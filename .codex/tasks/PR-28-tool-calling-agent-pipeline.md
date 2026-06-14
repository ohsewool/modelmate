# PR-28 Task: Tool-calling Agent Pipeline

Status:
todo

Branch:
`codex/pr-28-tool-calling-agent-pipeline`

Commit message:
`feat: add tool calling agent pipeline`

## Goal

Implement PR-28 Tool-calling Agent Pipeline.

PR-27 created the Goal-first Agent Mode with persisted Agent Run and Plan.

PR-28 must connect that plan to real tool execution.

This PR should wrap existing ModelMate AutoML functionality as typed tools and persist:

- tool_call records
- observation records
- decision records
- validation records
- artifact records

This PR is the core step that makes ModelMate meaningfully agentic.

## Context

ModelMate is a Korean-first, CSV-first, predictive-analysis-first Agentic AutoML SaaS MVP.

The product must not merely show decorative "AI is thinking" messages.

A real Agentic AutoML workflow must show and persist:

goal
→ plan
→ tool call
→ observation
→ decision
→ validation
→ artifact

PR-28 should focus on backend/data-flow and execution state first.
UI polish comes in PR-29.

## Non-negotiable constraints

Do not rewrite the whole app.

Do not redesign unrelated UI.

Do not migrate JavaScript to TypeScript.

Do not add real billing.

Do not add enterprise MLOps features.

Do not fake tool traces.

Do not hardcode observations as real results.

Do not mark a step completed unless the real tool/function executed.

Do not require an LLM API key.

Do not implement optional LLM planner yet.

Do not break existing upload, sample/starter analysis, reports, prediction API readiness, workspace navigation, or settings usage.

Do not bypass ownership/session checks.

Do not expose raw CSV contents, secrets, tokens, or full user data in logs.

User-facing UI copy must remain Korean-first.

Preserve Railway deployment compatibility.

## Required tools

Wrap or connect existing functionality as typed tools where possible.

Expected tools:

1. `data_profile_tool`
2. `schema_validation_tool`
3. `target_recommendation_tool`
4. `leakage_check_tool`
5. `automl_training_tool`
6. `evaluation_tool`
7. `shap_explainer_tool`
8. `validation_tool`
9. `report_writer_tool`
10. `api_readiness_tool`

Do not duplicate large existing AutoML logic unnecessarily.

Prefer wrapping existing functions/services.

## Tool call data model

Each tool execution should create a persisted tool call record.

A tool call should include:

- tool_call_id
- agent_run_id
- plan_id
- plan_step_id
- project_id if linked
- dataset_id if linked
- tool_name
- input_summary
- output_summary
- status
- started_at
- completed_at
- error_message if failed

Suggested statuses:

- pending
- running
- completed
- failed
- skipped
- blocked

Do not store full raw CSV in `input_summary`.

## Observation data model

Each successful tool call should create an observation.

An observation should include:

- observation_id
- agent_run_id
- tool_call_id
- plan_step_id
- observation_type
- payload
- summary
- created_at

Examples:

For data profile:
- row_count
- column_count
- missing values summary
- inferred column types

For evaluation:
- task type
- metric values
- baseline comparison if available
- best model

For SHAP/explanation:
- top feature contributions
- explanation limitations

## Decision data model

The agent must record decisions separately from observations.

A decision should include:

- decision_id
- agent_run_id
- based_on_observation_ids
- decision_type
- summary
- selected_value if applicable
- reason
- created_at

Examples:

- selected target candidate
- selected task type
- selected metric family
- selected best model
- continue to report writing
- block API readiness due to low quality

Do not hide decisions inside tool output.

## Validation data model

Validation results should be persisted.

A validation result should include:

- validation_id
- agent_run_id
- plan_step_id
- severity
- validation_type
- message
- passed
- created_at

Suggested severities:

- info
- warning
- blocking

Important validations:

- unsupported goal
- ambiguous target
- leakage risk
- time-series uncertainty
- class imbalance
- low model performance
- API readiness risk
- causal overclaim warning

## Artifact data model

Generated artifacts should be linked to the Agent Run.

An artifact should include:

- artifact_id
- agent_run_id
- project_id if linked
- run_id/job_id if linked
- artifact_type
- title
- route/link if available
- status
- created_at

