"""
Stage 1-2 ingestion pipeline with page awareness and local retrieval.

extract_pages -> chunk_pages -> embed (sentence-transformers) -> KnowledgeBase
build/load/retrieve using NumPy cosine similarity (no faiss/chromadb).
"""
import os
import sys
import json
import logging
from typing import Any, Dict, List, Optional
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
from pypdf import PdfReader
# pyrefly: ignore [missing-import]
from langchain_text_splitters import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)

# Directory holding built knowledge bases: backend/knowledge/{kb_id}/
KNOWLEDGE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "knowledge"
)

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

# Lazily loaded singleton sentence-transformers model.
_EMBEDDING_MODEL = None


def _get_embedding_model():
    """Loads the sentence-transformers model once and returns it."""
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is None:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading embedding model '{EMBEDDING_MODEL_NAME}'...")
        _EMBEDDING_MODEL = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _EMBEDDING_MODEL


def extract_pages(pdf_path: str) -> List[Dict[str, Any]]:
    """
    Extracts text from each page of a PDF using pypdf.

    Returns:
        List of {"page": int (1-based), "text": str}; pages with no text are skipped.
    """
    reader = PdfReader(pdf_path)
    pages: List[Dict[str, Any]] = []
    for page_number, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if not text:
            continue
        pages.append({"page": page_number, "text": text})
    return pages


def chunk_pages(
    pages: List[Dict[str, Any]],
    chunk_size: int = 900,
    overlap: int = 150,
) -> List[Dict[str, Any]]:
    """
    Splits each page's text into chunks separately, so every chunk carries
    exactly one page number.

    Returns:
        List of {"chunk_id": "p{page}_c{index}", "page": int, "text": str}.
    """
    splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=overlap)
    chunks: List[Dict[str, Any]] = []
    for page in pages:
        parts = splitter.split_text(page["text"])
        for index, part in enumerate(parts):
            chunks.append(
                {
                    "chunk_id": f"p{page['page']}_c{index}",
                    "page": page["page"],
                    "text": part,
                }
            )
    return chunks


class KnowledgeBase:
    """Page-aware local knowledge base backed by NumPy cosine similarity."""

    def __init__(self, kb_id: str, chunks: List[Dict[str, Any]], vectors: np.ndarray):
        self.kb_id = kb_id
        self.chunks = chunks
        self.vectors = vectors

    @classmethod
    def build(cls, pdf_path: str, kb_id: str) -> "KnowledgeBase":
        """
        Extracts, chunks, and embeds the PDF, then persists the knowledge base
        to backend/knowledge/{kb_id}/chunks.json and vectors.npy.
        """
        pages = extract_pages(pdf_path)
        chunks = chunk_pages(pages)
        if not chunks:
            raise ValueError(f"No extractable text found in PDF: {pdf_path}")

        model = _get_embedding_model()
        embeddings = model.encode([c["text"] for c in chunks], convert_to_numpy=True)
        vectors = np.asarray(embeddings, dtype=np.float32)

        kb_dir = os.path.join(KNOWLEDGE_DIR, kb_id)
        os.makedirs(kb_dir, exist_ok=True)
        with open(os.path.join(kb_dir, "chunks.json"), "w", encoding="utf-8") as f:
            json.dump(chunks, f, indent=2, ensure_ascii=False)
        np.save(os.path.join(kb_dir, "vectors.npy"), vectors)
        logger.info(f"Knowledge base '{kb_id}' saved to {kb_dir} ({len(chunks)} chunks)")

        return cls(kb_id, chunks, vectors)

    @classmethod
    def load(cls, kb_id: str) -> "KnowledgeBase":
        """Loads a previously built knowledge base from backend/knowledge/{kb_id}/."""
        kb_dir = os.path.join(KNOWLEDGE_DIR, kb_id)
        chunks_path = os.path.join(kb_dir, "chunks.json")
        vectors_path = os.path.join(kb_dir, "vectors.npy")
        if not os.path.exists(chunks_path) or not os.path.exists(vectors_path):
            raise FileNotFoundError(f"Knowledge base '{kb_id}' not found at {kb_dir}")
        with open(chunks_path, "r", encoding="utf-8") as f:
            chunks = json.load(f)
        vectors = np.load(vectors_path)
        logger.info(f"Knowledge base '{kb_id}' loaded from {kb_dir} ({len(chunks)} chunks)")
        return cls(kb_id, chunks, vectors)

    def retrieve(self, query: str, k: int = 4) -> List[Dict[str, Any]]:
        """
        Returns the top-k most similar chunks for a query using cosine
        similarity, each with an added float "score" field.
        """
        if not self.chunks:
            return []

        model = _get_embedding_model()
        query_vector = np.asarray(
            model.encode([query], convert_to_numpy=True), dtype=np.float32
        )[0]

        vector_norms = np.linalg.norm(self.vectors, axis=1)
        query_norm = float(np.linalg.norm(query_vector))
        denominators = vector_norms * query_norm
        scores = np.divide(
            self.vectors @ query_vector,
            denominators,
            out=np.zeros(len(self.chunks), dtype=np.float32),
            where=denominators != 0,
        )

        top_indices = np.argsort(scores)[::-1][:k]
        return [{**self.chunks[i], "score": float(scores[i])} for i in top_indices]


def main() -> None:
    """CLI entry point: python -m app.ingest <pdf_path> <kb_id> "<query>" """
    if len(sys.argv) != 4:
        print('Usage: python -m app.ingest <pdf_path> <kb_id> "<query>"')
        sys.exit(1)

    pdf_path, kb_id, query = sys.argv[1], sys.argv[2], sys.argv[3]

    print(f"Building knowledge base '{kb_id}' from '{pdf_path}'...")
    kb = KnowledgeBase.build(pdf_path, kb_id)
    print(f"Indexed {len(kb.chunks)} chunks.\n")

    results = kb.retrieve(query, k=4)
    print(f"Top {len(results)} results for query: {query!r}\n")
    for result in results:
        print(f"[page {result['page']}] {result['chunk_id']}  score={result['score']:.4f}")
        print(result["text"][:400])
        print("-" * 60)


if __name__ == "__main__":
    main()
