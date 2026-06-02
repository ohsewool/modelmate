# Public Dataset Test Results

Branch: `codex/split-for-team`

This file records the first AutoML robustness pass for the Part 1 backend owner.

## Summary

| Dataset | Type | Rows x Cols | Best Model | Features After Preprocess | Failed Models | Result |
|---|---:|---:|---|---:|---:|---|
| iris_classification | classification | 120 x 8 | Logistic Regression | 4 | 0 | pass |
| breast_cancer_classification | classification | 120 x 34 | Logistic Regression | 30 | 0 | pass |
| wine_multiclass_classification | classification | 120 x 17 | Random Forest | 13 | 0 | pass |
| diabetes_regression | regression | 120 x 14 | Random Forest | 10 | 0 | pass |
| california_housing_regression | regression | 120 x 12 | Ridge Regression | 8 | 0 | pass |

## What Was Tested

- CSV-shaped public datasets generated from scikit-learn public datasets.
- Added synthetic `row_id`, `created_at`, and `constant_col` columns to verify auto-drop logic.
- Ran `set_target`, `run_cv`, `feature_info`, and `predict_single` for every dataset.
- Confirmed classification and regression workflows both pass.

## Auto-Drop Behavior

| Dataset | Suggested Drops |
|---|---|
| iris_classification | row_id, created_at, constant_col |
| breast_cancer_classification | row_id, created_at, constant_col |
| wine_multiclass_classification | row_id, created_at, constant_col |
| diabetes_regression | row_id, created_at, constant_col |
| california_housing_regression | row_id, created_at, constant_col |

## Notes

- ID-like, datetime-like, and constant columns are now filtered more conservatively.
- Model failures are represented with `status: failed` and `error_message` instead of fake `0.0` metrics.
- Next recommended step: test real uploaded CSV files from UCI/Kaggle-style sources and verify the frontend rendering of failed model rows.
