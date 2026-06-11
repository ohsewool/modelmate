# ModelMate Agent Upgrade Roadmap

Current status: PR-07 AutoML training adapter. ModelMate is being extended toward
Agentic AutoML, but it is not yet a completed real AI agent.

| PR | Goal | Files | Done Criteria | Test Method | Risks | Next PR |
| --- | --- | --- | --- | --- | --- | --- |
| PR-01 | Create inert agent docs and skeleton | `docs/agent-architecture.md`, `backend/agents`, `backend/tools`, `backend/schemas/agent` | Existing app behavior unchanged, skeleton compiles | `python -m compileall backend/agents backend/tools backend/schemas` | Agent naming without trace could be misleading | PR-02 adds trace storage contracts |
| PR-02 | Prepare trace schemas for runs, steps, tools, observations, decisions | `backend/agents/persistence.py`, `backend/agents/state.py`, `backend/schemas/agent/trace.py` | Schema helper exists but is not wired into startup; existing endpoints unchanged | Compile backend, create schema in an in-memory SQLite DB | Tables are prepared but not used by the app yet | PR-03 wires mock planner runs to the trace |
| PR-03 | Add goal-first mock planner API | `backend/agents`, `backend/main_parts/045_agent_runs.part` | User goal creates a mock plan and trace records | API call returns run id and ordered steps | Endpoint may confuse users if exposed too early | PR-04 adds timeline UI |
| PR-04 | Add mock tool registry and timeline flow | `backend/tools/registry.py`, `backend/agents/mock_runner.py`, `backend/main_parts/045_agent_runs.part` | Plan, mock tool call, observation, and decision records are visible by API | Mock timeline API test | Could be mistaken for real agent execution | PR-05 replaces first mock tools with deterministic tools |
| PR-05 | Replace first mock tools with deterministic data profiling and schema validation | `backend/tools/data_profile.py`, `backend/tools/schema_validation.py`, `backend/tools/registry.py` | Profile and validation outputs are JSON-compatible and can become observations | Direct tool tests, mock timeline with `csv_text`, compile backend | Validation is heuristic and not a final training decision | PR-06 adds target/leakage tools |
| PR-06 | Wrap target recommendation and leakage checks as tools | `backend/tools/target_recommendation.py`, `backend/tools/leakage_check.py` | Target and excluded-column reasons become deterministic observations | Direct tool tests, mock timeline with `csv_text`, compile backend | Wrong auto-exclusion risk; heuristics still need human review | PR-07 wraps AutoML |
| PR-07 | Wrap existing AutoML as `automl_training_tool` | `backend/tools/automl_training.py`, `backend/tools/automl_result.py`, `backend/tools/registry.py` | Legacy model comparison remains intact and tool can call existing training | Direct adapter call, training benchmark, upload QA, compile backend | Uses existing in-memory `STATE`; concurrent agent runs need later isolation | PR-08 adds evaluation branch |
| PR-08 | Add evaluation and tuning decision policy | `evaluation_tool`, Optuna decision policy | Stable/no-improvement/retry cases are recorded as decisions | Optuna and no-improvement QA | Excessive retry behavior | PR-09 adds XAI/report evidence |
| PR-09 | Wrap XAI and report creation as tools | `shap_explainer_tool`, `report_writer_tool` | Final report links to observations and evidence | Report/XAI regression | Overconfident explanations | PR-10 adds human review |
| PR-10 | Add human review and deployment checks | review queue, `deployment_check_tool` | Risky runs can pause before deploy | Risk dataset QA | Longer demo flow | PR-11 adds model lifecycle |
| PR-11 | Add model aliases, versions, lineage | model registry metadata | Saved models can be reused with trace lineage | Save/load/predict QA | DB complexity | PR-12 strengthens SaaS UX |
| PR-12 | Polish workspace/share/API around agent runs | workspace, share/API UI | Dataset-run-model-report links are clear | Login/share/API QA | Permission policy gaps | Stabilization |

## Current PR-07 Notes

PR-07 keeps the same legacy AutoML implementation and adds a thin adapter:

```text
goal -> plan -> profile/validation/target/leakage tools -> automl_training_tool -> observation -> decision
```

`automl_training_tool` calls the existing `set_target` and `run_cv` functions.
It does not rewrite model training and does not delete or change existing
endpoints. The output is wrapped for future observations, including leaderboard,
best model, best metric, warnings, failures, and next action.

This is still not a completed real AI agent. PR-08 must add explicit evaluation
policy and retry/human-review branching.

## Validation

```bash
python -m compileall backend
```

For schema verification without touching the real database:

```bash
python - <<'PY'
import sqlite3
from backend.agents.persistence import ensure_agent_trace_schema, AGENT_TRACE_TABLES
conn = sqlite3.connect(':memory:')
ensure_agent_trace_schema(conn)
print([name for name in AGENT_TRACE_TABLES])
PY
```

For deterministic tool verification through the mock timeline API:

```bash
curl -X POST http://127.0.0.1:8000/api/agent/mock-timeline \
  -H "Content-Type: application/json" \
  -d "{\"user_goal\":\"Predict pass/fail\",\"csv_text\":\"id,age,result\\n1,20,pass\\n2,30,fail\"}"
```

For direct AutoML adapter verification:

```bash
python - <<'PY'
from backend.tools import automl_training_tool
rows = [{"age": 20, "glucose": 90, "diabetes": 0}, {"age": 60, "glucose": 180, "diabetes": 1}]
print(automl_training_tool({"records": rows, "target_column": "diabetes"}))
PY
```