Artifact types may include:

- report
- trained_model
- evaluation_summary
- explanation_summary
- api_readiness
- dataset_profile

## Pipeline behavior

When an Agent Run is executed:

1. Load Agent Run and Plan.
2. Validate ownership/session.
3. Execute plan steps in order.
4. For each step:
   - create tool_call record
   - run tool
   - persist observation
   - persist validation result if applicable
   - persist decision if the system chooses something
   - update plan_step status
5. Stop safely if a blocking validation occurs.
6. Keep partial trace if the run fails.
7. Do not erase previous successful trace.
8. Update Agent Run status.

Suggested Agent Run statuses:

- planned
- running
- waiting_for_review
- completed
- failed
- blocked

## Human review interaction

PR-28 should create review-needed states, but the full review UI/recovery flow comes in PR-30.

If a step needs human review:

- mark Agent Run as `waiting_for_review`
- persist validation or review-needed reason
- stop execution safely
- do not proceed silently

## API / backend requirements

Use existing backend/API patterns if available.

Possible endpoints:

- POST `/agent-runs/:id/execute`
- GET `/agent-runs/:id/trace`
- GET `/agent-runs/:id/tool-calls`
- GET `/agent-runs/:id/observations`
- GET `/agent-runs/:id/decisions`
- GET `/agent-runs/:id/validations`
- GET `/agent-runs/:id/artifacts`

Use the repository’s existing style.

Do not introduce unnecessary frameworks.

If the app currently uses local/session demo storage, implement the same data contract cleanly in that persistence layer.

## Frontend requirements

Add only the minimum UI needed to start execution from an Agent Run/Plan.

PR-29 will polish the full trace UI.

For PR-28, the UI should at least:

- allow starting execution for a planned Agent Run
- show running/completed/failed/waiting status honestly
- not fake detailed timeline if detailed timeline UI is not ready
- link to existing run/detail area if available

Korean copy examples:

- `에이전트 실행 시작`
- `도구 실행 중`
- `검증 대기`
- `사용자 확인 필요`
- `실행 실패`
- `실행 완료`

## Documentation updates

Update or create:

- docs/agent-mode-mvp.md
- docs/architecture-overview.md if relevant
- docs/final-qa-report.md if relevant
- `.codex/TASK_QUEUE.md`

Document:

- tool registry
- trace objects
- execution flow
- known limitations
- that PR-29 will improve trace UI
- that PR-30 will implement full human review/recovery

Do not overclaim full autonomy.

## Build and tests

Required:

`cd frontend && npm run build`

If backend is touched, run relevant backend tests or smoke scripts.

If no backend tests exist, document manual backend verification.

## Manual verification

Perform and document:

1. Open app.
2. Create or use an Agent Run from PR-27.
3. Start agent execution.
4. Confirm real tool calls are created.
5. Confirm observations are persisted.
6. Confirm decisions are persisted where choices are made.
7. Confirm validations are persisted.
8. Confirm artifacts are linked if generated.
9. Refresh browser.
10. Confirm trace records remain.
11. Confirm failed or blocked steps are visible and not hidden.
12. Confirm existing upload/sample/starter analysis still works.
13. Confirm workspace/project/run/report/API records remain connected.

## Acceptance criteria

- Agent Run can execute planned steps.
- Existing AutoML functionality is wrapped as tools where possible.
- tool_call records are persisted.
- observation records are persisted.
- decision records are persisted.
- validation records are persisted.
- artifact records are persisted when artifacts are generated.
- Failed steps are not hidden.
- Blocking validations stop execution safely.
- No fake trace data is displayed.
- Existing workspace/project/run/report/API records remain connected.
- Existing upload/sample/starter flow still works.
- Korean-first UI copy is preserved.
- Frontend build passes.
- PR-28 is marked `review_needed`, not `done`.
- PR-29 is not started.

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

`PR-28 persists real tool execution traces. PR-29 will improve the Run Detail trace and decision timeline UI.`

## Final instruction

Implement only PR-28.

Do not start PR-29.

After implementation, update `.codex/TASK_QUEUE.md` so PR-28 is `review_needed`.

Stop for review.
