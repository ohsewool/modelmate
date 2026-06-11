# AGENTS.md

## Project

This repository is ModelMate, a graduation project and portfolio service.

ModelMate currently provides an AutoML web workflow: CSV upload, data analysis, target recommendation, model comparison, result summary, prediction explanation, new-data prediction, shared API, and workspace reuse.

The long-term goal is to extend ModelMate into an Agentic AutoML platform where a planner interprets the user's analysis goal, creates a plan, selectively calls tools, records observations and decisions, branches when needed, and produces a final report.

## Core Rules

1. Do not break existing ModelMate features, deployment, or demo flow.
2. Do not delete the existing AutoML pipeline.
3. Wrap existing AutoML features as future tool adapters instead of replacing them.
4. Do not rewrite `app.py`, `backend/main.py`, or `main_parts` in one large change.
5. Keep existing endpoints. If behavior changes, preserve compatibility with legacy shims.
6. Implement only one PR scope at a time.
7. Do not implement the whole agent roadmap at once.
8. Do not call something an Agent unless real `plan -> tool call -> observation -> decision` flow is designed or implemented.
9. Avoid large DB, frontend, API, or architecture changes unless the current PR explicitly requires them.

## Honest Agent Claim

Before the real agent flow exists, describe the project as:

> ModelMate is being extended toward Agentic AutoML.

Do not claim:

> ModelMate includes a real AI agent.

A real agent version must include goal-first input, explicit plan, dynamic tool choice, stored observations/decisions, visible branching, and human review or confirmation.

## Recommended Architecture

Use one main decision-making agent:

* `Supervisor Planner`: interprets user goals, creates plans, selects tools, reads observations, and decides next actions.

Treat the following as tools, not independent agents:

* `data_profile_tool`
* `schema_validation_tool`
* `target_recommendation_tool`
* `leakage_check_tool`
* `automl_training_tool`
* `evaluation_tool`
* `shap_explainer_tool`
* `validation_tool`
* `deployment_check_tool`
* `report_writer_tool`
* `human_review_handoff`

Do not create fake multi-agent names such as `Profiler Agent` or `Report Agent` unless they actually own next-step decisions.

## PR Discipline

Before implementation, summarize work as:

* PR number
* goal
* files to add or modify
* done criteria
* test method
* risks
* connection to the next PR

If the user requests PR-01, implement only PR-01.

## PR-01 Scope

PR-01 only creates the minimum skeleton and documentation for the agent upgrade.

Allowed:

* analyze current structure
* add `docs/agent-architecture.md`
* add `docs/agent-roadmap.md`
* add backend agent/tool/schema skeleton folders
* add mock planner or placeholder tool interface
* document test commands and manual checks
* state clearly that this is only the PR-01 skeleton stage

Forbidden:

* DB schema implementation
* real LLM agent implementation
* real AutoML tool connection
* existing API deletion
* existing AutoML pipeline modification
* large frontend change
* full PDF roadmap implementation

## Backend Rules

The backend is Python/FastAPI based.

* Keep existing import and runtime behavior stable.
* New agent skeleton code must not affect existing endpoints.
* Mock planner must not call an LLM.
* Mock tools must not call the real AutoML pipeline.
* Optional dependencies must not be required for existing startup.

## Frontend Rules

The frontend is React/Vite JavaScript.

* Do not migrate to TypeScript unless explicitly requested.
* Do not redesign the UI during PR-01.
* Agent timeline UI belongs to a later PR.

## Validation

Run relevant checks when possible:

```bash
python -m compileall backend
```

If applicable:

```bash
uvicorn backend.main:app --reload
```

For frontend changes:

```bash
cd frontend
npm run build
```

If a command cannot be run, report why.

## Final Report Format

After each task, report:

1. PR implemented
2. changed files
3. key changes
4. demo flow impact
5. API compatibility impact
6. commands run
7. results
8. remaining risks
9. next PR
