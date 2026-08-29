import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import rag

def test_chunking_with_overlap():
    text = "Sentence one is long and detailed. Sentence two has many words. Sentence three discusses policies."
    chunks = rag.chunk_text(text, max_words=10, overlap_words=4)
    assert len(chunks) >= 1
    assert "text" in chunks[0]
    assert "section_heading" in chunks[0]

def test_heading_extraction():
    assert rag.extract_section_heading("## Refund Policy") == "Refund Policy"
    assert rag.extract_section_heading("Chapter 4: Setup") == "Chapter 4: Setup"
    assert rag.extract_section_heading("Normal text") is None

def test_tokenization_stop_words():
    tokens = rag.tokenize_text("This is an official document for testing")
    assert "official" in tokens
    assert "testing" in tokens
    assert "this" not in tokens
    assert "is" not in tokens

def test_rrf_fusion():
    dense = [{"text": "doc1", "score": 0.9}, {"text": "doc2", "score": 0.8}]
    sparse = [{"text": "doc2", "score": 4.5}, {"text": "doc3", "score": 3.0}]
    fused = rag.reciprocal_rank_fusion(dense, sparse, k=60)
    assert len(fused) == 3
    # doc2 appeared in both, so it should rank first
    assert fused[0]["text"] == "doc2"
