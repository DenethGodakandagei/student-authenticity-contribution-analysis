"""
INCODE Machine Learning Core Engine (ml_model.src)
--------------------------------------------------
Modular pipeline package providing:
- config: Model hyperparameters, feature lists, risk tier thresholds
- preprocess: Data cleaning, feature extraction, and GroupKFold partitioning
- classifier: Model architectures (XGBoost, Random Forest, etc.)
- train: GroupKFold cross-validation and production model fitting
- predict: Continuous probability inference and calibrated risk tier classification
"""

from .config import (
    FEATURE_COLUMNS,
    TARGET_COLUMN,
    GROUP_COLUMN,
    DEFAULT_DATA_PATH,
    MODEL_SAVE_PATH,
    METADATA_SAVE_PATH,
    LOW_RISK_MAX,
    HIGH_RISK_MIN,
    DEFAULT_N_SPLITS
)

from .preprocess import (
    clean_and_engineer_features,
    prepare_features_and_target,
    load_data,
    get_group_kfold_splits,
    export_preprocessed_datasets
)

from .classifier import (
    get_models,
    build_primary_model_pipeline
)

from .train import (
    train_grouped_cv,
    train_final_model,
    display_feature_importances,
    save_model_artifacts
)

from .predict import (
    predict_authenticity,
    classify_risk_tier,
    load_model_bundle,
    demonstrate_predictions
)

__all__ = [
    "FEATURE_COLUMNS",
    "TARGET_COLUMN",
    "GROUP_COLUMN",
    "DEFAULT_DATA_PATH",
    "MODEL_SAVE_PATH",
    "METADATA_SAVE_PATH",
    "LOW_RISK_MAX",
    "HIGH_RISK_MIN",
    "DEFAULT_N_SPLITS",
    "clean_and_engineer_features",
    "prepare_features_and_target",
    "load_data",
    "get_group_kfold_splits",
    "export_preprocessed_datasets",
    "get_models",
    "build_primary_model_pipeline",
    "train_grouped_cv",
    "train_final_model",
    "display_feature_importances",
    "save_model_artifacts",
    "predict_authenticity",
    "classify_risk_tier",
    "load_model_bundle",
    "demonstrate_predictions"
]
