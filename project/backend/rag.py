import os
import time
import threading
import re
import uuid
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

import numpy as np
from pypdf import PdfReader
from rank_bm25 import BM25Okapi

from google import genai
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, ScoredPoint, Filter, FieldCondition, MatchValue, FilterSelector

load_dotenv(override=True)

# Configuration
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_EMBEDDING_MODEL = os.getenv('GEMINI_EMBEDDING_MODEL', 'models/gemini-embedding-001')
QDRANT_URL = os.getenv('QDRANT_URL')
QDRANT_API_KEY = os.getenv('QDRANT_API_KEY')

COLLECTION_NAME = 'support_knowledge'

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
    qdrant_client = QdrantClient(location=':memory:')

# In-memory BM25 index
bm25_corpus: List[str] = []
bm25_metadata: List[Dict[str, Any]] = []
bm25_model = None
bm25_lock = threading.Lock()
MAX_PDF_PAGES = 50
bm25_lock = threading.Lock()
MAX_PDF_PAGES = 50

# Common English stop words for BM25 text normalization
STOP_WORDS = {
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'were', 'will', 'with', 'or', 'this', 'can', 'should'
}

def tokenize_text(text: str) -> List[str]:
    '''Normalizes text for BM25 matching: lowercasing, punctuation stripping, stop word filtering.'''
    text_lower = text.lower()
    clean_text = re.sub(r'[^\w\s]', '', text_lower)
    tokens = clean_text.split()
    filtered = [t for t in tokens if t not in STOP_WORDS and len(t) > 1]
    return filtered if filtered else tokens

def extract_section_heading(text: str) -> Optional[str]:
    """Extracts section heading if present."""
    clean = text.strip()
    if clean.startswith("#"):
        return clean.lstrip("#").strip()
    if clean.lower().startswith(("section ", "chapter ", "part ", "topic ")):
        return clean
    if clean.isupper() and 1 < len(clean.split()) <= 6:
        return clean.title()
    return None

def chunk_text(text: str, max_words: int = 350, overlap_words: int = 60) -> List[Dict[str, Any]]:
    """Sentence and section-heading aware chunking strategy with sliding window overlap."""
    if not text or not text.strip():
        return []

    lines = text.splitlines()
    structured_blocks = []
    current_heading = "General Overview"

    for line in lines:
        clean = line.strip()
        if not clean:
            continue
        heading = extract_section_heading(clean)
        if heading:
            current_heading = heading
        else:
            structured_blocks.append((current_heading, clean))

    if not structured_blocks:
        structured_blocks = [(current_heading, text.strip())]

    chunks = []
    current_sentences = []
    current_heading = structured_blocks[0][0]
    current_word_count = 0

    for heading, block in structured_blocks:
        raw_sentences = re.split(r'(?<=[.!?])\s+|\n+', block)
        sentences = [s.strip() for s in raw_sentences if s and s.strip()]

        for sentence in sentences:
            sentence_words = len(sentence.split())
            if current_word_count + sentence_words > max_words and current_sentences:
                body_text = ' '.join(current_sentences)
                full_text = f"[Section: {current_heading}]\n{body_text}"
                chunks.append({
                    "text": full_text,
                    "section_heading": current_heading
                })

                overlap_sentences = []
                overlap_count = 0
                for s in reversed(current_sentences):
                    s_words = len(s.split())
                    overlap_sentences.insert(0, s)
                    overlap_count += s_words
                    if overlap_count >= overlap_words:
                        break

                current_sentences = overlap_sentences
                current_word_count = sum(len(s.split()) for s in current_sentences)

            current_sentences.append(sentence)
            current_word_count += sentence_words
            current_heading = heading

    if current_sentences:
        body_text = ' '.join(current_sentences)
        full_text = f"[Section: {current_heading}]\n{body_text}"
        if not chunks or body_text not in chunks[-1]["text"]:
            chunks.append({
                "text": full_text,
                "section_heading": current_heading
            })

    return chunks

from qdrant_client.models import PayloadSchemaType

