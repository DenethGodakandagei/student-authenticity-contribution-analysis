"""
Stage 3: grounded misconception generation from a local KnowledgeBase.

Uses retrieval from app.ingest.KnowledgeBase plus JSON-validated LLM calls
(app.llm.generate_json) to produce misconceptions that cite source chunks,
pages, and verbatim quotes, then verifies each quote against the chunk text.
"""
import os
import sys
import json
import time
import logging
import difflib
from typing import Any, Dict, List
# pyrefly: ignore [missing-import]
from pydantic import BaseModel

from app.ingest import KNOWLEDGE_DIR, KnowledgeBase
from app.llm import generate_json

logger = logging.getLogger(__name__)

# Seed queries used to gather a bounded view of the document for concept extraction.
CONCEPT_QUERIES = [
    "inheritance",
    "polymorphism",
    "encapsulation",
    "abstraction",
    "interface",
    "method overriding and overloading",
    "constructor",
    "class and object",
]

CONCEPT_CHUNK_LIMIT = 500  # chars per seed chunk sent to the LLM
MISCONCEPTION_CHUNK_LIMIT = 700  # chars per source chunk sent to the LLM
MIN_QUOTE_WORDS = 10
MAX_QUOTE_WORDS = 30
GROUNDING_SIMILARITY_THRESHOLD = 0.8


# ============================================================================
# Pydantic Models (validated LLM output)
# ============================================================================

class ConceptList(BaseModel):
    concepts: list[str]


class GroundedMisconception(BaseModel):
    concept: str
    wrong_belief: str
    correct_concept: str
    reason: str
    source_chunk_ids: list[str]
    source_quote: str


class MisconceptionBatch(BaseModel):
    misconceptions: list[GroundedMisconception]


# ============================================================================
# Concept Extraction (Step 1)
# ============================================================================

def _gather_seed_chunks(kb: KnowledgeBase) -> List[Dict[str, Any]]:
    """Retrieves the top 2 chunks per concept query, deduplicated by chunk_id,
    with each chunk's text truncated to CONCEPT_CHUNK_LIMIT characters."""
    seen: set = set()
    seeds: List[Dict[str, Any]] = []
    for query in CONCEPT_QUERIES:
        for hit in kb.retrieve(query, k=2):
            chunk_id = hit["chunk_id"]
            if chunk_id in seen:
                continue
            seen.add(chunk_id)
            seeds.append(
                {
                    "chunk_id": chunk_id,
                    "page": hit["page"],
                    "text": hit["text"][:CONCEPT_CHUNK_LIMIT],
                }
            )
    return seeds


def _format_chunks(chunks: List[Dict[str, Any]]) -> str:
    """Formats chunks as labelled blocks for inclusion in an LLM prompt."""
    return "\n\n".join(
        f"[chunk_id: {c['chunk_id']}, page {c['page']}]\n{c['text']}" for c in chunks
    )


def _extract_concepts(kb: KnowledgeBase, max_concepts: int) -> List[str]:
    """Asks the LLM which OOP concepts are actually taught in the retrieved
    seed chunks, returning at most max_concepts short concept names."""
    seeds = _gather_seed_chunks(kb)
    if not seeds:
        return []

    prompt = f"""
You are an expert object-oriented programming educator.
Read the lecture excerpts below and list the key object-oriented programming
concepts that are ACTUALLY taught in this text.

LECTURE EXCERPTS:
{_format_chunks(seeds)}

RULES:
- Use short names only (one or two words each), e.g. "inheritance", "polymorphism".
- List at most {max_concepts} concepts.
- Only include concepts genuinely taught in the excerpts above.
- Ignore syllabus text, headers, college names, unit lists, and administrative text.
- Return only JSON in exactly this form:
{{"concepts": ["concept name 1", "concept name 2"]}}
"""
    result = generate_json(prompt, ConceptList)
    return result.concepts[:max_concepts]


# ============================================================================
# Misconception Generation per Concept (Step 2)
# ============================================================================

def _generate_for_concept(
    kb: KnowledgeBase, concept: str, per_concept: int
) -> List[GroundedMisconception]:
    """Retrieves the top 3 chunks for a concept (truncated to
    MISCONCEPTION_CHUNK_LIMIT chars) and asks the LLM for up to per_concept
    grounded misconceptions about it."""
    hits = kb.retrieve(concept, k=3)
    chunks = [
        {"chunk_id": h["chunk_id"], "page": h["page"], "text": h["text"][:MISCONCEPTION_CHUNK_LIMIT]}
        for h in hits
    ]
    if not chunks:
        return []

    prompt = f"""
You are an expert object-oriented programming tutor.
Generate student misconceptions about the concept: "{concept}".

SOURCE KNOWLEDGE (use ONLY the chunks below as the source of correct knowledge):
{_format_chunks(chunks)}

TASK: Produce up to {per_concept} plausible student misconceptions about "{concept}".

RULES:
- wrong_belief: a subtle mistake a real beginner would make, written in first
  person style such as "I think that ...".
- correct_concept: the accurate understanding; it must be supported by the chunks.
- reason: a short pedagogical explanation of why the misconception arises.
- source_quote: copied VERBATIM from one of the provided chunks, between
  {MIN_QUOTE_WORDS} and {MAX_QUOTE_WORDS} words long.
- source_chunk_ids: must contain only chunk ids from the provided chunks
  (for example "p1_c0").
- concept: "{concept}".
- Return only JSON in exactly this form:
{{"misconceptions": [{{"concept": "{concept}", "wrong_belief": "...",
"correct_concept": "...", "reason": "...", "source_chunk_ids": ["..."],
"source_quote": "..."}}]}}
"""
    batch = generate_json(prompt, MisconceptionBatch)
    return batch.misconceptions[:per_concept]


