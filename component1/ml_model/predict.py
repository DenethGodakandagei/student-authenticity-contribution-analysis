"""
Inference & Continuous Probability Scoring Module (predict.py)
--------------------------------------------------------------
Implements:
1. Continuous Probability Scoring (predict_proba):
   Outputs exact suspicion probabilities P(AI | x) in [0.0%, 100.0%].
2. Calibrated Defense Tier Mapping:
   - Low Risk (< 30.0%): Verified Authentic Human Coding
   - Inconclusive (30.0% - 70.0%): Mixed Indicators / Syntax Lookup
   - High Risk (> 70.0%): High Confidence AI Generation / Bulk Pasting
3. Batch & Single-Vector Inference:
   Accepts feature dictionaries or pandas DataFrames.
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Union, List

from .config import (
    MODEL_SAVE_PATH,
    FEATURE_COLUMNS,
    LOW_RISK_MAX,
    HIGH_RISK_MIN
)


def classify_risk_tier(prob_percent: float) -> str:
    """
    Maps continuous probability score (0-100%) to defense risk tier.
    """
    if prob_percent < LOW_RISK_MAX:
        return "Low Risk (Authentic Human)"
    elif prob_percent <= HIGH_RISK_MIN:
        return "Inconclusive (Mixed / Syntax Review)"
    else:
        return "High Risk (AI-Generated / Pasted)"


def load_model_bundle(model_path: str = MODEL_SAVE_PATH) -> Dict[str, Any]:
    """
    Loads serialized model bundle containing trained estimator and feature names.
    """
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model artifact not found at '{model_path}'. Run training first.")
    return joblib.load(model_path)


def predict_authenticity(
    features: Union[Dict[str, float], pd.DataFrame, np.ndarray],
    model_bundle: Dict[str, Any] = None,
    model_path: str = MODEL_SAVE_PATH
) -> Union[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Runs continuous suspicion scoring and tier classification.
    Returns dictionary with:
    - suspicion_score_percent: float (0.0 to 100.0)
    - risk_tier: str ("Low Risk", "Inconclusive", "High Risk")
    - is_authentic: bool (True if low risk)
    - probability_human: float
    - probability_ai: float
    """
    if model_bundle is None:
        model_bundle = load_model_bundle(model_path)

    model = model_bundle["model"]
    feature_names = model_bundle.get("features", FEATURE_COLUMNS)

    # Convert single dictionary to 2D numpy array
    if isinstance(features, dict):
        vec = np.array([[float(features.get(col, 0.0)) for col in feature_names]])
        single_input = True
    elif isinstance(features, pd.DataFrame):
        vec = features[feature_names].fillna(0).values.astype(np.float64)
        single_input = False
    elif isinstance(features, np.ndarray):
        vec = features if features.ndim == 2 else features.reshape(1, -1)
        single_input = (len(vec) == 1)
    else:
        raise ValueError("Unsupported input format. Provide dict, DataFrame, or numpy array.")

    # Compute probability estimates via predict_proba
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(vec)
        prob_human = probs[:, 0]
        prob_ai = probs[:, 1]
    else:
        preds = model.predict(vec)
        prob_ai = preds.astype(float)
        prob_human = 1.0 - prob_ai

    results = []
    for i in range(len(vec)):
        p_ai_pct = round(float(prob_ai[i]) * 100.0, 2)
        p_human_pct = round(float(prob_human[i]) * 100.0, 2)
        tier = classify_risk_tier(p_ai_pct)

        res = {
            "suspicion_score_percent": p_ai_pct,
            "authenticity_score_percent": p_human_pct,
            "risk_tier": tier,
            "is_authentic": (p_ai_pct < LOW_RISK_MAX),
            "is_anomaly": (p_ai_pct > HIGH_RISK_MIN),
            "probability_human": float(prob_human[i]),
            "probability_ai": float(prob_ai[i])
        }
        results.append(res)

    return results[0] if single_input else results


def demonstrate_predictions(
    df: pd.DataFrame,
    model_bundle: Dict[str, Any] = None,
    num_samples: int = 12
):
    """
    Prints a formatted evaluation table demonstrating predict_proba scoring on test samples.
    """
    print("\n" + "=" * 80)
    print("  CONTINUOUS SUSPICION SCORING & TIER MAPPING (predict_proba)")
    print("=" * 80)
    print(f"  {'Participant':<13} {'Window':<8} {'Ground Truth':<16} {'Suspicion P(AI)':<18} {'Calibrated Risk Tier':<28}")
    print("  " + "-" * 76)

    sample_indices = np.linspace(0, len(df) - 1, num=min(num_samples, len(df)), dtype=int)
    for idx in sample_indices:
        row = df.iloc[idx]
        pid = row.get("participant_id", "P01")
        w_idx = row.get("window_index", 0)
        label = row.get("label", 0)
        gt_text = "Class 1 (AI/Paste)" if label == 1 else "Class 0 (Manual)"

        feat_dict = {col: row.get(col, 0) for col in FEATURE_COLUMNS}
        pred = predict_authenticity(feat_dict, model_bundle=model_bundle)

        p_ai = pred["suspicion_score_percent"]
        tier = pred["risk_tier"]

        print(f"  {pid:<13} #{w_idx:<7} {gt_text:<16} {p_ai:6.2f}%            {tier:<28}")
