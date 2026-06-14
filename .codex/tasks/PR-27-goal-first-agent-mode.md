# PR-27 Task: Goal-first Agent Mode

Status:
todo

Branch:
`codex/pr-27-goal-first-agent-mode`

Commit message:
`feat: add goal-first agent mode`

## Goal

Implement PR-27 Goal-first Agent Mode.

This PR adds the first real Agentic AutoML entry point to ModelMate.

The user should be able to enter a Korean natural-language analysis goal, choose or upload a dataset, and create a persisted Agent Run with a deterministic structured plan.

This PR must not execute the full tool-calling pipeline yet.
Tool execution starts in PR-28.

PR-27 is about:

* goal input
* goal interpretation
* supported/unsupported scope detection
* deterministic plan generation
* Agent Run persistence
* Plan persistence
* Plan preview UI
* honest pending state for future tools

## Context

ModelMate is a Korean-first, CSV-first, predictive-analysis-first Agentic AutoML SaaS MVP.

PR-26 Workspace Data Integration Fix is considered complete.

The workspace should already support persisted projects, datasets, jobs/runs, reports, and prediction API readiness.

PR-27 must build on that persistence foundation.

The product must not merely show decorative "AI is thinking" messages.

A real Agentic AutoML workflow starts with a persisted goal and plan.

## Non-negotiable constraints

Do not rewrite the whole app.

Do not redesign unrelated UI.

Do not migrate JavaScript to TypeScript.

Do not add real billing.

Do not add enterprise MLOps features.

Do not implement PR-28 tool execution in this PR.

Do not add fake completed tool traces.

Do not hardcode mock observations as real tool results.

Do not require an LLM API key.

Do not add an LLM planner yet.

Do not bypass ownership/session checks.

Do not expose secrets, raw tokens, or full uploaded CSV content in logs.

Do not break existing upload, sample/starter analysis, reports, prediction API readiness, workspace navigation, or settings usage.

User-facing UI copy must remain Korean-first.

Route paths, API keys, JSON keys, function names, component names, imports, package names, database column names, and environment variables must not be translated.

Preserve Railway deployment compatibility.

## Product behavior

Add an Agent Mode entry point.

The user should be able to start from a natural-language goal such as:

`이 CSV로 고객 이탈 가능성을 예측하고 중요한 원인을 보고서로 정리해줘.`

The system should:

1. Accept the goal.
2. Accept either an uploaded CSV, an existing dataset/project if available, or a starter/sample dataset if the app supports it.
3. Interpret the goal deterministically.
4. Classify the task intent.
5. Detect whether the goal is supported, limited, or unsupported.
6. Create a persisted Agent Run.
7. Create a persisted Plan.
8. Show a plan preview.
9. Clearly show tool steps as planned or pending, not completed.
10. Link the Agent Run to project/workspace state where appropriate.
11. Survive page refresh.

## Supported scope

Supported:

* Binary classification
* Multiclass classification
* Single-target regression

Limited or beta:

* Simple time-series style prediction only when timestamp/horizon information is clear

Unsupported:

* Multi-target prediction
* Causal inference
* Uplift modeling
* Clustering as the primary product flow
* Anomaly detection as the primary product flow
* RAG/document analysis
* Full enterprise MLOps
* Fully autonomous unsupervised data science

Unsupported goals must be handled honestly with Korean UI copy.

Do not pretend unsupported analysis types are fully supported.

## Goal interpreter requirements

Implement a deterministic goal interpreter.

Do not use an LLM.

The interpreter should map common Korean/English goal terms to structured task intent.

Examples:

Churn / 이탈 / 해지:

* likely task family: classification
* likely report framing: customer churn prediction
* likely metrics: ROC-AUC, F1, precision, recall
* likely target candidates: columns containing churn, cancel, cancelled, retained, 이탈, 해지

Failure / 고장 / 불량 / 장애:

* likely task family: classification
* likely report framing: equipment failure or defect risk prediction
* likely metrics: ROC-AUC, F1, precision, recall
* likely target candidates: failure, defect, fault, broken, 고장, 불량, 장애

Conversion / 구매 / 전환:

* likely task family: classification
* likely report framing: conversion or purchase probability prediction
* likely metrics: ROC-AUC, F1, precision, recall
* likely target candidates: conversion, purchase, bought, 전환, 구매

Price / 매출 / 수요 / 점수 / 금액:

* likely task family: regression
* likely report framing: numeric outcome prediction
* likely metrics: MAE, RMSE, R2
* likely target candidates: price, revenue, demand, score, amount, sales, 가격, 매출, 수요, 점수, 금액

Time / 날짜 / 월별 / 일별 / 예측 기간:

* likely mode: limited time-series review required
* require timestamp and horizon confirmation
* do not silently treat it as fully supported

