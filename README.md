# ModelMate

ModelMate turns CSV data into explainable predictions, grounded reports, and
reusable prediction APIs through a guided AI analyst workflow.

ModelMate는 CSV 데이터를 설명 가능한 예측, 근거 기반 보고서, 재사용 가능한
예측 API로 바꿔주는 가이드형 AI 분석 서비스입니다.

It helps a user upload a CSV, inspect whether the data is usable, choose a
prediction target, compare models, understand the result, and reuse the outcome
through reports, prediction screens, workspace history, and API-style sharing.

## Product Position

ModelMate is not intended to replace enterprise AutoML platforms such as
DataRobot, Vertex AI, Azure ML, or Dataiku.

The realistic product position is:

> Guided CSV predictive analysis SaaS MVP.

Users do not primarily buy "an AI agent" itself. They use ModelMate to get:

- a reliable prediction result from a CSV,
- evidence-backed model and data explanations,
- a reusable report,
- and a prediction API/share flow that can be demonstrated or extended later.

The Agentic AutoML work in this repository is an architecture direction, not a
claim that ModelMate is already a fully autonomous AI data scientist.

## Deployment

- Railway: https://web-production-5d6fa.up.railway.app/
- GitHub: https://github.com/ohsewool/-
- Branch: `main`

## Current AutoML Features

- CSV/TXT/TSV upload and validation
- Dataset domain and prediction-purpose inference
- Target recommendation and excluded-column review
- Cross-validated model comparison
- Optional Optuna tuning
- Result summary and XAI/reason view
- Analysis trace, trust summary, and evidence summary on the report screen
- HTML report preview/download for grounded analysis reports
- New-data prediction
- Workspace/history reuse
- Share/API-style flow
- Reusable prediction API documentation for shared models

## Agentic AutoML Upgrade Status

ModelMate is being extended toward a real tool-calling Agentic AutoML platform.
The current implementation keeps the existing AutoML flow and adds tool,
evidence, decision, review, and resume skeletons around it.

Implemented skeleton flow:

1. Mock goal-to-plan structure
2. Tool registry
3. Data profile and schema validation tools
4. Target recommendation and leakage check tools
5. AutoML training adapter around the existing pipeline
6. Evaluation decision tool
7. XAI/evidence bundle adapter
8. Evidence validation tool
9. Grounded report writer
10. Deployment readiness advice
11. Human review and resume skeleton

Still not implemented:

- real LLM planner runtime
- fully dynamic tool selection runtime
- automatic retraining loops
- production deployment automation
- persistent human review queue
- enterprise model registry
- feature store
- full MLOps lifecycle
- payment system

## Commercialization Readiness Focus

Until the November graduation-project target, the priority is not large
enterprise expansion. The priority is SaaS readiness:

- stable demo flow
- clear README and docs
- report export path
- prediction API documentation
- project save/reopen/re-run flow
- basic usage limits
- clear explanation of what ModelMate does and does not do

Grounded reports and reusable prediction APIs are important because they turn a
one-time model comparison screen into a SaaS-style output that can be saved,
shared, reviewed, and reused. See `docs/prediction-api.md` for the current
shared prediction API contract and limitations.

Operational readiness is handled at MVP level: status tracking, friendly
failure recovery messages, and demo guardrails for file size, row count, column
count, and training budget. See `docs/operational-readiness.md`.

Large enterprise features are intentionally out of scope for now:

- enterprise model registry
- feature store
- full MLOps automation
- automatic retraining loop
- large connector system
- billing/payment system

## Tool Registry

- `data_profile_tool`
- `schema_validation_tool`
- `target_recommendation_tool`
- `leakage_check_tool`
- `automl_training_tool`
- `evaluation_tool`
- `shap_explainer_tool`
- `validation_tool`
- `report_writer_tool`
- `deployment_check_tool`

## Local Run

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Frontend build:

```bash
cd frontend
npm run build
```

## QA

```bash
python -m compileall backend
python scripts/run_upload_validation_qa.py
python scripts/run_training_benchmark.py
python scripts/run_full_qa.py --skip-slow
```

## Demo Scenario

Recommended demo files live in `sample_data/`.

1. Login
2. Upload a CSV
3. Check dataset judgment and target recommendation
4. Run model comparison
5. Review selected model and performance
6. Open report/XAI/reason view
7. Check workspace history or share/API flow
8. Explain the Agentic AutoML architecture direction honestly:
   tool registry, evidence bundle, grounded report, deployment advice, and
   human review/resume skeleton

Detailed 3-minute and 5-minute demo flows are documented in
`docs/demo-agentic-automl.md`.

## Admin Account

The admin account can be configured through environment variables:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Default values are `admin@modelmate.local` / `admin1234`.
