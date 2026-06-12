# Project Save and Rerun Notes

This document records the current MVP behavior before PR-14. It is not a full
project-history implementation plan.

## Current Behavior

- Signed-in users can save project and dataset metadata under their `user_id`.
- Signed-in users can see their own workspace/history records.
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

The project list route keeps a compatibility behavior for unauthenticated users:
it returns an empty list instead of exposing private records.

## Not Implemented Yet

The following are intentionally left for later PRs:

- persisted project detail pages with full analysis/report/model linkage;
- explicit project rerun endpoint with ownership checks;
- dataset deletion;
- report-id based private export;
- prediction token ownership hardening;
- team workspace, RBAC, payment, or enterprise SSO.

## PR-14 Connection

PR-14 should focus on persistent project history and rerun semantics:

1. define the saved project detail shape;
2. link dataset, analysis run, report summary, saved model metadata, and rerun
   configuration;
3. require ownership checks before reopening or rerunning a project;
4. preserve guest demo flow separately from private project history.
