"""
Stage 6: Misconception Detection Engine.

After Nova replies, the detector asks the LLM whether her reply still expresses
or relies on each of her current misconceptions (status "active" or "testing"),
directly or indirectly. Detection is READ-ONLY: it never changes any
misconception status - only the adaptive answer gate (Stages 7-8) can do that.
"""
import json
import logging
from typing import Any, Dict, List, Optional, Tuple

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

from app.llm import BaseLLMProvider, get_llm_provider, generate_json

logger = logging.getLogger(__name__)


# ============================================================================
# LLM Output Schemas (JSON mode, validated with Pydantic)
# ============================================================================

class DetectionItem(BaseModel):
    """Verdict for ONE misconception found in Nova's reply."""
    id: str = Field(description="Id of the misconception being checked, copied verbatim.")
    still_present: bool = Field(description="True only when Nova's reply expresses or relies on the wrong belief.")
    evidence: str = Field(description="Short exact quote from Nova's reply, or empty string if not present.")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence in this verdict, from 0 to 1.")


class DetectionOutput(BaseModel):
    """Detection result: one entry per misconception id that was checked."""
    results: List[DetectionItem]


# ============================================================================
# Prompt
# ============================================================================

def _build_detection_prompt(
    nova_reply: str, teacher_message: str, misconceptions: List[Dict[str, Any]]
) -> str:
    """Builds the detection prompt for Nova's latest reply + the misconceptions she still holds."""
    items_json = json.dumps([
        {
            "id": m.get("id", ""),
            "concept": m.get("concept", ""),
            "wrong_belief": m.get("wrong_belief", ""),
        }
        for m in misconceptions
    ], indent=2)

    return f"""
You are an expert pedagogical evaluator watching a student named Nova learn.
Nova holds the misconceptions listed below. Read her latest reply and decide, for EACH
misconception, whether she still expresses or relies on that wrong belief.

MISCONCEPTIONS TO CHECK:
{items_json}

THE TEACHER'S LATEST MESSAGE:
"{teacher_message}"

NOVA'S LATEST REPLY:
"{nova_reply}"

EVALUATION RULES:
1. still_present is true only if Nova's reply expresses or relies on the wrong belief,
   including indirectly through an example or an assumption.
2. A question asking for clarification is NOT still_present.
3. evidence must be a short exact quote from Nova's reply, or an empty string if not present.
4. Return one entry per misconception id, exactly once, and use the given ids verbatim.
5. confidence is a number from 0 to 1 for how sure you are of this verdict.
6. If Nova's reply states something that matches the correct_concept (the correct understanding),
   then still_present is false, even if the reply mentions the same words as the wrong belief.
   still_present is true only when the reply asserts the wrong_belief itself.

Return ONLY valid JSON:
{{
  "results": [
    {{"id": "id_here", "still_present": true, "evidence": "exact quote from Nova's reply", "confidence": 0.9}}
  ]
}}
"""


# ============================================================================
# Detection
# ============================================================================

def _fallback_results(misconceptions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Conservative fallback when the LLM output cannot be used."""
    return [
        {"id": m.get("id", ""), "still_present": True, "evidence": "", "confidence": 0.0}
        for m in misconceptions
    ]


def _run_detection(
    nova_reply: str,
    teacher_message: str,
    misconceptions: List[Dict[str, Any]],
    provider: Optional[BaseLLMProvider] = None,
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Runs the detection call and returns (results, error).

    `error` is None on success, otherwise a short message describing why the
    LLM output could not be used (the results are then the conservative fallback).
    """
    if not misconceptions:
        return [], None

    if provider is None:
        provider = get_llm_provider()

    try:
        output = generate_json(
            _build_detection_prompt(nova_reply, teacher_message, misconceptions),
            DetectionOutput,
            provider=provider,
            retries=1,
        )
    except Exception as e:
        return _fallback_results(misconceptions), str(e)

    results = [
        {
            "id": item.id,
            "still_present": bool(item.still_present),
            "evidence": item.evidence.strip(),
            "confidence": round(max(0.0, min(1.0, item.confidence)), 2),
        }
        for item in output.results
    ]
    return results, None


def detect_misconceptions(
    nova_reply: str,
    teacher_message: str,
    misconceptions: List[Dict[str, Any]],
    provider: Optional[BaseLLMProvider] = None,
) -> List[Dict[str, Any]]:
    """
    Detects which of the given misconceptions are still present in Nova's reply.

    `misconceptions` are the ones with status "active" or "testing"
    (dicts with id, concept, wrong_belief, correct_concept).
    Returns one dict per misconception: {id, still_present, evidence, confidence}.
    Skips the LLM call and returns [] when there are no misconceptions to check.
    On bad JSON (after one retry) returns still_present=true with empty evidence
    and logs a "detector_error".
    """
    results, error = _run_detection(nova_reply, teacher_message, misconceptions, provider=provider)
    if error:
        logger.warning(f"detector_error: {error}")
    return results


def detect_misconceptions_checked(
    nova_reply: str,
    teacher_message: str,
    misconceptions: List[Dict[str, Any]],
    provider: Optional[BaseLLMProvider] = None,
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Same as detect_misconceptions(), but also returns the error message
    (None on success) so the caller can log a detector_error event.
    """
    return _run_detection(nova_reply, teacher_message, misconceptions, provider=provider)
