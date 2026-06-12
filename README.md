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
claim that ModelMate is already a complete autonomous AI data scientist.

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
- Auth-lite session foundation with guest demo mode
- Email/password register, login, `/auth/me`, and logout smoke checks
- User-owned project foundation with MVP ownership checks for saved projects,
  datasets, agent analysis runs, and private deployed model metadata

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
- auth-lite session foundation with guest demo mode
- basic usage limits
- try-with-sample-data onboarding
- clear explanation of what ModelMate does and does not do

Grounded reports and reusable prediction APIs are important because they turn a
one-time model comparison screen into a SaaS-style output that can be saved,
shared, reviewed, and reused. See `docs/prediction-api.md` for the current
shared prediction API contract and limitations.

Operational readiness is handled at MVP level: status tracking, friendly
failure recovery messages, and demo guardrails for file size, row count, column
count, and training budget. See `docs/operational-readiness.md`.

Auth-lite is handled at MVP foundation level. Guest demo mode remains available,
and `/api/session` exposes whether the current context is guest or authenticated
so the next PR can attach user-owned project rules. Email/password auth uses
PBKDF2 password hashing and bearer-token session revocation on logout. This is
not full RBAC, payment, enterprise SSO, or account-based quota. See
`docs/auth-lite-session.md`.

User-owned projects are handled at MVP foundation level. Signed-in users see
their own saved projects and private analysis metadata, while guest demo mode
stays available for sample-data evaluation. This is MVP access control, not
enterprise-grade tenant isolation. See `docs/security-notes.md` and
`docs/privacy.md`.

Available without signing in:

- landing page and product docs;
- sample dataset selector and guest demo session;
- CSV upload/demo analysis flow;
- report preview/export demo flow when the current session has analysis state;
- prediction API documentation and public prediction invocation for shared
  model URLs.

Requires signing in:

- account-scoped project list and dataset metadata;
- project detail access;
- account-scoped analysis history;
- private agent analysis run trace access;
- private deployed model metadata and deletion.

First-time users can try ModelMate without preparing their own CSV. The upload
screen links to three small synthetic sample datasets:

- `sample_data/customer_churn_demo.csv`
- `sample_data/manufacturing_quality_demo.csv`
- `sample_data/public_bike_signup_demo.csv`

See `sample_data/metadata.json`, `docs/onboarding.md`, and
`docs/demo-agentic-automl.md` for recommended targets, task types, demo goals,
and guided demo flow.

Beta testing is prepared for a small 5-15 user feedback round. This is a
feedback-driven commercialization step for a guided CSV predictive analysis MVP,
not a claim of production readiness. Use these documents before inviting beta
users:

- Beta-ready checklist: `docs/beta-readiness.md`
- Feedback questions: `docs/feedback-guide.md`
- Demo QA checklist: `docs/demo-qa-checklist.md`
- GitHub issue templates: `.github/ISSUE_TEMPLATE/`

To report bugs or beta feedback, open a GitHub issue using the bug report,
feature request, or beta feedback template. Known limitations remain: no
payment, no account-based quota, no full async job queue, no enterprise
compliance program, and no complete autonomous AI analyst runtime.

Final demo and beta QA documents:

- Beta MVP release notes: `docs/release-notes-beta.md`
- Beta tester guide: `docs/beta-tester-guide.md`
- Beta feedback message draft: `docs/beta-feedback-message.md`
- Automated QA guide: `docs/automated-qa.md`
- Auth-lite session foundation: `docs/auth-lite-session.md`
- Project rerun and PR-14 notes: `docs/project-rerun.md`
- Commercialization roadmap: `docs/commercialization-roadmap.md`
- Commercialization backlog: `docs/commercialization-backlog.md`
- Deployment checklist: `docs/deployment-checklist.md`
- Final QA checklist: `docs/final-qa.md`
- Demo QA checklist: `docs/demo-qa-checklist.md`

Beta launch package:

- Status: small beta package for 5-15 testers
- Try the demo: open the app, download a sample CSV from the upload screen,
  upload it, run model comparison, review report/export/API/history
- What to test: clarity of CSV choice, target recommendation, warnings, report
  usefulness, prediction API reuse, and project rerun
- Feedback: use GitHub issue templates or the placeholder form in
  `docs/beta-feedback-message.md`
- Direction: feedback-driven commercialization of a guided CSV predictive
  analysis MVP

Screenshots to add before a wider public demo:

- Landing page
- CSV upload and sample dataset selector
- Target recommendation
- Agent timeline
- Trust panel
- Model comparison
- Report export
- Prediction API documentation
- Project history/rerun
- Privacy/terms/pricing links

Release QA can be run with:

```bash
python scripts/run_release_qa.py --base-url https://web-production-5d6fa.up.railway.app --skip-training
python scripts/run_auth_smoke.py --base-url https://web-production-5d6fa.up.railway.app
python scripts/run_ownership_smoke.py --base-url https://web-production-5d6fa.up.railway.app
python scripts/run_product_smoke.py --base-url https://web-production-5d6fa.up.railway.app
```

Automated QA checks endpoints, sample upload, target selection, report export,
auth-lite session context, register/login/logout smoke, MVP ownership smoke,
guest demo session start, and deployment smoke paths. Human review is still needed for usability, copy
clarity, visual layout, and whether beta users find the report persuasive.

Commercial SaaS MVP trust documents are drafted, not finalized legal policies:

- Privacy and data handling draft: `docs/privacy.md`
- Terms and acceptable use draft: `docs/terms.md`
- MVP security notes: `docs/security-notes.md`
- Planned pricing mock: `docs/pricing.md`

These documents clarify current limitations. ModelMate is not an enterprise
AutoML replacement, does not claim enterprise compliance, and does not
currently implement payment, billing, account-based quota, or full production
security governance.

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
python scripts/run_ownership_smoke.py --base-url http://localhost:8000
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
