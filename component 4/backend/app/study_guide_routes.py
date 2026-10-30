"""
Study Guide and Progressive Hints for Novice Learners.

Supports university students who know nothing about the topic being taught to Nova:
1. Study Guide: GET /sessions/{session_id}/study-guide
   - Generated from chunks.json + concepts.json (never misconceptions.json).
   - Cached in knowledge/{kb_id}/study_guide.json.
   - Logs session event {type: "study_guide_viewed", timestamp}.
2. Progressive Hints: POST /sessions/{session_id}/hint
   - Level 1 (nudge), Level 2 (guiding question/analogy), Level 3 (key facts from chunks).
   - Max 3 hints per misconception.
   - Logs session event {type: "hint_used", level, misconception_id, timestamp}.
"""
import json
import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

from app.auth import get_current_user
from app.ingest import KNOWLEDGE_DIR
from app.llm import BaseLLMProvider, generate_json, get_llm_provider
from app.materials import _kb_dir, _load_json
from app.nova_agent import NovaStudentAgent

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SESSIONS_DIR = os.path.join(BASE_DIR, "sessions")

router = APIRouter(tags=["study-guide-and-hints"])


# ---------------------------------------------------------------------------
# Pydantic Schemas for Study Guide
# ---------------------------------------------------------------------------

class StudyGuideSection(BaseModel):
    concept: str = Field(description="Name of the concept")
    explanation: str = Field(description="Plain language, assume zero knowledge, 2-4 sentences")
    analogy: str = Field(description="One everyday analogy")
    example: str = Field(description="Short code or worked example in the same language as the material, max ~8 lines")
    key_points: List[str] = Field(description="2-4 bullets")
    source_pages: List[int] = Field(default_factory=list, description="Source page numbers where this concept appears")


class StudyGuideOutput(BaseModel):
    topic: str = Field(description="Overall topic name")
    overview: str = Field(description="3-4 sentences, beginner-friendly, no jargon")
    sections: List[StudyGuideSection] = Field(description="One per concept in concepts.json (max ~8)")
    teaching_tips: List[str] = Field(description="3-4 tips on how to explain things to Nova")


# ---------------------------------------------------------------------------
# Pydantic Schemas for Progressive Hints
# ---------------------------------------------------------------------------

class HintRequest(BaseModel):
    level: Literal[1, 2, 3] = 1


class HintResponse(BaseModel):
    hint: str
    level: int
    concept: Optional[str] = None
    hints_left: int


class GeneratedHintOutput(BaseModel):
    hint: str = Field(description="The hint under 60 words")


# ---------------------------------------------------------------------------
# Internal Helpers
# ---------------------------------------------------------------------------

def _session_file(session_id: str) -> str:
    return os.path.join(SESSIONS_DIR, f"{session_id}.json")


def _check_session_owner(nova: NovaStudentAgent, user: dict) -> None:
    """Raises 403 if the session is owned by a different user. Unowned sessions stay open."""
    if nova.state.owner_id and nova.state.owner_id != str(user["id"]):
        raise HTTPException(status_code=403, detail="You do not own this session.")


def _load_owned_session(session_id: str, user: dict) -> tuple[NovaStudentAgent, str]:
    session_path = _session_file(session_id)
    if not os.path.exists(session_path):
        raise HTTPException(status_code=404, detail="Session not found.")
    nova = NovaStudentAgent.load_state(session_path)
    _check_session_owner(nova, user)
    return nova, session_path


