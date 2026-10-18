import os
import sys
import tempfile

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.nova_agent import NovaStudentAgent, NovaState, MisconceptionState

def run_test():
    print("==========================================================")
    print("TEST: Nova AI Student Agent")
    print("==========================================================")

    # 1. Sample Atlas output
    sample_atlas_output = {
        "topic": "Machine Learning Fundamentals",
        "learning_objectives": ["Distinguish AI from Machine Learning"],
        "misconceptions": [
            {
                "wrong_concept": "Artificial Intelligence and Machine Learning are completely identical terms.",
                "correct_concept": "AI is the broad umbrella of machine intelligence, while ML is a data-driven subset.",
                "reason": "Students confuse the overall field with specific algorithmic learning techniques."
            }
        ]
    }

    # 2. Test initialization from Atlas output
    nova = NovaStudentAgent.from_atlas_output(sample_atlas_output)
    assert nova.state.topic == "Machine Learning Fundamentals"
    assert len(nova.state.misconceptions) == 1
    assert nova.state.misconceptions[0].is_corrected is False
    print("✓ Successfully initialized Nova from Atlas output.")

    # 3. Test state serialization & deserialization (to_dict / from_dict)
    state_dict = nova.to_dict()
    restored_nova = NovaStudentAgent.from_dict(state_dict)
    assert restored_nova.state.session_id == nova.state.session_id
    assert restored_nova.state.misconceptions[0].wrong_concept == nova.state.misconceptions[0].wrong_concept
    print("✓ Successfully serialized & deserialized Nova state in memory.")

    # 4. Test file persistence (save_state / load_state)
    with tempfile.TemporaryDirectory() as tmp_dir:
        state_file = os.path.join(tmp_dir, f"{nova.state.session_id}.json")
        nova.save_state(state_file)
        assert os.path.exists(state_file)

        loaded_nova = NovaStudentAgent.load_state(state_file)
        assert loaded_nova.state.session_id == nova.state.session_id
        print("✓ Successfully saved and loaded Nova session state from JSON file.")

    # 5. Test conversation history tracking
    nova.state.conversation_history.append({"role": "user", "content": "Nova, what is AI vs ML?"})
    nova.state.conversation_history.append({"role": "nova", "content": "I think AI and ML are exact synonyms!"})
    assert len(nova.state.conversation_history) == 2

    # 6. Test state modification & knowledge tracking query methods
    assert len(nova.get_unresolved_misconceptions()) == 1
    assert len(nova.get_learned_misconceptions()) == 0

    nova.state.misconceptions[0].is_corrected = True
    nova.state.misconceptions[0].user_explanation = "Machine learning is just a branch of AI focused on learning from data."
    
    assert len(nova.get_unresolved_misconceptions()) == 0
    assert len(nova.get_learned_misconceptions()) == 1
    assert nova.get_learned_misconceptions()[0]["wrong_concept"] == "Artificial Intelligence and Machine Learning are completely identical terms."
    assert nova.get_learned_misconceptions()[0]["correct_concept"] == "AI is the broad umbrella of machine intelligence, while ML is a data-driven subset."
    # 7. Test Learning Progress Tracker
    progress_before = restored_nova.get_learning_progress()
    assert progress_before["total_misconceptions"] == 1
    assert progress_before["corrected_misconceptions"] == 0
    assert progress_before["remaining_misconceptions"] == 1
    assert progress_before["learning_percentage"] == 0.0

    progress_after = nova.get_learning_progress()
    assert progress_after["total_misconceptions"] == 1
    assert progress_after["corrected_misconceptions"] == 1
    assert progress_after["remaining_misconceptions"] == 0
    assert progress_after["learning_percentage"] == 100.0
    print("✓ Successfully verified learning progress tracking metrics (100% completion achieved).")

    print("\n==========================================================")
    print("SUCCESS: Nova AI Student Agent verified working!")
    print("==========================================================")

if __name__ == "__main__":
    run_test()
