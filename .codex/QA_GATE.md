# ModelMate QA Gate

Build success is required, but it is not completion.

Do not mark a task as `done` only because `npm run build` or `python -m compileall backend` passed.

## Completion Rule

A task can be marked `done` only after all of the following are true:

1. Backend compile passes when backend code is touched.
2. Frontend build passes when frontend code is touched.
3. The actual user flow affected by the change has been smoke tested.
4. QA evidence is recorded in `.codex/RUN_LOG.md`, a PR summary, or a QA report.

If an affected user flow cannot be tested, mark it as `not verified`.
Do not report an untested flow as `passed`.

If smoke testing cannot be performed and the missing check is important to the change, mark the task as `needs_manual_verification`, not `done`.

## Evidence Requirement

Every QA report must include concrete evidence where applicable:

- tested route
- tested CSV filename
- downloaded file first line
- response content type
- generated dataset id
- generated project id
- generated analysis run id or Agent Run ID
- final route URL
- result status
- screenshot note if manual
- pass / fail / not verified

## Standard Smoke Checklist

### A. CSV Upload

- [ ] Upload a valid CSV.
- [ ] Confirm row/column count appears.
- [ ] Confirm dataset/project reference is created.

### B. Sample CSV Download

For each sample CSV:

- [ ] Download the file.
- [ ] Confirm it does not start with `<!DOCTYPE html>`.
- [ ] Confirm the first row is a CSV header.
- [ ] Confirm the expected target column exists.
- [ ] Confirm the downloaded file can be uploaded back successfully.

Required sample targets:

- `customer_churn_demo.csv` -> `churn`
- `sales_demand_demo.csv` -> `demand`
- `equipment_failure_demo.csv` -> `failure_risk`
- `marketing_conversion_demo.csv` -> `converted`
- `student_performance_demo.csv` -> `passed`

### C. Quick Automatic Analysis

- [ ] Start quick automatic analysis.
- [ ] Confirm it still works.
- [ ] Confirm no broken route occurs.

### D. Goal-Based Analysis

- [ ] Open `/agent-mode`.
- [ ] Select or upload a CSV.
- [ ] Confirm suggested goal matches the dataset.
- [ ] Create analysis run.
- [ ] Execute plan.
- [ ] Confirm run id exists.
- [ ] Confirm dataset connection is preserved.
- [ ] Confirm no `/agent-mode/undefined`.

### E. Agent Run Detail

- [ ] Click detailed record / trace button.
- [ ] Confirm route uses a real run id.
- [ ] Refresh the detail URL directly.
- [ ] Confirm the page still renders.
- [ ] Confirm advanced trace is available.

### F. Human Review

- [ ] Trigger or inspect review-needed state.
- [ ] Confirm the UI explains why review is needed.
- [ ] Confirm action buttons are visible and meaningful.
- [ ] Confirm continuing does not lose previous trace.

### G. Report

- [ ] Report button works or shows honest empty state.
- [ ] Report screen explains result, cautions, and next actions.

### H. Prediction API

- [ ] API page works or shows honest readiness/empty state.
- [ ] API does not show false readiness for weak or unclear models.

### I. Navigation

Check these routes:

- [ ] `/dashboard`
- [ ] `/upload`
- [ ] `/agent-mode`
- [ ] `/projects`
- [ ] `/jobs`
- [ ] `/reports`
- [ ] `/prediction-apis`
- [ ] `/settings`

Confirm no broken links and no route like `/undefined`.

## Reporting Language

Use:

- `passed`: tested and confirmed with evidence.
- `failed`: tested and failed.
- `not verified`: not tested or could not be tested.
- `needs_manual_verification`: cannot mark done until a human checks the flow.
