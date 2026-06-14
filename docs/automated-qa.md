# ModelMate Automated QA

This document explains the automated checks available before a demo, Railway
deployment review, or beta test.

For the final release package, pair these commands with:

- [Final release checklist](final-release-checklist.md)
- [Deployment notes](deployment-notes.md)
- [Demo guide](demo-guide.md)

## Local QA Commands

```bash
python -m compileall backend
python scripts/run_upload_validation_qa.py
python scripts/run_training_benchmark.py
python scripts/run_full_qa.py --skip-slow
python scripts/run_auth_smoke.py --base-url http://localhost:8000
python scripts/run_ownership_smoke.py --base-url http://localhost:8000
python scripts/run_project_history_smoke.py --base-url http://localhost:8000
python scripts/run_background_jobs_smoke.py --base-url http://localhost:8000
python scripts/run_failure_recovery_smoke.py --base-url http://localhost:8000
python scripts/run_dataset_delete_smoke.py --base-url http://localhost:8000
python scripts/run_prediction_token_smoke.py --base-url http://localhost:8000
python scripts/run_usage_limits_smoke.py --base-url http://localhost:8000
python scripts/run_monitoring_smoke.py --base-url http://localhost:8000
python scripts/run_feedback_smoke.py --base-url http://localhost:8000
python scripts/run_workspace_integration_smoke.py --base-url http://localhost:8000
```

## Product Smoke Test

Run against a local server:

```bash
python scripts/run_product_smoke.py --base-url http://localhost:8000
```

Run against Railway:

```bash
python scripts/run_product_smoke.py --base-url https://web-production-5d6fa.up.railway.app
```

For faster deployed checks, skip the training endpoint:

```bash
python scripts/run_product_smoke.py --base-url https://web-production-5d6fa.up.railway.app --skip-training
```

## Monitoring Smoke Test

Run against a local server:

```bash
python scripts/run_monitoring_smoke.py --base-url http://localhost:8000
```

Run against Railway:

```bash
python scripts/run_monitoring_smoke.py --base-url https://web-production-5d6fa.up.railway.app
```

This checks `/api/health`, `X-Request-ID`, friendly error objects, sanitized
frontend error reporting, protected admin monitoring endpoints, and a prediction
API invalid-token failure that must not echo the full token.

## Feedback Smoke Test

Run against a local server:

```bash
python scripts/run_feedback_smoke.py --base-url http://localhost:8000
```

Run against Railway:

```bash
python scripts/run_feedback_smoke.py --base-url https://web-production-5d6fa.up.railway.app
```

This checks authenticated feedback submission, guest feedback submission,
invalid category/severity validation, token redaction, and admin feedback
endpoint protection.

## Release QA Wrapper

Run the standard release checks:

```bash
python scripts/run_release_qa.py --base-url https://web-production-5d6fa.up.railway.app
```

Skip slower training checks when needed:

```bash
python scripts/run_release_qa.py --base-url https://web-production-5d6fa.up.railway.app --skip-training
```

## What Is Checked Automatically

- backend compiles;
- auth smoke can register, login, call `/api/auth/me`, logout, and confirm token
  revocation when a base URL is provided;
- auth smoke confirms `/api/auth/me` does not expose password or
  `password_hash` fields;
- ownership smoke can register two users, create a project for user A, confirm
  user B cannot list or open user A's project, and confirm user B cannot read
  user A's agent analysis run;
- project history smoke can open project detail, run history, and report
  metadata for the owner while blocking another user;
- background job smoke can create a signed-in training job, poll job status,
  confirm owner-only job access, confirm project job history, and verify guest
  demo mode remains available;
- failure recovery smoke can create a failed job, verify `error_type`,
  `error_message`, `recommended_next_action`, run an owner-protected rerun,
  check duplicate rerun behavior, and confirm another user cannot rerun it;
- dataset delete smoke can register two users, upload a sample CSV for user A,
  confirm user B cannot read or delete user A's dataset, preview delete impact,
  delete the dataset as user A, and verify training on the deleted dataset is
  blocked;
- upload validation QA passes;
- full QA quick path passes;
- training benchmark can run when not skipped;
- landing and pricing routes respond;
- `/api/state`, `/api/agent/tools`, `/api/deployed`, `/api/report/summary`, and
  `/api/report/html` respond;
