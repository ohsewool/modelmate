# ModelMate Agent Architecture

Current status: PR-06 deterministic target recommendation and leakage checks. This document describes the target
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

## Next Connection

PR-07 should wrap the existing AutoML training path as an `automl_training_tool`
adapter while preserving the legacy upload/model-comparison flow.

It still should not call a real LLM.