def init_qdrant():
    '''Initialize Qdrant collection and sync BM25 index from stored vectors.'''
    global bm25_corpus, bm25_metadata, bm25_model
    try:
        collections = qdrant_client.get_collections().collections
        if not any(c.name == COLLECTION_NAME for c in collections):
            qdrant_client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=768, distance=Distance.COSINE)
            )
            
        # Ensure payload indexes exist for server-side filter-based operations
        for field_key in ['document_name', 'source', 'document_id']:
            try:
                qdrant_client.create_payload_index(
                    collection_name=COLLECTION_NAME,
                    field_name=field_key,
                    field_schema=PayloadSchemaType.KEYWORD
                )
            except Exception:
                pass
            
        if not bm25_corpus:
            next_offset = None
            while True:
                records, next_offset = qdrant_client.scroll(
                    collection_name=COLLECTION_NAME,
                    limit=1000,
                    offset=next_offset,
                    with_payload=True,
                    with_vectors=False
                )
                for r in records:
                    if r.payload and r.payload.get('text'):
                        bm25_corpus.append(r.payload['text'])
                        bm25_metadata.append(r.payload)
                if next_offset is None or not records:
                    break

            if bm25_corpus:
                tokenized_corpus = [tokenize_text(doc) for doc in bm25_corpus]
                bm25_model = BM25Okapi(tokenized_corpus)
    except Exception as e:
        print(f'Error initializing Qdrant collection: {e}')

def get_embedding(text: str, retries: int = 3) -> List[float]:
    '''Generate dense 768-dimensional embedding using Gemini with exponential backoff.'''
    if not gemini_client or not text or not text.strip():
        return [0.0] * 768
    
    for attempt in range(retries):
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
            if attempt < retries - 1:
                time.sleep(0.5 * (2 ** attempt))
                continue
            print(f'Gemini Embedding error after {retries} attempts: {e}')
            return [0.0] * 768

def ingest_document(file_content: bytes, filename: str, file_type: str):
    '''Process a document and store its chunks in Qdrant and BM25.'''
    global bm25_corpus, bm25_metadata, bm25_model
    
    text = ''
    if file_type == 'application/pdf':
        from io import BytesIO
        reader = PdfReader(BytesIO(file_content))
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text += t + '\n'
    else:
        try:
            text = file_content.decode('utf-8')
        except UnicodeDecodeError:
            text = file_content.decode('latin-1', errors='ignore')
        
    chunks = chunk_text(text)
    if not chunks:
        return
        
    doc_id = str(uuid.uuid4())
    points = []
    for i, chunk_obj in enumerate(chunks):
        chunk_id = f"{doc_id}_{i}"
        chunk_text_str = chunk_obj["text"]
        section_heading = chunk_obj.get("section_heading", "General Overview")
        vector = get_embedding(chunk_text_str)
        
        metadata = {
            "document_id": doc_id,
            "document_name": filename,
            "section_heading": section_heading,
            "chunk_id": chunk_id,
            "text": chunk_text_str,
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
        
        with bm25_lock:
            bm25_corpus.append(chunk_text_str)
            bm25_metadata.append(metadata)
        
    if points:
        init_qdrant()
        qdrant_client.upsert(
            collection_name=COLLECTION_NAME,
            points=points
        )
        
    with bm25_lock:
        if bm25_corpus:
            tokenized_corpus = [tokenize_text(doc) for doc in bm25_corpus]
            bm25_model = BM25Okapi(tokenized_corpus)

def get_real_qdrant_sources() -> List[Dict[str, Any]]:
    '''Fetch real documents stored in Qdrant vector database.'''
    init_qdrant()
    try:
        docs_map = {}
        next_offset = None
        while True:
            records, next_offset = qdrant_client.scroll(
                collection_name=COLLECTION_NAME,
                limit=1000,
                offset=next_offset,
                with_payload=True,
                with_vectors=False
            )
            for r in records:
                if not r.payload:
                    continue
                doc_name = r.payload.get('document_name') or r.payload.get('source') or 'Document'
                if doc_name not in docs_map:
                    docs_map[doc_name] = {
                        'name': doc_name,
                        'chunks_count': 0,
                        'preview': r.payload.get('text', '')[:120].strip(),
                        'source': 'Qdrant Cloud'
                    }
                docs_map[doc_name]['chunks_count'] += 1
            if next_offset is None or not records:
                break

        result = list(docs_map.values())
        return result
    except Exception as e:
        print(f'Error reading Qdrant sources: {e}')
        return []

def delete_document_from_qdrant(doc_name: str) -> bool:
    '''Delete a document and all its chunks from Qdrant and BM25 efficiently using server-side filtering.'''
    global bm25_corpus, bm25_metadata, bm25_model
    init_qdrant()
    try:
        qdrant_client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=FilterSelector(
                filter=Filter(
                    should=[
                        FieldCondition(
                            key='document_name',
                            match=MatchValue(value=doc_name)
                        ),
                        FieldCondition(
                            key='source',
                            match=MatchValue(value=doc_name)
                        ),
                        FieldCondition(
                            key='document_id',
                            match=MatchValue(value=doc_name)
                        )
                    ]
                )
            )
        )

        with bm25_lock:
            new_corpus = []
            new_meta = []
            for text, meta in zip(bm25_corpus, bm25_metadata):
                meta_name = meta.get('document_name') or meta.get('source') or meta.get('document_id')
                if meta_name != doc_name:
                    new_corpus.append(text)
                    new_meta.append(meta)
                    
            bm25_corpus = new_corpus
            bm25_metadata = new_meta
            if bm25_corpus:
                tokenized_corpus = [tokenize_text(doc) for doc in bm25_corpus]
                bm25_model = BM25Okapi(tokenized_corpus)
            else:
                bm25_model = None
            
        return True
    except Exception as e:
        print(f'Error deleting {doc_name} from Qdrant: {e}')
        return False

