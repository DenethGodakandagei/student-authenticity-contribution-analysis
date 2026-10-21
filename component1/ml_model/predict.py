#!/usr/bin/env python3
"""
Root entrypoint wrapper for src/predict.py.
Allows direct execution: python predict.py
"""
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(current_dir, "src")
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from src.predict import (
    classify_risk_tier,
    load_model_bundle,
    predict_authenticity,
    demonstrate_predictions,
    main
)

if __name__ == "__main__":
    main()
