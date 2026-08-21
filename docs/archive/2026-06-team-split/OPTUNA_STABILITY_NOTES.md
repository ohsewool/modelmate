# Optuna Stability Notes
<!-- historical: 2026-06 팀 분할 단계 -->
> **이 문서는 기록이다.** `codex/split-for-team` 브랜치에서 팀에 나눠 주려고
> 쓴 것이고, 그 분할은 존재하지 않는다. 경위와 그 뒤로 달라진 것은
> [이 폴더의 README](README.md)에 있다. 지금의 안내는
> [README](../../../README.md)와 [SECURITY](../../../SECURITY.md)에 있다.

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
