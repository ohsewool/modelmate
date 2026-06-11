# ModelMate Agent Architecture

Current status: PR-03 mock planner trace API. This document describes the target
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

## Next Connection

PR-04 should add a small timeline UI that:

1. accepts or reuses an `analysis_run_id`
2. shows planned steps in order
3. distinguishes future tool calls, observations, and decisions
4. keeps the existing ModelMate demo flow intact

It still should not call a real LLM or the real AutoML pipeline.
