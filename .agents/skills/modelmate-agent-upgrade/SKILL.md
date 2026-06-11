---
name: modelmate-agent-upgrade
description: Plan and implement the ModelMate Agentic AutoML upgrade in small PR-sized steps. Use when extending ModelMate toward a real tool-calling AI Agent system, splitting work into PRs, implementing an agent skeleton, adding agent architecture docs, adding tool registry structure, or reviewing pseudo-agent risk. Always preserve existing ModelMate AutoML behavior and never implement the whole roadmap at once.
---

# ModelMate Agent Upgrade

## Purpose

Upgrade ModelMate from an AutoML service toward a real tool-calling Agentic AutoML platform while preserving existing features, deployment, and demo flow.

ModelMate should not be treated as a finished real AI agent until the project has a real, visible, and stored flow:

```text
user goal -> structured plan -> selected tool call -> observation -> decision -> retry / stop / human review / final report
```

If this flow does not exist yet, describe the project honestly as:

> ModelMate is being extended toward Agentic AutoML.

Do not claim:

> ModelMate already includes a real AI agent.

## Scope Control

Always work in PR-sized steps. Before implementation, summarize:

```text
PR number
Goal
Files to add or modify
Done criteria
Test method
Risks
Next PR connection
```

Only implement the PR requested by the user. Do not implement the whole roadmap in one pass.

## Architecture Rule

Use one real decision-making agent:

- `Supervisor Planner`: interprets user goals, creates plans, selects tools, reads observations, and decides next actions.

Treat these as tools, not independent agents:

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

Do not create fake multi-agent modules such as `Profiler Agent` or `Report Agent` unless they actually own next-step decisions.

## PR-01 Rules

PR-01 only creates skeleton and documentation.

Allowed:

- `docs/agent-architecture.md`
- `docs/agent-roadmap.md`
- backend `agents/`, `tools/`, `schemas/agent` skeleton
- mock planner
- placeholder tool registry
- README/docs note saying PR-01 skeleton stage
- test and manual check documentation

Forbidden:

- DB schema implementation
- real LLM calls
- real AutoML tool connection
- existing API deletion
- existing AutoML pipeline modification
- large frontend changes
- full roadmap implementation

## Suggested PR Roadmap

- PR-01: agent architecture docs and skeleton folders
- PR-02: `analysis_runs`, `analysis_steps`, `tool_calls`, `observations`, `decisions` schema
- PR-03: New Analysis goal-first input flow
- PR-04: tool registry interface, mock planner, and mock timeline
- PR-05: `data_profile_tool`, `schema_validation_tool`
- PR-06: `target_recommendation_tool`, `leakage_check_tool`
- PR-07: wrap existing AutoML pipeline as `automl_training_tool`
- PR-08: `evaluation_tool`, metric threshold, retry branch
- PR-09: `shap_explainer_tool`, evidence bundle, explanation UI
- PR-10: `validation_tool`, `report_writer_tool`, Report Center
- PR-11: `deployment_check_tool`, Deployment Center, model alias/stage
- PR-12: Human Review Queue, resume flow, README, demo script

## Backend Constraints

- Keep existing import and runtime behavior stable.
- Do not rewrite `app.py`, `backend/main.py`, or `backend/main_parts` in one large change.
- Keep existing endpoints or preserve compatibility through legacy shims.
- New skeleton code must not affect existing endpoints unless the current PR explicitly says so.
- Mock planner must not call an LLM.
- Mock tools must not call the real AutoML pipeline.
- Optional dependencies must not be required for existing startup.

## Frontend Constraints

- The frontend is React/Vite JavaScript.
- Do not migrate to TypeScript unless explicitly requested.
- Do not redesign the UI during PR-01.
- Agent timeline UI belongs to a later PR.

## Validation

For backend skeleton changes, run when possible:

```bash
python -m compileall backend
```

For backend runtime checks, run when applicable:

```bash
uvicorn backend.main:app --reload
```

For frontend changes, run:

```bash
cd frontend
npm run build
```

If a command cannot be run, report why.

## Final Report

After work, report:

1. Implemented PR
2. Changed files
3. Key changes
4. Demo flow impact
5. API compatibility impact
6. Commands run
7. Results
8. Remaining risks
9. Next PR
