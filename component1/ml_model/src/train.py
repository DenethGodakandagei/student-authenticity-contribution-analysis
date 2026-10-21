"""
Model Training & GroupKFold Cross-Validation (src/train.py)
-----------------------------------------------------------
Executes:
1. Student-Level Grouped Cross-Validation (GroupKFold):
   Zero data leakage guarantee between train and test splits.
2. Model Benchmarking:
   Evaluates XGBoost, Random Forest, HistGradientBoosting, and Logistic Regression.
3. Feature Importance Ranking:
   Evaluates quantitative weights for code_churn_ratio, paste_ratio, CPM, etc.
4. Production Model Serialization:
   Saves trained model bundle and defense metadata to disk in artifacts/.
"""

import os
import sys
import json
import argparse
import numpy as np
import joblib
from typing import Dict, Any, List, Tuple

from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    roc_auc_score,
    precision_score,
    recall_score,
    f1_score
)

try:
    from .config import (
        MODEL_SAVE_PATH,
        METADATA_SAVE_PATH,
        DEFAULT_N_SPLITS,
        LOW_RISK_MAX,
        HIGH_RISK_MIN,
        DEFAULT_DATA_PATH,
        DATA_DIR,
        ARTIFACTS_DIR
    )
    from .classifier import get_models, build_primary_model_pipeline
    from .preprocess import get_group_kfold_splits, load_data, prepare_features_and_target
except ImportError:
    try:
        from src.config import (
            MODEL_SAVE_PATH,
            METADATA_SAVE_PATH,
            DEFAULT_N_SPLITS,
            LOW_RISK_MAX,
            HIGH_RISK_MIN,
            DEFAULT_DATA_PATH,
            DATA_DIR,
            ARTIFACTS_DIR
        )
        from src.classifier import get_models, build_primary_model_pipeline
        from src.preprocess import get_group_kfold_splits, load_data, prepare_features_and_target
    except ImportError:
        from config import (
            MODEL_SAVE_PATH,
            METADATA_SAVE_PATH,
            DEFAULT_N_SPLITS,
            LOW_RISK_MAX,
            HIGH_RISK_MIN,
            DEFAULT_DATA_PATH,
            DATA_DIR,
            ARTIFACTS_DIR
        )
        from classifier import get_models, build_primary_model_pipeline
        from preprocess import get_group_kfold_splits, load_data, prepare_features_and_target


def train_grouped_cv(
    X: np.ndarray,
    y: np.ndarray,
    groups: np.ndarray,
    models: Dict[str, Any] = None,
    n_splits: int = DEFAULT_N_SPLITS
) -> Tuple[str, Any, Dict[str, Any]]:
    """
    Runs Student-Level GroupKFold Cross-Validation across all models.
    Returns (best_model_name, best_model_instance, benchmark_results).
    """
    if models is None:
        models = get_models()

    unique_groups = len(np.unique(groups))
    actual_splits = max(2, min(n_splits, unique_groups))

    print("\n" + "=" * 80)
    print("  COLLEGE DEFENSE AUDIT: STUDENT-LEVEL GROUPED CROSS-VALIDATION (GroupKFold)")
    print("=" * 80)
    print(f"[*] Total Observations: {len(X)} 5-minute sliding windows")
    print(f"[*] Unique Participants: {unique_groups} participants")
    print(f"[*] GroupKFold Folds:    {actual_splits} folds")
    print("[OK] Zero Data Leakage Guarantee: Windows from any participant never cross between train & test.")

    benchmark_results = {}
    best_model_name = None
    best_roc_auc = -1.0
    best_model_obj = None

    for model_name, model in models.items():
        print(f"\n--- Benchmarking: {model_name} ---")
        fold_acc, fold_bacc, fold_auc, fold_f1, fold_prec, fold_rec = [], [], [], [], [], []

        for fold_idx, (train_idx, test_idx) in enumerate(get_group_kfold_splits(X, y, groups, actual_splits), 1):
            X_train, X_test = X[train_idx], X[test_idx]
            y_train, y_test = y[train_idx], y[test_idx]

            model.fit(X_train, y_train)

            if hasattr(model, "predict_proba"):
                y_prob = model.predict_proba(X_test)[:, 1]
            else:
                y_prob = model.predict(X_test)

            y_pred = (y_prob >= 0.5).astype(int)

            acc = accuracy_score(y_test, y_pred)
            bacc = balanced_accuracy_score(y_test, y_pred)
            f1 = f1_score(y_test, y_pred, zero_division=0)
            prec = precision_score(y_test, y_pred, zero_division=0)
            rec = recall_score(y_test, y_pred, zero_division=0)

            try:
                auc = roc_auc_score(y_test, y_prob)
            except Exception:
                auc = acc

            fold_acc.append(acc)
            fold_bacc.append(bacc)
            fold_auc.append(auc)
            fold_f1.append(f1)
            fold_prec.append(prec)
            fold_rec.append(rec)

        mean_auc = float(np.mean(fold_auc))
        std_auc = float(np.std(fold_auc))
        mean_acc = float(np.mean(fold_acc))
        mean_bacc = float(np.mean(fold_bacc))
        mean_f1 = float(np.mean(fold_f1))

        print(f"  > ROC-AUC:          {mean_auc:.4f} (+/- {std_auc:.4f})")
        print(f"  > Balanced Acc:     {mean_bacc:.4f}")
        print(f"  > Standard Acc:     {mean_acc:.4f}")
        print(f"  > F1-Score:         {mean_f1:.4f}")

        benchmark_results[model_name] = {
            "roc_auc": (mean_auc, std_auc),
            "balanced_accuracy": (mean_bacc, float(np.std(fold_bacc))),
            "accuracy": (mean_acc, float(np.std(fold_acc))),
            "f1_score": (mean_f1, float(np.std(fold_f1)))
        }

        if mean_auc > best_roc_auc:
            best_roc_auc = mean_auc
            best_model_name = model_name
            best_model_obj = model

    print("\n" + "=" * 80)
    print(f"  BENCHMARK WINNER: '{best_model_name}' (Mean ROC-AUC: {best_roc_auc:.4f})")
    print("=" * 80)

    return best_model_name, best_model_obj, benchmark_results


