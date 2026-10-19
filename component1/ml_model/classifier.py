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

try:
    from xgboost import XGBClassifier
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

try:
    from .config import XGB_PARAMS, RF_PARAMS, HGB_PARAMS, LOGREG_PARAMS
except ImportError:
    from config import XGB_PARAMS, RF_PARAMS, HGB_PARAMS, LOGREG_PARAMS


def get_models() -> Dict[str, Any]:
    """
    Returns a dictionary of configured classifier architectures for cross-validation benchmarking.
    """
    models = {}
    if HAS_XGBOOST:
        models["XGBoost (Tuned)"] = XGBClassifier(**XGB_PARAMS)
    models["Random Forest (Tuned)"] = RandomForestClassifier(**RF_PARAMS)
    models["Gradient Boosting"] = HistGradientBoostingClassifier(**HGB_PARAMS)
    models["Logistic Regression Baseline"] = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(**LOGREG_PARAMS))
    ])
    return models


def build_primary_model_pipeline(model_type: str = "xgb") -> Any:
    """
    Builds the primary production model pipeline.
    """
    if model_type == "xgb":
        if not HAS_XGBOOST:
            raise ImportError("xgboost is not installed. Please run 'pip install xgboost'.")
        return XGBClassifier(**XGB_PARAMS)
    elif model_type == "rf":
        return RandomForestClassifier(**RF_PARAMS)
    elif model_type == "hgb":
        return HistGradientBoostingClassifier(**HGB_PARAMS)
    elif model_type == "logreg":
        return Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(**LOGREG_PARAMS))
        ])
    else:
        raise ValueError(f"Unknown model_type '{model_type}'. Choose 'xgb', 'rf', 'hgb', or 'logreg'.")

