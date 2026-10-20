"""Tests for the grounded quiz engine (stubbed LLM, no Ollama call).

Covers option shuffling/remapping, rejection of an ungrounded quote, plain
Python answer checking, and pages.json source location.

Run: python test_quiz_engine.py
"""
import json
import os
import shutil
import sys
import tempfile
from typing import Any, Dict, List

os.environ["DEMO_LOG"] = "1"

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app import quiz_engine
from app.quiz_engine import QuizGenerationError, check_answer, generate_question, locate_source

KB_ID = "quizkb"


class StubKnowledgeBase:
    def __init__(self):
        self.kb_id = KB_ID
        self.calls = []
        self.chunks = {
            "p1_c0": {
                "chunk_id": "p1_c0",
                "page": 1,
                "text": (
                    "Object-Oriented Programming\n"
                    "A class is a blueprint for creating objects.\n"
                    "An object is a specific instance of a class.\n"
                    "Objects store state in fields and behaviour in methods."
                ),
            },
            "p1_c1": {
                "chunk_id": "p1_c1",
                "page": 1,
                "text": "A constructor initialises the fields of a new object.",
            },
            "p2_c0": {
                "chunk_id": "p2_c0",
                "page": 2,
                "text": "Inheritance lets one class reuse another class.",
            },
            "p2_c1": {
                "chunk_id": "p2_c1",
                "page": 2,
                "text": "Polymorphism lets one interface represent different types.",
            },
        }

    def retrieve(self, query: str, k: int = 4) -> List[Dict[str, Any]]:
        self.calls.append({"query": query, "k": k})
        scores = [0.91, 0.82, 0.75, 0.61]
        return [
            {**self.chunks[chunk_id], "score": score}
            for chunk_id, score in zip(self.chunks, scores)
        ]


class StubProvider:
    model_name = "stub-quiz-model"

    def __init__(self, responses: List[str]):
        self.responses = list(responses)
        self.calls = []

    def generate(self, prompt: str, json_mode: bool = False) -> str:
        self.calls.append({"prompt": prompt, "json_mode": json_mode})
        if not self.responses:
            raise AssertionError("StubProvider ran out of responses")
        return self.responses.pop(0)


def _question_payload(source_quote: str = "An object is a specific instance of a class.") -> str:
    target = "A class is a specific instance of an object."
    return json.dumps(
        {
            "angle": "application",
            "question": "Which statement best describes an object in object-oriented programming?",
            "options": [
                "An instance of a class",
                "A blueprint for creating objects",
                "A package that imports classes",
                target,
            ],
            "correct_index": 0,
            "option_notes": [
                {"misconception": "", "why_wrong": ""},
                {
                    "misconception": "A class is an object.",
                    "why_wrong": "A class is a blueprint; objects are created from it.",
                },
                {
                    "misconception": "Classes are imported like packages.",
                    "why_wrong": "An import makes a class available; it does not make the class an object.",
                },
                {
                    "misconception": target,
                    "why_wrong": "The relationship is reversed: an object is an instance of a class.",
                },
            ],
            "explanation": "A class defines a blueprint. An object is made from that blueprint.",
            "example": "class Dog: pass\nbuddy = Dog()",
            "source_chunk_id": "p1_c0",
            "source_quote": source_quote,
        }
    )


def _write_pages(tmpdir: str) -> None:
    os.makedirs(os.path.join(tmpdir, KB_ID), exist_ok=True)
    pages = [
        {
            "page": 1,
            "lines": [
                "1: Object-Oriented Programming",
                "2: A class is a blueprint for creating objects.",
                "3: An object is a specific instance of a class.",
                "4: Objects store state in fields and behaviour in methods.",
            ],
        },
        {
            "page": 2,
            "lines": [
                "1: Inheritance lets one class reuse another class.",
                "2: Objects store state in fields",
                "3: and behaviour in methods.",
            ],
        },
    ]
    with open(os.path.join(tmpdir, KB_ID, "pages.json"), "w", encoding="utf-8") as handle:
        json.dump(pages, handle, indent=2)


