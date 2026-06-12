# ModelMate Operational Readiness

This document describes the MVP-level operational behavior for ModelMate. It is
not a full job queue, billing system, or enterprise monitoring system.

## Analysis Status Lifecycle

ModelMate uses the following canonical analysis status values:

| Status | Meaning |
| --- | --- |
| `created` | A run or screen state exists but analysis has not started. |
| `queued` | A lightweight background training job was created and is waiting to run. |
| `running` | The current request or background job is processing upload, target setup, or model comparison. |
| `succeeded` | The current step completed successfully. |
| `failed` | The current step failed and recovery guidance should be shown. |
| `cancelled` | Reserved for future cancellation flow. |
| `needs_review` | The result or input should be reviewed before relying on it. |

Compatibility aliases such as `ok`, `done`, `success`, `error`, and `draft` can
be mapped to the canonical values without changing existing API behavior.

## Lightweight Training Jobs

Commercialization PR-15 adds MVP training job tracking for signed-in users:

- `POST /api/training/jobs`
- `GET /api/training/jobs/{job_id}`
- `GET /api/projects/{project_id}/jobs`

The job endpoint creates a persistent `training_jobs` record with `queued`,
`running`, `succeeded`, or `failed` status. Execution uses FastAPI
`BackgroundTasks` as an in-process wrapper around the existing `/api/run-cv`
AutoML flow. The existing synchronous `/api/run-cv` endpoint remains available
for compatibility.

This is not a distributed training platform. On Railway beta deployment, a
server restart can interrupt an in-process job. The persisted job record keeps
the latest known status and friendly failure guidance, but it does not guarantee
automatic recovery of interrupted training.

Stored job fields include:

- `job_id`, `user_id`, `project_id`, `analysis_run_id`, `dataset_id`
- `status`, `current_step`, `progress_message`, `progress_percent`
- `created_at`, `queued_at`, `started_at`, `finished_at`, `failed_at`
- `error_type`, `error_message`, `recommended_next_action`
- `result_summary`, `artifact_refs`

## Status Payload

Where available, status information follows this shape:

```json
{
  "status": "succeeded",
  "current_step": "automl_training",
  "progress_message": "RandomForest 모델이 가장 좋은 분류 결과로 선택되었습니다.",
  "started_at": "2026-06-12T10:00:00",
  "completed_at": "2026-06-12T10:01:20",
  "failed_at": null,
  "error_type": null,
  "error_message": null,
  "recommended_next_action": "결과 요약에서 신뢰도, evidence, report export를 확인하세요."
}
```

## Failure Handling Policy

Failures should be shown as recovery guidance, not as unexplained crashes.

Recommended failure shape:

```json
{
  "failed_stage": "automl_training",
  "user_friendly_message": "모든 분류 모델 학습이 실패했습니다.",
  "technical_message": "All classification models failed",
  "retry_possible": true,
  "recommended_next_action": "타깃 값의 클래스 수, 결측값, 제외 컬럼 설정을 확인한 뒤 다시 실행하세요.",
  "support_debug_id": "run-20260612100000"
}
```

Current covered stages:

- CSV parsing
- CSV validation
- target setup
- AutoML model comparison

Future stages can reuse the same shape for report generation, prediction API
errors, deployment checks, and human review handoff.

Training job failures are stored on the job record with `error_type`,
`error_message`, `failed_at`, and `recommended_next_action`. User-facing
responses should avoid stack traces and explain whether the user should choose a
different target, re-upload a CSV, or review missing/identifier-heavy columns.

## MVP Failure Recovery And Rerun

Commercialization PR-16 adds a small failure recovery layer for training jobs.
It does not implement a full workflow orchestrator or automatic retraining loop.

Failure records can include:

- `status`
- `current_step`
- `error_type`
- `error_message`
- `recommended_next_action`
- `failed_at`
- `can_rerun`
- `rerun_source_run_id`

Supported error types are intentionally simple and user-facing, for example
`invalid_csv`, `missing_header`, `empty_dataset`, `missing_target`,
`invalid_target`, `single_class_target`, `leakage_risk_blocked`,
`training_timeout`, `training_failed`, `permission_denied`, and
`unknown_error`.

Rerun endpoints:

- `POST /api/training/jobs/{job_id}/rerun`
- `POST /api/projects/{project_id}/runs/{analysis_run_id}/rerun`

Rerun requests are owner-protected. If a project already has a `queued` or
`running` job, the API returns the active job with duplicate-guard guidance
instead of creating another job for the same project.

## Retry Guidance

Common recovery actions:

- If upload fails, confirm that the file is CSV/TSV/TXT with a header row.
- If validation fails, check that there is at least one target-like column and
  one usable feature column.
- If target setup fails, choose a column that exists in the current uploaded
  CSV.
- If training fails, check class balance, missing target values, high-cardinality
  identifiers, and excluded columns.
- If prediction fails, compare the input fields with the deployed model's saved
  feature schema.

## MVP Usage Limits

These limits are demo guardrails, not account-based quotas.

| Guardrail | Value |
| --- | --- |
| Maximum CSV file size | 10 MB |
| Warning row count | 10,000 rows |
| Maximum demo training rows | 50,000 rows |
| Warning column count | 80 columns |
| Maximum column count reference | 150 columns |
| Training time budget target | 180 seconds |
| Maximum models per run | 8 |
| Unsupported file types | xlsx, xls, pdf, docx, png, jpg |

The current implementation blocks oversized uploads and warns about large row
or column counts. It does not implement payment, account quota, or distributed
job scheduling.

## Current Limitations

- Training runs can be tracked through lightweight in-process background jobs,
  but they are not handled by a Redis/Celery job queue.
- In-process background jobs are best-effort on Railway beta deployment and do
  not provide fully reliable restart recovery.
- There is no account-based quota or billing system.
- There is no full MLOps monitoring, model drift detection, or automatic
  retraining loop.
- Some status values are reserved for future async flows.
- The app still prioritizes a graduation-project SaaS MVP demo over enterprise
  production operations.

## Future Work

- Real async job queue with durable worker recovery
- Auth-based usage quotas
- Billing and plan limits
- Run cancellation
- Admin monitoring dashboard for failures and slow jobs
- Production audit logs
- Model lifecycle monitoring and drift checks
