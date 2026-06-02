# Optuna Stability Notes

## Purpose

Part 1 is responsible for making the AutoML backend reliable across uploaded datasets.
This update makes `/api/run-optuna` safer and easier for the frontend to explain.

## Behavior

- Optuna now requires cross-validation results before tuning.
- `n_trials` is clamped to 5-50 so requests cannot make tuning too slow.
- Unsupported best models return `status: skipped` instead of fake parameters.
- Classification reports `metric_name: ROC-AUC`.
- Regression reports `metric_name: R2`.
- Existing `before_roc` and `after_roc` fields remain for frontend compatibility.

## Response Shape

Successful tuning:

```json
{
  "status": "ok",
  "best_params": {},
  "before_score": 0.4125,
  "after_score": 0.4227,
  "before_roc": 0.4125,
  "after_roc": 0.4227,
  "improvement": 1.02,
  "metric_name": "R2",
  "n_trials": 5
}
```

Skipped tuning:

```json
{
  "status": "skipped",
  "reason": "Logistic Regression does not have a configured Optuna search space.",
  "best_params": {},
  "before_score": 0.9964,
  "after_score": 0.9964,
  "before_roc": 0.9964,
  "after_roc": 0.9964,
  "improvement": 0.0,
  "metric_name": "ROC-AUC",
  "n_trials": 5
}
```

## Local Verification

- Combined backend parts compile successfully.
- Optuna before CV returns a clear 400 error.
- Iris classification with Logistic Regression returns `status: skipped`.
- Diabetes regression with Random Forest returns `status: ok` and tuned R2.
