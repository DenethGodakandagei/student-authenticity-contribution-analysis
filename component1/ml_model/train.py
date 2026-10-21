#!/usr/bin/env python3
"""
Root entrypoint wrapper for src/train.py.
Allows direct execution: python train.py
"""
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(current_dir, "src")
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from src.train import (
    train_grouped_cv,
    train_final_model,
    display_feature_importances,
    save_model_artifacts,
    main
)

if __name__ == "__main__":
    main()
