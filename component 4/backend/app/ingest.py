"""
Stage 1-2 ingestion pipeline with page awareness and local retrieval.

extract_pages -> chunk_pages -> embed (sentence-transformers) -> KnowledgeBase
build/load/retrieve using NumPy cosine similarity (no faiss/chromadb).
"""
import os
import sys
import json
import time
import logging
import re
import zipfile
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
from pypdf import PdfReader
# pyrefly: ignore [missing-import]
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.demo_log import step

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


import zipfile
import xml.etree.ElementTree as ET

def extract_docx_text(docx_path: str) -> str:
    """Extracts raw text from a .docx file without requiring external docx libraries."""
    try:
        with zipfile.ZipFile(docx_path) as z:
            xml_content = z.read("word/document.xml")
            tree = ET.fromstring(xml_content)
            # w:t elements contain the text fragments
            paragraphs = []
            for p in tree.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
                texts = [
                    node.text
                    for node in p.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t")
                    if node.text
                ]
                if texts:
                    paragraphs.append("".join(texts))
            return "\n\n".join(paragraphs)
    except Exception as exc:
        logger.warning(f"Failed extracting text from docx {docx_path}: {exc}")
        return ""


def extract_pptx_slides(pptx_path: str) -> List[Dict[str, Any]]:
    """
    Extracts text per slide from a PowerPoint (.pptx) file using standard library zipfile and XML parsing.
    Extracts all text tags from slide XMLs, notesSlide XMLs, and diagram data.
    """
    slides: List[Dict[str, Any]] = []
    try:
        with zipfile.ZipFile(pptx_path) as z:
            all_files = z.namelist()
            logger.info(f"PPTX contents count: {len(all_files)} files in zip archive.")

            # Match slide XML files (e.g. ppt/slides/slide1.xml)
            slide_names = [
                name for name in all_files
                if "/slides/slide" in name.lower() and name.lower().endswith(".xml")
            ]

            def slide_num(name: str) -> int:
                m = re.search(r"slide(\d+)\.xml", name, re.IGNORECASE)
                return int(m.group(1)) if m else 9999

            slide_names.sort(key=slide_num)

            for idx, slide_name in enumerate(slide_names, start=1):
                try:
                    xml_content = z.read(slide_name)
                    tree = ET.fromstring(xml_content)
                    texts: List[str] = []
                    
                    # Extract from all text elements (.text or .tail)
                    for elem in tree.iter():
                        tag_name = elem.tag.split("}")[-1].lower() if "}" in elem.tag else elem.tag.lower()
                        if tag_name in ("t", "r", "p") and elem.text and elem.text.strip():
                            texts.append(elem.text.strip())
                        elif elem.tail and elem.tail.strip():
                            texts.append(elem.tail.strip())

                    slide_text = " ".join(texts).strip()
                    if slide_text:
                        slides.append({"page": idx, "text": slide_text})
                except Exception as slide_err:
                    logger.debug(f"Failed parsing slide {slide_name}: {slide_err}")

            # If no text found from slides/slide*.xml, check notesSlides and diagram data
            if not slides:
                logger.info("No slide XML text found, checking notesSlides and diagram data...")
                fallback_names = [
                    name for name in all_files
                    if ("/notesslides/" in name.lower() or "/diagrams/" in name.lower() or "sharedstrings.xml" in name.lower())
                    and name.lower().endswith(".xml")
                ]
                for idx, fb_name in enumerate(fallback_names, start=1):
                    try:
                        content = z.read(fb_name)
                        tree = ET.fromstring(content)
                        texts = [elem.text.strip() for elem in tree.iter() if elem.text and elem.text.strip()]
                        if texts:
                            slides.append({"page": idx, "text": " ".join(texts)})
                    except Exception:
                        pass

            # Ultimate fallback: scan every XML file under ppt/ for readable textual content
            if not slides:
                logger.info("Scanning all ppt/*.xml files for text...")
                all_xmls = [n for n in all_files if n.lower().startswith("ppt/") and n.lower().endswith(".xml")]
                aggregated_texts: List[str] = []
                for xfile in all_xmls:
                    try:
                        content = z.read(xfile)
                        tree = ET.fromstring(content)
                        for elem in tree.iter():
                            tag = elem.tag.split("}")[-1].lower() if "}" in elem.tag else elem.tag.lower()
                            if tag == "t" and elem.text and elem.text.strip():
                                aggregated_texts.append(elem.text.strip())
                    except Exception:
                        pass
                if aggregated_texts:
                    slides.append({"page": 1, "text": " ".join(aggregated_texts)})

            logger.info(f"Extracted {len(slides)} slide/section texts from PPTX: {pptx_path}")
    except Exception as exc:
        logger.warning(f"Failed extracting slides from pptx {pptx_path}: {exc}")
    return slides


