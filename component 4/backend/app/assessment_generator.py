import json
import random
from typing import List, Dict, Any

# ---------------------------------------------------------------------------
# Data models (lightweight, no external dependencies)
# ---------------------------------------------------------------------------

class QuestionBase:
    def __init__(self, question: str, expected_answer: Any, question_type: str):
        self.question = question
        self.expected_answer = expected_answer
        self.question_type = question_type  # "mcq" or "short"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "question": self.question,
            "expected_answer": self.expected_answer,
            "type": self.question_type,
        }

class MCQQuestion(QuestionBase):
    def __init__(self, question: str, options: List[str], correct_option_index: int):
        super().__init__(question, correct_option_index, "mcq")
        self.options = options

    def to_dict(self) -> Dict[str, Any]:
        base = super().to_dict()
        base.update({"options": self.options})
        return base

class ShortAnswerQuestion(QuestionBase):
    def __init__(self, question: str, expected_answer: str):
        super().__init__(question, expected_answer, "short")

# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _create_mcq_options(correct: str, wrong: str) -> List[str]:
    """Create a four‑option list containing the correct concept, the original
    misconception, and two generic distractors.
    The order is shuffled so the correct answer is not always predictable.
    """
    distractors = [
        "An unrelated fact about the topic",
        "A common but irrelevant statement",
    ]
    options = [correct, wrong] + distractors
    random.shuffle(options)
    return options

def _find_correct_index(options: List[str], correct: str) -> int:
    """Return the index of the correct option after shuffling."""
    for i, opt in enumerate(options):
        if opt == correct:
            return i
    # Fallback – should never happen
    return -1

# ---------------------------------------------------------------------------
# Core generation logic
# ---------------------------------------------------------------------------

def generate_assessment(
    lecture_text: str,
    learning_objectives: List[str],
    misconceptions: List[Dict[str, str]],
) -> List[Dict[str, Any]]:
    """Generate a list of assessment items targeting the supplied misconceptions.

    Parameters
    ----------
    lecture_text:
        Full lecture material (currently unused but kept for future extensions).
    learning_objectives:
        List of objectives – currently only used for descriptive metadata.
    misconceptions:
        A list of dictionaries, each containing at least the keys:
        ``wrong_concept`` – the flawed belief Nova holds
        ``correct_concept`` – the accurate statement Nova should learn
        ``reason`` – optional pedagogical explanation (ignored here)

    Returns
    -------
    List[dict]
        Each entry is the dictionary representation of a QuestionBase subclass.
    """
    questions: List[QuestionBase] = []

    for mis in misconceptions:
        wrong = mis.get("wrong_concept", "")
        correct = mis.get("correct_concept", "")
        if not wrong or not correct:
            continue

        # ---- MCQ ----
        mcq_q = f"Which of the following statements best corrects the misconception: \"{wrong}\"?"
        mcq_options = _create_mcq_options(correct, wrong)
        correct_idx = _find_correct_index(mcq_options, correct)
        mcq = MCQQuestion(question=mcq_q, options=mcq_options, correct_option_index=correct_idx)
        questions.append(mcq)

        # ---- Short answer ----
        short_q = f"Explain why the statement '{wrong}' is inaccurate and provide the correct concept."
        short = ShortAnswerQuestion(question=short_q, expected_answer=correct)
        questions.append(short)

    # Serialize to a plain list of dicts for downstream storage or API use
    return [q.to_dict() for q in questions]

# ---------------------------------------------------------------------------
# Persistence helpers (optional – can be used by API endpoints)
# ---------------------------------------------------------------------------

def save_assessment(questions: List[Dict[str, Any]], filepath: str) -> None:
    """Write the generated assessment to a JSON file.

    The JSON structure is a list where each item contains the keys
    ``question``, ``type`` and ``expected_answer`` (plus ``options`` for MCQs).
    """
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)

def load_assessment(filepath: str) -> List[Dict[str, Any]]:
    """Load a previously saved assessment from ``filepath``.
    Returns an empty list if the file does not exist.
    """
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return []

# ---------------------------------------------------------------------------
# Example usage (for manual testing – not executed in production)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # Simple demo using a fabricated misconception list
    demo_mis = [
        {
            "wrong_concept": "Artificial Intelligence and Machine Learning are completely identical terms.",
            "correct_concept": "AI is the broad umbrella of machine intelligence, while ML is a data‑driven subset.",
            "reason": "ML is a technique within AI, not a synonym."
        }
    ]
    generated = generate_assessment("", [], demo_mis)
    print(json.dumps(generated, indent=2, ensure_ascii=False))
    # Optionally persist:
    # save_assessment(generated, "assessment.json")

