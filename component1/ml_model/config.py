"""
ML Pipeline Configuration (config.py)
--------------------------------------
Centralized configuration for CollabIntel's Machine Learning Authenticity Engine.
Contains feature column definitions, data paths, model hyperparameters,
and calibrated suspicion risk tier thresholds.
"""

import os

# Base Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COMPONENT1_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
WORKSPACE_ROOT = os.path.abspath(os.path.join(COMPONENT1_ROOT, ".."))

# Data Paths
DEFAULT_DATA_PATH = os.path.join(BASE_DIR, "dataset.csv")
FALLBACK_DATA_PATH = os.path.join(WORKSPACE_ROOT, "pilot_dataset.csv")
ARTIFACTS_DIR = os.path.join(BASE_DIR, "model_artifacts")
MODEL_SAVE_PATH = os.path.join(ARTIFACTS_DIR, "authenticity_classifier.joblib")
METADATA_SAVE_PATH = os.path.join(ARTIFACTS_DIR, "model_metadata.json")

# Ground Truth & Grouping Columns
TARGET_COLUMN = "authenticity_label"  # 0 = Manual Genuine, 1 = AI-Assisted
GROUP_COLUMN = "student_id"           # Grouping unit for GroupKFold (prevents biometric cross-contamination)

# Feature Vector (13 Sensor-Agnostic Behavioral & Biometric Telemetry Features)
FEATURE_COLUMNS = [
    "duration_minutes",
    "keystrokes",
    "lines_added",
    "lines_removed",
    "net_lines",
    "code_churn_ratio",
    "paste_count",
    "characters_pasted",
    "typing_speed_cpm",
    "keystroke_efficiency_keff",
    "paste_ratio",
    "is_offline",
    "files_edited_count"
]

# Validation Strategy (Zero Data Leakage)
DEFAULT_N_SPLITS = 5
RANDOM_STATE = 42

# Continuous Suspicion Risk Tiers (predict_proba calibration)
LOW_RISK_MAX = 30.0   # Suspicion < 30.0%  -> Low Risk (Verified Authentic Human)
HIGH_RISK_MIN = 70.0  # Suspicion > 70.0%  -> High Risk (AI-Generated / Pasted)
                      # 30.0% <= S <= 70.0% -> Inconclusive (Mixed / Syntax Review)

# Model Hyperparameters
XGB_PARAMS = {
    "n_estimators": 100,
    "max_depth": 5,
    "learning_rate": 0.05,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "eval_metric": "logloss",
    "random_state": RANDOM_STATE
}

RF_PARAMS = {
    "n_estimators": 100,
    "max_depth": 6,
    "min_samples_leaf": 3,
    "random_state": RANDOM_STATE
}

HGB_PARAMS = {
    "max_iter": 100,
    "max_depth": 5,
    "min_samples_leaf": 5,
    "random_state": RANDOM_STATE
}

LOGREG_PARAMS = {
    "max_iter": 1000,
    "random_state": RANDOM_STATE
}