- `/api/session` returns an auth-lite session context;
- `/api/session/guest` can start a guest demo session;
- sample CSV upload works;
- target selection path works;
- AutoML training endpoint works when not skipped;
- report summary can expose trace/trust/evidence information after training;
- invalid CSV returns a friendly failure response;
- docs for privacy, terms, pricing, prediction API, and sample metadata exist;
- project-scoped prediction token metadata is owner-protected;
- invalid/revoked prediction tokens are rejected without exposing sensitive details;
- usage summary returns plan/limits/usage and project limits block extra project creation.
- monitoring smoke confirms `/api/health` returns a `request_id`, admin
  monitoring endpoints are protected, frontend error reports can be stored, and
  invalid prediction token responses do not leak the full token.
- feedback smoke confirms `/api/feedback` accepts authenticated and guest beta
  feedback, rejects invalid category/severity values, avoids echoing full
  tokens, and keeps admin feedback review protected.
- pilot inquiry smoke confirms `/api/pilot-inquiries` accepts safe guest or
  authenticated inquiries, rejects invalid email addresses, avoids storing
  blocked token/payment/raw CSV context, and keeps admin inquiry review
  protected.
- workspace integration smoke confirms a signed-in CSV upload creates
  dataset/project metadata, `/api/run-cv` completion appears in Projects,
  Project Detail, Jobs, Reports, Datasets, and Prediction API readiness
  metadata, while guest demo mode remains separate from private workspace data.

## What Still Requires Human Review

- whether the UI feels intuitive to a non-technical user;
- whether Korean/English copy is clear;
- whether the report is persuasive enough for a real user;
- whether visual layout is polished across devices;
- whether a beta user would pay for Free / Pro / Team packaging;
- whether the result makes domain sense for a user's real CSV.

## Common Failures

- `connection refused`: local `uvicorn` server is not running.
- old Railway bundle: deployment is still rolling out.
- upload smoke fails: `/api/upload` changed or rejected the sample CSV.
- training smoke times out: use `--skip-training` for a quick deployment check.
- report summary lacks evidence/trust data: run training before checking report.
- project history smoke fails: verify `/api/projects/{id}`, `/runs`, and
  `/reports` are deployed and ownership checks are active.
- background job smoke fails: verify `/api/training/jobs`,
  `/api/training/jobs/{job_id}`, and `/api/projects/{id}/jobs` are deployed and
  owner-scoped.
- failure recovery smoke fails: verify failed jobs expose recovery fields and
  `/api/training/jobs/{job_id}/rerun` keeps ownership and duplicate guards.
- dataset delete smoke fails: verify `/api/datasets`, dataset delete-impact,
  dataset delete, and deleted-resource training guards are deployed.
- monitoring smoke fails: verify `/api/health`,
  `/api/monitoring/frontend-error`, and `/api/admin/monitoring/*` are deployed
  and that error responses include `request_id`.
- feedback smoke fails: verify `/api/feedback` is deployed, category/severity
  validation is active, and `/api/admin/feedback` remains admin-only.
- pilot inquiry smoke fails: verify `/api/pilot-inquiries` is deployed, email
  validation is active, blocked context keys are filtered, and
  `/api/admin/pilot-inquiries` remains admin-only.
- workspace integration smoke fails: verify authenticated upload creates
  `current_dataset.project_id`, `/api/run-cv` persists an experiment with
  `dataset_ref`, and completed analyses are mirrored to project job metadata.

## Release Blockers

- backend compile fails;
- sample CSV upload fails;
- target selection fails after upload;
- report export endpoint returns 500;
- prediction API docs mention an endpoint that does not exist;
- invalid CSV returns a raw server error;
- Railway root route does not load.
- user B can access user A's project, dataset, agent run, or private deployed
  model metadata by guessing an id.
- user B can access user A's training job or project job history by guessing an
  id.
- user B can rerun user A's failed job or failed project run.
- user B can delete user A's dataset or project.
- a deleted dataset can still be used to start a new training/rerun job.
- monitoring smoke fails because errors lack `request_id` or an invalid
  prediction token is echoed in a response.
- feedback smoke leaks a full token, accepts invalid category/severity values,
  or exposes admin feedback lists to guests/non-admin users.
- pilot inquiry smoke stores payment details, API tokens, raw CSV content, or
  exposes admin inquiry lists to guests/non-admin users.
- workspace integration smoke fails because a completed signed-in analysis does
  not appear in Projects, Jobs, Reports, or Prediction API readiness metadata.
