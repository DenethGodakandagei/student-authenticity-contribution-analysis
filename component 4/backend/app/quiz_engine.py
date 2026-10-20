"""
Stage 8 quiz engine: grounded multiple-choice question generation.

The LLM writes a question and four options from retrieved source chunks only.
Python then validates the structure and grounding, shuffles the options, remaps
the correct answer and option notes, and locates the source line window.
Answer checking is a plain integer comparison and never calls the LLM.
"""
import difflib
import json
import logging
import os
import random
import re
import time
from typing import Any, Dict, List, Optional

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

from app.demo_log import step
from app.grounded_misconceptions import _is_grounded, _normalise, _window_similarity
from app.ingest import KNOWLEDGE_DIR
from app.llm import generate_json, get_llm_provider

logger = logging.getLogger(__name__)

ANGLES = ["definition", "application", "code_trace", "spot_the_error", "compare_why"]
MAX_LLM_ATTEMPTS = 2
MAX_SOURCE_WINDOW_LINES = 20
_LINE_PREFIX_RE = re.compile(r"^\s*(\d+):\s?(.*)$")


class OptionNote(BaseModel):
    """Feedback tied to one option: what a wrong choice reveals and why it is wrong."""
    misconception: str = ""
    why_wrong: str = ""


class GeneratedQuestion(BaseModel):
    """LLM output schema for one grounded MCQ (validated by generate_json)."""
    angle: str
    question: str
    options: List[str] = Field(min_length=4, max_length=4)
    correct_index: int = Field(ge=0, le=3)
    option_notes: List[OptionNote] = Field(min_length=4, max_length=4)
    explanation: str
    example: str = ""
    source_chunk_id: str
    source_quote: str


class QuizGenerationError(RuntimeError):
    """Raised when two attempts fail to produce a valid grounded question."""


class _AttemptLoggingProvider:
    """Wraps a provider so every actual LLM call is visible in the demo log."""

    def __init__(self, provider: Any, concept: str, angle: str, target: Optional[str]):
        self.provider = provider
        self.concept = concept
        self.angle = angle
        self.target = target
        self.calls = 0

    def generate(self, prompt: str, json_mode: bool = False) -> str:
        self.calls += 1
        started = time.perf_counter()
        try:
            response = self.provider.generate(prompt, json_mode=json_mode)
        except Exception as exc:
            step(
                "LLM",
                "quiz llm attempt",
                concept=self.concept,
                angle=self.angle,
                target=self.target,
                attempt=self.calls,
                json_mode=json_mode,
                prompt_len=len(prompt),
                seconds=round(time.perf_counter() - started, 3),
                error=str(exc),
            )
            raise
        step(
            "LLM",
            "quiz llm attempt",
            concept=self.concept,
            angle=self.angle,
            target=self.target,
            attempt=self.calls,
            json_mode=json_mode,
            prompt_len=len(prompt),
            seconds=round(time.perf_counter() - started, 3),
            response_len=len(response),
            response=" ".join(response.split())[:180],
        )
        return response


def _format_chunks(chunks: List[Dict[str, Any]]) -> str:
    """Formats retrieved chunks as labelled source blocks for the prompt."""
    return "\n\n".join(
        f"[source_chunk_id: {chunk['chunk_id']}, page {chunk['page']}]\n{chunk['text']}"
        for chunk in chunks
    )


