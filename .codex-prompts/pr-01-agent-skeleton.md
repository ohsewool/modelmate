# PR-01: ModelMate Agentic AutoML Skeleton

Use the attached strict ModelMate Agentic AutoML architecture PDF as the final target reference.

Important: Do not implement the whole document at once. First split the full work into PR-sized stages, then implement only PR-01 in this task.

## Final Target

Extend ModelMate from a simple AutoML pipeline or LLM summary feature into a real tool-calling Agentic AutoML platform.

The final platform should:

- interpret the user's analysis goal
- generate an analysis plan
- selectively call tools
- store observations and decisions
- branch, retry, stop, request human review, or create a final report

The honest target flow is:

```text
user goal -> structured plan -> selected tool call -> observation -> decision -> retry / stop / human review / final report
```

## Required Principles

1. Do not break existing ModelMate features, deployment, or demo flow.
2. Do not delete the existing AutoML pipeline.
3. Preserve existing AutoML features so they can later be wrapped as tool adapters.
4. Do not rewrite `app.py`, `backend/main.py`, or `backend/main_parts` in one large change.
5. Keep existing endpoints, or preserve compatibility with legacy shims if behavior changes.
6. Implement only one PR scope at a time.
7. For every PR, summarize changed files, reasons, test methods, and remaining risks.
8. Do not call something an Agent unless a real `plan -> tool call -> observation -> decision` flow is designed or implemented.
9. In PR-01, do not connect real AutoML logic, make large DB changes, redesign the frontend, or complete a real LLM agent.

## First Output Required

Before implementation, organize the full work into PR units using this format:

- PR number
- Goal
- Files to add or modify
- Done criteria
- Test method
- Risks
- Connection to the next PR

Then implement only PR-01.

## PR-01 Goal

Create the minimum project skeleton and documentation for the future AI Agent upgrade without changing existing ModelMate behavior.

## PR-01 Scope

Allowed:

- analyze the current ModelMate structure
- add `docs/agent-architecture.md`
- add `docs/agent-roadmap.md`
- create agent upgrade skeleton folders
- create backend `agents/`, `tools/`, `schemas/agent` folders, or equivalent folders that fit the current structure
- add a mock planner or mock tool execution interface
- document test commands and manual checks
- clearly state that the project is currently only at the PR-01 skeleton stage

Forbidden:

- DB schema implementation
- real LLM API calls
- real AutoML tool connection
- existing API deletion
- existing AutoML pipeline modification
- large frontend changes
- full roadmap implementation
- forced connection between existing endpoints and the new agent skeleton

## Recommended Skeleton

Prefer this shape if it fits the current repository. If the repository already has a different structure, follow the existing structure while preserving these responsibilities.

```text
backend/
  agents/
    __init__.py
    supervisor.py
    state.py
  tools/
    __init__.py
    base.py
    registry.py
  schemas/
    agent/
      __init__.py
      plan.py
      tool.py
docs/
  agent-architecture.md
  agent-roadmap.md
```

## File Intent

### `backend/agents/supervisor.py`

PR-01 may contain only a mock supervisor/planner.

- It may accept a user goal and return a sample plan.
- It must not call an LLM.
- It must not call real AutoML logic.

### `backend/agents/state.py`

Reserve the future location for concepts such as:

- `analysis_run`
- `analysis_step`
- `tool_call`
- `observation`
- `decision`

No DB integration in PR-01.

### `backend/tools/base.py`

Define the minimum interface or protocol that future tool adapters will follow.

Do not connect existing AutoML logic in PR-01.

### `backend/tools/registry.py`

Define a mock tool registry.

It may include tool names, descriptions, and input/output schema placeholders.

### `backend/schemas/agent/plan.py`

Define light schemas for:

- structured goal
- plan
- plan step

Use Pydantic if the existing project style favors it; otherwise follow the existing backend style.

### `backend/schemas/agent/tool.py`

Define placeholder schemas for:

- tool call request
- tool call response

### `docs/agent-architecture.md`

Summarize the final architecture from the PDF in a way that fits the current ModelMate structure.

The document must say clearly:

- the current project is in the PR-01 skeleton stage
- ModelMate is not yet a completed real AI agent
- the future structure uses a `Supervisor Planner`
- existing AutoML will be wrapped later as `automl_training_tool`, not deleted

### `docs/agent-roadmap.md`

Create a PR-by-PR roadmap from PR-01 to PR-12.

It must state that PR-02 will add storage/schema for:

- `analysis_runs`
- `analysis_steps`
- `tool_calls`
- `observations`
- `decisions`

Each PR should include:

- goal
- done criteria
- test method
- risks
- next PR connection

### `README.md` or docs index

Mention that the project is currently at the PR-01 skeleton stage.

Use the honest claim:

> ModelMate is being extended toward Agentic AutoML.

Do not claim that a real AI agent is already complete.

## Validation

Run when possible:

```bash
python -m compileall backend
```

If backend runtime verification is applicable:

```bash
uvicorn backend.main:app --reload
```

Frontend build is not required if PR-01 does not change frontend files. If frontend files are changed:

```bash
cd frontend
npm run build
```

If any command cannot be run, explain why.

## Final Report Format

After implementation, report:

1. Implemented PR number
2. Changed files
3. Key changes
4. Existing demo flow impact
5. API compatibility impact
6. Test/build commands run
7. Results
8. Remaining risks
9. Next PR work