Causal terms such as 원인, 영향, 왜, cause:

* allow report framing as explanation/contribution
* but avoid causal claims
* include warning that SHAP/feature importance is contribution, not causality

## Agent Run data model

Add or reuse a persistence model suitable for Agent Runs.

Use existing project/run storage conventions if they already exist.

An Agent Run should have at least:

* agent_run_id
* project_id if linked
* dataset_id if linked
* owner/session id
* goal_text
* interpreted_goal
* task_type
* task_family
* status
* supported_status
* unsupported_reason if applicable
* plan_id
* created_at
* updated_at

Suggested statuses:

* draft
* planned
* waiting_for_review
* ready_to_execute
* unsupported
* failed

For PR-27, most successful agent runs should end as:

* planned
  or
* waiting_for_review
  or
* ready_to_execute

Do not mark tool execution as completed in PR-27.

## Plan data model

A Plan should have at least:

* plan_id
* agent_run_id
* project_id if linked
* status
* steps
* created_at
* updated_at

Each Plan Step should have:

* plan_step_id
* order
* name
* tool_name
* purpose
* expected_input
* expected_output
* status
* requires_human_review
* review_reason if applicable

Suggested step statuses:

* planned
* pending
* blocked
* skipped
* unsupported

Do not use:

* completed
  unless a real tool has actually executed.

## Required default plan steps

Generate a deterministic plan using these planned steps where applicable:

1. Dataset profile

   * tool_name: data_profile_tool
   * purpose: 데이터 행/열, 결측치, 컬럼 타입, 기본 통계를 확인합니다.
   * status: planned

2. Schema validation

   * tool_name: schema_validation_tool
   * purpose: 분석 가능한 CSV 구조인지 확인합니다.
   * status: planned

3. Target recommendation

   * tool_name: target_recommendation_tool
   * purpose: 목표에 맞는 예측 타깃 후보를 추천합니다.
   * status: planned
   * may require human review if target is ambiguous

4. Leakage check

   * tool_name: leakage_check_tool
   * purpose: 타깃 누수 가능성이 있는 컬럼을 점검합니다.
   * status: planned
   * may require human review

5. AutoML training

   * tool_name: automl_training_tool
   * purpose: 여러 모델을 학습하고 비교합니다.
   * status: planned

6. Evaluation

   * tool_name: evaluation_tool
   * purpose: 문제 유형에 맞는 지표로 모델 성능을 평가합니다.
   * status: planned

7. Explanation

   * tool_name: shap_explainer_tool
   * purpose: 주요 변수의 기여도를 설명합니다.
   * status: planned

8. Validation

   * tool_name: validation_tool
   * purpose: 성능, 데이터 품질, 위험 요소를 검증합니다.
   * status: planned

9. Report writing

   * tool_name: report_writer_tool
   * purpose: 분석 결과와 한계를 근거 기반 보고서로 정리합니다.
   * status: planned

10. API readiness check

* tool_name: api_readiness_tool
* purpose: 예측 API로 제공 가능한 상태인지 확인합니다.
* status: planned

## Human review flags

PR-27 should create review flags but does not need to implement the full review workflow.

Full review/recovery comes in PR-30.

Create clear flags for:

* target_ambiguous
* unsupported_goal
* limited_time_series
* leakage_review_required
* metric_review_required
* api_readiness_review_required
* causal_claim_warning

Examples:

If goal asks for "원인" or "영향":

* add causal_claim_warning
* UI copy should say:
  `중요 변수의 기여도는 설명할 수 있지만, 인과관계를 단정하지는 않습니다.`

If goal looks like clustering:

* supported_status: unsupported
* reason:
  `현재 Agent Mode는 CSV 기반 분류/회귀 예측 문제를 우선 지원합니다.`

If goal looks like time-series:

* supported_status: limited
* reason:
  `시계열 예측은 날짜 컬럼과 예측 기간 확인이 필요합니다.`

## UI requirements

Add a Korean-first Agent Mode entry.

Possible labels:

* `Agent Mode`
* `목표 기반 분석`
* `AI 분석 에이전트`

The UI should include:

1. Goal input

   * Korean placeholder:
     `예: 이 CSV로 고객 이탈 가능성을 예측하고 중요한 원인을 보고서로 정리해줘.`

2. Dataset selection

   * Use existing upload or starter/sample dataset flow where possible.
   * Do not duplicate upload logic unnecessarily.

3. Optional target preference

   * User may optionally specify a target column.
   * If target is not provided, plan should include target recommendation step.

4. Plan preview

   * Show generated plan steps.
   * Show status as planned/pending.
   * Do not show fake completed execution.

5. Scope warning panel

   * Show supported, limited, or unsupported status.
   * Show limitations honestly.

6. Create Agent Run action

   * Creates persisted Agent Run and Plan.