def _build_prompt(
    concept: str,
    angle: str,
    chunks: List[Dict[str, Any]],
    avoid_questions: List[str],
    target_misconception: Optional[str],
    attempt: int,
) -> str:
    """Builds the grounded MCQ prompt for one angle."""
    difficulty = ANGLES.index(angle) + 1
    avoid_block = (
        "\n".join(f"- {question}" for question in avoid_questions[:20])
        if avoid_questions
        else "None."
    )
    target_block = (
        f'One wrong option MUST embody this target misconception: "{target_misconception}".'
        if target_misconception
        else "No target misconception was supplied."
    )
    retry_note = (
        "\nThe previous answer was rejected. Follow every rule exactly this time."
        if attempt > 1
        else ""
    )
    return f"""
You are an expert object-oriented programming quiz writer.
Write ONE multiple-choice question for the concept: "{concept}".
Angle: "{angle}" (difficulty {difficulty} of {len(ANGLES)}).
{target_block}

SOURCE KNOWLEDGE (use ONLY these chunks; do not use outside knowledge):
{_format_chunks(chunks)}

RULES:
- Cite exactly one source_chunk_id from the provided chunks.
- source_quote must be copied VERBATIM from that cited chunk. Do not paraphrase it.
- The question must be answerable from the cited source quote.
- options must contain EXACTLY 4 distinct choices, with exactly one correct answer.
- correct_index must be the zero-based index of the correct option (0-3).
- option_notes must contain EXACTLY 4 entries aligned with options.
- For each WRONG option:
  - misconception: the specific realistic wrong belief that choosing it reveals;
  - why_wrong: 1-2 sentences explaining why that belief is wrong.
- For the CORRECT option, both misconception and why_wrong must be empty strings.
- Each wrong option must embody a DIFFERENT misconception.
- explanation: how it really works, simple words, at most 4 sentences.
- example: optional short code snippet or analogy (may be an empty string).
- Do not repeat or paraphrase any avoided question:
{avoid_block}
{retry_note}

Return only JSON with exactly these keys:
{{"angle": "{angle}", "question": "...", "options": ["...", "...", "...", "..."],
"correct_index": 0, "option_notes": [{{"misconception": "...", "why_wrong": "..."}},
{{"misconception": "...", "why_wrong": "..."}}, {{"misconception": "...", "why_wrong": "..."}},
{{"misconception": "", "why_wrong": ""}}], "explanation": "...", "example": "...",
"source_chunk_id": "...", "source_quote": "..."}}
"""


def _quote_match_score(quote: str, chunk_text: str) -> float:
    """Returns 1.0 for a verbatim substring, otherwise the best difflib ratio."""
    quote_norm = _normalise(quote)
    text_norm = _normalise(chunk_text)
    if not quote_norm or not text_norm:
        return 0.0
    if quote_norm in text_norm:
        return 1.0
    return _window_similarity(quote_norm, text_norm)


def _target_is_covered(target: str, notes: List[OptionNote], wrong_indices: List[int]) -> bool:
    """True when at least one wrong option embodies the target misconception."""
    target_norm = _normalise(target)
    if not target_norm:
        return True
    for index in wrong_indices:
        note_norm = _normalise(notes[index].misconception)
        if not note_norm:
            continue
        if target_norm in note_norm or note_norm in target_norm:
            return True
        if difflib.SequenceMatcher(None, target_norm, note_norm, autojunk=False).ratio() >= 0.6:
            return True
    return False


def _validation_reasons(
    question: GeneratedQuestion,
    chunks_by_id: Dict[str, Dict[str, Any]],
    target_misconception: Optional[str],
) -> tuple[List[str], float]:
    """Returns semantic validation failures and the cited-quote match score."""
    reasons: List[str] = []
    notes = question.option_notes
    correct = question.correct_index
    wrong_indices = [index for index in range(4) if index != correct]

    if any(not option.strip() for option in question.options):
        reasons.append("an option is empty")
    if len({_normalise(option) for option in question.options}) != 4:
        reasons.append("options are not distinct")

    empty_note_indices = [
        index
        for index, note in enumerate(notes)
        if not note.misconception.strip() and not note.why_wrong.strip()
    ]
    non_empty_wrong = [
        index
        for index in wrong_indices
        if notes[index].misconception.strip() and notes[index].why_wrong.strip()
    ]
    if empty_note_indices != [correct]:
        reasons.append("only the correct option must have an empty option note")
    if len(non_empty_wrong) != 3:
        reasons.append("all three wrong options need a misconception and why_wrong")
    misconceptions = [
        _normalise(notes[index].misconception)
        for index in wrong_indices
        if notes[index].misconception.strip()
    ]
    if len(set(misconceptions)) != len(misconceptions):
        reasons.append("distractors repeat the same misconception")
    if target_misconception and not _target_is_covered(
        target_misconception, notes, wrong_indices
    ):
        reasons.append("no distractor embodies the target misconception")

    chunk = chunks_by_id.get(question.source_chunk_id)
    if chunk is None:
        step(
            "QUIZ",
            "grounding check",
            chunk=question.source_chunk_id,
            passed=False,
            match=0.0,
            quote=question.source_quote,
        )
        reasons.append("source_chunk_id is not one of the retrieved chunks")
        return reasons, 0.0

    score = _quote_match_score(question.source_quote, chunk["text"])
    grounded = _is_grounded(question.source_quote, [chunk["text"]])
    step(
        "QUIZ",
        "grounding check",
        chunk=question.source_chunk_id,
        page=chunk["page"],
        passed=grounded,
        match=round(score, 3),
        quote=question.source_quote,
    )
    if not grounded:
        reasons.append("source_quote is not grounded in the cited chunk")
    return reasons, score


