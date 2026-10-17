"""
Classifier Model Architectures (classifier.py)
-----------------------------------------------
Defines the machine learning classification algorithms:
1. Random Forest Classifier: Primary ensemble model with feature importance.
2. HistGradientBoosting Classifier: Gradient boosted decision trees for non-linear thresholds.
3. Logistic Regression Baseline: L2-regularized linear model with feature scaling.
"""

from typing import Dict, Any
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

from .config import RF_PARAMS, HGB_PARAMS, LOGREG_PARAMS


def get_models() -> Dict[str, Any]:
    """
    Returns a dictionary of configured classifier architectures for cross-validation benchmarking.
    """
    models = {
        "Random Forest (Tuned)": RandomForestClassifier(**RF_PARAMS),
        "Gradient Boosting": HistGradientBoostingClassifier(**HGB_PARAMS),
        "Logistic Regression Baseline": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(**LOGREG_PARAMS))
        ])
    }
    return models


def build_primary_model_pipeline(model_type: str = "rf") -> Any:
    """
    Builds the primary production model pipeline.
    """
    if model_type == "rf":
        return RandomForestClassifier(**RF_PARAMS)
    elif model_type == "hgb":
        return HistGradientBoostingClassifier(**HGB_PARAMS)
    elif model_type == "logreg":
        return Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(**LOGREG_PARAMS))
        ])
    else:
        raise ValueError(f"Unknown model_type '{model_type}'. Choose 'rf', 'hgb', or 'logreg'.")