def _run_with_provider(provider: StubProvider, callback):
    old_factory = quiz_engine.get_llm_provider
    old_shuffle = quiz_engine.random.shuffle
    old_dir = quiz_engine.KNOWLEDGE_DIR
    tmpdir = tempfile.mkdtemp(prefix="nova-quiz-test-")
    _write_pages(tmpdir)
    quiz_engine.get_llm_provider = lambda: provider
    quiz_engine.random.shuffle = lambda items: items.reverse()
    quiz_engine.KNOWLEDGE_DIR = tmpdir
    try:
        return callback(StubKnowledgeBase())
    finally:
        quiz_engine.get_llm_provider = old_factory
        quiz_engine.random.shuffle = old_shuffle
        quiz_engine.KNOWLEDGE_DIR = old_dir
        shutil.rmtree(tmpdir, ignore_errors=True)


def test_generate_question_shuffle_and_remap():
    provider = StubProvider([_question_payload()])

    def run(kb):
        return generate_question(
            kb,
            concept="class and object",
            angle="application",
            avoid_questions=["What is a class?"],
            target_misconception="A class is a specific instance of an object.",
        )

    question = _run_with_provider(provider, run)

    assert len(provider.calls) == 1
    assert provider.calls[0]["json_mode"] is True
    prompt = provider.calls[0]["prompt"]
    assert "class and object" in prompt
    assert "source_chunk_id: p1_c0" in prompt
    assert "What is a class?" in prompt
    assert "A class is a specific instance of an object." in prompt

    assert question["angle"] == "application"
    assert question["options"] == [
        "A class is a specific instance of an object.",
        "A package that imports classes",
        "A blueprint for creating objects",
        "An instance of a class",
    ]
    assert question["correct_index"] == 3
    assert question["option_notes"][3] == {"misconception": "", "why_wrong": ""}
    assert all(
        note["misconception"] and note["why_wrong"]
        for index, note in enumerate(question["option_notes"])
        if index != question["correct_index"]
    )
    assert question["source"] == {
        "page": 1,
        "line_start": 3,
        "line_end": 3,
        "quote": "An object is a specific instance of a class.",
    }
    assert check_answer(question, 3) is True
    assert check_answer(question, 0) is False
    assert len(provider.calls) == 1, "answer checking must not call the LLM"
    print("  OK shuffle/remap, option notes, source, and plain-Python answer check.")


def test_ungrounded_quote_is_rejected_after_retry():
    bad_quote = "This exact sentence does not exist in any supplied source chunk."
    provider = StubProvider([_question_payload(bad_quote), _question_payload(bad_quote)])

    def run(kb):
        return generate_question(
            kb,
            concept="class and object",
            angle="definition",
            avoid_questions=[],
        )

    try:
        _run_with_provider(provider, run)
        raise AssertionError("expected QuizGenerationError for an ungrounded quote")
    except QuizGenerationError as exc:
        assert "not grounded" in str(exc)
        assert len(provider.calls) == 2
        print("  OK ungrounded quote rejected after exactly one retry.")


def test_locate_source():
    tmpdir = tempfile.mkdtemp(prefix="nova-quiz-locate-")
    old_dir = quiz_engine.KNOWLEDGE_DIR
    quiz_engine.KNOWLEDGE_DIR = tmpdir
    try:
        _write_pages(tmpdir)
        result = locate_source(
            KB_ID,
            page=2,
            quote="Objects store state in fields and behaviour in methods.",
        )
        assert result == {
            "page": 2,
            "line_start": 2,
            "line_end": 3,
            "quote": "Objects store state in fields and behaviour in methods.",
        }
        print("  OK locate_source finds the best matching multi-line window.")
    finally:
        quiz_engine.KNOWLEDGE_DIR = old_dir
        shutil.rmtree(tmpdir, ignore_errors=True)


def run_test():
    print("=" * 58)
    print("TEST: grounded quiz engine")
    print("=" * 58)
    test_generate_question_shuffle_and_remap()
    test_ungrounded_quote_is_rejected_after_retry()
    test_locate_source()
    print()
    print("=" * 58)
    print("SUCCESS: quiz engine verified working!")
    print("=" * 58)


if __name__ == "__main__":
    run_test()
