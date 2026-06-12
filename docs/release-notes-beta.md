# ModelMate Beta MVP Release Notes

This beta package is prepared for a small feedback round with 5-15 users. The
goal is to validate whether ModelMate's guided CSV predictive analysis flow is
understandable, useful, and trustworthy enough for further commercialization.

## Positioning

ModelMate is a guided CSV predictive analysis MVP being extended toward
Agentic AutoML. It helps a user move from CSV upload to data checks, target
recommendation, model comparison, evidence-based reporting, and reusable
prediction API-style output.

## Main Capabilities In This Beta

- CSV/TXT/TSV upload and data validation
- Dataset domain and prediction-purpose judgment
- Target recommendation and excluded-column review
- Cross-validated model comparison
- Optional Optuna tuning
- Result summary and XAI/reason view
- Analysis trace, trust panel, and evidence summary
- HTML report preview/export
- New-data prediction
- Shared prediction API-style flow
- Project history, saved model reuse, and rerun support
- Sample dataset onboarding flow

## Agentic AutoML Workflow Summary

The current Agentic AutoML upgrade exposes a structured analysis trace:

```text
goal -> plan -> tool calls -> observations -> decisions -> evidence -> report
```

The implementation includes deterministic tools and skeletons for data profile,
schema validation, target recommendation, leakage checks, AutoML adapter,
evaluation decisions, XAI evidence, report writing, deployment advice, and human
review/resume contracts.

## Sample Dataset Demo Flow

Start with one of the small synthetic CSV files:

- `sample_data/customer_churn_demo.csv`
- `sample_data/manufacturing_quality_demo.csv`
- `sample_data/public_bike_signup_demo.csv`

Recommended flow:

1. Open the upload screen.
2. Download a sample CSV.
3. Upload it.
4. Confirm the recommended target.
5. Run model comparison.
6. Open the report screen.
7. Review analysis trace, trust panel, and evidence summary.
8. Check report export and prediction API documentation.
9. Reopen the run from history or workspace.

## Report Export

ModelMate includes an HTML report preview/export path. Reports should include
the target, task type, model comparison result, best model, metric, explanation
summary, limitations, and recommended next action.

## Prediction API Reuse

The documented shared prediction endpoint is:

```text
POST /api/v2/{model_id}/predict
```

See `docs/prediction-api.md` for request/response examples and security
limitations.

## Known Limitations

- No complete LLM planner runtime.
- No automatic retraining loop.
- No payment or account-based quota.
- No full async job queue.
- No enterprise compliance program.
- No production deployment automation.
- Prediction quality depends on uploaded data and validation results.

## Feedback Requested

Please report:

- what you tried to predict;
- whether CSV upload and target recommendation were clear;
- whether warnings helped you trust or question the result;
- whether the report was useful;
- whether prediction API reuse made sense;
- what confused you;
- what would make you pay for this;
- whether Free / Pro / Team packaging feels reasonable.
