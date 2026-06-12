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

The project list route keeps a compatibility behavior for unauthenticated users:
it returns an empty list instead of exposing private records.

## Not Implemented Yet

The following are intentionally left for later PRs:

- full persisted HTML report bodies per report id;
- explicit project rerun execution endpoint with ownership checks;
- dataset deletion;
- report-id based private HTML export;
- prediction token ownership hardening;
- team workspace, RBAC, payment, or enterprise SSO.

## PR-14 Connection

Next PRs should continue from this project history foundation:

1. persist report bodies or report snapshots by report id;
2. implement a concrete rerun endpoint that restores a saved configuration;
3. require ownership checks before rerunning a project;
4. preserve guest demo flow separately from private project history.

## Smoke Test

```bash
python scripts/run_project_history_smoke.py --base-url http://localhost:8000
```

The smoke test creates two users, creates a project for User A, links a mock
analysis run, confirms User A can open project history, and confirms User B
cannot open User A's project detail or run history.
