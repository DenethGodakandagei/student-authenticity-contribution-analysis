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
    "class and object",
    "constructor",
    "inheritance",
    "polymorphism",
    "encapsulation",
    "abstraction",
    "interface",
    "method overriding and overloading",
]

CONCEPT_CHUNK_LIMIT = 500  # chars per seed chunk sent to the LLM
MISCONCEPTION_CHUNK_LIMIT = 700  # chars per source chunk sent to the LLM
MIN_QUOTE_WORDS = 8  # prompt rule: quotes must be 8-30 words
MAX_QUOTE_WORDS = 30
DISCARD_MIN_QUOTE_WORDS = 6  # discard rule: quotes under 6 words are dropped
GROUNDING_SIMILARITY_THRESHOLD = 0.8

# Stats from the most recent build_misconception_repository run.
LAST_RUN_STATS: Dict[str, int] = {"kept": 0, "discarded": 0}


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
    """Builds the concept list: core concepts supported by the seed text first,
    then whatever else the LLM finds, capped at max_concepts."""
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
    try:
        discovered = generate_json(prompt, ConceptList).concepts
    except Exception as e:
        logger.warning(f"Concept extraction failed, using core concepts only: {e}")
        discovered = []

    seed_text = _normalise(" ".join(s["text"] for s in seeds))
    core = [
        "class and object", "constructor", "encapsulation",
        "inheritance", "polymorphism", "abstraction",
    ]
    final: List[str] = []
    for concept in core:
        if not _concept_supported(concept, seed_text):
            continue
        if concept not in final:
            final.append(concept)
    for concept in discovered:
        if concept not in final:
            final.append(concept)
        if len(final) >= max_concepts:
            break
    return final[:max_concepts]


def _concept_supported(concept: str, seed_text: str) -> bool:
    """True when every content word of the concept appears in the seed text."""
    stop = {"and", "or", "the", "of", "a", "an", "in", "for"}
    words = [w for w in concept.lower().split() if w not in stop]
    return all(w in seed_text for w in words)


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
- wrong_belief: must be clearly WRONG (not partly correct), something a
  beginner could really believe, written in the form "I think that ...".
- correct_concept: a short plain sentence (max 25 words) written in simple
  words, supported by the chunks and supported by the source quote.
- reason: a short pedagogical explanation of why the misconception arises.
- source_quote: copied EXACTLY from one of the provided chunks, between
  {MIN_QUOTE_WORDS} and {MAX_QUOTE_WORDS} words long, and it must be a
  definition or explanation. Never use exercise instructions such as "Write
  the java code...". Never return "..." as a quote.
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

def _filter_batch(
    batch: List[GroundedMisconception], chunk_lookup: Dict[str, dict]
) -> tuple[List[GroundedMisconception], int]:
    """Applies the discard rules to one generated batch: drops items whose
    quote is under DISCARD_MIN_QUOTE_WORDS words or is not grounded in a
    cited chunk.

    Returns:
        (kept_items, discarded_count)
    """
    kept: List[GroundedMisconception] = []
    discarded = 0
    for item in batch:
        if (
            len(item.source_quote.split()) < DISCARD_MIN_QUOTE_WORDS
            or item.source_quote.strip() == "..."
        ):
            discarded += 1
            continue
        cited_texts = [
            chunk_lookup[cid]["text"]
            for cid in item.source_chunk_ids
            if cid in chunk_lookup
        ]
        if not _is_grounded(item.source_quote, cited_texts):
            discarded += 1
            continue
        kept.append(item)
    return kept, discarded


def _generate_grounded_for_concept(
    kb: KnowledgeBase,
    concept: str,
    per_concept: int,
    chunk_lookup: Dict[str, dict],
) -> tuple[List[GroundedMisconception], int]:
    """Generates batches for a concept and filters each one. If zero grounded
    items remain after the first attempt, retries the concept exactly once.

    Returns:
        (kept_items, discarded_count)
    """
    discarded = 0
    for attempt in range(2):
        try:
            batch = _generate_for_concept(kb, concept, per_concept)
        except Exception as e:
            logger.warning(f"LLM failure for concept '{concept}' (attempt {attempt + 1}): {e}")
            batch = []

        kept, attempt_discarded = _filter_batch(batch, chunk_lookup)
        discarded += attempt_discarded
        if kept:
            return kept, discarded
        if attempt == 0:
            logger.info(f"Zero grounded items for concept '{concept}', retrying once...")

    return [], discarded


def build_misconception_repository(
    kb_id: str, max_concepts: int = 6, per_concept: int = 2
) -> List[dict]:
    """
    Runs Stage 3 for a built knowledge base: extracts key OOP concepts from
    retrieved chunks, generates per-concept misconceptions with the LLM,
    discards items with short/ungrounded quotes (retrying a concept once if
    nothing survives) and duplicate correct_concept values, assigns ids
    "m1", "m2", ..., and saves only the kept items to
    backend/knowledge/{kb_id}/misconceptions.json.

    The number of discarded items from the last run is recorded in
    LAST_RUN_STATS["discarded"].

    Returns:
        list[dict]: kept misconception records with id, source_pages, and
        grounded fields added.
    """
    kb = KnowledgeBase.load(kb_id)
    chunk_lookup = {c["chunk_id"]: c for c in kb.chunks}

    concepts = _extract_concepts(kb, max_concepts)
    logger.info(f"Extracted {len(concepts)} concepts for knowledge base '{kb_id}': {concepts}")

    items: List[GroundedMisconception] = []
    discarded = 0
    for concept in concepts:
        kept, concept_discarded = _generate_grounded_for_concept(
            kb, concept, per_concept, chunk_lookup
        )
        items.extend(kept)
        discarded += concept_discarded

    output: List[dict] = []
    seen_correct: set = set()
    for item in items:
        # Duplicate correct_concept: keep the first occurrence only.
        ckey = _normalise(item.correct_concept)
        if ckey in seen_correct:
            discarded += 1
            continue
        seen_correct.add(ckey)

        record = {"id": f"m{len(output) + 1}"}
        record.update(item.model_dump())
        record["source_pages"] = _source_pages(item.source_chunk_ids, chunk_lookup)
        record["grounded"] = True
        output.append(record)

    LAST_RUN_STATS["discarded"] = discarded
    LAST_RUN_STATS["kept"] = len(output)

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
    kept = build_misconception_repository(kb_id)
    elapsed = time.time() - started

    for item in kept:
        print(f"[{item['id']}] concept: {item['concept']}")
        print(f"  wrong_belief: {item['wrong_belief']}")
        print(f"  correct_concept: {item['correct_concept']}")
        print(f"  source_pages: {item['source_pages']}")
        print(f"  source_quote: {item['source_quote']}")
        print(f"  grounded: {item['grounded']}")
        print("-" * 60)

    print(
        f"Kept: {LAST_RUN_STATS['kept']}, "
        f"Discarded: {LAST_RUN_STATS['discarded']}, "
        f"Time: {elapsed:.1f}s"
    )


if __name__ == "__main__":
    main()
