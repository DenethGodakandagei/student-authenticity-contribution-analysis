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
        return f"""
You are Atlas, a world-class educational expert, master tutor, and pedagogical analyst.
Your task is to analyze the provided lecture material deeply and identify key concepts, core learning objectives, and exactly FIVE (5) common student misconceptions.

LECTURE CONTENT:
\"\"\"
{lecture_text}
\"\"\"

INSTRUCTIONS:
Behave as an expert educator. Extract and format your analysis into ONLY a valid JSON object.
Generate:
1. "topic": A clear, concise title summarizing the overarching subject of the lecture.
2. "learning_objectives": A list of key learning objectives that a student should master from this content.
3. "misconceptions": A list of exactly 5 common student misconceptions. Each item MUST be an object with the following exact keys:
   - "wrong_concept": The specific flawed belief, incorrect assumption, or misconception a student may hold.
   - "correct_concept": The accurate fact, rule, or correct conceptual understanding.
   - "reason": Clear pedagogical reasoning explaining why students form this misconception and why the correct concept is true.

OUTPUT FORMAT REQUIREMENTS:
Return ONLY raw valid JSON matching this exact structure with no extra text, explanations, or markdown fences outside JSON:

{{
  "topic": "Main topic title",
  "learning_objectives": [
    "Learning objective 1",
    "Learning objective 2"
  ],
  "misconceptions": [
    {{
      "wrong_concept": "Description of the student misconception",
      "correct_concept": "The correct conceptual understanding",
      "reason": "Pedagogical explanation for why this misconception occurs and how to rectify it"
    }}
  ]
}}
"""

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

        MAX_TEXT_LEN = 3500
        if len(lecture_text) > MAX_TEXT_LEN:
            logger.info(f"Truncating lecture text from {len(lecture_text)} to {MAX_TEXT_LEN} characters to ensure fast local LLM inference...")
            lecture_text = lecture_text[:MAX_TEXT_LEN] + "\n...[truncated for model performance]..."

        logger.info(f"Atlas Agent processing lecture text ({len(lecture_text)} characters)...")
        prompt = self._build_prompt(lecture_text)

        try:
            raw_response = self.provider.generate(prompt, json_mode=True)
        except Exception as e:
            logger.error(f"LLM Provider execution failed: {e}")
            raise RuntimeError(
                f"LLM Service Error: Unable to connect to LLM or obtain response. Details: {e}"
            ) from e

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
            raise ValueError(
                f"LLM Response Error: Model output could not be parsed as valid JSON: {err}"
            ) from err
        except Exception as e:
            logger.error(f"Error validating misconception result structure: {e}")
            raise RuntimeError(
                f"LLM Response Validation Error: {e}"
            ) from e


# Helper function for quick invocation
def generate_student_misconceptions(lecture_text: str, provider: Optional[BaseLLMProvider] = None) -> Dict[str, Any]:
    agent = AtlasMisconceptionAgent(provider=provider)
    return agent.generate_misconceptions(lecture_text)