def _shuffle_question(question: GeneratedQuestion) -> tuple[GeneratedQuestion, Dict[int, int]]:
    """Shuffles options in Python and remaps correct_index and option_notes."""
    order = list(range(4))
    random.shuffle(order)
    old_to_new = {old: new for new, old in enumerate(order)}

    shuffled = question.model_copy(
        update={
            "options": [question.options[old] for old in order],
            "correct_index": old_to_new[question.correct_index],
            "option_notes": [question.option_notes[old] for old in order],
        }
    )
    step(
        "QUIZ",
        "options shuffled",
        mapping=", ".join(f"{old}->{new}" for old, new in old_to_new.items()),
        old_correct=question.correct_index,
        new_correct=shuffled.correct_index,
    )
    return shuffled, old_to_new


def _line_parts(line: str, fallback_number: int) -> tuple[int, str]:
    """Splits a numbered pages.json line into (line number, raw text)."""
    match = _LINE_PREFIX_RE.match(line)
    if match:
        return int(match.group(1)), match.group(2)
    return fallback_number, line


def _best_line_window(lines: List[str], quote: str) -> tuple[float, int, int, str]:
    """Finds the best matching contiguous line window using difflib."""
    quote_norm = _normalise(quote)
    if not quote_norm:
        raise ValueError("Cannot locate an empty source quote.")

    parts = [_line_parts(line, index + 1) for index, line in enumerate(lines)]
    best_score = -1.0
    best_start = 0
    best_end = 0
    best_text = ""
    for start in range(len(parts)):
        for end in range(start, min(len(parts), start + MAX_SOURCE_WINDOW_LINES)):
            window_text = "\n".join(text for _, text in parts[start:end + 1])
            window_norm = _normalise(window_text)
            score = difflib.SequenceMatcher(
                None, quote_norm, window_norm, autojunk=False
            ).ratio()
            if (
                score > best_score
                or (
                    score == best_score
                    and len(window_text) < len(best_text)
                )
            ):
                best_score = score
                best_start = parts[start][0]
                best_end = parts[end][0]
                best_text = window_text
    return best_score, best_start, best_end, best_text


def locate_source(kb_id: str, page: int, quote: str) -> Dict[str, Any]:
    """
    Locates the best matching line window for a quote on one PDF page.

    Reads knowledge/{kb_id}/pages.json (lines are stored as "N: text") and uses
    difflib.SequenceMatcher to choose the most similar contiguous window.

    Returns:
        {"page": page, "line_start": int, "line_end": int, "quote": quote}
    """
    pages_path = os.path.join(KNOWLEDGE_DIR, kb_id, "pages.json")
    if not os.path.exists(pages_path):
        raise FileNotFoundError(f"pages.json not found for knowledge base '{kb_id}'")
    with open(pages_path, "r", encoding="utf-8") as handle:
        pages = json.load(handle)

    page_entry = next(
        (entry for entry in pages if int(entry.get("page", -1)) == int(page)),
        None,
    )
    if page_entry is None:
        raise ValueError(f"Page {page} not found in knowledge base '{kb_id}'")
    lines = page_entry.get("lines") or []
    if not lines:
        raise ValueError(f"Page {page} has no text lines in knowledge base '{kb_id}'")

    score, line_start, line_end, matched_text = _best_line_window(lines, quote)
    result = {
        "page": int(page),
        "line_start": line_start,
        "line_end": line_end,
        "quote": quote,
    }
    step(
        "QUIZ",
        "source located",
        kb_id=kb_id,
        page=page,
        lines=f"{line_start}-{line_end}",
        similarity=round(score, 3),
        quote=" ".join(matched_text.split())[:160],
    )
    return result


