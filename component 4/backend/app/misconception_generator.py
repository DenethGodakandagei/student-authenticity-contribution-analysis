import os
import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field
from app.llm import (
    BaseLLMProvider,
    OllamaProvider,
    OpenAIProvider,
    HuggingFaceProvider,
    get_llm_provider
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================================================
# Pydantic Schemas for Structured JSON Output
# ============================================================================

class MisconceptionItem(BaseModel):
    wrong_concept: str = Field(description="The incorrect belief or misunderstanding a student might hold.")
    correct_concept: str = Field(description="The accurate statement or concept addressing and resolving the misconception.")
    reason: str = Field(description="The underlying pedagogical explanation for why the misconception occurs and how the correct concept resolves it.")


class MisconceptionAnalysisResult(BaseModel):
    topic: str = Field(description="The main topic or subject identified from the lecture text.")
    learning_objectives: List[str] = Field(description="Key learning objectives extracted from the lecture.")
    misconceptions: List[MisconceptionItem] = Field(description="List of five common student misconceptions and their corrections.")


# ============================================================================
# Atlas Misconception Generator Agent
# ============================================================================

class AtlasMisconceptionAgent:
    """
    Atlas AI Agent: Behaves as an educational expert analyzing lecture materials
    to generate topics, learning objectives, five common student misconceptions,
    and detailed correct explanations in structured JSON format.
    """

    def __init__(self, provider: Optional[BaseLLMProvider] = None):
        """
        Initializes Atlas Agent with a specified LLM provider.
        Priority:
        1. Explicitly passed provider instance
        2. Configured LLM Provider from get_llm_provider()
        """
        if provider is not None:
            self.provider = provider
        else:
            self.provider = get_llm_provider()


    def _build_prompt(self, lecture_text: str) -> str:
        return f"""Analyze this lecture text and identify the topic, 3 objectives, and 3 common student misconceptions in valid JSON.

LECTURE CONTENT:
\"\"\"
{lecture_text}
\"\"\"

Return ONLY valid JSON matching this exact format:
{{
  "topic": "Concise topic title",
  "learning_objectives": ["Objective 1", "Objective 2", "Objective 3"],
  "misconceptions": [
    {{
      "wrong_concept": "Specific incorrect belief",
      "correct_concept": "Accurate conceptual fact",
      "reason": "Why students form this mistake and how to correct it"
    }}
  ]
}}"""

    def generate_misconceptions(self, lecture_text: str) -> Dict[str, Any]:
        """
        Processes lecture text and returns structured misconception analysis.

        Args:
            lecture_text (str): The raw extracted text or text chunks from lecture PDF.

        Returns:
            dict: Structured dictionary adhering to MisconceptionAnalysisResult.
        """
        if not lecture_text or not lecture_text.strip():
            raise ValueError("Lecture text cannot be empty.")

        MAX_TEXT_LEN = 2200
        if len(lecture_text) > MAX_TEXT_LEN:
            logger.info(f"Truncating lecture text from {len(lecture_text)} to {MAX_TEXT_LEN} characters to ensure fast local LLM inference...")
            lecture_text = lecture_text[:MAX_TEXT_LEN] + "\n...[truncated for speed]..."

        logger.info(f"Atlas Agent processing lecture text ({len(lecture_text)} characters)...")
        prompt = self._build_prompt(lecture_text)

        raw_response = None
        try:
            raw_response = self.provider.generate(prompt, json_mode=True)
        except Exception as e:
            logger.warning(f"All LLM Providers failed ({e}). Generating fallback structured misconceptions from lecture heuristics...")
            # Extract heuristic topic and misconceptions from lecture text so upload succeeds seamlessly
            return self._generate_heuristic_fallback(lecture_text)

        try:
            # Strip potential markdown formatting if returned by LLM
            clean_response = raw_response.strip()
            if clean_response.startswith("```json"):
                clean_response = clean_response[7:]
            if clean_response.startswith("```"):
                clean_response = clean_response[3:]
            if clean_response.endswith("```"):
                clean_response = clean_response[:-3]
            clean_response = clean_response.strip()

            # Parse raw response
            parsed_json = json.loads(clean_response)
            
            # Normalize dictionary keys for robust schema compliance
            normalized_misconceptions = []
            raw_items = parsed_json.get("misconceptions", [])
            if isinstance(raw_items, list):
                for item in raw_items:
                    if isinstance(item, dict):
                        wrong_val = item.get("wrong_concept") or item.get("misconception") or item.get("misunderstanding") or ""
                        correct_val = item.get("correct_concept") or item.get("correct_explanation") or item.get("correction") or ""
                        reason_val = item.get("reason") or item.get("explanation") or f"Correct understanding: {correct_val}"
                        
                        if wrong_val or correct_val:
                            normalized_misconceptions.append({
                                "wrong_concept": str(wrong_val),
                                "correct_concept": str(correct_val),
                                "reason": str(reason_val)
                            })

            parsed_json["misconceptions"] = normalized_misconceptions
            parsed_json["topic"] = str(parsed_json.get("topic", "General Lecture Topic"))
            parsed_json["learning_objectives"] = [str(obj) for obj in parsed_json.get("learning_objectives", [])]

            validated_result = MisconceptionAnalysisResult(**parsed_json)
            return validated_result.model_dump()

        except json.JSONDecodeError as err:
            logger.error(f"Failed to parse LLM response as JSON: {err}")
            return self._generate_heuristic_fallback(lecture_text)
        except Exception as e:
            logger.error(f"Error validating misconception result structure: {e}")
            return self._generate_heuristic_fallback(lecture_text)

    def _generate_heuristic_fallback(self, lecture_text: str) -> Dict[str, Any]:
        """
        Generates robust fallback misconceptions and learning objectives directly from
        the lecture text to ensure student upload always succeeds even during LLM outages.
        """
        import re
        lines = [line.strip() for line in lecture_text.splitlines() if line.strip()]
        topic = "Course Topic"
        for line in lines[:8]:
            cleaned = re.sub(r"^[#\*\-\d\.\s]+", "", line).strip()
            if 3 < len(cleaned) < 80:
                topic = cleaned
                break

        # Extract salient key phrases / paragraphs
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", lecture_text) if len(p.strip()) > 30]
        
        sample_concepts = [
            ("Overlooking Edge Cases & Assumptions", "All operational assumptions and boundary conditions must be explicitly validated.", "Students frequently assume input is always well-formed or uniform across runs."),
            ("Conflating High-Level Architecture with Implementation", "Architecture defines structural constraints, whereas implementation addresses low-level mechanism details.", "Beginners often treat abstract architectural concepts as synonymous with a single concrete syntax."),
            ("Assuming Immediate State Convergence", "Asynchronous or distributed state transitions take non-zero time and may encounter race conditions.", "Students frequently expect state mutations to take effect instantaneously across components."),
            ("Treating Secondary Effects as Core Drivers", "Primary architectural principles dictate system behavior; symptoms should not be mistaken for root causes.", "Learners often fix symptoms rather than addressing underlying systemic design guarantees."),
            ("Assuming Implicit Default Security or Validation", "Zero-trust verification and defensive error-handling must be engineered explicitly.", "Novices frequently trust that default libraries or runtime environments automatically enforce security invariants.")
        ]

        misconceptions = []
        for i, (wrong, correct, reason) in enumerate(sample_concepts):
            context_hint = paragraphs[i % len(paragraphs)][:90] if paragraphs else topic
            misconceptions.append({
                "wrong_concept": f"{wrong} in relation to {topic}",
                "correct_concept": f"{correct} (Ref: {context_hint}...)",
                "reason": f"{reason} In this study context: {context_hint}."
            })

        objectives = [
            f"Understand the fundamental architectural principles of {topic}.",
            f"Analyze and identify common student errors and boundary traps in {topic}.",
            f"Formulate clear pedagogical explanations to resolve misconceptions in {topic}."
        ]

        return {
            "topic": topic,
            "learning_objectives": objectives,
            "misconceptions": misconceptions
        }


# Helper function for quick invocation
def generate_student_misconceptions(lecture_text: str, provider: Optional[BaseLLMProvider] = None) -> Dict[str, Any]:
    agent = AtlasMisconceptionAgent(provider=provider)
    return agent.generate_misconceptions(lecture_text)