def train_final_model(model: Any, X: np.ndarray, y: np.ndarray) -> Any:
    """
    Fits final production model on full dataset.
    """
    print(f"\n[*] Training: Fitting final production model on all {len(X)} instances...")
    model.fit(X, y)
    print("[OK] Production model fitted successfully.")
    return model


def display_feature_importances(model: Any, feature_names: List[str]) -> None:
    """
    Prints ranked feature importances for defense justification.
    """
    clf = model
    if hasattr(model, "named_steps"):
        clf = model.named_steps.get("clf", model)

    if hasattr(clf, "feature_importances_"):
        importances = clf.feature_importances_
        indices = np.argsort(importances)[::-1]

        print("\n" + "=" * 80)
        print("  FEATURE IMPORTANCE RANKING (Defense Justification Matrix)")
        print("=" * 80)
        for rank, idx in enumerate(indices, 1):
            name = feature_names[idx] if idx < len(feature_names) else f"Feature_{idx}"
            weight = importances[idx]
            bar = "#" * int(weight * 40)
            print(f"  {rank:2d}. {name:<28} | {weight:6.4f} | {bar}")
        print("=" * 80)


def save_model_artifacts(
    model: Any,
    model_name: str,
    feature_names: List[str],
    benchmark_results: Dict[str, Any],
    model_path: str = MODEL_SAVE_PATH,
    metadata_path: str = METADATA_SAVE_PATH
) -> None:
    """
    Serializes trained model bundle (.joblib) and audit metadata (.json).
    """
    os.makedirs(os.path.dirname(os.path.abspath(model_path)), exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(metadata_path)), exist_ok=True)

    bundle = {
        "model": model,
        "model_name": model_name,
        "features": feature_names,
        "tiers": {
            "low_risk": f"< {LOW_RISK_MAX}% (Verified Authentic Human)",
            "inconclusive": f"{LOW_RISK_MAX}% - {HIGH_RISK_MIN}% (Mixed / Syntax Review)",
            "high_risk": f"> {HIGH_RISK_MIN}% (AI-Generated / Pasted)"
        }
    }
    joblib.dump(bundle, model_path)
    print(f"[OK] Training: Saved model bundle to: '{model_path}'")

    meta = {
        "model_name": model_name,
        "features": feature_names,
        "benchmark_summary": {
            k: {
                m: [round(float(v[0]), 4), round(float(v[1]), 4)]
                for m, v in vals.items()
            }
            for k, vals in benchmark_results.items()
        },
        "calibrated_thresholds": {
            "low_risk_threshold": LOW_RISK_MAX,
            "high_risk_threshold": HIGH_RISK_MIN
        }
    }
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print(f"[OK] Training: Saved defense audit metadata to: '{metadata_path}'")


def main():
    parser = argparse.ArgumentParser(description="Train and evaluate Authenticity ML Models (GroupKFold)")
    parser.add_argument(
        "--model",
        type=str,
        default="all",
        choices=["all", "xgb", "rf", "hgb", "logreg"],
        help="Model architecture: 'all' to benchmark all algorithms, or 'xgb' to train XGBoost specifically."
    )
    parser.add_argument(
        "--data",
        type=str,
        default=None,
        help="Path to feature CSV (defaults to data/preprocessed_features.csv or data/dataset.csv)"
    )
    parser.add_argument(
        "--splits",
        type=int,
        default=DEFAULT_N_SPLITS,
        help=f"Number of GroupKFold splits (default: {DEFAULT_N_SPLITS})"
    )
    args = parser.parse_args()

    if args.data:
        csv_target = args.data
    else:
        preprocessed_path = os.path.join(DATA_DIR, "preprocessed_features.csv")
        csv_target = preprocessed_path if os.path.exists(preprocessed_path) else DEFAULT_DATA_PATH

    print(f"[*] Training: Loading features from '{csv_target}'...")
    df = load_data(csv_target)
    X, y, groups, feature_names = prepare_features_and_target(df)

    if args.model == "all":
        selected_models = get_models()
    elif args.model == "xgb":
        selected_models = {"XGBoost (Tuned)": build_primary_model_pipeline("xgb")}
    elif args.model == "rf":
        selected_models = {"Random Forest (Tuned)": build_primary_model_pipeline("rf")}
    elif args.model == "hgb":
        selected_models = {"Gradient Boosting": build_primary_model_pipeline("hgb")}
    elif args.model == "logreg":
        selected_models = {"Logistic Regression Baseline": build_primary_model_pipeline("logreg")}
    else:
        selected_models = get_models()

    best_name, best_model, benchmark_results = train_grouped_cv(
        X, y, groups, models=selected_models, n_splits=args.splits
    )
    final_model = train_final_model(best_model, X, y)
    display_feature_importances(final_model, feature_names)
    save_model_artifacts(final_model, best_name, feature_names, benchmark_results)


if __name__ == "__main__":
    main()
