import os
import uuid
from typing import List, Dict, Any
from dotenv import load_dotenv

import numpy as np
from pypdf import PdfReader
from rank_bm25 import BM25Okapi

from google import genai
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, ScoredPoint, Filter, FieldCondition, MatchValue

load_dotenv(override=True)

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "models/gemini-embedding-001")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

COLLECTION_NAME = "support_knowledge"

# Initialize clients
if GEMINI_API_KEY:
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
else:
    gemini_client = None

if QDRANT_URL and QDRANT_API_KEY:
    qdrant_client = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY
    )
else:
    qdrant_client = QdrantClient(location=":memory:")

# In-memory BM25 index
bm25_corpus: List[str] = []
bm25_metadata: List[Dict[str, Any]] = []
bm25_model = None

def init_qdrant():
    """Initialize Qdrant collection and sync BM25 index from stored vectors."""
    global bm25_corpus, bm25_metadata, bm25_model
    try:
        collections = qdrant_client.get_collections().collections
        if not any(c.name == COLLECTION_NAME for c in collections):
            qdrant_client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=768, distance=Distance.COSINE)
            )
            
        # Rehydrate BM25 index from Qdrant if BM25 is currently empty
        if not bm25_corpus:
            records, _ = qdrant_client.scroll(
                collection_name=COLLECTION_NAME,
                limit=1000,
                with_payload=True,
                with_vectors=False
            )
            for r in records:
                if r.payload and r.payload.get("text"):
                    bm25_corpus.append(r.payload["text"])
                    bm25_metadata.append(r.payload)
            if bm25_corpus:
                tokenized = [doc.split() for doc in bm25_corpus]
                bm25_model = BM25Okapi(tokenized)
    except Exception as e:
        print(f"Error initializing Qdrant collection: {e}")

def get_embedding(text: str) -> List[float]:
    """Generate dense 768-dimensional embedding using Gemini."""
    if not gemini_client:
        return [0.0] * 768
    
    try:
        from google.genai import types
        config = types.EmbedContentConfig(output_dimensionality=768)
        result = gemini_client.models.embed_content(
            model=GEMINI_EMBEDDING_MODEL,
            contents=text,
            config=config
        )
        return result.embeddings[0].values
    except Exception as e:
        print(f"Gemini Embedding error: {e}")
        return [0.0] * 768

def chunk_text(text: str, max_tokens: int = 500) -> List[str]:
    """Simple chunking strategy by words."""
    words = text.split()
    chunks = []
    words_per_chunk = int(max_tokens * 0.75)
    if words_per_chunk <= 0:
        words_per_chunk = 50
    
    for i in range(0, len(words), words_per_chunk):
        chunk = " ".join(words[i:i + words_per_chunk])
        if chunk.strip():
            chunks.append(chunk)
        
    return chunks

def ingest_document(file_content: bytes, filename: str, file_type: str):
    """Process a document and store its chunks in Qdrant and BM25."""
    global bm25_corpus, bm25_metadata, bm25_model
    
    text = ""
    if file_type == "application/pdf":
        from io import BytesIO
        reader = PdfReader(BytesIO(file_content))
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
    else:
        try:
            text = file_content.decode("utf-8")
        except UnicodeDecodeError:
            text = file_content.decode("latin-1", errors="ignore")
        
    chunks = chunk_text(text)
    if not chunks:
        return
        
    doc_id = str(uuid.uuid4())
    points = []
    for i, chunk in enumerate(chunks):
        chunk_id = f"{doc_id}_{i}"
        vector = get_embedding(chunk)
        
        metadata = {
            "document_id": doc_id,
            "document_name": filename,
            "chunk_id": chunk_id,
            "text": chunk,
            "source": filename
        }
        
        point_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk_id))
        points.append(
            PointStruct(
                id=point_uuid,
                vector=vector,
                payload=metadata
            )
        )
        
        bm25_corpus.append(chunk)
        bm25_metadata.append(metadata)
        
    if points:
        init_qdrant()
        qdrant_client.upsert(
            collection_name=COLLECTION_NAME,
            points=points
        )
        
    if bm25_corpus:
        tokenized_corpus = [doc.split() for doc in bm25_corpus]
        bm25_model = BM25Okapi(tokenized_corpus)

def get_real_qdrant_sources() -> List[Dict[str, Any]]:
    """Fetch real documents stored in Qdrant vector database."""
    init_qdrant()
    try:
        records, _ = qdrant_client.scroll(
            collection_name=COLLECTION_NAME,
            limit=500,
            with_payload=True,
            with_vectors=False
        )
        
        docs_map = {}
        for r in records:
            if not r.payload:
                continue
            doc_name = r.payload.get("document_name") or r.payload.get("source") or "Document"
            if doc_name not in docs_map:
                docs_map[doc_name] = {
                    "name": doc_name,
                    "chunks_count": 0,
                    "preview": r.payload.get("text", "")[:120].strip(),
                    "source": "Qdrant Cloud"
                }
            docs_map[doc_name]["chunks_count"] += 1

        result = list(docs_map.values())
        return result
    except Exception as e:
        print(f"Error reading Qdrant sources: {e}")
        return []

