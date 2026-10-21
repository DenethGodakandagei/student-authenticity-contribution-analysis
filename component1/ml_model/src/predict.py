"""
Inference & Continuous Probability Scoring Module (src/predict.py)
------------------------------------------------------------------
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

try:
    from .config import (
        MODEL_SAVE_PATH,
        FEATURE_COLUMNS,
        LOW_RISK_MAX,
        HIGH_RISK_MIN,
        DEFAULT_DATA_PATH,
        DATA_DIR,
        ARTIFACTS_DIR
    )
except ImportError:
    try:
        from src.config import (
            MODEL_SAVE_PATH,
            FEATURE_COLUMNS,
            LOW_RISK_MAX,
            HIGH_RISK_MIN,
            DEFAULT_DATA_PATH,
            DATA_DIR,
            ARTIFACTS_DIR
        )
    except ImportError:
        from config import (
            MODEL_SAVE_PATH,
            FEATURE_COLUMNS,
            LOW_RISK_MAX,
            HIGH_RISK_MIN,
            DEFAULT_DATA_PATH,
            DATA_DIR,
            ARTIFACTS_DIR
        )


def classify_risk_tier(prob_percent: float) -> str:
    """
    Maps continuous probability score (0-100%) to academic defense risk tier.
    """
    if prob_percent < LOW_RISK_MAX:
        return "Low Risk (Authentic Human)"
    elif prob_percent <= HIGH_RISK_MIN:
        return "Medium Risk (Inconclusive / Mixed Hybrid)"
    else:
        return "High Risk (AI-Generated / Pasted)"


def calculate_calibrated_authenticity(model, input_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Computes calibrated continuous authenticity probabilities.
    Prevents binary logloss saturation on hybrid/Copilot sessions.
    """
    # 1. Raw XGBoost Tree Probability
    # Note: Column 0 = Human (Class 0), Column 1 = AI (Class 1)
    probs = model.predict_proba(input_df)
    raw_suspicion_ai = float(probs[0][1]) * 100.0
    raw_prob_human = float(probs[0][0]) * 100.0

    # Extract continuous physical telemetry features
    paste_ratio = float(input_df["paste_ratio"].iloc[0]) if "paste_ratio" in input_df.columns else 0.0
    churn_ratio = float(input_df["code_churn_ratio"].iloc[0]) if "code_churn_ratio" in input_df.columns else 0.0
    keystrokes = int(input_df["keystrokes"].iloc[0]) if "keystrokes" in input_df.columns else 0

    # 2. Hybrid Telemetry Calibration
    # If the student is actively typing (keystrokes > 100) BUT has an elevated paste ratio (15% to 75%)
    if keystrokes > 100 and (0.15 <= paste_ratio <= 0.75):
        # Physical Suspicion Index based on paste volume & lack of refactoring
        # Higher paste ratio -> higher suspicion
        # Higher churn (more debugging) -> lower suspicion
        telemetry_suspicion = 25.0 + (paste_ratio * 60.0) + ((1.0 - min(churn_ratio, 0.5) * 2.0) * 10.0)

        # Blend: 15% Tree Prior + 85% Physical Telemetry Index
        calibrated_suspicion = (0.15 * raw_suspicion_ai) + (0.85 * telemetry_suspicion)
        calibrated_suspicion = max(35.0, min(75.0, calibrated_suspicion))  # Keep within Inconclusive band
        is_hybrid = True
    else:
        # For extreme ends (Pure Human or 1-Shot ChatGPT dump), use raw model output
        calibrated_suspicion = raw_suspicion_ai
        is_hybrid = False

    calibrated_authenticity = 100.0 - calibrated_suspicion

    # 3. Assign Academic Risk Tier
    tier = classify_risk_tier(calibrated_suspicion)
    if calibrated_suspicion < LOW_RISK_MAX:
        status = "Verified Authentic"
    elif calibrated_suspicion <= HIGH_RISK_MIN:
        status = "Flagged for Secondary Viva Review"
    else:
        status = "Anomaly Confirmed"

    return {
        "p_human": round(calibrated_authenticity, 2),
        "p_ai": round(calibrated_suspicion, 2),
        "suspicion_score_percent": round(calibrated_suspicion, 2),
        "authenticity_score_percent": round(calibrated_authenticity, 2),
        "risk_tier": tier,
        "status": status,
        "is_authentic": (calibrated_suspicion < LOW_RISK_MAX),
        "is_anomaly": (calibrated_suspicion > HIGH_RISK_MIN),
        "is_hybrid": is_hybrid,
        "raw_suspicion_percent": round(raw_suspicion_ai, 2),
        "raw_authenticity_percent": round(raw_prob_human, 2)
    }


def load_model_bundle(model_path: str = MODEL_SAVE_PATH) -> Dict[str, Any]:
    """
    Loads serialized model bundle containing trained estimator and feature names.
    """
    if not os.path.exists(model_path):
        # Check fallback to model_artifacts
        alt_path = model_path.replace("artifacts", "model_artifacts")
        if os.path.exists(alt_path):
            model_path = alt_path
        else:
            raise FileNotFoundError(f"Model artifact not found at '{model_path}'. Run training first.")
    return joblib.load(model_path)


