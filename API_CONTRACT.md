# ModelMate API Contract Notes

Branch: `codex/split-for-team`

This document records backend response fields that frontend teammates can use safely.

## Compatibility Rule

Do not remove or rename existing fields without team agreement.

New fields should be treated as optional by the frontend:

```js
const explanations = data.explanations || {}
```

## POST `/api/set-target`

Existing fields are preserved, including:

- `n_samples`
- `n_features`
- `failure_rate`
- `missing_total`
- `dropped_cols`
- `features`
- `cat_cols`
- `corr_data`
- `corr_cols`
- `distributions`
- `class_distribution`
- `label_map`
- `task_type`
- `n_unique_target`
- `stats`

Optional new field:

```json
{
  "explanations": {
    "task_reason": "Target has 3 unique value(s), so it was treated as a classification problem.",
    "drop_reasons": {
      "row_id": "Dropped because it looks like an ID or identifier column.",
      "created_at": "Dropped from the base feature set because it is datetime-like."
    },
    "preprocess_summary": "Training data was prepared with 8 feature column(s)."
  }
}
```

Frontend usage:

- Show `task_reason` in an "AI decision" or "Analysis setup" card.
- Show `drop_reasons` only when it has keys.
- Show `preprocess_summary` near feature count or EDA summary.

## POST `/api/run-cv`

Existing fields are preserved, including:

- `results`
- `best_model`
- `feature_importance`
- `task_type`
- `final_accuracy`
- `final_f1`
- `final_r2`
- `final_rmse`

Optional new field:

```json
{
  "explanations": {
    "best_model_reason": "Random Forest was selected because it had the highest roc_auc score. Best roc_auc: 0.9412.",
    "failed_model_count": 1
  }
}
```

Frontend usage:

- Show `best_model_reason` above or below the leaderboard.
- If `failed_model_count > 0`, show a subtle warning that some models were skipped or failed.
- Do not assume `explanations` always exists.

## Failed Model Row

Model rows can include:

```json
{
  "model": "XGBoost",
  "status": "failed",
  "error_message": "unsupported input type",
  "accuracy": null,
  "f1": null,
  "roc_auc": null
}
```

Frontend should render failed rows differently from valid low-scoring rows.

## GET `/api/report/summary`

Returns one structured JSON payload for the report/XAI backend flow.

Frontend-ready sections:

- `readiness`: completion flags for upload, target selection, CV, model, and Optuna.
- `executive_summary`: short plain-language result summary.
- `dataset`: raw/training shape, target, task type, missing count, categorical columns.
- `preprocessing`: manually dropped columns, auto-dropped columns, and drop reasons.
- `model_selection`: CV results, best model, score fields, failed model count.
- `optimization`: Optuna status, metric name, before/after score, trials, params.
- `final_metrics`: final train-set metrics for classification or regression.
- `feature_evidence`: top feature importance or coefficient evidence.
- `presentation_points`: short bullet points the UI can display.

## GET `/api/explain/summary`

Returns a stable global explanation for the selected model.

Fields:

- `status`: `ok` when explanation data is available.
- `model`: selected model name.
- `task_type`: `classification` or `regression`.
- `source`: one of `feature_importance`, `model_coefficient`, or `target_correlation`.
- `summary`: short explanation sentence.
- `items`: ranked feature list with `feature`, `importance`, `raw_importance`, and `source`.
- `limitations`: explanation caveats for the UI.

## GET `/api/explain/local/{idx}`

Returns a stable per-row explanation for one sample.

Fields:

- `sample_index`: row index in the training data.
- `prediction`: model prediction.
- `prediction_label`: decoded class label when available.
- `probabilities` and `confidence`: classification-only fields when supported.
- `features`: ranked local contribution approximation with value, baseline, direction, and contribution.
- `source`: global evidence source used for the local approximation.