def check_answer(question: Any, selected_index: int) -> bool:
    """Grades an MCQ in plain Python: selected_index == correct_index."""
    correct_index = (
        question.correct_index
        if isinstance(question, GeneratedQuestion)
        else question["correct_index"]
    )
    return int(selected_index) == int(correct_index)


def generate_question(
    kb: Any,
    concept: str,
    angle: str,
    avoid_questions: List[str],
    target_misconception: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generates, validates, shuffles, and locates one grounded MCQ.

    The LLM output is parsed through generate_json (one schema retry). Semantic
    validation (four options, one correct, three distinct misconception notes,
    cited chunk grounding, target misconception) is retried once, then
    QuizGenerationError is raised.
    """
    if angle not in ANGLES:
        raise ValueError(f"Unknown angle '{angle}'. Expected one of: {ANGLES}")
    step(
        "QUIZ",
        "generate question",
        concept=concept,
        angle=angle,
        target_misconception=target_misconception or "-",
        avoid=len(avoid_questions),
    )

    hits = kb.retrieve(concept, k=4)
    if not hits:
        raise QuizGenerationError(
            f"No source chunks retrieved for concept '{concept}' in knowledge base '{kb.kb_id}'."
        )
    chunks = [
        {
            "chunk_id": hit["chunk_id"],
            "page": hit["page"],
            "text": hit["text"],
        }
        for hit in hits
    ]
    step(
        "RAG",
        "quiz chunks retrieved",
        kb_id=kb.kb_id,
        concept=concept,
        angle=angle,
        chunks=", ".join(
            f"{hit['chunk_id']}@page{hit['page']}(score={round(float(hit.get('score', 0.0)), 3)})"
            for hit in hits
        ),
    )
    chunks_by_id = {chunk["chunk_id"]: chunk for chunk in chunks}
    provider = _AttemptLoggingProvider(get_llm_provider(), concept, angle, target_misconception)
    failures: List[str] = []

    for attempt in range(1, MAX_LLM_ATTEMPTS + 1):
        prompt = _build_prompt(
            concept, angle, chunks, avoid_questions, target_misconception, attempt
        )
        try:
            question = generate_json(
                prompt,
                GeneratedQuestion,
                provider=provider,
                retries=1,
            )
        except Exception as exc:
            reason = f"LLM/schema validation failed: {exc}"
            failures.append(reason)
            step(
                "QUIZ",
                "question rejected",
                concept=concept,
                angle=angle,
                attempt=attempt,
                reason=reason,
            )
            if attempt == MAX_LLM_ATTEMPTS:
                break
            continue

        reasons, _ = _validation_reasons(
            question, chunks_by_id, target_misconception
        )
        if reasons:
            reason = "; ".join(reasons)
            failures.append(reason)
            step(
                "QUIZ",
                "question rejected",
                concept=concept,
                angle=angle,
                attempt=attempt,
                question=" ".join(question.question.split())[:120],
                reason=reason,
            )
            if attempt == MAX_LLM_ATTEMPTS:
                break
            continue

        shuffled, _ = _shuffle_question(question)
        cited = chunks_by_id[shuffled.source_chunk_id]
        source = locate_source(kb.kb_id, cited["page"], shuffled.source_quote)
        result = shuffled.model_dump()
        result["angle"] = angle
        result["source"] = source
        step(
            "QUIZ",
            "question ready",
            concept=concept,
            angle=angle,
            question=" ".join(shuffled.question.split())[:120],
            options=4,
            correct_index=shuffled.correct_index,
            source_page=source["page"],
            source_lines=f"{source['line_start']}-{source['line_end']}",
            target_misconception=target_misconception or "-",
        )
        return result

    message = (
        f"Could not generate a valid quiz question for concept '{concept}' "
        f"and angle '{angle}' after {MAX_LLM_ATTEMPTS} attempts: "
        + " | ".join(failures)
    )
    step(
        "ERROR",
        "quiz generation failed",
        concept=concept,
        angle=angle,
        attempts=MAX_LLM_ATTEMPTS,
        reason=" | ".join(failures),
    )
    raise QuizGenerationError(message)
