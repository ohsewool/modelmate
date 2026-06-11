# ModelMate Demo Scenario

ModelMate turns CSV data into explainable predictions, grounded reports, and
reusable prediction APIs through a guided AI analyst workflow.

ModelMate는 CSV 데이터를 설명 가능한 예측, 근거 기반 보고서, 재사용 가능한
예측 API로 바꿔주는 가이드형 AI 분석 서비스입니다.

Current status: guided demo workflow. Agentic AutoML structures exist as tools,
observations, decisions, evidence, review, and resume skeletons, but ModelMate
should not be described as a complete autonomous AI data scientist.

## Recommended Demo Datasets

Use arbitrary CSV upload as the main story. Use these synthetic files when a
stable demo is needed:

| File | Recommended Target | Task Type | Demo Message |
| --- | --- | --- | --- |
| `sample_data/customer_churn_demo.csv` | `churn` | classification | Customer churn prediction from usage and support signals |
| `sample_data/manufacturing_quality_demo.csv` | `defect` | classification | Manufacturing defect prediction from machine signals |
| `sample_data/public_bike_signup_demo.csv` | `signup_count` | regression | Public bike signup demand prediction |

Metadata is stored in `sample_data/metadata.json`.

## 3-Minute Demo Flow

1. Open ModelMate and explain the product in one sentence.
   - Message: CSV upload -> data check -> target recommendation -> model
     comparison -> explanation/report -> prediction API.

2. Open the upload screen.
   - Show: the sample dataset cards.
   - Say: users can start with their own CSV or download a sample CSV first.

3. Upload `customer_churn_demo.csv`.
   - Show: row count, column count, missing values, domain/purpose judgment.
   - Explain: ModelMate first checks whether the data can support prediction.

4. Confirm the recommended target.
   - Expected target: `churn`.
   - Show: identifier-like columns such as `customer_id` should not be used as
     normal predictive features.

5. Run model comparison.
   - Show: several models are compared under one task type.
   - Explain: the result comes from measured validation, not a fixed sample-only
     answer.

6. Open result summary and report.
   - Show: analysis trace, trust panel, evidence summary, limitations, and HTML
     report export.
   - Closing message: ModelMate gives a repeatable predictive analysis result
     that can be saved, reviewed, and reused.

## 5-Minute Demo Flow

Use the same first six steps, then add:

7. Show XAI/reason view.
   - Mention that explanations are based on the uploaded dataset and current
     validation results.

8. Show prediction/API reuse.
   - Mention `docs/prediction-api.md` and the existing shared prediction
     endpoint contract.

9. Show workspace/history reuse.
   - Show that previous work can be reopened instead of repeated from zero.

10. Explain Agentic AutoML direction honestly.
    - Current implementation: tool registry, deterministic checks, evidence
      bundle, grounded report, deployment advice, human review/resume skeleton.
    - Honest limit: no real LLM planner runtime, no automatic production
      deployment, no automatic retraining loop.

## Failure Demo

If asked how failures are handled:

1. Upload a tiny or invalid CSV.
2. Show the user-friendly failure message and recommended next action.
3. Explain that ModelMate records failure stage and recovery guidance instead
   of silently failing.

## Talking Points

- "This is a guided CSV predictive workflow."
- "The value is not only model choice; it is the report, trace, reuse, and API
  handoff after the model is selected."
- "ModelMate is not an enterprise AutoML replacement."
- "Predictions and explanations depend on the uploaded dataset and validation
  results."

## What Not To Claim

- Do not say the prediction is guaranteed correct.
- Do not say ModelMate replaces DataRobot, Vertex AI, Azure ML, or Dataiku.
- Do not say the demo is fully autonomous.
- Do not say the API/share flow is production-grade secret management unless
  that production security layer is implemented.