init_qdrant()

def search_dense(query: str, top_k: int = 8, min_score: float = 0.30) -> List[Dict[str, Any]]:
    '''Dense vector search using Qdrant with relevance threshold filtering.'''
    init_qdrant()
    vector = get_embedding(query)
    try:
        if hasattr(qdrant_client, 'query_points'):
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

        hits = []
        for hit in results:
            if hit.score >= min_score:
                hits.append({
                    'text': hit.payload.get('text', ''),
                    'metadata': {
                        'document_name': hit.payload.get('document_name', ''),
                        'source': hit.payload.get('source', ''),
                        'chunk_id': hit.payload.get('chunk_id', '')
                    },
                    'score': hit.score
                })
        return hits
    except Exception as e:
        print(f'Error in search_dense: {e}')
        return []

def search_sparse(query: str, top_k: int = 8) -> List[Dict[str, Any]]:
    '''Sparse keyword search using normalized BM25 with thread-safe lock.'''
    tokenized_query = tokenize_text(query)
    if not tokenized_query:
        return []

    with bm25_lock:
        if not bm25_model or not bm25_corpus:
            return []
        scores = bm25_model.get_scores(tokenized_query)
        top_indices = np.argsort(scores)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            if scores[idx] > 0:
                results.append({
                    'text': bm25_corpus[idx],
                    'metadata': bm25_metadata[idx],
                    'score': float(scores[idx])
                })
        return results

def reciprocal_rank_fusion(dense_results: List[Dict[str, Any]], sparse_results: List[Dict[str, Any]], k: int = 60) -> List[Dict[str, Any]]:
    '''Combines dense and sparse results using Reciprocal Rank Fusion (RRF).'''
    scores = {}
    doc_map = {}
    
    for rank, doc in enumerate(dense_results):
        text = doc['text']
        doc_map[text] = doc
        scores[text] = scores.get(text, 0.0) + 1.0 / (k + rank + 1)
        
    for rank, doc in enumerate(sparse_results):
        text = doc['text']
        if text not in doc_map:
            doc_map[text] = doc
        scores[text] = scores.get(text, 0.0) + 1.0 / (k + rank + 1)
        
    reranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    
    final_results = []
    for text, score in reranked:
        doc = doc_map[text]
        doc['rrf_score'] = score
        final_results.append(doc)
        
    return final_results

def hybrid_search(query: str, top_k: int = 8, rerank_k: int = 4) -> List[Dict[str, Any]]:
    '''Executes hybrid search (dense + sparse with RRF reranking).'''
    dense_hits = search_dense(query, top_k=top_k)
    sparse_hits = search_sparse(query, top_k=top_k)
    fused = reciprocal_rank_fusion(dense_hits, sparse_hits)
    return fused[:rerank_k]