def extract_pages(file_path: str) -> List[Dict[str, Any]]:
    """
    Extracts text from each page/section/slide of a PDF, DOCX, PPTX, or TXT file.

    Returns:
        List of {"page": int (1-based), "text": str}; empty pages are skipped.
    """
    ext = os.path.splitext(file_path)[1].lower()
    pages: List[Dict[str, Any]] = []

    if ext == ".pptx":
        return extract_pptx_slides(file_path)

    if ext == ".docx":
        full_text = extract_docx_text(file_path).strip()
        if full_text:
            # Group into ~1500 character virtual pages to maintain page-awareness
            chunks = [full_text[i : i + 1500] for i in range(0, len(full_text), 1500)]
            for idx, chunk in enumerate(chunks, start=1):
                pages.append({"page": idx, "text": chunk.strip()})
        return pages

    if ext in (".txt", ".text", ".md"):
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                full_text = f.read().strip()
            if full_text:
                chunks = [full_text[i : i + 1500] for i in range(0, len(full_text), 1500)]
                for idx, chunk in enumerate(chunks, start=1):
                    pages.append({"page": idx, "text": chunk.strip()})
        except Exception as exc:
            logger.warning(f"Failed reading text file {file_path}: {exc}")
        return pages

    # Default to PDF
    reader = PdfReader(file_path)
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


def save_pages(pages: List[Dict[str, Any]], kb_id: str) -> None:
    """Saves page text as numbered lines to knowledge/{kb_id}/pages.json."""
    kb_dir = os.path.join(KNOWLEDGE_DIR, kb_id)
    os.makedirs(kb_dir, exist_ok=True)
    numbered_pages = [
        {
            "page": page["page"],
            "lines": [
                f"{line_number}: {line}"
                for line_number, line in enumerate(page["text"].splitlines(), start=1)
            ],
        }
        for page in pages
    ]
    pages_path = os.path.join(kb_dir, "pages.json")
    with open(pages_path, "w", encoding="utf-8") as f:
        json.dump(numbered_pages, f, indent=2, ensure_ascii=False)


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
        step("INGEST", "pages extracted", kb_id=kb_id, pages=len(pages))
        save_pages(pages, kb_id)
        chunks = chunk_pages(pages)
        if not chunks:
            raise ValueError(f"No extractable text found in PDF: {pdf_path}")
        step("INGEST", "chunks created", kb_id=kb_id, chunks=len(chunks))

        model = _get_embedding_model()
        embed_started = time.perf_counter()
        embeddings = model.encode([c["text"] for c in chunks], convert_to_numpy=True)
        vectors = np.asarray(embeddings, dtype=np.float32)
        step(
            "INGEST",
            "embeddings created",
            kb_id=kb_id,
            embeddings=len(chunks),
            seconds=round(time.perf_counter() - embed_started, 3),
        )

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
            step("RAG", "retrieve", kb_id=self.kb_id, query=query, k=k, hits=[])
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
        hits = [
            {
                "chunk_id": self.chunks[i]["chunk_id"],
                "page": self.chunks[i]["page"],
                "score": round(float(scores[i]), 3),
            }
            for i in top_indices
        ]
        step("RAG", "retrieve", kb_id=self.kb_id, query=query, k=k, hits=hits)
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
