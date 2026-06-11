# ModelMate Agent Upgrade Roadmap

Current status: PR-02 schema preparation. ModelMate is being extended toward
Agentic AutoML, but it is not yet a completed real AI agent.

| PR | Goal | Files | Done Criteria | Test Method | Risks | Next PR |
| --- | --- | --- | --- | --- | --- | --- |
| PR-01 | Create inert agent docs and skeleton | `docs/agent-architecture.md`, `backend/agents`, `backend/tools`, `backend/schemas/agent` | Existing app behavior unchanged, skeleton compiles | `python -m compileall backend/agents backend/tools backend/schemas` | Agent naming without trace could be misleading | PR-02 adds trace storage contracts |
| PR-02 | Prepare trace schemas for runs, steps, tools, observations, decisions | `backend/agents/persistence.py`, `backend/agents/state.py`, `backend/schemas/agent/trace.py` | Schema helper exists but is not wired into startup; existing endpoints unchanged | Compile backend, create schema in an in-memory SQLite DB | Tables are prepared but not used by the app yet | PR-03 wires mock planner runs to the trace |
| PR-03 | Add goal-first mock planner API | `backend/agents`, endpoint shim | User goal creates a mock plan and trace records | API call returns run id and ordered steps | Endpoint may confuse users if exposed too early | PR-04 adds timeline UI |
| PR-04 | Add Agent Run Detail timeline UI | frontend route/components | Plan, tool call, observation, decision are visible | Browser smoke test | UI clutter | PR-05 connects data tools |
| PR-05 | Wrap data profiling and schema validation as tools | `data_profile_tool`, `schema_validation_tool` | CSV quality appears as observations | Public, invalid, tiny, malformed CSV QA | Duplicate upload logic | PR-06 adds target/leakage tools |
| PR-06 | Wrap target recommendation and leakage checks as tools | `target_recommendation_tool`, `leakage_check_tool` | Target and excluded-column reasons become decisions | Pima, public bike, facility, manufacturing QA | Wrong auto-exclusion risk | PR-07 wraps AutoML |
| PR-07 | Wrap existing AutoML as `automl_training_tool` | adapter around existing training flow | Legacy model comparison remains intact and agent can call training | Legacy regression plus mock agent run | Training state conflicts | PR-08 adds evaluation branch |
| PR-08 | Add evaluation and tuning decision policy | `evaluation_tool`, Optuna decision policy | Stable/no-improvement/retry cases are recorded as decisions | Optuna and no-improvement QA | Excessive retry behavior | PR-09 adds XAI/report evidence |
| PR-09 | Wrap XAI and report creation as tools | `shap_explainer_tool`, `report_writer_tool` | Final report links to observations and evidence | Report/XAI regression | Overconfident explanations | PR-10 adds human review |
| PR-10 | Add human review and deployment checks | review queue, `deployment_check_tool` | Risky runs can pause before deploy | Risk dataset QA | Longer demo flow | PR-11 adds model lifecycle |
| PR-11 | Add model aliases, versions, lineage | model registry metadata | Saved models can be reused with trace lineage | Save/load/predict QA | DB complexity | PR-12 strengthens SaaS UX |
| PR-12 | Polish workspace/share/API around agent runs | workspace, share/API UI | Dataset-run-model-report links are clear | Login/share/API QA | Permission policy gaps | Stabilization |

## Current PR-02 Notes

PR-02 intentionally does not call `ensure_agent_trace_schema()` from
`backend/main.py` or `main_parts`. This avoids changing startup behavior before
the mock planner API exists. PR-03 can explicitly wire the helper after a small
runtime test.

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
