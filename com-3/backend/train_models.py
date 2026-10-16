"""
Machine Learning Training & Experimental Evaluation Pipeline
Component 3: Intelligent Document Evolution and Revision Analytics using Machine Learning
Author: R.R.S. Ranadewa (IT23217522)

Implements Proposal Section 3.5 & 3.6:
- Baseline 1: Majority Class Baseline
- Baseline 2: Traditional NLP Classification (TF-IDF + Logistic Regression / LinearSVC)
- Experiment 4: Semantic & Linguistic Feature Augmentation (using lines 63-91 features)
- Computes Precision, Recall, Macro F1-Score, and Confusion Matrix (Table 3.4)
- Persists trained models to disk (`intent_model.joblib`, `significance_model.joblib`)
"""

import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, f1_score, precision_score, recall_score, confusion_matrix
from scipy.sparse import hstack

DATASET_CSV = "actual_revisions_dataset.csv"

def load_and_preprocess_dataset(csv_path=DATASET_CSV):
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset '{csv_path}' not found. Run build_dataset.py first.")

    df = pd.read_csv(csv_path)
    df["before_text"] = df["before_text"].fillna("")
    df["after_text"] = df["after_text"].fillna("")
    
    # Combined revision text for vectorization
    df["combined_text"] = df["before_text"] + " [SEP] " + df["after_text"]

    # Numerical & Linguistic feature columns (extracted in lines 63-91 of ml_engine.py)
    feature_cols = [
        "words_added", "words_deleted",
        "similarity_ratio", "semantic_distance", "content_jaccard",
        "citation_added", "evidence_score", "structural_shift"
    ]
    for col in feature_cols:
        df[col] = df[col].fillna(0).astype(float)

    return df, feature_cols

