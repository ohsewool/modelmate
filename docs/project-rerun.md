# Project Save and Rerun Notes

This document records the current MVP behavior before PR-14. It is not a full
project-history implementation plan.

## Current Behavior

- Signed-in users can save project and dataset metadata under their `user_id`.
- Signed-in users can see their own workspace/history records.
- Signed-in users can open `/api/projects/{project_id}` for a project detail
  summary that includes linked datasets, analysis run summaries, report
  metadata, prediction API metadata, warnings, and next action guidance.
- Signed-in users can call `/api/projects/{project_id}/runs` and
  `/api/projects/{project_id}/reports` for owner-scoped project history.
- Signed-in users can see the latest linked background training job status on
  project list/detail responses when a job was started for that project.
- Signed-in users can call `/api/projects/{project_id}/jobs` for owner-scoped
  training job history.
- Guest demo users can run the CSV demo flow, but guest work is not treated as a
  private user-owned project.
- The existing AutoML, report, and prediction flows remain compatible with guest
  demo mode.

## Current Access-Control Foundation

Commercialization PR-13 added MVP ownership checks for:

- project detail;
- dataset ownership helpers;
- agent analysis run read access;
- agent mock-plan/mock-timeline creation when a `project_id` or `dataset_id` is
  supplied;
- private deployed model metadata and deletion.

Commercialization PR-14 keeps those checks and adds owner-scoped project history
read endpoints. User B cannot open User A's project detail, run history, or
report metadata by guessing an id.

Commercialization PR-15 adds owner-scoped lightweight training job status. User
B cannot read User A's `job_id` or project job list by guessing identifiers.

Commercialization PR-16 adds MVP failure recovery and rerun endpoints:

- `POST /api/training/jobs/{job_id}/rerun`
- `POST /api/projects/{project_id}/runs/{analysis_run_id}/rerun`

Failed jobs expose `error_type`, `error_message`, `recommended_next_action`,
`failed_at`, and `can_rerun`. Rerun jobs keep a link to the source job or run
with `rerun_of` or `source_run_id`. If a project already has a queued/running
job, duplicate rerun attempts return the active job instead of creating another
parallel job.

The project list route keeps a compatibility behavior for unauthenticated users:
it returns an empty list instead of exposing private records.

## Not Implemented Yet

The following are intentionally left for later PRs:

- full persisted HTML report bodies per report id;
- full rerun restoration of every prior UI setting;
- durable distributed job recovery after server restart;
- dataset deletion;
- report-id based private HTML export;
- prediction token ownership hardening;
- team workspace, RBAC, payment, or enterprise SSO.

## Dataset Delete Impact

Commercialization PR-17 adds MVP dataset delete and project archive behavior.
Signed-in users can preview delete impact before deleting a dataset. The impact
response explains whether rerun will be disabled and how many linked runs,
reports, models, or prediction APIs may be affected.

Deleted datasets are hidden from the active dataset list. Rerun/training
requests that reference a deleted dataset or archived project are blocked with a
friendly message that asks the user to upload the CSV again or choose another
dataset. Existing reports may remain as historical summaries. Prediction API
metadata linked to deleted artifacts may be marked disabled.

Guest/sample datasets remain separate from private user-owned datasets.

## PR-14 Connection

Next PRs should continue from this project history foundation:

1. persist report bodies or report snapshots by report id;
2. implement a concrete rerun endpoint that restores a saved configuration;
3. require ownership checks before rerunning a project;
4. preserve guest demo flow separately from private project history.

## Smoke Test

```bash
python scripts/run_project_history_smoke.py --base-url http://localhost:8000
python scripts/run_background_jobs_smoke.py --base-url http://localhost:8000
python scripts/run_failure_recovery_smoke.py --base-url http://localhost:8000
python scripts/run_dataset_delete_smoke.py --base-url http://localhost:8000
```

The smoke test creates two users, creates a project for User A, links a mock
analysis run, confirms User A can open project history, and confirms User B
cannot open User A's project detail or run history.

The background jobs smoke test creates a training job for User A, confirms job
status is readable by the owner, confirms User B cannot read it, and confirms
project detail includes the latest job status.

The failure recovery smoke test confirms a failed job includes recovery fields,
owner rerun works, duplicate rerun is guarded, and User B cannot rerun User A's
job.

The dataset delete smoke test uploads a sample CSV as User A, confirms User B
cannot read or delete that dataset, confirms delete-impact is available, deletes
the dataset as User A, and confirms training on the deleted dataset is blocked.