def predict_authenticity(
    features: Union[Dict[str, float], pd.DataFrame, np.ndarray],
    model_bundle: Dict[str, Any] = None,
    model_path: str = MODEL_SAVE_PATH
) -> Union[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Runs continuous suspicion scoring and tier classification with hybrid calibration.
    Returns dictionary with:
    - suspicion_score_percent / p_ai: float (0.0 to 100.0)
    - authenticity_score_percent / p_human: float (0.0 to 100.0)
    - risk_tier: str ("Low Risk", "Medium Risk", "High Risk")
    - status: str ("Verified Authentic", "Flagged for Secondary Viva Review", "Anomaly Confirmed")
    - is_authentic: bool
    - is_anomaly: bool
    - is_hybrid: bool
    """
    if model_bundle is None:
        model_bundle = load_model_bundle(model_path)

    model = model_bundle["model"]
    feature_names = model_bundle.get("features", FEATURE_COLUMNS)

    # Convert single dictionary to 2D numpy array
    if isinstance(features, dict):
        vec = np.array([[float(features.get(col, 0.0)) for col in feature_names]])
        input_df = pd.DataFrame([features])
        single_input = True
    elif isinstance(features, pd.DataFrame):
        vec = features[feature_names].fillna(0).values.astype(np.float64)
        input_df = features
        single_input = False
    elif isinstance(features, np.ndarray):
        vec = features if features.ndim == 2 else features.reshape(1, -1)
        input_df = pd.DataFrame(vec, columns=feature_names)
        single_input = (len(vec) == 1)
    else:
        raise ValueError("Unsupported input format. Provide dict, DataFrame, or numpy array.")

    # Compute raw probability estimates via predict_proba
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(vec)
        prob_human = probs[:, 0]
        prob_ai = probs[:, 1]
    else:
        preds = model.predict(vec)
        prob_ai = preds.astype(float)
        prob_human = 1.0 - prob_ai

    paste_ratio_idx = feature_names.index("paste_ratio") if "paste_ratio" in feature_names else -1
    churn_ratio_idx = feature_names.index("code_churn_ratio") if "code_churn_ratio" in feature_names else -1
    keystrokes_idx = feature_names.index("keystrokes") if "keystrokes" in feature_names else -1

    results = []
    for i in range(len(vec)):
        raw_ai = float(prob_ai[i]) * 100.0
        raw_human = float(prob_human[i]) * 100.0

        p_ratio = float(vec[i, paste_ratio_idx]) if paste_ratio_idx != -1 else 0.0
        churn = float(vec[i, churn_ratio_idx]) if churn_ratio_idx != -1 else 0.0
        keys = float(vec[i, keystrokes_idx]) if keystrokes_idx != -1 else 0.0

        # Continuous Hybrid Telemetry Calibration
        if keys > 100 and (0.15 <= p_ratio <= 0.75):
            telemetry_suspicion = 25.0 + (p_ratio * 60.0) + ((1.0 - min(churn, 0.5) * 2.0) * 10.0)
            calibrated_suspicion = (0.15 * raw_ai) + (0.85 * telemetry_suspicion)
            calibrated_suspicion = max(35.0, min(75.0, calibrated_suspicion))
            is_hybrid = True
        else:
            calibrated_suspicion = raw_ai
            is_hybrid = False

        calibrated_human = 100.0 - calibrated_suspicion
        p_ai_pct = round(calibrated_suspicion, 2)
        p_human_pct = round(calibrated_human, 2)
        tier = classify_risk_tier(p_ai_pct)

        if p_ai_pct < LOW_RISK_MAX:
            status = "Verified Authentic"
        elif p_ai_pct <= HIGH_RISK_MIN:
            status = "Flagged for Secondary Viva Review"
        else:
            status = "Anomaly Confirmed"

        res = {
            "p_human": p_human_pct,
            "p_ai": p_ai_pct,
            "suspicion_score_percent": p_ai_pct,
            "authenticity_score_percent": p_human_pct,
            "risk_tier": tier,
            "status": status,
            "is_authentic": (p_ai_pct < LOW_RISK_MAX),
            "is_anomaly": (p_ai_pct > HIGH_RISK_MIN),
            "is_hybrid": is_hybrid,
            "probability_human": round(p_human_pct / 100.0, 4),
            "probability_ai": round(p_ai_pct / 100.0, 4),
            "raw_suspicion_percent": round(raw_ai, 2),
            "raw_authenticity_percent": round(raw_human, 2)
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
        pid = row.get("student_id", row.get("participant_id", f"S{idx:02d}"))
        pid_display = (pid[:8] + "..") if isinstance(pid, str) and len(pid) > 10 else str(pid)
        w_idx = row.get("window_index", idx)
        label = row.get("authenticity_label", row.get("label", row.get("target", 0)))
        gt_text = "Class 1 (AI/Paste)" if label == 1 else "Class 0 (Manual)"

        feat_dict = {col: row.get(col, 0) for col in FEATURE_COLUMNS}
        pred = predict_authenticity(feat_dict, model_bundle=model_bundle)

        p_ai = pred["suspicion_score_percent"]
        tier = pred["risk_tier"]

        print(f"  {pid_display:<13} #{w_idx:<7} {gt_text:<16} {p_ai:6.2f}%            {tier:<28}")


def main():
    preprocessed_path = os.path.join(DATA_DIR, "preprocessed_features.csv")
    csv_target = preprocessed_path if os.path.exists(preprocessed_path) else DEFAULT_DATA_PATH
    print(f"[*] Inference: Loading test samples from '{csv_target}'...")
    test_df = pd.read_csv(csv_target)
    bundle = load_model_bundle()
    demonstrate_predictions(test_df, model_bundle=bundle, num_samples=12)


if __name__ == "__main__":
    main()
