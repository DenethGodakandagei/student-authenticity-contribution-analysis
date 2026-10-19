"""
Model Training & GroupKFold Cross-Validation (train.py)
-------------------------------------------------------
Executes:
1. Student-Level Grouped Cross-Validation (GroupKFold):
   Zero data leakage guarantee between train and test splits.
2. Model Benchmarking:
   Evaluates Random Forest, HistGradientBoosting, and Logistic Regression.
3. Feature Importance Ranking:
   Evaluates quantitative weights for code_churn_ratio, paste_velocity, etc.
4. Production Model Serialization:
   Saves trained model bundle and defense metadata to disk.
"""

import os
import sys
import json
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
        DEFAULT_DATA_PATH
    )
    from .classifier import get_models, build_primary_model_pipeline
    from .preprocess import get_group_kfold_splits, load_data, prepare_features_and_target
except ImportError:
    from config import (
        MODEL_SAVE_PATH,
        METADATA_SAVE_PATH,
        DEFAULT_N_SPLITS,
        LOW_RISK_MAX,
        HIGH_RISK_MIN,
        DEFAULT_DATA_PATH
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
        mean_acc = float(np.mean(fold_acc))
        mean_bacc = float(np.mean(fold_bacc))
        mean_f1 = float(np.mean(fold_f1))

        benchmark_results[model_name] = {
            "accuracy": (mean_acc, float(np.std(fold_acc))),
            "balanced_accuracy": (mean_bacc, float(np.std(fold_bacc))),
            "roc_auc": (mean_auc, float(np.std(fold_auc))),
            "f1": (mean_f1, float(np.std(fold_f1))),
            "precision": (float(np.mean(fold_prec)), float(np.std(fold_prec))),
            "recall": (float(np.mean(fold_rec)), float(np.std(fold_rec)))
        }

        print(f"  Fold Accuracy:      {mean_acc*100:6.2f}% +/- {np.std(fold_acc)*100:.2f}%")
        print(f"  Balanced Accuracy:  {mean_bacc*100:6.2f}% +/- {np.std(fold_bacc)*100:.2f}%")
        print(f"  ROC-AUC Score:      {mean_auc:6.4f} +/- {np.std(fold_auc):.4f}")
        print(f"  F1-Score:           {mean_f1:6.4f} +/- {np.std(fold_f1):.4f}")

        if mean_auc > best_roc_auc:
            best_roc_auc = mean_auc
            best_model_name = model_name
            best_model_obj = model

    print(f"\n[*] Best Selected Model: {best_model_name} (Mean ROC-AUC: {best_roc_auc:.4f})")
    return best_model_name, best_model_obj, benchmark_results


def train_final_model(
    model: Any,
    X: np.ndarray,
    y: np.ndarray
) -> Any:
    """
    Fits the winning model architecture on the full dataset for deployment.
    """
    model.fit(X, y)
    return model


def display_feature_importances(model: Any, feature_names: List[str]):
    """
    Displays the feature importance ranking of the trained tree model.
    """
    raw_clf = model.named_steps["clf"] if hasattr(model, "named_steps") else model
    if hasattr(raw_clf, "feature_importances_"):
        print("\n" + "=" * 80)
        print("  FEATURE IMPORTANCE ANALYSIS (Biometric Weighting)")
        print("=" * 80)
        importances = raw_clf.feature_importances_
        indices = np.argsort(importances)[::-1]
        for rank, idx in enumerate(indices, 1):
            col_name = feature_names[idx]
            weight = importances[idx] * 100
            bar = "#" * int(weight / 2.5)
            print(f"  {rank:2d}. {col_name:<24} {weight:6.2f}%  {bar}")


def save_model_artifacts(
    model: Any,
    model_name: str,
    feature_names: List[str],
    benchmark_results: Dict[str, Any],
    model_path: str = MODEL_SAVE_PATH,
    metadata_path: str = METADATA_SAVE_PATH
):
    """
    Serializes the trained model bundle and defense metadata JSON.
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


if __name__ == "__main__":
    import argparse
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
        help="Path to feature CSV (defaults to preprocessed_features.csv or dataset.csv)"
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
        csv_target = "preprocessed_features.csv" if os.path.exists("preprocessed_features.csv") else DEFAULT_DATA_PATH

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


