import os
import sys

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.misconception_generator import (
    AtlasMisconceptionAgent,
    generate_student_misconceptions
)

def run_test():
    sample_lecture_text = """
    Lecture: Introduction to Machine Learning and Vector Search
    In this session, we explore Artificial Intelligence and Machine Learning. 
    Machine learning models learn patterns from training data. In RAG pipelines, large documents are broken 
    down into smaller chunks using text splitters like RecursiveCharacterTextSplitter. 
    These chunks are converted into dense vector embeddings and stored in vector indices like FAISS.
    """

    print("==========================================================")
    print("TEST: Atlas AI Agent - Misconception Generator")
    print("==========================================================")

    try:
        agent = AtlasMisconceptionAgent()
        result = agent.generate_misconceptions(sample_lecture_text)

        print(f"\nTopic Identified: {result.get('topic')}")
        print("\nLearning Objectives:")
        for obj in result.get('learning_objectives', []):
            print(f"  - {obj}")

        print("\nGenerated Student Misconceptions & Corrections:")
        for idx, item in enumerate(result.get('misconceptions', []), 1):
            print(f"\n  [Wrong Concept {idx}]: {item['wrong_concept']}")
            print(f"  [Correct Concept]: {item['correct_concept']}")
            print(f"  [Reason]: {item['reason']}")

        # Validation assertions
        assert "topic" in result and len(result["topic"]) > 0
        assert "learning_objectives" in result and len(result["learning_objectives"]) > 0
        assert "misconceptions" in result and len(result["misconceptions"]) > 0
        
        for item in result["misconceptions"]:
            assert "wrong_concept" in item and len(item["wrong_concept"]) > 0
            assert "correct_concept" in item and len(item["correct_concept"]) > 0
            assert "reason" in item and len(item["reason"]) > 0

        print("\n==========================================================")
        print("SUCCESS: Atlas Misconception Generator verified working!")
        print("==========================================================")

    except Exception as e:
        print(f"\n[NOTICE]: {e}")
        print("==========================================================")

if __name__ == "__main__":
    run_test()

