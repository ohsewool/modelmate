# ModelMate Agent Architecture

Current status: PR-11 deployment readiness advice. This document describes the target
architecture, but the production app is still the existing ModelMate AutoML
workflow. ModelMate is being extended toward Agentic AutoML.

## Target Flow

The future agent must leave a trace:

```text
user goal -> plan -> tool call -> observation -> decision -> retry / human review / final report
```

Until that runtime flow is implemented, do not claim that ModelMate already has
a completed real AI agent.

## Current Repository Shape

The backend uses `backend/main.py` to load `backend/main_parts/*.py` into one
FastAPI app. Upload, target selection, model comparison, Optuna, XAI, prediction,
share/API, workspace, and report features already live in that legacy flow.

Agent work must protect that flow:

- Do not rewrite `app.py`, `backend/main.py`, or `backend/main_parts` in one large change.
- Do not delete existing endpoints.
- Do not replace the AutoML pipeline.
- Wrap existing behavior later as tools.

## Agent Boundary

Use one decision-making agent:

- `Supervisor Planner`: interprets the user goal, creates a plan, chooses tools,
  reads observations, and decides the next action.

Everything else should start as a tool adapter:

- `data_profile_tool`
- `schema_validation_tool`
- `target_recommendation_tool`
- `leakage_check_tool`
- `automl_training_tool`
- `evaluation_tool`
- `shap_explainer_tool`
- `validation_tool`
- `deployment_check_tool`
- `report_writer_tool`
- `human_review_handoff`

## PR-02 Trace Model

PR-02 prepares storage-facing contracts for:

- `analysis_runs`: one user goal and agent session
- `analysis_steps`: ordered plan, tool, observation, or decision steps
- `tool_calls`: selected tool name, arguments, status, and timing
- `observations`: what the agent read from a tool result
- `decisions`: what the agent decided after reading observations

The helper is intentionally not wired into app startup yet. This protects the
existing demo and deployment flow while giving PR-03 a clean persistence boundary.

## PR-03 Mock Planner API

PR-03 adds a small deterministic endpoint:

```text
POST /api/agent/mock-plan
GET  /api/agent/runs/{analysis_run_id}
```

The endpoint stores an `analysis_run` and ordered `analysis_steps` from the mock
`SupervisorPlanner`. It does not call an LLM and does not call the existing
AutoML pipeline.

## PR-04 Mock Timeline

PR-04 adds mock-only tool registry and timeline endpoints:

```text
GET  /api/agent/tools
POST /api/agent/mock-timeline
GET  /api/agent/runs/{analysis_run_id}/timeline
```

The mock timeline records:

1. structured plan
2. selected mock tool calls
3. mock observations
4. placeholder decisions

This is still not a real LLM agent. The mock tools expose names, descriptions,
input/output schemas, and mock responses only. They do not inspect CSV data and
do not call the existing AutoML pipeline.

## PR-05 Deterministic Safety Tools

PR-05 replaces the first two mock tools with deterministic Python tools:

- `data_profile_tool`: profiles row/column counts, dtypes, missing values, unique
  counts, high-cardinality columns, constant columns, id-like columns, numeric
  columns, categorical columns, datetime-like columns, class-balance candidates,
  and profiling warnings.
- `schema_validation_tool`: acts as a safety gate before training by returning
  pass/warning/fail status, violations, severe missing-value columns, constant
  columns, identifier-like columns, too-few-row/too-few-column checks, training
  suitability, and recommended next action.

These tools are deterministic and do not call an LLM. They also do not call the
existing AutoML training pipeline. Their outputs are JSON-compatible so they can
be stored as future observations.

## PR-06 Deterministic Target And Leakage Tools

PR-06 replaces two more mock tools with deterministic Python tools:

- `target_recommendation_tool`: ranks possible target columns from profile and
  validation outputs. It rejects identifier-like columns, constant columns,
  high-cardinality columns, and heavily missing columns. Each candidate includes
  inferred task type, confidence, reason, warnings, balance/distribution
  summary, suitability, and next action.
- `leakage_check_tool`: reviews feature columns against the chosen target. It
  flags target-like names, result/label/status columns, possible future-only
  fields, identifier-like columns, high-cardinality columns, and datetime fields
  that need time-order review.