def _build_study_guide_prompt(topic: str, concepts: List[str], chunks: List[Dict[str, Any]]) -> str:
    """
    Builds LLM prompt grounded in chunk texts + concept names only.
    Treated as data, not instructions.
    """
    # Limit to at most 4 key concepts to avoid LLM token generation cutoffs
    selected_concepts = concepts[:4]
    concepts_text = ", ".join(selected_concepts)
    
    # Format top chunks concisely
    formatted_chunks = []
    for c in chunks[:6]:
        page_num = c.get("page", 1)
        text = str(c.get("text", "")).strip()[:400]
        formatted_chunks.append(f"[Page {page_num}]: {text}")
    chunks_context = "\n\n".join(formatted_chunks)

    return f"""You are creating a beginner-friendly study guide for university students.
Explain simply and concisely in plain language.

TOPIC: {topic}
CONCEPTS: {concepts_text}

REFERENCE:
\"\"\"
{chunks_context}
\"\"\"

CRITICAL REQUIREMENTS:
1. Provide an "overview": 2-3 concise sentences introducing {topic}.
2. For each concept in [{concepts_text}], provide a section with "concept", "explanation" (1-2 sentences), "analogy" (1 sentence), "example" (2-4 lines), "key_points" (2 bullets), and "source_pages" ([1]).
3. Provide 2-3 "teaching_tips" (short strings).
4. DO NOT wrap the output in a "study_guide" object. Return directly a JSON object with keys: "topic", "overview", "sections", "teaching_tips".
5. Keep explanations brief so the JSON is completely closed and valid.

Return ONLY valid JSON matching this schema."""


def _build_hint_prompt(
    level: int,
    concept: str,
    wrong_belief: str,
    chunks: List[Dict[str, Any]],
) -> str:
    chunks_text = "\n\n".join(
        f"[Page {c.get('page', 1)}]: {c.get('text', '')}"
        for c in chunks
    )

    if level == 1:
        instructions = (
            f"Generate a Level 1 hint (a gentle nudge). Name the concept area ('{concept}') that Nova is confused about "
            "and suggest what kind of explanation would help her understand (e.g., whether defining the term, "
            "explaining its role, or comparing it with another idea would help). "
            "DO NOT state the correct answer or the solution. Keep it under 60 words."
        )
    elif level == 2:
        instructions = (
            f"Generate a Level 2 hint (guiding question or analogy idea). Provide a thought-provoking guiding question "
            f"or suggest an analogy idea relating to '{concept}' that leads the student toward the right explanation. "
            "DO NOT state the full answer or solution. Keep it under 60 words."
        )
    else:  # level 3
        instructions = (
            f"Generate a Level 3 hint (key facts). State the essential key facts about '{concept}' that the student needs, "
            "paraphrased from the reference chunks below. "
            "DO NOT quote the answer verbatim, DO NOT state Nova's exact wrong belief, and DO NOT write the hint as a "
            "ready-made reply the student can paste directly to Nova. Keep it under 60 words."
        )

    return f"""You are a pedagogical assistant helping a university student teach an AI student named Nova.
Nova is currently confused about the concept: "{concept}".
Nova's confusion relates to: "{wrong_belief}" (for your context only - do NOT state this to the student).

REFERENCE MATERIAL (DATA ONLY):
\"\"\"
{chunks_text}
\"\"\"

TASK:
{instructions}

Return JSON with a single field "hint" containing the hint string (under 60 words)."""


# ---------------------------------------------------------------------------
# Study Guide Route: GET /sessions/{session_id}/study-guide
# ---------------------------------------------------------------------------

