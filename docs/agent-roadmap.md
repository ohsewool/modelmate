# ModelMate Agent Upgrade Roadmap

Current status: PR-12 human review and resume skeleton. ModelMate is being extended toward
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
| PR-08 | Add evaluation and retry decision placeholder | `backend/tools/evaluation.py`, `backend/tools/evaluation_policy.py`, `backend/tools/registry.py` | Metric threshold observation and decision placeholder are returned | Direct evaluation tests, training benchmark, upload QA, compile backend | Thresholds are heuristic and retry is not executed yet | PR-09 adds XAI/report evidence |
| PR-09 | Wrap XAI evidence as a tool and create evidence bundle structure | `backend/tools/shap_explainer.py`, `backend/tools/evidence_bundle.py`, `backend/schemas/agent/evidence.py`, `backend/tools/registry.py` | Explanation observations and evidence bundle are JSON-compatible | Direct explainer test, training benchmark, upload QA, compile backend | Explanations may fall back to approximate feature importance | PR-10 adds validation and report writer |
| PR-10 | Add validation and report writing tools | `backend/tools/validation.py`, `backend/tools/report_writer.py`, `backend/tools/report_center.py`, `backend/schemas/agent/report.py`, `docs/report-center.md` | Report draft is grounded in evidence and missing evidence is disclosed | Direct validation/report tests, upload QA, training benchmark, compile backend | Report wording can still be too generic when evidence is sparse | PR-11 adds deployment checks |
| PR-11 | Add deployment readiness advice | `backend/tools/deployment_check.py`, `backend/tools/deployment_center.py`, `backend/schemas/agent/deployment.py`, `docs/deployment-center.md` | Deployment advice returns deploy/review/hold/blocked without deploying | Direct deployment tool tests, upload QA, training benchmark, compile backend | Advice is deterministic and not a production approval system | PR-12 adds human review/resume contracts |
| PR-12 | Add human review and resume contracts | `backend/schemas/agent/review.py`, `backend/agents/review_queue.py`, `backend/agents/resume.py`, `README.md`, `docs/demo-agentic-automl.md` | Risky decisions can become review items and receive resume recommendations | Contract tests, upload QA, training benchmark, compile backend | Skeleton is not persistent and does not rerun work | Future stabilization |
| Future | Polish workspace/share/API around agent runs | workspace, share/API UI | Dataset-run-model-report links are clear | Login/share/API QA | Permission policy gaps | Stabilization |

## Current PR-12 Notes

PR-12 completes the first skeleton pass:

```text
agent decision -> needs_review / hold / blocked -> review item -> reviewer resolution -> resume recommendation
```

`review_queue.py` can turn risky decision or observation payloads into
JSON-compatible review items. `resume.py` can mark a review item as resolved and
recommend the next action. This is a skeleton only: there is no DB queue, async
worker, actual retraining, actual deployment, or LLM planner call.

README and `docs/demo-agentic-automl.md` describe the current state honestly:
ModelMate is being extended toward real tool-calling Agentic AutoML, but it is
not yet a fully autonomous AI data scientist.

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

For direct evaluation verification:

```bash
python - <<'PY'
from backend.tools import evaluation_tool
print(evaluation_tool({
    "automl_training_result": {
        "success": True,
        "task_type": "classification",
        "leaderboard": [{"model": "A", "roc_auc": 0.82, "status": "ok"}],
        "best_model": {"name": "A"},
        "best_metric": {"label": "ROC-AUC", "value": 0.82},
    }
}))
PY
```

For direct XAI evidence verification after a training run:

```bash
python - <<'PY'
from backend.tools import automl_training_tool, evaluation_tool, shap_explainer_tool
rows = [
    {"age": 22, "glucose": 90, "diabetes": 0},
    {"age": 61, "glucose": 180, "diabetes": 1},
    {"age": 45, "glucose": 130, "diabetes": 1},
    {"age": 30, "glucose": 100, "diabetes": 0},
]
training = automl_training_tool({"records": rows, "target_column": "diabetes"})
evaluation = evaluation_tool({"automl_training_result": training})
print(shap_explainer_tool({
    "automl_training_result": training,
    "evaluation_result": evaluation,
    "user_goal": "Predict diabetes risk",
})["evidence_bundle"])
PY
```

For direct report draft verification:

```bash
python - <<'PY'
from backend.tools import validation_tool, report_writer_tool
bundle = {
    "user_goal": "Predict churn",
    "selected_target": "churn",
    "task_type": "classification",
    "model_summary": {"name": "Random Forest"},
    "metric_summary": {"evaluated_metric": "roc_auc", "best_metric_value": 0.84},
    "threshold_status": "pass",
    "explanation_summary": "tenure is the strongest available signal",
    "limitations": ["Feature importance is not causality."],
    "source_tool_calls": ["data_profile_tool", "schema_validation_tool", "leakage_check_tool"],
}
validation = validation_tool({"evidence_bundle": bundle})
report = report_writer_tool({"evidence_bundle": bundle, "validation_result": validation})
print(validation["validation_status"], report["report_format"])
PY
```

For direct deployment advice verification:

```bash
python - <<'PY'
from backend.tools import deployment_check_tool
bundle = {
    "user_goal": "Predict churn",
    "selected_target": "churn",
    "task_type": "classification",
    "metric_summary": {"evaluated_metric": "roc_auc", "best_metric_value": 0.84},
    "threshold_status": "pass",
    "explanation_summary": "tenure is the strongest available signal",
    "limitations": ["Feature importance is not causality."],
}
validation = {"validation_status": "grounded"}
report = {"success": True}
print(deployment_check_tool({
    "evidence_bundle": bundle,
    "validation_result": validation,
    "report_result": report,
})["deployment_status"])
PY
```

For direct review/resume skeleton verification:

```bash
python - <<'PY'
from backend.agents.review_queue import review_item_from_decision
from backend.agents.resume import resolve_review_item, build_resume_recommendation
decision = {"action": "blocked", "rationale": "High leakage risk"}
item = review_item_from_decision(decision, {"severity": "error"}, analysis_run_id="demo", step_id="s1")
resolved = resolve_review_item(item, "fix_required", "Remove leakage column")
print(item["status"], build_resume_recommendation(resolved)["status"])
PY
```