# ============================================================================
# Grounding Check (Step 3)
# ============================================================================

def _normalise(text: str) -> str:
    """Lowercases text and collapses all whitespace runs to single spaces."""
    return " ".join(text.split()).lower()


def _window_similarity(quote: str, text: str) -> float:
    """Returns the best difflib ratio of the quote against any window of
    text whose length equals the quote's length."""
    if not quote or not text:
        return 0.0
    if len(quote) >= len(text):
        return difflib.SequenceMatcher(None, quote, text, autojunk=False).ratio()

    window = len(quote)
    best = 0.0
    for start in range(0, len(text) - window + 1):
        score = difflib.SequenceMatcher(
            None, quote, text[start:start + window], autojunk=False
        ).ratio()
        if score > best:
            best = score
        if best >= GROUNDING_SIMILARITY_THRESHOLD:
            break
    return best


def _is_grounded(quote: str, cited_texts: List[str]) -> bool:
    """True if the normalised quote is a substring of a cited chunk's text,
    or reaches the similarity threshold against a window of one of them."""
    quote_norm = _normalise(quote)
    if not quote_norm:
        return False
    for text in cited_texts:
        text_norm = _normalise(text)
        if quote_norm in text_norm:
            return True
        if _window_similarity(quote_norm, text_norm) >= GROUNDING_SIMILARITY_THRESHOLD:
            return True
    return False


def _source_pages(chunk_ids: List[str], chunk_lookup: Dict[str, dict]) -> List[int]:
    """Maps cited chunk ids to their unique page numbers, in citation order."""
    pages: List[int] = []
    for chunk_id in chunk_ids:
        chunk = chunk_lookup.get(chunk_id)
        if chunk is None:
            continue
        if chunk["page"] not in pages:
            pages.append(chunk["page"])
    return pages


# ============================================================================
# Repository Builder (Steps 4-5)
# ============================================================================

def build_misconception_repository(
    kb_id: str, max_concepts: int = 6, per_concept: int = 2
) -> List[dict]:
    """
    Runs Stage 3 for a built knowledge base: extracts key OOP concepts from
    retrieved chunks, generates per-concept misconceptions with the LLM,
    verifies each source quote against its cited chunks, assigns ids
    "m1", "m2", ..., and saves everything to
    backend/knowledge/{kb_id}/misconceptions.json.

    Returns:
        list[dict]: misconception records with id, source_pages, and grounded
        fields added. Failed grounding checks are kept with grounded=False.
    """
    kb = KnowledgeBase.load(kb_id)
    chunk_lookup = {c["chunk_id"]: c for c in kb.chunks}

    concepts = _extract_concepts(kb, max_concepts)
    logger.info(f"Extracted {len(concepts)} concepts for knowledge base '{kb_id}': {concepts}")

    items: List[GroundedMisconception] = []
    for concept in concepts:
        try:
            batch = _generate_for_concept(kb, concept, per_concept)
        except Exception as e:
            logger.warning(
                f"Skipping concept '{concept}' due to LLM failure: {e}"
            )
            continue
        items.extend(batch)

    output: List[dict] = []
    for index, item in enumerate(items, start=1):
        cited_texts = [
            chunk_lookup[cid]["text"]
            for cid in item.source_chunk_ids
            if cid in chunk_lookup
        ]
        record = {"id": f"m{index}"}
        record.update(item.model_dump())
        record["source_pages"] = _source_pages(item.source_chunk_ids, chunk_lookup)
        record["grounded"] = _is_grounded(item.source_quote, cited_texts)
        output.append(record)

    kb_dir = os.path.join(KNOWLEDGE_DIR, kb_id)
    os.makedirs(kb_dir, exist_ok=True)
    output_path = os.path.join(kb_dir, "misconceptions.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    logger.info(f"Saved {len(output)} misconceptions to {output_path}")

    return output


# ============================================================================
# CLI (Step 6)
# ============================================================================

def main() -> None:
    """CLI entry point: python -m app.grounded_misconceptions <kb_id> """
    if len(sys.argv) != 2:
        print("Usage: python -m app.grounded_misconceptions <kb_id>")
        sys.exit(1)

    kb_id = sys.argv[1]
    started = time.time()
    items = build_misconception_repository(kb_id)
    elapsed = time.time() - started

    for item in items:
        print(f"[{item['id']}] concept: {item['concept']}")
        print(f"  wrong_belief: {item['wrong_belief']}")
        print(f"  correct_concept: {item['correct_concept']}")
        print(f"  source_pages: {item['source_pages']}")
        print(f"  source_quote: {item['source_quote']}")
        print(f"  grounded: {item['grounded']}")
        print("-" * 60)

    grounded = sum(1 for item in items if item["grounded"])
    total = len(items)
    percentage = (grounded / total * 100.0) if total else 0.0
    print(f"Grounded: {grounded}/{total} ({percentage:.1f}%)")
    print(f"Total time: {elapsed:.1f}s")


if __name__ == "__main__":
    main()
