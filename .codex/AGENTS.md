# ModelMate Codex Agent Instructions

You are working on the ModelMate repository.

ModelMate is a Korean-first, CSV-first, predictive-analysis-first Agentic AutoML SaaS MVP.

The product goal is not to become a full enterprise AutoML replacement.
The product goal is to provide a guided, auditable, agentic workflow for tabular CSV predictive analysis.

Core positioning:

> "ModelMate turns CSV data into explainable predictions, grounded reports, and reusable APIs through a guided AI analyst workflow."

Korean positioning:

> "ModelMate는 CSV 데이터를 업로드하면 데이터 구조 분석, 예측 타깃 추천, 모델 비교, 근거 기반 보고서, 예측 API 생성까지 하나의 흐름으로 제공하는 guided AutoML SaaS MVP입니다."

## Operating mode

Work one PR at a time.
Do not skip PRs.
Do not start the next PR until the current PR is explicitly marked done.

After each PR:

1. Create a focused branch.
2. Implement only the current PR.
3. Run required build/tests.
4. Create or update a pull request.
5. Mark the task as review_needed.
6. Stop.

If verification fails:

1. Mark the current task as fix_needed.
2. Fix the same PR.
3. Run build/tests again.
4. Update the PR with the fix summary.
5. Return it to review_needed.
6. Do not move to the next PR.

## Roadmap

PR-26 Workspace Data Integration Fix is considered complete.

Continue from:

* PR-27 Goal-first Agent Mode
* PR-28 Tool-calling Agent Pipeline
* PR-29 Agent Trace / Decision UI
* PR-30 Human Review / Recovery
* PR-31 Optional LLM Planner Integration
* PR-32 Final Agentic Portfolio Polish

## Non-negotiable rules

Do not rewrite the whole app.
Do not redesign unrelated UI.
Do not migrate JavaScript to TypeScript.
Do not add real billing.
Do not add enterprise MLOps features.
Do not add fake Agent UI.
Do not hardcode mock results as if they are real.
Do not show workspace objects unless they are persisted.
Do not bypass ownership/session checks.
Do not expose secrets, API keys, raw tokens, or full uploaded CSV contents in logs.
Do not translate route paths, API keys, JSON keys, function names, component names, imports, package names, database column names, or environment variables.
User-facing UI copy must remain Korean-first.
Preserve Railway deployment compatibility.

## Definition of real Agentic AutoML

ModelMate must not merely show decorative messages like:

* "AI is thinking"
* "AI is analyzing"
* "AI is writing your report"

A real Agentic AutoML workflow must persist real execution state:

* goal
* agent_run_id
* plan_id
* plan_step_id
* tool_call_id
* observation_id
* decision_id
* validation_id
* artifact_id
* human_review_request_id when needed
* final report metadata
* prediction API readiness

If a tool has not executed, show it as pending or unavailable.
If trace data is not available yet, say so honestly.
If a result is based on a real tool output, reference the persisted observation or artifact.

## Supported analysis scope

ModelMate should focus on tabular CSV predictive analysis.

Supported:

* Binary classification
* Multiclass classification
* Single-target regression

Limited or beta:

* Simple time-series style prediction only when timestamp/horizon information is clear

Out of scope for this roadmap:

* Multi-target prediction
* Causal inference
* Uplift modeling
* Clustering as a primary product flow
* Anomaly detection as a primary product flow
* RAG/document analysis
* Full enterprise MLOps
* Fully autonomous unsupervised data science

Unsupported requests should be handled honestly.
Do not pretend unsupported analysis types are fully supported.

## Planner rules

Use deterministic planning by default.
An optional LLM planner may be added only in PR-31.
Before PR-31, do not require an LLM API key to run Agent Mode.

Planner output must be structured and schema-like.
A plan should include:

* step id
* tool name or pending action
* purpose
* expected input
* expected output
* status
* whether human review may be required

## Tool-calling rules

Existing AutoML functionality should be wrapped as typed tools instead of duplicated.

Expected tools:

* data_profile_tool
* schema_validation_tool
* target_recommendation_tool
* leakage_check_tool
* automl_training_tool
* evaluation_tool
* shap_explainer_tool
* validation_tool
* report_writer_tool
* api_readiness_tool

Each real tool execution should produce:

* tool_call record
* observation record
* validation result when applicable
* decision record when the system chooses what to do next
* artifact record when a report/model/API readiness object is created

## Safety and trust rules

The main risk is not toxic content.
The main risk is wrong analytics.

High-risk situations must trigger warning or human review:

* ambiguous target column
* high leakage risk
* unclear task type
* time-series split uncertainty
* low model performance
* severe class imbalance
* API deployment when model quality is weak
* public sharing or token generation
* report wording that overclaims causality

SHAP explanations must be described as feature contribution, not causality.
Reports must include limitations and unknowns when relevant.

## UI rules

Korean-first UI copy.
Keep UI clear and SaaS-like.
Do not add decorative AI animation unless it is tied to real persisted state.

Agent Mode UI should show:

* goal
* generated plan
* current step
* tool execution status
* observations
* decisions
* validation warnings
* human review requests
* artifacts
* final report
* prediction API readiness

Run Detail should become the main agent console.

## Build and verification

Required frontend build:

```bash
cd frontend && npm run build
```

If backend is touched, run the relevant backend tests or smoke scripts available in the repository.
If no backend test exists, document the manual smoke test clearly.

## Pull request format

PR title:

```text
PR-XX: <short title>
```

PR body must include:

1. Summary
2. Implementation approach
3. Files changed
4. Build/test results
5. Manual verification
6. Screens/routes checked
7. Known limitations
8. Review status

## Blocking behavior

If the task cannot be completed safely:

* Do not guess.
* Do not fake data.
* Do not mark the task as done.
* Mark it as blocked.
* Explain:
  * what was found
  * why it is blocked
  * exact files/functions involved
  * what decision is needed

## Completion rule

A PR can only move to done after review confirms the acceptance criteria pass.
Do not self-mark a PR as done unless the review gate explicitly allows it.
