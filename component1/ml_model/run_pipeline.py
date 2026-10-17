#!/usr/bin/env python3
"""
Complete ML Authenticity Pipeline Runner (run_pipeline.py)
---------------------------------------------------------
Executes the complete machine learning workflow:
1. Data Preprocessing & Code Churn Feature Engineering
2. Student-Level Grouped Cross-Validation (GroupKFold)
3. Model Benchmark (Random Forest, Gradient Boosting, Logistic Regression)
4. Feature Importance Biometric Ranking
5. Continuous Probability Scoring (predict_proba) & Risk Tier Mapping
6. Model Artifact & Defense Metadata Export

Usage:
    python run_pipeline.py
    python run_pipeline.py --data ../../pilot_dataset.csv --splits 5
"""

import os
import sys
import argparse

# Ensure utf-8 stdout on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Add parent directory to sys.path for relative imports when executed directly
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from ml_model.config import (
    DEFAULT_DATA_PATH,
    MODEL_SAVE_PATH,
    METADATA_SAVE_PATH,
    DEFAULT_N_SPLITS
)
from ml_model.preprocess import (
    load_data,
    prepare_features_and_target,
    generate_calibrated_pilot_dataset
)
from ml_model.train import (
    train_grouped_cv,
    train_final_model,
    display_feature_importances,
    save_model_artifacts
)
from ml_model.predict import (
    load_model_bundle,
    demonstrate_predictions
)


def main():
    parser = argparse.ArgumentParser(description="Run complete ML Authenticity Pipeline.")
    parser.add_argument("--data", type=str, default=DEFAULT_DATA_PATH,
                        help=f"Path to input CSV dataset (default: {DEFAULT_DATA_PATH})")
    parser.add_argument("--splits", type=int, default=DEFAULT_N_SPLITS,
                        help=f"Number of folds for GroupKFold (default: {DEFAULT_N_SPLITS})")
    parser.add_argument("--model-out", type=str, default=MODEL_SAVE_PATH,
                        help=f"Output path for model artifact (default: {MODEL_SAVE_PATH})")
    parser.add_argument("--generate-synthetic", action="store_true",
                        help="Force generation of calibrated 20-participant pilot dataset")
    args = parser.parse_args()

    print("\n" + "=" * 80)
    print("  COLLABINTEL: MACHINE LEARNING AUTHENTICITY PIPELINE")
    print("=" * 80)

    # 1. Preprocessing & Data Ingestion
    if args.generate_synthetic:
        df = generate_calibrated_pilot_dataset(args.data, n_participants=20)
    else:
        df = load_data(args.data)

    X, y, groups, feature_names = prepare_features_and_target(df)
    print(f"[*] Preprocessing complete: {len(X)} instances, {len(feature_names)} features, {len(set(groups))} student groups.")

    # 2. Classification & GroupKFold Benchmark
    best_name, best_model, benchmark_results = train_grouped_cv(
        X, y, groups, n_splits=args.splits
    )

    # 3. Fit Final Production Model on Full Training Set
    final_model = train_final_model(best_model, X, y)

    # 4. Feature Importance Analysis
    display_feature_importances(final_model, feature_names)

    # 5. Save Artifacts
    save_model_artifacts(
        final_model,
        best_name,
        feature_names,
        benchmark_results,
        model_path=args.model_out,
        metadata_path=METADATA_SAVE_PATH
    )

    # 6. Continuous Probability Inference & Tier Mapping
    bundle = load_model_bundle(args.model_out)
    demonstrate_predictions(df, model_bundle=bundle, num_samples=12)

    print("\n" + "=" * 80)
    print("  PIPELINE EXECUTION COMPLETED SUCCESSFULLY")
    print("=" * 80)
    print(f"  Model Artifact:   {args.model_out}")
    print(f"  Defense Metadata: {METADATA_SAVE_PATH}\n")


if __name__ == "__main__":
    main()
