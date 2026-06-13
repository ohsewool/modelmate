# Monitoring and Error Reporting

ModelMate PR-20 adds a lightweight monitoring, request correlation, and error
reporting foundation for beta and pilot operation. This is not an enterprise
observability stack and does not require a paid external service.

## Scope

This foundation is designed to answer operational questions:

- what failed;
- which user, project, run, job, or dataset was affected when that context is
  safely available;
- when it failed;
- whether the failure came from upload, analysis, report export, prediction
  API, dataset deletion, token management, usage limits, or frontend rendering;
- which `request ID` or `error ID` a user can share for support.

## Request ID

Every backend request gets a correlation ID.

- Incoming `X-Request-ID` is reused when it matches a safe format.
- Otherwise the backend creates a `req_...` ID.
- Every response includes `X-Request-ID`.
- Friendly error responses include `error.request_id`.

Example error object:

```json
{
  "detail": "로그인이 필요합니다.",
  "error": {
    "code": "unauthorized",
    "message": "로그인이 필요합니다.",
    "request_id": "req_example123",
    "error_id": "err_example456",
    "action": "로그인한 뒤 다시 시도하세요."
  }
}
```

The `code`, `request_id`, and `error_id` fields remain stable technical values.
The `message` and `action` fields are user-facing Korean copy.

## Structured Logs

Backend requests emit JSON-like records to stdout so Railway logs can be searched
without adding a new dependency.

Common fields:

- `timestamp`
- `level`
- `event_type`
- `request_id`
- `user_id`
- `project_id`
- `run_id`
- `job_id`
- `dataset_id`
- `route`
- `method`
- `status_code`
- `duration_ms`
- `error_code`
- `message`

Internal event type strings are intentionally English and developer-facing.
They should not be translated.

## Event Types

PR-20 documents and uses a lightweight event vocabulary:

- `auth.login`
- `auth.logout`
- `project.created`
- `project.opened`
- `project.rerun_requested`
- `dataset.upload_started`
- `dataset.upload_completed`
- `dataset.deleted`
- `dataset.delete_blocked`
- `job.created`
- `job.queued`
- `job.started`
- `job.succeeded`
- `job.failed`
- `job.rerun_requested`
- `report.generated`
- `report.exported`
- `report.export_failed`
- `prediction_token.created`
- `prediction_token.revoked`
- `prediction_token.regenerated`
- `prediction_api.called`
- `prediction_api.failed`
- `usage_limit.warning`
- `usage_limit.blocked`
- `api.error`
- `frontend.error_reported`

Not every event type has a dedicated call site yet. The vocabulary is kept
stable so future PRs can add specific event emission without changing logs or
docs again.

## Lightweight Persistence

Important monitoring events are stored in the existing app database table
`monitoring_events`.

Fields include:

- `error_id`
- `request_id`
- `user_id`
- `project_id`
- `run_id`
- `job_id`
- `dataset_id`
- `event_type`
- `error_code`
- `message`
- `safe_details`
- `route`
- `method`
- `status_code`
- `severity`
- `created_at`
- `resolved_at`

The table is bounded by `MODEL_MATE_MAX_MONITORING_EVENTS`, defaulting to
`1000`, to avoid unbounded growth in the MVP environment.

## Safe Logging Policy

Safe to log:

- generated IDs such as `request_id`, `error_id`, `project_id`, `dataset_id`,
  `run_id`, and `job_id`;
- route and HTTP method;
- status code and coarse event type;
- safe error codes;
- count or summary fields that do not expose raw user data.

Never log:

- full CSV contents;
- raw uploaded rows;
- passwords;
- bearer tokens;
- plaintext prediction API tokens;
- session secrets;
- private environment variables;
- full request payloads that may contain user data.

Prediction token failures should log at most token status, route, status code,
and safe metadata. The full token must not appear in logs or error responses.

## Frontend Error Boundary

The React app is wrapped in `ErrorBoundary`.

When an unexpected rendering error occurs, users see Korean-first fallback copy:

- `화면을 불러오지 못했습니다.`
- `일시적인 오류가 발생했습니다. 새로고침하거나 대시보드로 돌아가세요.`
- `새로고침`
- `대시보드로 이동`

The fallback may display `오류 ID` and `request ID` when available. Raw stack
traces are not shown to users.

## Frontend Error Reporting

Endpoint:

```text
POST /api/monitoring/frontend-error
```

The frontend sends a sanitized payload:

- `name`
- `message`
- `route`
- `user_agent`
- optional `project_id`
- optional `run_id`
- optional `request_id`

The backend stores this as `frontend.error_reported`. The endpoint does not
require login so it can receive reports from public or partially loaded screens.
The backend derives `user_id` from a bearer token only when one is present.

## Health Endpoint

Endpoint:

```text
GET /api/health
```

Response includes:

- `status`: `ok` or `degraded`
- `service`
- `timestamp`
- safe environment label
- `storage.reachable`
- `request_id`

The response does not expose secrets.

## Admin Monitoring Endpoints

Admin-only endpoints:

```text
GET /api/admin/monitoring/errors
GET /api/admin/monitoring/events
GET /api/admin/monitoring/errors/{error_id}
```

These endpoints use existing auth and admin checks. Non-admin users receive a
friendly access error. Returned records contain sanitized `safe_details`.

## Railway Notes

- Structured logs are printed to stdout and can be searched in Railway logs.
- `X-Request-ID` can be copied from browser dev tools or user-facing error
  messages.
- `MODEL_MATE_MAX_MONITORING_EVENTS` can be adjusted for pilot deployments.
- Do not commit Railway secrets, API keys, JWT secrets, or admin passwords.

## Validation

Local backend compile:

```bash
python -m compileall backend
```

Local or deployed monitoring smoke:

```bash
python scripts/run_monitoring_smoke.py --base-url http://localhost:8000
python scripts/run_monitoring_smoke.py --base-url https://web-production-5d6fa.up.railway.app
```

Release wrapper:

```bash
python scripts/run_release_qa.py --base-url http://localhost:8000 --skip-training
```

## Known Limitations

- This is an MVP monitoring foundation, not full APM.
- There is no Sentry, Datadog, OpenTelemetry, or external alerting dependency.
- There is no full admin console.
- Event persistence is bounded and intended for short beta diagnostics.
- Some product events are currently inferred from request route/status rather
  than emitted from every exact business action.

Future work can add Sentry or OpenTelemetry after beta if the team needs richer
trace sampling, alerting, or dashboarding.
