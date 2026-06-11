# ModelMate Demo Scenario

ModelMate turns CSV data into explainable predictions, grounded reports, and
reusable prediction APIs through a guided AI analyst workflow.

ModelMate는 CSV 데이터를 설명 가능한 예측, 근거 기반 보고서, 재사용 가능한
예측 API로 바꿔주는 가이드형 AI 분석 서비스입니다.

Current status: Commercialization PR-01 demo scenario. The Agentic AutoML
architecture exists as tool, evidence, decision, review, and resume skeletons,
but ModelMate should not be described as a fully autonomous AI data scientist.

## Recommended Demo Datasets

Use arbitrary CSV upload as the main story. Use these synthetic files only for
stable presentation rehearsal:

| File | Recommended Target | Task Type | Demo Message |
| --- | --- | --- | --- |
| `sample_data/customer_churn_demo.csv` | `churn` | classification | Customer churn prediction from usage and support signals |
| `sample_data/manufacturing_quality_demo.csv` | `defect` | classification | Manufacturing defect prediction from machine signals |
| `sample_data/public_bike_signup_demo.csv` | `signup_count` | regression | Public bike signup demand prediction |

## 3-Minute Demo Flow

1. Open ModelMate and explain the product in one sentence.
   - Message: CSV upload -> data check -> target recommendation -> model
     comparison -> explanation/report -> prediction API.

2. Login and open the CSV upload screen.
   - Click: `시작하기` or login button.
   - Show: ModelMate starts from a normal CSV workflow, not a fixed sample-only
     demo.

3. Upload `customer_churn_demo.csv`.
   - Show: row count, column count, missing values, domain/purpose judgment.
   - Explain: ModelMate first checks whether the data can support prediction.

4. Confirm the recommended target.
   - Expected target: `churn`.
   - Show: ID-like columns are not useful prediction targets and may be excluded
     from features.

5. Run model comparison.
   - Show: several models are compared under one task type.
   - Explain: the model is chosen from measured results, not from a hard-coded
     answer.

6. Open result summary, XAI/reason view, and report/share flow.
   - Show: performance, selected model, top evidence, limitations, and
     prediction/share API path.
   - Show: `Model trust summary`, `Evidence-based report`, and `Analysis trace`
     cards so the audience can see why the result is believable.
   - Click: `HTML로 열기` or report download to show the grounded report export.
   - Closing message: ModelMate gives a repeatable predictive analysis result
     that can be reused after the first CSV upload.

## 5-Minute Demo Flow

Use the same first six steps, then add:

7. Show target and excluded-column rationale.
   - Mention: ID, name, email, result-like, and high-cardinality columns are
     treated carefully because they can distort prediction.

8. Show report/XAI limitations.
   - Mention: if explanation evidence is limited, ModelMate records that
     limitation instead of pretending certainty.

9. Show the analysis trace.
   - Mention: the report screen surfaces goal interpretation, data profile,
     schema validation, target recommendation, leakage check, AutoML training,
     evaluation decision, XAI evidence, report writing, deployment readiness,
     and human review status.
   - Explain: this is not just a model score; it is a visible chain of
     observations and decisions.

10. Show workspace/history reuse.
   - Click: history or workspace screen.
   - Show: the user can reopen previous work rather than repeating every step.

11. Show prediction/API-style reuse.
    - Click: prediction or share/API screen.
    - Explain: the commercial value is not only "model recommendation"; it is
      the ability to reuse the result for later predictions.
    - Mention: `docs/prediction-api.md` documents the existing
      `/api/v2/{model_id}/predict` endpoint, request/response examples, and
      security limitations.

12. Briefly explain Agentic AutoML direction.
    - Current implementation: tool registry, deterministic checks, evidence
      bundle, grounded report, deployment advice, human review/resume skeleton.
    - Honest limit: no real LLM planner runtime, no automatic production
      deployment, no automatic retraining loop.

## Report Screen Talking Points

- Analysis trace: shows the analysis path from user goal to report.
- Model trust summary: data warnings, leakage warnings, metric threshold,
  explanation availability, deployment readiness, and human review status.
- Evidence-based report: selected target, task type, best model, best metric,
  top features, limitations, and recommended next action.
- Report export: HTML report preview/download contains the same grounded
  evidence and the limitation sentence about uploaded data and validation.
- Reusable prediction API: shared models can be called through the documented
  `/api/v2/{model_id}/predict` endpoint.

Use the phrase "guided analysis trace" rather than "fully autonomous AI data
scientist."

## Backup Dataset Switch

If the churn demo behaves unexpectedly:

1. Use `manufacturing_quality_demo.csv`.
2. Expected target: `defect`.
3. Emphasize defect prediction and data-quality judgment.

If a regression example is needed:

1. Use `public_bike_signup_demo.csv`.
2. Expected target: `signup_count`.
3. Emphasize demand prediction and public-service data use.

## What Not To Claim

- Do not say ModelMate replaces DataRobot, Vertex AI, Azure ML, or Dataiku.
- Do not say ModelMate is already a fully autonomous real AI agent.
- Do not say the prediction is guaranteed correct.
- Do not say the API key/share flow is production-grade secret management unless
  that production security layer is implemented.

## One-Sentence Closing

ModelMate is a guided CSV predictive analysis SaaS MVP: it helps a user turn a
CSV into a prediction target, model comparison, explanation, grounded report,
and reusable prediction flow.
