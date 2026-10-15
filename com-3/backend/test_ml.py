from ml_engine import classify_intent_and_significance

tests = [
    ("The resuts shows good performence.", "The results show good performance.", "Grammar Fix"),
    ("In this paper we propose a system.", "In this paper we propose a system. Furthermore, we implement a novel multi-modal tracking pipeline that extracts revision pairs across distributed document editors and stores them securely in the database.", "Content Addition"),
    ("In this paper we discuss multiple unrelated experiments that were aborted due to lack of time and excessive computational complexity.", "In this paper.", "Content Removal"),
    ("Section 1 Introduction", "# 3. Methodology and System Evaluation Framework", "Structural Shift"),
    ("We conducted five tests to evaluate the runtime speed.", "Five separate experiments were carried out to measure the execution latency.", "Paraphrase"),
    ("The system achieved high accuracy.", "The system achieved high accuracy of 94.2% as reported in [4] and (Kashefi et al., 2022).", "Evidence Addition")
]

for b, a, name in tests:
    res = classify_intent_and_significance(b, a)
    print(f"[{name}]")
    print(f"  Intent: {res['predicted_intent']}")
    print(f"  Significance: {res['predicted_significance']}")
    print(f"  Semantic Distance: {res['semantic_distance']}")
    print(f"  Confidence: {res['confidence']}")
    print(f"  Explanation: {res['explanation']}")
    print("-" * 50)
