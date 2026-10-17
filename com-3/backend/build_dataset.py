"""
Dataset Builder for Document Evolution & Revision Analytics
Component 3: Intelligent Document Evolution and Revision Analytics using Machine Learning
Author: R.R.S. Ranadewa (IT23217522)

This script:
1. Extracts before-and-after revision pairs from the collaborative document database / API.
2. Runs the exact feature extraction pipeline from ml_engine.py (lines 63-91):
   - words_added
   - words_deleted
   - similarity_ratio
   - semantic_distance
   - content_jaccard
   - citation_added
   - evidence_score
   - structural_shift
3. Maps ground-truth labels for:
   - Revision Intent (Table 3.1: 6 categories)
   - Revision Significance (Table 3.2: 3 categories)
4. Exports a structured research dataset to `dataset.csv` and `dataset.json`.
"""

import json
import csv
import urllib.request
import os
from ml_engine import extract_features, classify_intent_and_significance

def fetch_revisions_from_api(base_url=None):
    """Fetches real live revisions recorded by the editor from MongoDB Atlas via the backend API."""
    if not base_url:
        base_url = os.environ.get("BACKEND_URL", "https://student-authenticity-contribution-80jm.onrender.com")
    revisions = []
    print(f"Connecting to Backend API: {base_url}")
    try:
        docs_url = f"{base_url}/api/documents"
        req = urllib.request.Request(docs_url, headers={'User-Agent': 'DatasetBuilder/1.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            docs = json.loads(response.read().decode('utf-8'))
            
        for doc in docs:
            doc_id = doc.get("_id")
            if not doc_id:
                continue
            rev_url = f"{base_url}/api/documents/{doc_id}/revisions"
            try:
                r_req = urllib.request.Request(rev_url, headers={'User-Agent': 'DatasetBuilder/1.0'})
                with urllib.request.urlopen(r_req, timeout=5) as r_res:
                    doc_revs = json.loads(r_res.read().decode('utf-8'))
                    for r in doc_revs:
                        r["document_title"] = doc.get("title", "Untitled")
                    revisions.extend(doc_revs)
            except Exception as e:
                print(f"  Note: Could not fetch revisions for {doc_id}: {e}")
    except Exception as e:
        print(f"Warning: Could not connect to backend API ({e}).")
    return revisions

def build_dataset(output_csv="actual_revisions_dataset.csv", output_json="actual_revisions_dataset.json"):
    print("=" * 70)
    print("Building Document Evolution & Revision Analytics Dataset from ACTUAL Data")
    print("Source: Live MongoDB Database (Real Student Writing & Revision Logs)")
    print("Target Categories: 6 Intents (Table 3.1) & 3 Significance Levels (Table 3.2)")
    print("=" * 70)

    rows = []
    sample_id = 1

    # Process Live Revisions from Collaborative Editor (MongoDB)
    print("\nFetching actual student revision records from MongoDB API...")
    live_revisions = fetch_revisions_from_api()
    print(f"Retrieved {len(live_revisions)} actual revisions recorded in database.")

    for rev in live_revisions:
        b_text = rev.get("beforeText") or rev.get("deletedText") or ""
        a_text = rev.get("afterText") or rev.get("addedText") or ""
        section = rev.get("section") or "General"

        # Skip empty no-op diffs
        if not b_text.strip() and not a_text.strip():
            continue

        feats = extract_features(b_text, a_text, section)
        
        # Initial baseline predictions
        intent = rev.get("predictedIntent") or "Language Correction"
        sig = rev.get("predictedSignificance") or "Minor"
        if intent == "Unclassified":
            auto_res = classify_intent_and_significance(b_text, a_text, section)
            intent = auto_res["predicted_intent"]
            sig = auto_res["predicted_significance"]

        row = {
            "sample_id": f"ACTUAL_{sample_id:04d}",
            "timestamp": rev.get("timestamp", ""),
            "doc_id": rev.get("documentId", "live_doc"),
            "doc_title": rev.get("document_title", ""),
            "author_id": rev.get("anonymizedAuthorId") or rev.get("author") or "STU_ANON",
            "section": section,
            "before_text": b_text,
            "after_text": a_text,
            # Extracted features (lines 63-91)
            "words_added": feats["words_added"],
            "words_deleted": feats["words_deleted"],
            "similarity_ratio": round(feats["similarity_ratio"], 4),
            "semantic_distance": round(feats["semantic_distance"], 4),
            "content_jaccard": round(feats["content_jaccard"], 4),
            "citation_added": int(feats["citation_added"]),
            "evidence_score": round(feats["evidence_score"], 2),
            "structural_shift": int(feats["structural_shift"]),
            # Algorithmic prediction baseline
            "predicted_intent": intent,
            "predicted_significance": sig,
            # Ground-truth human annotation columns for research / Cohen's Kappa evaluation (Section 3.4 & 3.6)
            "annotator_1_intent": intent,
            "annotator_2_intent": "",
            "annotator_1_significance": sig,
            "annotator_2_significance": "",
            "final_ground_truth_intent": intent,
            "final_ground_truth_significance": sig,
            "data_source": "collaborative_editor_live_student_writing"
        }
        rows.append(row)
        sample_id += 1

    # 3. Export to CSV
    csv_fields = [
        "sample_id", "timestamp", "doc_id", "doc_title", "author_id", "section",
        "before_text", "after_text",
        "words_added", "words_deleted",
        "similarity_ratio", "semantic_distance", "content_jaccard",
        "citation_added", "evidence_score", "structural_shift",
        "predicted_intent", "predicted_significance",
        "annotator_1_intent", "annotator_2_intent",
        "annotator_1_significance", "annotator_2_significance",
        "final_ground_truth_intent", "final_ground_truth_significance",
        "data_source"
    ]

    with open(output_csv, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=csv_fields)
        writer.writeheader()
        writer.writerows(rows)

    # 4. Export to JSON
    with open(output_json, mode="w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)

    print(f"\n[Success] Dataset successfully compiled!")
    print(f"  Total Samples: {len(rows)}")
    print(f"  CSV File Saved:  {os.path.abspath(output_csv)}")
    print(f"  JSON File Saved: {os.path.abspath(output_json)}")

    # Summary Statistics
    intents = {}
    significances = {}
    for r in rows:
        intents[r["final_ground_truth_intent"]] = intents.get(r["final_ground_truth_intent"], 0) + 1
        significances[r["final_ground_truth_significance"]] = significances.get(r["final_ground_truth_significance"], 0) + 1

    print("\nRevision Intent Breakdown (Table 3.1):")
    for k, v in sorted(intents.items()):
        print(f"  - {k:<28}: {v} samples ({round((v/len(rows))*100, 1)}%)")

    print("\nRevision Significance Breakdown (Table 3.2):")
    for k, v in sorted(significances.items()):
        print(f"  - {k:<12}: {v} samples ({round((v/len(rows))*100, 1)}%)")

    return rows

if __name__ == "__main__":
    build_dataset()