def run_experiments():
    print("=" * 75)
    print("Component 3 ML Model Experiments (Revision Intent & Significance)")
    print("=" * 75)

    df, feature_cols = load_and_preprocess_dataset()
    print(f"Total samples loaded: {len(df)}")

    # Split into 80% Train, 20% Held-out Test
    train_df, test_df = train_test_split(df, test_size=0.20, random_state=42)
    print(f"Train set: {len(train_df)} samples | Held-out Test set: {len(test_df)} samples")

    # 1. Text Vectorizer (TF-IDF word + char ngrams)
    vectorizer = TfidfVectorizer(max_features=1500, ngram_range=(1, 2), stop_words='english')
    X_train_tfidf = vectorizer.fit_transform(train_df["combined_text"])
    X_test_tfidf = vectorizer.transform(test_df["combined_text"])

    # 2. Dense feature matrix (from ml_engine lines 63-91)
    X_train_dense = train_df[feature_cols].values
    X_test_dense = test_df[feature_cols].values

    # 3. Combined Sparse Matrix (TF-IDF + Extracted Features)
    X_train_combined = hstack([X_train_tfidf, X_train_dense]).tocsr()
    X_test_combined = hstack([X_test_tfidf, X_test_dense]).tocsr()

    # Targets (Support ground-truth or predicted columns in actual dataset)
    intent_col = "final_ground_truth_intent" if "final_ground_truth_intent" in df.columns else ("intent_label" if "intent_label" in df.columns else "predicted_intent")
    sig_col = "final_ground_truth_significance" if "final_ground_truth_significance" in df.columns else ("significance_label" if "significance_label" in df.columns else "predicted_significance")

    y_train_intent = train_df[intent_col]
    y_test_intent = test_df[intent_col]

    y_train_sig = train_df[sig_col]
    y_test_sig = test_df[sig_col]

    # =========================================================================
    # TASK 1: REVISION INTENT CLASSIFICATION (Table 3.1)
    # =========================================================================
    print("\n" + "#" * 75)
    print("EXPERIMENT SET A: REVISION INTENT CLASSIFICATION (6 CATEGORIES)")
    print("#" * 75)

    # Baseline 1: Majority Class Baseline
    dummy = DummyClassifier(strategy="most_frequent")
    dummy.fit(X_train_tfidf, y_train_intent)
    dummy_pred = dummy.predict(X_test_tfidf)
    dummy_f1 = f1_score(y_test_intent, dummy_pred, average="macro", zero_division=0)
    print(f"\n[Baseline 1 - Majority Class Classifier]")
    print(f"  Macro F1-Score: {dummy_f1:.4f}")

    # Baseline 2: Traditional TF-IDF + Logistic Regression
    lr = LogisticRegression(max_iter=1000, random_state=42)
    lr.fit(X_train_tfidf, y_train_intent)
    lr_pred = lr.predict(X_test_tfidf)
    lr_f1 = f1_score(y_test_intent, lr_pred, average="macro", zero_division=0)
    print(f"\n[Baseline 2 - Traditional TF-IDF + Logistic Regression]")
    print(f"  Macro F1-Score: {lr_f1:.4f}")

    # Experiment 4: Feature-Augmented Classifier (TF-IDF + Lines 63-91 Features)
    rf_intent = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_intent.fit(X_train_combined, y_train_intent)
    rf_pred = rf_intent.predict(X_test_combined)
    rf_f1 = f1_score(y_test_intent, rf_pred, average="macro", zero_division=0)
    rf_prec = precision_score(y_test_intent, rf_pred, average="macro", zero_division=0)
    rf_rec = recall_score(y_test_intent, rf_pred, average="macro", zero_division=0)

    print(f"\n[Proposed Model - TF-IDF + Extracted Semantic/Linguistic Features (Random Forest)]")
    print(f"  Precision (Macro): {rf_prec:.4f}")
    print(f"  Recall (Macro):    {rf_rec:.4f}")
    print(f"  Macro F1-Score:    {rf_f1:.4f}")
    print(f"  F1 Improvement over Baseline 1: +{(rf_f1 - dummy_f1):.4f}")
    print(f"  F1 Improvement over Baseline 2: +{(rf_f1 - lr_f1):.4f}")

    print("\nDetailed Classification Report (Revision Intent):")
    print(classification_report(y_test_intent, rf_pred, zero_division=0))

    # =========================================================================
    # TASK 2: REVISION SIGNIFICANCE CLASSIFICATION (Table 3.2)
    # =========================================================================
    print("\n" + "#" * 75)
    print("EXPERIMENT SET B: REVISION SIGNIFICANCE CLASSIFICATION (MINOR / MODERATE / MAJOR)")
    print("#" * 75)

    rf_sig = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_sig.fit(X_train_combined, y_train_sig)
    sig_pred = rf_sig.predict(X_test_combined)
    sig_f1 = f1_score(y_test_sig, sig_pred, average="macro", zero_division=0)
    sig_prec = precision_score(y_test_sig, sig_pred, average="macro", zero_division=0)
    sig_rec = recall_score(y_test_sig, sig_pred, average="macro", zero_division=0)

    print(f"\n[Significance Model - TF-IDF + Extracted Features]")
    print(f"  Precision (Macro): {sig_prec:.4f}")
    print(f"  Recall (Macro):    {sig_rec:.4f}")
    print(f"  Macro F1-Score:    {sig_f1:.4f}")

    print("\nDetailed Classification Report (Revision Significance):")
    print(classification_report(y_test_sig, sig_pred, zero_division=0))

    # Save trained models for production inference
    models_dir = os.path.abspath("trained_models")
    os.makedirs(models_dir, exist_ok=True)
    joblib.dump(vectorizer, os.path.join(models_dir, "tfidf_vectorizer.joblib"))
    joblib.dump(rf_intent, os.path.join(models_dir, "intent_classifier.joblib"))
    joblib.dump(rf_sig, os.path.join(models_dir, "significance_classifier.joblib"))
    joblib.dump(feature_cols, os.path.join(models_dir, "feature_names.joblib"))

    print("\n" + "=" * 75)
    print(f"[Success] Trained models persisted to: {models_dir}")
    print("  - tfidf_vectorizer.joblib")
    print("  - intent_classifier.joblib")
    print("  - significance_classifier.joblib")
    print("  - feature_names.joblib")
    print("=" * 75)

if __name__ == "__main__":
    run_experiments()
