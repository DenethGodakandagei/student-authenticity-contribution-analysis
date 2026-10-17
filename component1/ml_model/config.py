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
DEFAULT_DATA_PATH = os.path.join(WORKSPACE_ROOT, "pilot_dataset.csv")
FALLBACK_DATA_PATH = os.path.join(WORKSPACE_ROOT, "telemetry_dataset.csv")
ARTIFACTS_DIR = os.path.join(BASE_DIR, "model_artifacts")
MODEL_SAVE_PATH = os.path.join(ARTIFACTS_DIR, "authenticity_classifier.joblib")
METADATA_SAVE_PATH = os.path.join(ARTIFACTS_DIR, "model_metadata.json")

# Ground Truth & Grouping Columns
TARGET_COLUMN = "label"             # 0 = Manual Genuine, 1 = AI-Assisted
GROUP_COLUMN = "participant_id"     # Grouping unit for GroupKFold (P01-P20)

# Feature Vector (12 Biometric & Behavioral Telemetry Features)
FEATURE_COLUMNS = [
    "keystroke_count",
    "manual_chars_inserted",
    "chars_added",
    "chars_deleted",
    "backspace_count",
    "code_churn_ratio",
    "paste_count",
    "pasted_chars",
    "paste_velocity",
    "typing_speed_cpm",
    "paste_ratio",
    "active_time_sec"
]

# Validation Strategy (Zero Data Leakage)
DEFAULT_N_SPLITS = 5
RANDOM_STATE = 42

# Continuous Suspicion Risk Tiers (predict_proba calibration)
LOW_RISK_MAX = 30.0   # Suspicion < 30.0%  -> Low Risk (Verified Authentic Human)
HIGH_RISK_MIN = 70.0  # Suspicion > 70.0%  -> High Risk (AI-Generated / Pasted)
                      # 30.0% <= S <= 70.0% -> Inconclusive (Mixed / Syntax Review)

# Model Hyperparameters
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