7. Continue action

   * Since PR-28 is not implemented yet, the continue action can say:
     `도구 실행은 다음 단계에서 연결됩니다. 현재는 실행 계획까지 생성되었습니다.`
   * Or route to existing analysis flow only if the data contract is safe and honest.

## Routing and workspace integration

Use the existing app routing patterns.

Do not break existing navigation.

Agent Runs should be reachable from workspace where reasonable.

At minimum:

* after creation, show an Agent Run detail or plan preview page
* user can refresh and still see the run/plan
* run/project linkage is visible if a project was created or selected

If there is already a Run Detail page, reuse it where appropriate.

Do not create a parallel disconnected world that workspace cannot see.

## Persistence requirements

Do not store Agent Run only in transient React state.

Use the project’s existing persistence pattern.

Acceptable persistence, depending on current app architecture:

* backend storage
* existing local/session demo persistence layer
* existing workspace persistence abstraction

But it must be consistent with the workspace/session model.

Refresh must not immediately lose the Agent Run and Plan.

If the current app uses session-scoped demo persistence, document that clearly.

## Backend/API requirements

If backend exists for workspace/project/run persistence, add focused endpoints or reuse existing ones.

Suggested endpoints if appropriate:

* POST /agent-runs
* GET /agent-runs
* GET /agent-runs/:id
* POST /agent-runs/:id/plan
* GET /agent-runs/:id/plan

Use the repo’s existing API style.

Do not introduce unnecessary new frameworks.

Do not add a database migration unless the project already uses persistent DB models and this is the cleanest path.

If data is stored locally for demo mode, keep schema clean and ready for backend migration.

## Frontend implementation requirements

Add reusable helpers where useful:

* goalInterpreter
* planBuilder
* agentRunStore or API client integration
* agentPlan components
* supportedScopeBadge
* reviewFlagPanel

Names may follow existing repo conventions.

Do not over-engineer.

Do not duplicate existing workspace stores if reusable ones exist.

## Documentation updates

Update or create documentation:

* `.codex/TASK_QUEUE.md`

  * PR-27 should move to `review_needed` only after implementation is complete.
  * Do not mark PR-27 as done.

* docs/agent-mode-mvp.md if docs folder exists

  * Explain what PR-27 implements.
  * Explain deterministic planner.
  * Explain that tool execution starts in PR-28.
  * Explain supported/limited/unsupported scope.

* docs/final-qa-report.md or relevant QA docs if they exist

  * Add PR-27 verification notes.

Do not overclaim full autonomy.

## Build and tests

Required:

`cd frontend && npm run build`

If backend is touched, run relevant backend tests or smoke scripts.

If no backend tests exist, document manual backend verification.

## Manual verification

Perform and document:

1. Open app.
2. Start Agent Mode / 목표 기반 분석.
3. Enter:
   `이 CSV로 고객 이탈 가능성을 예측하고 중요한 원인을 보고서로 정리해줘.`
4. Select or use a sample/starter dataset if available.
5. Create Agent Run.
6. Confirm Agent Run is created.
7. Confirm deterministic plan is created.
8. Confirm plan steps are planned/pending, not completed.
9. Refresh browser.
10. Confirm run/plan still exists.
11. Try an unsupported goal such as:
    `이 문서들로 RAG 챗봇을 만들어줘.`
12. Confirm unsupported message appears honestly.
13. Confirm existing upload/sample/starter analysis still works.
14. Confirm workspace navigation still works.

## Acceptance criteria

* Agent Mode entry exists.
* Korean natural-language goal input exists.
* Deterministic goal interpreter exists.
* Supported/limited/unsupported scope handling exists.
* Agent Run is persisted.
* Plan is persisted.
* Plan preview is shown.
* Tool steps are not falsely shown as completed.
* Unsupported goals are handled honestly.
* Refresh does not lose Agent Run and Plan.
* Existing upload/sample/starter analysis still works.
* Existing workspace navigation still works.
* No LLM API key is required.
* No fake Agent UI is added.
* Korean-first UI copy is preserved.
* Frontend build passes.
* PR-27 is marked `review_needed`, not `done`.
* PR-28 is not started.

## PR output

The PR body must include:

1. Summary
2. Implementation approach
3. Files changed
4. Build/test results
5. Manual verification
6. Screens/routes checked
7. Known limitations
8. Review status

Review status should be:

`review_needed`

## Known limitation wording

If needed, use wording like:

`PR-27 creates the persisted Agent Run and deterministic plan. Actual tool execution and observation/decision trace persistence will be implemented in PR-28.`

## Final instruction

Implement only PR-27.

Do not start PR-28.

After implementation, update `.codex/TASK_QUEUE.md` so PR-27 is `review_needed`.

Stop for review.
