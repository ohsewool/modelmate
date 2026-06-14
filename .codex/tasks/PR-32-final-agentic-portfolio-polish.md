# PR-32 Task: Final Agentic Portfolio Polish

Status:
todo

Branch:
`codex/pr-32-final-agentic-portfolio-polish`

Commit message:
`docs: polish agentic automl portfolio package`

## Goal

Implement PR-32 Final Agentic Portfolio Polish.

This PR finalizes ModelMate’s public-facing positioning, documentation, demo path, and QA checklist after the Agentic AutoML roadmap.

The product should be presented honestly as:

`Korean-first Agentic AutoML SaaS MVP`

Do not overclaim full autonomy or enterprise-grade AutoML.

## Context

PR-27 added Goal-first Agent Mode.

PR-28 added tool-calling agent pipeline.

PR-29 added trace and decision UI.

PR-30 added human review and recovery.

PR-31 added optional LLM planner integration.

PR-32 should make the project portfolio-ready.

## Non-negotiable constraints

Do not rewrite the whole app.

Do not redesign unrelated UI.

Do not add real billing.

Do not add enterprise MLOps features.

Do not overclaim.

Do not describe ModelMate as a fully autonomous enterprise AutoML platform.

Do not claim SHAP proves causality.

Do not hide limitations.

Do not break existing upload/sample/starter analysis.

Do not break workspace navigation.

User-facing UI copy must remain Korean-first.

Preserve Railway deployment compatibility.

## Positioning

Use this as the safe English positioning:

`ModelMate turns CSV data into explainable predictions, grounded reports, and reusable APIs through a guided AI analyst workflow.`

Use this as the safe Korean positioning:

`ModelMate는 CSV 데이터를 업로드하면 데이터 구조 분석, 예측 타깃 추천, 모델 비교, 근거 기반 보고서, 예측 API 생성까지 하나의 흐름으로 제공하는 guided AutoML SaaS MVP입니다.`

For Agentic version, use:

`ModelMate는 CSV 기반 분류·회귀 예측 문제를 대상으로, 사용자 목표를 실행 계획으로 변환하고, AutoML 도구 호출·관찰·결정·검증 결과를 저장하며, grounded report와 prediction API readiness까지 제공하는 Korean-first Agentic AutoML SaaS MVP입니다.`

Avoid:

- fully autonomous AI data scientist
- enterprise AutoML replacement
- DataRobot replacement
- production-grade MLOps platform
- causality engine
- universal AI agent
- supports every data science task

## Landing page polish

Review landing page copy.

Improve only if needed.

Landing should clearly explain:

1. CSV upload
2. Goal-first analysis
3. AutoML model comparison
4. Explainable report
5. Agent trace / auditability
6. Prediction API readiness

Keep the landing page concise.

Do not make it too wordy.

Korean-first copy preferred.

Suggested hero direction:

`CSV 데이터를 예측 보고서와 API로 바꾸세요`

or:

`목표를 입력하면, ModelMate가 CSV 예측 분석 계획부터 보고서까지 안내합니다.`

CTA examples:

- `CSV 분석 시작`
- `샘플로 체험하기`
- `Agent Mode 시작`

## README updates

Update README or portfolio docs to include:

- project summary
- problem statement
- target users
- main features
- Agentic AutoML workflow
- architecture overview
- supported tasks
- limitations
- demo flow
- tech stack
- screenshots/routes if available
- deployment note
- future roadmap

Do not overstate commercialization readiness.

## Required docs

Update or create relevant docs:

- `README.md`
- `docs/agent-mode-mvp.md`
- `docs/architecture-overview.md`
- `docs/final-release-checklist.md`
- `docs/final-qa-report.md`
- `docs/portfolio-summary.md` if useful

Use existing doc structure if these files already exist.

Do not duplicate docs unnecessarily.

## Demo path

Document a clear demo path:

1. Open landing page.
2. Start with sample/starter dataset.
3. Enter Korean goal.
4. Create Agent Run.
5. Review generated plan.
6. Execute pipeline.
7. Open Run Detail.
8. Inspect tool calls, observations, decisions, validations.
9. Open generated report.
10. Check prediction API readiness.
11. Show human review/recovery if available.

## Limitations section

Include honest limitations:

- optimized for tabular CSV predictive analysis
- supports classification and regression first
- time-series is limited/beta if implemented
- not a full enterprise MLOps platform
- not a replacement for expert data science review
- SHAP/feature importance is contribution, not causality
- LLM planner is optional if configured
- demo/session persistence may differ from production DB if applicable

## Final QA checklist

Update final QA checklist to include:

- landing loads
- upload/sample/starter analysis works
- workspace pages work
- Agent Mode goal input works
- Agent Run persists
- plan persists
- tool calls persist
- observations persist
- decisions persist
- validations persist
- human review works
- Run Detail trace UI works
- report opens
- prediction API readiness appears
- refresh does not lose expected state
- frontend build passes

## UI copy review

Check major screens for:

- Korean-first copy
- no awkward English-only regression
- no overclaiming
- no fake autonomy language
- clear warnings
- clear unsupported/limited scope copy

## Build and tests

Required:

`cd frontend && npm run build`

If backend is touched, run relevant backend tests or smoke scripts.

If no backend tests exist, document manual backend verification.

## Manual verification

Perform and document:

1. Landing page loads.
2. Sample/starter analysis still works.
3. Workspace navigation works.
4. Agent Mode starts.
5. Korean goal input works.
6. Agent Run and Plan persist.
7. Tool trace exists if PR-28 pipeline is available.
8. Run Detail shows trace honestly.
9. Human review/recovery works if available.
10. Report opens.
11. Prediction API readiness appears.
12. Refresh preserves expected state.
13. README/docs reflect final behavior.
14. No full-autonomy overclaim exists.
15. No causality claim from SHAP exists.

## Acceptance criteria

- Final positioning is honest.
- Landing copy does not overclaim.
- README or portfolio docs are updated.
- Agent Mode docs are updated.
- Architecture docs are updated if relevant.
- Final QA checklist is updated.
- Demo path is clear.
- Limitations are explicit.
- Korean-first positioning is preserved.
- Product is not described as fully autonomous enterprise AutoML.
- SHAP is not described as causality.
- Existing app flows still work.
- Frontend build passes.
- PR-32 is marked `review_needed`, not `done`.

## PR output

The PR body must include:

1. Summary
2. Documentation updated
3. UI copy changes if any
4. Build/test results
5. Manual verification
6. Screens/routes checked
7. Known limitations
8. Review status

Review status should be:

`review_needed`

## Final instruction

Implement only PR-32.

After implementation, update `.codex/TASK_QUEUE.md` so PR-32 is `review_needed`.

Stop for review.
