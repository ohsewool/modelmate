# PR-30 Task: Human Review / Recovery

Status:
todo

Branch:
`codex/pr-30-human-review-recovery`

Commit message:
`feat: add human review and recovery for agent runs`

## Goal

Implement PR-30 Human Review / Recovery.

PR-27 created Agent Runs and Plans.

PR-28 added tool execution and persisted trace records.

PR-29 made trace records visible in Run Detail.

PR-30 must add user confirmation and recovery behavior for risky or ambiguous analytics decisions.

The goal is not full autonomy.

The goal is safe, auditable, human-in-the-loop Agentic AutoML.

## Context

The main risk in ModelMate is wrong analytics, not toxic content.

High-risk situations should not be silently auto-approved.

The product should ask for human review when:

- target column is ambiguous
- leakage risk is high
- task type is unclear
- time-series split/horizon is unclear
- model performance is low
- class imbalance is severe
- prediction API readiness is risky
- public sharing or token creation is risky
- report wording could overclaim causality

## Non-negotiable constraints

Do not rewrite the whole app.

Do not redesign unrelated UI.

Do not migrate JavaScript to TypeScript.

Do not add real billing.

Do not add enterprise MLOps features.

Do not fake review events.

Do not silently auto-approve high-risk decisions.

Do not delete previous trace when retrying.

Do not corrupt existing Agent Run history.

Do not implement PR-31 LLM planner yet.

Do not break existing upload, sample/starter analysis, reports, prediction API readiness, workspace navigation, or settings usage.

User-facing UI copy must remain Korean-first.

Preserve Railway deployment compatibility.

## Human review data model

Add or reuse a persisted Human Review Request model.

A review request should include:

- human_review_request_id
- agent_run_id
- plan_step_id if applicable
- tool_call_id if applicable
- validation_id if applicable
- review_type
- severity
- status
- title
- message
- options
- selected_option if resolved
- user_note if provided
- created_at
- resolved_at

Suggested statuses:

- pending
- approved
- rejected
- retried
- stopped
- resolved

Suggested review types:

- target_ambiguity
- leakage_risk
- time_series_uncertainty
- low_model_performance
- class_imbalance
- api_readiness_risk
- causal_claim_warning
- failed_tool_recovery

## Required review scenarios

### 1. Target ambiguity

When target recommendation is ambiguous:

- pause run
- create human review request
- show target candidates
- let user select target or stop

Korean copy:

`예측 타깃 후보가 여러 개 발견되었습니다. 분석에 사용할 타깃 컬럼을 확인해주세요.`

Actions:

- select target
- continue
- stop analysis

### 2. Leakage risk

When leakage risk is high:

- pause or warn depending on severity
- show suspicious columns
- allow user to exclude columns or continue with warning

Korean copy:

`타깃 누수 가능성이 있는 컬럼이 발견되었습니다. 이 컬럼을 제외하고 진행하는 것이 안전합니다.`

Actions:

- exclude suspicious columns
- continue with warning
- stop analysis

### 3. Time-series uncertainty

When goal suggests time-series but timestamp/horizon is unclear:

- ask for confirmation
- require timestamp column or horizon if needed
- do not silently run as normal random split

Korean copy:

`시계열 예측은 날짜 컬럼과 예측 기간 확인이 필요합니다.`

Actions:

- select timestamp column
- provide horizon
- continue as standard prediction
- stop analysis

### 4. Low model performance

When evaluation is weak:

- warn before report/API readiness
- do not present API as production-ready
- allow report generation with limitations

Korean copy:

`모델 성능이 낮아 예측 API로 바로 사용하기에는 위험할 수 있습니다.`

Actions:

- generate report with warning
- retry training if supported
- stop before API readiness

### 5. API readiness risk

When model quality, validation, or missing artifact blocks API readiness:

- show disabled reason
- do not generate misleading ready state

Korean copy:

`현재 모델은 예측 API로 제공하기 전에 추가 확인이 필요합니다.`

Actions:

- acknowledge
- return to report
- retry if supported

### 6. Failed tool recovery

When a tool fails:

- preserve previous successful trace
- mark failed step
- allow retry if safe
- allow stop

Korean copy:

`도구 실행 중 문제가 발생했습니다. 이전 단계의 결과는 보존되었습니다.`

Actions:

- retry step
- skip if safe
- stop run

## Recovery behavior

Recovery must not erase previous trace.

When retrying:

- create a new tool_call attempt
- link it to the same plan_step_id
- preserve previous failed tool_call record
- update final plan_step status based on latest successful attempt

When stopping:

- mark Agent Run as stopped or blocked
- preserve all trace records
- show clear final state

When approving:

- persist selected option
- create decision record
- resume from the paused step if safe

## UI requirements

Add human review UI to Agent Run Detail / Run Detail.

Review panel should show:

- review title
- severity
- explanation
- related step/tool
- suggested action
- available options
- confirm/retry/stop buttons

Korean labels:

- `사용자 확인 필요`
- `권장 조치`
- `계속 진행`
- `다시 시도`
- `중단`
- `제외하고 진행`
- `경고를 확인하고 진행`

## Trace integration

Human review events should appear in the trace timeline.

Timeline should show:

- review requested
- user action
- decision after review
- resumed step if applicable

Do not hide review decisions.

## Backend/API requirements

Use existing repo style.

Possible endpoints:

- POST `/agent-runs/:id/reviews`
- GET `/agent-runs/:id/reviews`
- POST `/agent-runs/:id/reviews/:review_id/resolve`
- POST `/agent-runs/:id/retry-step`
- POST `/agent-runs/:id/stop`

Use existing persistence conventions.

If local/session demo persistence is used, implement the same clean data contract.

## Documentation updates

Update or create:

- docs/agent-mode-mvp.md
- docs/final-qa-report.md
- docs/architecture-overview.md if relevant
- `.codex/TASK_QUEUE.md`

Document:

- human review scenarios
- recovery behavior
- limitations
- how trace is preserved
- why the system is not fully autonomous

## Build and tests

Required:

`cd frontend && npm run build`

If backend is touched, run relevant backend tests or smoke scripts.

If no backend tests exist, document manual backend verification.

## Manual verification

Perform and document:

1. Create or use an Agent Run.
2. Trigger or simulate target ambiguity.
3. Confirm human review request appears.
4. Select a target and continue.
5. Trigger or simulate leakage risk.
6. Confirm leakage review appears.
7. Continue with exclusion or warning.
8. Trigger or simulate low model performance.
9. Confirm API readiness warning or block appears.
10. Trigger or simulate failed tool recovery.
11. Retry the failed step.
12. Confirm previous failed trace remains.
13. Confirm new retry attempt is added.
14. Confirm final run status is clear.
15. Refresh browser.
16. Confirm review records remain.
17. Confirm existing upload/sample/starter analysis still works.
18. Confirm workspace navigation still works.

## Acceptance criteria

- Human review request model exists.
- Target ambiguity can trigger review.
- Leakage risk can trigger review.
- Time-series uncertainty can trigger review or warning.
- Low model performance can warn/block API readiness.
- Failed tool step can be retried or stopped.
- User approval creates persisted decision.
- Retry does not erase previous trace.
- Stop does not corrupt run history.
- Review events appear in Agent Run Detail / Run Detail.
- High-risk decisions are not silently auto-approved.
- Existing upload/sample/starter flow still works.
- Existing workspace navigation still works.
- Korean-first UI copy is preserved.
- Frontend build passes.
- PR-30 is marked `review_needed`, not `done`.
- PR-31 is not started.

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

If needed, use:

`PR-30 adds human review and recovery for major analytics risks. Optional LLM planner integration remains disabled until PR-31.`

## Final instruction

Implement only PR-30.

Do not start PR-31.

After implementation, update `.codex/TASK_QUEUE.md` so PR-30 is `review_needed`.

Stop for review.