def delete_document_from_qdrant(doc_name: str) -> bool:
    """Delete a document and all its chunks from Qdrant and BM25."""
    global bm25_corpus, bm25_metadata, bm25_model
    init_qdrant()
    try:
        # 1. Scroll and find all point IDs matching doc_name
        from qdrant_client.models import PointIdsList
        records, _ = qdrant_client.scroll(
            collection_name=COLLECTION_NAME,
            limit=1000,
            with_payload=True,
            with_vectors=False
        )
        
        point_ids = []
        for r in records:
            if not r.payload:
                continue
            name = r.payload.get("document_name") or r.payload.get("source")
            if name == doc_name:
                point_ids.append(r.id)
                
        if point_ids:
            qdrant_client.delete(
                collection_name=COLLECTION_NAME,
                points_selector=PointIdsList(points=point_ids)
            )
            
        # 2. Also try filter-based delete as secondary cleanup
        try:
            qdrant_client.delete(
                collection_name=COLLECTION_NAME,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="document_name",
                            match=MatchValue(value=doc_name)
                        )
                    ]
                )
            )
        except Exception:
            pass

        # 3. Clean up BM25 in-memory corpus
        new_corpus = []
        new_meta = []
        for text, meta in zip(bm25_corpus, bm25_metadata):
            meta_name = meta.get("document_name") or meta.get("source")
            if meta_name != doc_name:
                new_corpus.append(text)
                new_meta.append(meta)
                
        bm25_corpus = new_corpus
        bm25_metadata = new_meta
        if bm25_corpus:
            tokenized_corpus = [doc.split() for doc in bm25_corpus]
            bm25_model = BM25Okapi(tokenized_corpus)
        else:
            bm25_model = None
            
        return True
    except Exception as e:
        print(f"Error deleting {doc_name} from Qdrant: {e}")
        return False

# Ensure Qdrant collection is initialized
init_qdrant()

def search_dense(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Dense vector search using Qdrant."""
    init_qdrant()
    vector = get_embedding(query)
    try:
        # Modern qdrant-client uses query_points
        if hasattr(qdrant_client, "query_points"):
            response = qdrant_client.query_points(
                collection_name=COLLECTION_NAME,
                query=vector,
                limit=top_k
            )
            results = response.points
        else:
            results = qdrant_client.search(
                collection_name=COLLECTION_NAME,
                query_vector=vector,
                limit=top_k
            )

        return [
            {
                "text": hit.payload.get("text", ""),
                "metadata": {
                    "document_name": hit.payload.get("document_name", ""),
                    "source": hit.payload.get("source", ""),
                    "chunk_id": hit.payload.get("chunk_id", "")
                },
                "score": hit.score
            }
            for hit in results
        ]
    except Exception as e:
        print(f"Error in search_dense: {e}")
        return []

def search_sparse(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Sparse keyword search using BM25."""
    if not bm25_model or not bm25_corpus:
        return []
        
    tokenized_query = query.split()
    scores = bm25_model.get_scores(tokenized_query)
    
    top_indices = np.argsort(scores)[::-1][:top_k]
    
    results = []
    for idx in top_indices:
        if scores[idx] > 0:
            results.append({
                "text": bm25_corpus[idx],
                "metadata": bm25_metadata[idx],
                "score": float(scores[idx])
            })
    return results

def reciprocal_rank_fusion(dense_results: List[Dict[str, Any]], sparse_results: List[Dict[str, Any]], k: int = 60) -> List[Dict[str, Any]]:
    """Combines dense and sparse results using Reciprocal Rank Fusion (RRF)."""
    scores = {}
    doc_map = {}
    
    for rank, doc in enumerate(dense_results):
        text = doc["text"]
        doc_map[text] = doc
        scores[text] = scores.get(text, 0.0) + 1.0 / (k + rank + 1)
        
    for rank, doc in enumerate(sparse_results):
        text = doc["text"]
        if text not in doc_map:
            doc_map[text] = doc
        scores[text] = scores.get(text, 0.0) + 1.0 / (k + rank + 1)
        
    reranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    
    final_results = []
    for text, score in reranked:
        doc = doc_map[text]
        doc["rrf_score"] = score
        final_results.append(doc)
        
    return final_results

def hybrid_search(query: str, top_k: int = 5, rerank_k: int = 3) -> List[Dict[str, Any]]:
    """Executes hybrid search (dense + sparse with RRF reranking)."""
    dense_hits = search_dense(query, top_k=top_k)
    sparse_hits = search_sparse(query, top_k=top_k)
    fused = reciprocal_rank_fusion(dense_hits, sparse_hits)
    return fused[:rerank_k]
