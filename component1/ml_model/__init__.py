"""
CollabIntel ML Package: Machine Learning Engine for Student Authenticity Classification
"""

from .config import FEATURE_COLUMNS, LOW_RISK_MAX, HIGH_RISK_MIN
from .preprocess import load_data, clean_and_engineer_features, get_group_kfold_splits
from .classifier import get_models
from .train import train_grouped_cv, train_final_model
from .predict import predict_authenticity, classify_risk_tier

__all__ = [
    "FEATURE_COLUMNS",
    "LOW_RISK_MAX",
    "HIGH_RISK_MIN",
    "load_data",
    "clean_and_engineer_features",
    "get_group_kfold_splits",
    "get_models",
    "train_grouped_cv",
    "train_final_model",
    "predict_authenticity",
    "classify_risk_tier",
]
