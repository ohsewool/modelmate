# PR-29 Task: Agent Trace / Decision UI

Status:
todo

Branch:
`codex/pr-29-agent-trace-decision-ui`

Commit message:
`feat: add agent trace and decision timeline`

## Goal

Implement PR-29 Agent Trace / Decision UI.

PR-28 added persisted tool calls, observations, decisions, validations, and artifacts.

PR-29 must make those records visible and understandable in the product UI.

Run Detail should become the main agent console.

The UI must show real persisted trace data, not decorative fake progress.

## Context

ModelMate is a Korean-first, CSV-first, predictive-analysis-first Agentic AutoML SaaS MVP.

The key trust feature is that users can see:

goal
→ plan
→ tool call
→ observation
→ decision
→ validation
→ artifact

This PR is about transparency, auditability, and product clarity.

## Non-negotiable constraints

Do not rewrite the whole app.

Do not redesign unrelated UI.

Do not migrate JavaScript to TypeScript.

Do not add real billing.

Do not add enterprise MLOps features.

Do not fake agent trace data.

Do not hardcode observations or decisions as real results.

Do not show completed steps unless real persisted records show completion.

Do not implement PR-30 human review/recovery logic yet.

Do not implement PR-31 LLM planner yet.

Do not break existing upload, sample/starter analysis, reports, prediction API readiness, workspace navigation, or settings usage.

User-facing UI copy must remain Korean-first.

Preserve Railway deployment compatibility.

## UI goal

Create or improve an Agent Run Detail / Run Detail page that shows:

1. Goal summary
2. Interpreted goal
3. Supported/limited/unsupported status
4. Plan steps
5. Tool calls
6. Observations
7. Decisions
8. Validation warnings
9. Artifacts
10. Current run status
11. Pending or unavailable steps honestly

## Required UI sections

### 1. Header

Show:

- Agent Run title or goal summary
- status badge
- task type
- dataset/project link if available
- created/updated time

Korean copy examples:

- `목표 기반 분석 실행`
- `실행 상태`
- `연결된 프로젝트`
- `연결된 데이터셋`

### 2. Goal panel

Show original user goal.

Show interpreted goal fields:

- task family
- task type
- supported status
- target candidates if available
- recommended metrics if available

If causal warning exists, show:

`중요 변수의 기여도는 설명할 수 있지만, 인과관계를 단정하지는 않습니다.`

### 3. Plan timeline

Show each plan step in order.

Each step should show:

- step name
- tool name
- status
- purpose
- whether review is required

Allowed statuses:

- planned
- pending
- running
- completed
- failed
- blocked
- skipped
- waiting_for_review

Do not use decorative-only statuses.

### 4. Tool call detail

When a step is selected, show:

- tool_name
- started_at
- completed_at
- input_summary
- output_summary
- status
- error if failed

Do not show raw CSV content.

### 5. Observation detail

Show persisted observation summary.

Examples:

- dataset profile summary
- target recommendation output
- leakage warning
- model evaluation metrics
- SHAP contribution summary

If observation does not exist yet, show:

`아직 이 단계의 관찰 결과가 생성되지 않았습니다.`

### 6. Decision detail

Show persisted decisions.

Examples:

- selected target
- selected metric
- selected model
- whether to continue
- whether to block API readiness

Decision copy should explain why.

Example:

`이 단계에서는 F1과 ROC-AUC를 함께 확인하도록 결정했습니다. 클래스 불균형 가능성이 있기 때문입니다.`

### 7. Validation panel

Show validation results grouped by severity:

- info
- warning
- blocking

Korean labels:

- `정보`
- `주의`
- `차단`

Blocking validations must be visually clear.

### 8. Artifact panel

Show linked artifacts:

- report
- trained model
- evaluation summary
- explanation summary
- API readiness

If artifact is unavailable, show honest state.

Example:

`보고서는 아직 생성되지 않았습니다.`

## Navigation requirements

Agent Run Detail should be reachable from:

- Dashboard if recent Agent Run exists
- Projects / Project Detail if linked
- Jobs / Runs page if linked
- Reports page if report artifact exists

Do not create a disconnected Agent-only area that cannot be reached from workspace.

## Empty state requirements

Empty states must be honest.

Examples:

- `아직 실행된 도구가 없습니다.`
- `이 단계는 계획되었지만 아직 실행되지 않았습니다.`
- `검증 결과가 없습니다.`
- `생성된 아티팩트가 없습니다.`

Do not show fake progress.

## Data requirements

Read from persisted records created in PR-27 and PR-28.

Use existing API/client/store patterns.

Required data sources:

- Agent Run
- Plan
- Plan Steps
- Tool Calls
- Observations
- Decisions
- Validations
- Artifacts

If any record type is unavailable, show unavailable state honestly and document the limitation.

## Component suggestions

Use repo conventions.

Possible components:

- AgentRunHeader
- AgentGoalPanel
- AgentPlanTimeline
- AgentStepDetail
- ToolCallSummary
- ObservationSummary
- DecisionSummary
- ValidationPanel
- ArtifactPanel
- TraceEmptyState

Do not over-engineer.

## Documentation updates

Update or create:

- docs/agent-mode-mvp.md
- docs/final-qa-report.md
- docs/architecture-overview.md if relevant
- `.codex/TASK_QUEUE.md`

Document:

- trace UI behavior
- what is real persisted trace
- what is pending/unavailable
- known limitations
- PR-30 will add full human review/recovery

Do not overclaim full autonomy.

## Build and tests

Required:

`cd frontend && npm run build`

If backend is touched, run relevant backend tests or smoke scripts.

If no backend tests exist, document manual backend verification.

## Manual verification

Perform and document:

1. Open app.
2. Create or use an Agent Run.
3. Execute the Agent Run if PR-28 execution is available.
4. Open Run Detail / Agent Run Detail.
5. Confirm goal appears.
6. Confirm plan timeline appears.
7. Confirm tool calls appear from persisted records.
8. Confirm observations appear from persisted records.
9. Confirm decisions appear from persisted records.
10. Confirm validation warnings appear.
11. Confirm artifacts link correctly if available.
12. Refresh browser.
13. Confirm timeline still appears.
14. Confirm pending/unavailable states are honest.
15. Confirm Dashboard/Projects/Jobs/Reports/API navigation still works.
16. Confirm no fake “AI is thinking” timeline is shown.

## Acceptance criteria

- Agent Run Detail / Run Detail shows persisted trace data.
- Timeline is based on real records.
- Tool call details are visible.
- Observation summaries are visible.
- Decision summaries are visible.
- Validation warnings are visible.
- Artifact links are visible where available.
- Pending/unavailable states are labeled honestly.
- No fake decorative agent trace is shown.
- Workspace navigation remains connected.
- Refresh does not lose timeline state.
- Existing upload/sample/starter analysis still works.
- Korean-first UI copy is preserved.
- Frontend build passes.
- PR-29 is marked `review_needed`, not `done`.
- PR-30 is not started.

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

`PR-29 visualizes persisted agent trace records. Full human review and recovery actions will be implemented in PR-30.`

## Final instruction

Implement only PR-29.

Do not start PR-30.

After implementation, update `.codex/TASK_QUEUE.md` so PR-29 is `review_needed`.

Stop for review.