These tools are deterministic safety gates. They are not statistical leakage
proofs and they do not run training. Their output is JSON-compatible so the
mock timeline can store it as observations and decisions.

## PR-07 AutoML Training Adapter

PR-07 wraps the existing ModelMate training path as `automl_training_tool`.
The adapter calls the current `set_target` and `run_cv` functions instead of
reimplementing model training. It accepts dataset input, target column,
excluded columns, task hints, metric preference, and budget metadata, then
returns a JSON-compatible wrapper around the existing model comparison result:

- success/failure status
- task type and target column
- used and excluded features
- leaderboard and compact leaderboard summary
- best model and best metric
- training warnings/failures
- existing in-memory model identifier
- recommended next action for PR-08 evaluation policy

The adapter is still not a real LLM agent. It does not add evaluation retry
policy, SHAP, final report generation, or deployment checks.

## PR-08 Evaluation Tool

PR-08 adds `evaluation_tool`, a deterministic metric-threshold evaluator for
`automl_training_tool` output. It does not run training again. It reads the
leaderboard and best metric, then returns:

- evaluated metric and value
- pass/warning/fail/unknown threshold status
- model quality: strong, acceptable, weak, invalid, or unknown
- warnings and failure reasons
- an observation payload
- a decision placeholder
- a retry recommendation placeholder that is not executed in PR-08

Default thresholds are intentionally moderate:

- classification: pass at 0.80, warning at 0.65
- regression R2: pass at 0.70, warning at 0.40

Lower-is-better metrics such as RMSE and MAE are supported as warning/unknown
gates when provided, but PR-08 does not implement advanced evaluation policy.

## PR-09 XAI Adapter And Evidence Bundle

PR-09 adds `shap_explainer_tool`, an adapter around the existing ModelMate
explanation helpers. It does not create a final report and does not call an LLM.

The adapter tries explanation sources in this order:

1. existing `global_explanation_items` / `local_explanation_items` helpers
2. model-provided `feature_importances_`
3. model-provided `coef_`
4. unavailable explanation observation with limitations

The tool returns JSON-compatible explanation output:

- explanation type
- global and local explanations
- top features
- warnings and limitations
- observation payload
- evidence items
- recommended next action

PR-09 also adds an evidence bundle structure for PR-10. The bundle can carry
model evidence, metric evidence, explanation evidence, data-quality warnings,
leakage warnings, limitations, source tool calls, and creation time. This is
only evidence preparation for a future report writer.

## PR-10 Validation And Grounded Report Draft

PR-10 adds two deterministic tools:

- `validation_tool`: checks whether an evidence bundle can support a grounded
  report. It returns grounded, weak, invalid, or unknown-style validation
  signals through a JSON-compatible observation.
- `report_writer_tool`: creates a Markdown report draft from the provided
  evidence bundle and validation result.

The report writer does not call an LLM. It only writes from supplied evidence
such as target, task type, model summary, metric summary, leakage warnings, data
quality warnings, XAI explanation, and limitations. If evidence is missing, the
report states that evidence is missing instead of inventing claims.

PR-10 also adds `docs/report-center.md` and a backend placeholder for future
Report Center storage. It does not implement a frontend Report Center, PDF
export, deployment checks, human review queues, or resume flows.

## PR-11 Deployment Readiness Advice

PR-11 adds `deployment_check_tool`, a deterministic advice tool that reads:

- evidence bundle
- validation result
- report result
- metric and threshold evidence
- leakage and data-quality warnings
- explanation availability
- limitations and intended use

It returns JSON-compatible deployment advice:

- `deploy_recommended`
- `needs_review`
- `hold`
- `blocked`
- `unknown`

The tool returns observation and decision payloads, but it never deploys a
model, modifies prediction APIs, changes storage, or calls an LLM. PR-11 also
adds a minimal Deployment Center placeholder and `docs/deployment-center.md` for
future model stage and deployment history work.

## Next Connection

PR-12 should add human review and resume-flow contracts. Actual production
deployment automation, human review queues, resume flows, and a completed real
agent runtime are still outside PR-11.

It still should not call a real LLM.
