# PR-31 Task: Optional LLM Planner Integration

Status:
todo

Branch:
`codex/pr-31-optional-llm-planner`

Commit message:
`feat: add optional llm planner interface`

## Goal

Implement PR-31 Optional LLM Planner Integration.

The deterministic planner must remain the default and fallback.

Agent Mode must continue working without any LLM configuration.

The LLM planner should be optional, schema-constrained, validated, and safe to disable.

## Context

PR-27 implemented deterministic goal-first planning.

PR-28 implemented tool execution.

PR-29 implemented trace UI.

PR-30 implemented human review/recovery.

PR-31 may add optional LLM assistance for planning, but must not make the product dependent on an external paid API.

This PR is about planner architecture, not about uncontrolled autonomy.

## Non-negotiable constraints

Do not rewrite the whole app.

Do not redesign unrelated UI.

Do not migrate JavaScript to TypeScript.

Do not add real billing.

Do not add enterprise MLOps features.

Do not require an LLM API key.

Do not expose secrets or API keys.

Do not trust raw LLM output without validation.

Do not let LLM planner bypass supported scope rules.

Do not let LLM planner execute tools directly.

Do not remove deterministic planner.

Do not break existing Agent Mode.

Do not break upload/sample/starter analysis.

User-facing UI copy must remain Korean-first.

Preserve Railway deployment compatibility.

## Planner architecture

Introduce a planner interface if not already present.

Suggested interface:

- `createPlan(goal, datasetContext, workspacePolicy)`
- `revisePlan(plan, observations, constraints)`

Implement two planners:

1. deterministic planner
2. optional LLM planner

The deterministic planner must remain default.

The LLM planner may be enabled only through explicit configuration.

Example config names can follow repo conventions.

Possible flags:

- `ENABLE_LLM_PLANNER`
- `MODEL_MATE_LLM_PLANNER_ENABLED`
- frontend-safe display flag only if needed

Do not expose backend secrets to frontend.

## LLM planner behavior

The LLM planner can help with:

- goal interpretation
- plan step wording
- identifying likely task framing
- suggesting review flags

The LLM planner must not:

- execute tools
- access raw secrets
- bypass validation
- invent completed tool outputs
- invent observations
- invent model metrics
- invent reports
- claim unsupported tasks are supported

## Schema validation

LLM planner output must be validated.

Expected output should include:

- task_family
- task_type
- supported_status
- unsupported_reason if any
- target_hints
- metric_hints
- report_framing
- review_flags
- plan_steps

If output is invalid:

- discard LLM output
- fall back to deterministic planner
- create warning/log entry
- do not crash the app

## Fallback behavior

Fallback must work for:

- missing config
- missing API key
- network failure
- invalid schema
- unsupported goal
- unsafe output
- timeout

Korean UI copy example:

`LLM 계획 생성이 비활성화되어 기본 규칙 기반 계획을 사용했습니다.`

or:

`LLM 계획 결과가 유효하지 않아 기본 계획으로 대체했습니다.`

## Safety rules

The final plan must always pass existing validation.

Supported scope still applies:

Supported:

- binary classification
- multiclass classification
- single-target regression

Limited:

- simple time-series only when timestamp/horizon is clear

Unsupported:

- RAG/document analysis
- clustering primary flow
- anomaly detection primary flow
- causal inference
- uplift modeling
- enterprise MLOps
- full autonomous data science

LLM cannot override this scope.

## UI requirements

Add minimal UI/config indication only if appropriate.

Do not clutter the product.

Possible copy:

- `계획 방식: 기본 규칙 기반`
- `계획 방식: LLM 보조`
- `LLM 계획을 사용할 수 없어 기본 계획으로 진행합니다.`

The user should not need to understand implementation details.

## Logging requirements

Log safe summaries only.

Do not log:

- API keys
- raw uploaded CSV
- secrets
- full private user data

Log:

- planner type used
- fallback reason
- validation status

## Documentation updates

Update or create:

- docs/agent-mode-mvp.md
- docs/architecture-overview.md
- docs/final-qa-report.md
- `.codex/TASK_QUEUE.md`

Document:

- deterministic planner remains default
- LLM planner is optional
- fallback behavior
- schema validation
- limitations
- no external API dependency for normal demo

## Build and tests

Required:

`cd frontend && npm run build`

If backend is touched, run relevant backend tests or smoke scripts.

If no backend tests exist, document manual backend verification.

## Manual verification

Perform and document:

1. Run Agent Mode without LLM config.
2. Confirm deterministic planner works.
3. Confirm no LLM API key is required.
4. If mock/configured LLM planner path exists, enable it safely.
5. Confirm LLM planner output is validated.
6. Confirm invalid planner output falls back to deterministic planner.
7. Confirm unsupported goals remain unsupported.
8. Confirm no secrets are exposed.
9. Confirm existing Agent Run execution still works.
10. Confirm existing upload/sample/starter analysis still works.
11. Confirm workspace navigation still works.

## Acceptance criteria

- Planner interface exists or is clearly structured.
- Deterministic planner remains default.
- Agent Mode works without LLM config.
- Optional LLM planner can be enabled safely if configured.
- LLM planner output is schema-constrained.
- Invalid LLM output falls back safely.
- LLM cannot bypass supported scope rules.
- LLM does not invent tool outputs or observations.
- No secrets are exposed.
- Existing Agent Mode still works.
- Existing upload/sample/starter flow still works.
- Korean-first UI copy is preserved.
- Frontend build passes.
- PR-31 is marked `review_needed`, not `done`.
- PR-32 is not started.

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

`The LLM planner is optional. ModelMate continues to work with the deterministic planner when no LLM configuration is provided.`

## Final instruction

Implement only PR-31.

Do not start PR-32.

After implementation, update `.codex/TASK_QUEUE.md` so PR-31 is `review_needed`.

Stop for review.
