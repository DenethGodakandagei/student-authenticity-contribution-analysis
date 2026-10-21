"""
CollabIntel ML Package: Machine Learning Engine for Student Authenticity Classification
"""

from .src.config import FEATURE_COLUMNS, LOW_RISK_MAX, HIGH_RISK_MIN, DEFAULT_DATA_PATH, MODEL_SAVE_PATH
from .src.preprocess import load_data, clean_and_engineer_features, get_group_kfold_splits, prepare_features_and_target
from .src.classifier import get_models, build_primary_model_pipeline
from .src.train import train_grouped_cv, train_final_model, save_model_artifacts
from .src.predict import predict_authenticity, classify_risk_tier, load_model_bundle

__all__ = [
    "FEATURE_COLUMNS",
    "LOW_RISK_MAX",
    "HIGH_RISK_MIN",
    "DEFAULT_DATA_PATH",
    "MODEL_SAVE_PATH",
    "load_data",
    "clean_and_engineer_features",
    "prepare_features_and_target",
    "get_group_kfold_splits",
    "get_models",
    "build_primary_model_pipeline",
    "train_grouped_cv",
    "train_final_model",
    "save_model_artifacts",
    "predict_authenticity",
    "classify_risk_tier",
    "load_model_bundle"
]