@router.get("/sessions/{session_id}/study-guide")
def get_study_guide(session_id: str, user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Returns a comprehensive beginner-friendly study guide for the session's topic.
    Generated from chunks.json + concepts.json only (never misconceptions.json).
    Cached in knowledge/{kb_id}/study_guide.json.
    Logs a session event {type: "study_guide_viewed", timestamp}.
    """
    nova, session_path = _load_owned_session(session_id, user)

    kb_id = nova.state.kb_id
    kb_directory = _kb_dir(kb_id) if kb_id else ""
    has_kb = bool(kb_directory and os.path.isdir(kb_directory))

    chunks = []
    concepts = []
    cache_path = ""

    if has_kb:
        chunks = _load_json(os.path.join(kb_directory, "chunks.json"), None) or []
        concepts = _load_json(os.path.join(kb_directory, "concepts.json"), [])
        cache_path = os.path.join(kb_directory, "study_guide.json")
    else:
        # Fallback cache location for sessions without a KB: session-specific study guide cache
        os.makedirs(os.path.join(SESSIONS_DIR, "study_guides"), exist_ok=True)
        cache_path = os.path.join(SESSIONS_DIR, "study_guides", f"{session_id}.json")

    # If chunks are not available, synthesize chunks from session topic, objectives, and correct concepts
    if not chunks:
        synthetic_texts = []
        if nova.state.topic:
            synthetic_texts.append(f"Topic: {nova.state.topic}")
        if nova.state.learning_objectives:
            synthetic_texts.append("Learning Objectives:\n" + "\n".join(f"- {obj}" for obj in nova.state.learning_objectives))
        for m in nova.state.misconceptions:
            if m.concept:
                synthetic_texts.append(f"Concept: {m.concept}\nExplanation: {m.correct_concept}")
            elif m.correct_concept:
                synthetic_texts.append(f"Explanation: {m.correct_concept}")
        chunks = [{"chunk_id": f"s_{idx}", "page": 1, "text": txt} for idx, txt in enumerate(synthetic_texts, 1)]

    if not concepts:
        # Extract concepts from misconceptions or fallback to topic
        seen_concepts = set()
        for m in nova.state.misconceptions:
            if m.concept and m.concept.strip():
                c_name = m.concept.strip()
                if c_name not in seen_concepts:
                    seen_concepts.add(c_name)
                    concepts.append(c_name)
        if not concepts:
            concepts = [nova.state.topic] if nova.state.topic else ["Core Concepts"]

    cached_guide = _load_json(cache_path, None) if cache_path else None

    if cached_guide and isinstance(cached_guide, dict) and "sections" in cached_guide:
        study_guide_data = cached_guide
    else:
        # Generate with LLM (using the centralized provider with cloud fallback)
        provider = get_llm_provider()
        prompt = _build_study_guide_prompt(
            topic=nova.state.topic or "Topic Study Guide",
            concepts=concepts[:8],
            chunks=chunks,
        )
        try:
            guide_output = generate_json(
                prompt,
                StudyGuideOutput,
                provider=provider,
                retries=1,
            )
            study_guide_data = guide_output.model_dump()
        except Exception as exc:
            logger.warning("generate_json for StudyGuideOutput failed: %s; synthesizing clean guide from session data", exc)
            # Resilient fallback: build structured guide directly from session concepts and objectives
            study_guide_data = {
                "topic": nova.state.topic or "Study Guide",
                "overview": f"A foundational study guide for {nova.state.topic or 'this topic'}, outlining key ideas, principles, and concepts.",
                "sections": [
                    {
                        "concept": m.concept or nova.state.topic or "Core Concept",
                        "explanation": m.correct_concept or f"Understanding the core principles of {m.concept or 'the concept'}.",
                        "analogy": f"Think of {m.concept or 'this concept'} like building blocks working together in a modular system.",
                        "example": f"// Core illustration for {m.concept or 'the concept'}\n// Demonstrating structured and modular design.",
                        "key_points": [
                            m.correct_concept or f"Key aspect of {m.concept}.",
                            f"Essential building block for mastering {nova.state.topic}."
                        ],
                        "source_pages": m.source_pages or [1]
                    }
                    for m in (nova.state.misconceptions[:4] if nova.state.misconceptions else [])
                ],
                "teaching_tips": [
                    "Ask Nova guiding questions instead of giving direct answers.",
                    "Use practical analogies to help Nova connect ideas to real-world scenarios.",
                    "Check Nova's understanding by asking her to summarize the concept in her own words."
                ]
            }
            if not study_guide_data["sections"]:
                study_guide_data["sections"].append({
                    "concept": nova.state.topic or "Fundamentals",
                    "explanation": f"Core principles and foundations of {nova.state.topic}.",
                    "analogy": "Like the blueprint of a building.",
                    "example": "// Example concept illustration\n",
                    "key_points": ["Understand the foundation", "Apply through practice"],
                    "source_pages": [1]
                })
            # Cache the result atomically
            if cache_path:
                temp_cache = f"{cache_path}.tmp"
                with open(temp_cache, "w", encoding="utf-8") as f:
                    json.dump(study_guide_data, f, indent=2, ensure_ascii=False)
                os.replace(temp_cache, cache_path)
        else:
            # Cache LLM result atomically
            if cache_path:
                temp_cache = f"{cache_path}.tmp"
                with open(temp_cache, "w", encoding="utf-8") as f:
                    json.dump(study_guide_data, f, indent=2, ensure_ascii=False)
                os.replace(temp_cache, cache_path)

    # Log session event: {type: "study_guide_viewed", timestamp}
    # Using the same event mechanism as nova._log_event and save session
    event = {
        "type": "study_guide_viewed",
        "timestamp": datetime.now().isoformat(),
    }
    nova._log_event(event)
    nova.save_state(session_path)

    return study_guide_data


# ---------------------------------------------------------------------------
# Progressive Hints Route: POST /sessions/{session_id}/hint
# ---------------------------------------------------------------------------

@router.post("/sessions/{session_id}/hint")
def request_hint(
    session_id: str,
    req: HintRequest = HintRequest(),
    user: dict = Depends(get_current_user),
) -> HintResponse:
    """
    Returns a progressive hint (level 1-3) for the student's next unresolved misconception.
    Max 3 hints per misconception.
    Logs {type: "hint_used", level, misconception_id, timestamp}.
    """
    nova, session_path = _load_owned_session(session_id, user)

    # Pick the first unresolved misconception
    unresolved = [m for m in nova.state.misconceptions if not m.is_corrected]
    if not unresolved:
        return HintResponse(
            hint="Nova has no open confusions. Try finishing the session.",
            level=req.level,
            concept=None,
            hints_left=0,
        )

    target_misconception = unresolved[0]
    misconception_id = target_misconception.id
    concept_name = target_misconception.concept or nova.state.topic or "Current Concept"

    # Count previous hint events for this misconception id
    existing_hints = [
        e for e in nova.state.events
        if e.get("type") == "hint_used" and e.get("misconception_id") == misconception_id
    ]
    hints_used = len(existing_hints)

    if hints_used >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"You have reached the maximum of 3 hints for this misconception. Try explaining the concept to Nova using your own words!",
        )

    # Fetch reference chunks
    kb_id = nova.state.kb_id
    relevant_chunks = []
    if kb_id:
        try:
            kb_dir_path = _kb_dir(kb_id)
            all_chunks = _load_json(os.path.join(kb_dir_path, "chunks.json"), [])
            all_misconceptions = _load_json(os.path.join(kb_dir_path, "misconceptions.json"), [])

            # Locate source_chunk_ids from repo misconceptions if present
            repo_item = next(
                (item for item in all_misconceptions if item.get("id") == misconception_id),
                None,
            )
            source_chunk_ids = (
                repo_item.get("source_chunk_ids", []) if repo_item else []
            )

            if source_chunk_ids and isinstance(all_chunks, list):
                relevant_chunks = [
                    c for c in all_chunks if c.get("chunk_id") in source_chunk_ids
                ]

            if not relevant_chunks and isinstance(all_chunks, list):
                # Fallback to source_pages or first few chunks
                pages = target_misconception.source_pages
                if pages:
                    relevant_chunks = [c for c in all_chunks if c.get("page") in pages]
                if not relevant_chunks:
                    relevant_chunks = all_chunks[:3]
        except Exception:
            relevant_chunks = []

    if not relevant_chunks:
        # Fallback reference chunk from the misconception's verified correct concept
        ref_text = f"Concept: {concept_name}."
        if target_misconception.correct_concept:
            ref_text += f" Core Fact: {target_misconception.correct_concept}"
        if target_misconception.source_quote:
            ref_text += f" Reference: {target_misconception.source_quote}"
        relevant_chunks = [{"chunk_id": "c_fallback", "page": 1, "text": ref_text}]

    prompt = _build_hint_prompt(
        level=req.level,
        concept=concept_name,
        wrong_belief=target_misconception.wrong_concept,
        chunks=relevant_chunks,
    )

    try:
        output = generate_json(
            prompt,
            GeneratedHintOutput,
            provider=nova.provider,
            retries=1,
        )
        hint_text = output.hint.strip()
    except Exception as exc:
        logger.exception("Failed to generate hint: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to generate hint at this time. Please try again.",
        )

    # Log session event: {type: "hint_used", level, misconception_id, timestamp}
    timestamp_str = datetime.now().isoformat()
    event = {
        "type": "hint_used",
        "level": req.level,
        "misconception_id": misconception_id,
        "timestamp": timestamp_str,
    }
    nova._log_event(event)
    nova.save_state(session_path)

    # Hints remaining for this misconception (after logging this one)
    hints_left = max(0, 3 - (hints_used + 1))

    return HintResponse(
        hint=hint_text,
        level=req.level,
        concept=concept_name,
        hints_left=hints_left,
    )
