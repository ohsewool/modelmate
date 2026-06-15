# ModelMate Security Notes

This document describes the current MVP security posture and limitations. It is
not an enterprise compliance statement.

## Current MVP Scope

ModelMate is deployed as a graduation project and commercial SaaS MVP prototype.
The current focus is guided CSV predictive analysis, grounded reports, and
prediction API-style reuse.

## Current Safeguards

Current safeguards include:

- file type validation for supported tabular uploads
- dataset quality checks before analysis
- lightweight demo usage guardrails
- auth-lite email/password login using PBKDF2 password hashing
- bearer-token session records with logout revocation support
- guest demo mode for trying the sample flow without signing in
- MVP ownership checks for saved projects, datasets, agent analysis runs, and
  deployed model metadata
- private project lists scoped by `user_id`
- public prediction invocation kept separate from private model metadata access
- owner-scoped project history, run history, and report metadata endpoints
- owner-scoped lightweight training job status endpoints
- owner-scoped dataset list/detail/delete and project archive/delete impact
  endpoints
- disabled prediction API state for artifacts linked to deleted datasets or
  projects
- user-facing failure recovery messages
- documentation warning users not to upload secrets or sensitive data
- environment-variable based deployment configuration
- `ADMIN_EMAILS` based admin detection for owner/admin accounts

## Not Yet Implemented

The following are not yet implemented as full commercial controls:

- full authentication and authorization policy
- payment security
- enterprise access control
- enterprise SSO
- full RBAC
- complete audit logging
- advanced encryption policy
- SOC2 or ISO compliance program
- formal incident response process
- account-based quota and billing enforcement

## User-Owned Project Foundation

Commercialization PR-13 adds an MVP access-control layer for saved resources.
Authenticated project, dataset, analysis-run, and deployed-model metadata are
associated with the current `user_id`, and private list/detail routes only
return resources owned by that user, except for admin review paths.

Project history endpoints added in PR-14 are also owner-scoped:

- `GET /api/projects/{project_id}`;
- `GET /api/projects/{project_id}/runs`;
- `GET /api/projects/{project_id}/reports`.

Training job endpoints added in PR-15 are owner-scoped:

- `POST /api/training/jobs`;
- `GET /api/training/jobs/{job_id}`;
- `GET /api/projects/{project_id}/jobs`.

These endpoints provide MVP job status tracking for signed-in users. They do not
provide enterprise-grade job isolation, distributed worker recovery, or a full
queue system.

Failure recovery and rerun endpoints added in PR-16 are also owner-scoped:

- `POST /api/training/jobs/{job_id}/rerun`;
- `POST /api/projects/{project_id}/runs/{analysis_run_id}/rerun`.

Duplicate execution guards return the active project job when a queued/running
job already exists. This is an MVP safety guard, not a complete distributed
workflow lock.

Guest demo mode remains separate. Ownerless demo or legacy data should not be
treated as another user's private project, and public prediction endpoints are
not forcibly blocked by this PR. Prediction token hardening is a later roadmap
item.

This is an MVP access-control foundation, not enterprise-grade access control,
SOC2 readiness, complete tenant isolation, or full RBAC.

## Admin Role And Quota Bypass

The owner account `admin@modelmate.local` is always treated as `admin`.
Additional admin accounts can be configured with the Railway/environment
variable:

```text
ADMIN_EMAILS=admin@modelmate.local,osw1217@gmail.com
```

Admin users bypass MVP demo quotas for projects, datasets, CSV upload, daily
jobs, quick analysis, goal-based Agent Mode analysis, report demos, and
prediction API demo usage. This is an owner/developer demo policy, not a full
enterprise RBAC system.

## Dataset Delete And Retention Security Notes

Commercialization PR-17 adds an MVP dataset management and delete foundation.
Dataset list, detail, delete-impact, and delete routes require the current user
to own the dataset. Project delete/archive routes also require project
ownership. User B should not be able to read or delete User A's dataset or
project by guessing an id.

Current delete behavior is intentionally conservative:

- dataset deletion is a soft-delete metadata state;
- active queued/running training jobs block deletion;
- deleted datasets are hidden from active dataset lists;
- deleted datasets or archived projects are blocked from future training/rerun
  requests;
- deployed prediction metadata linked to deleted artifacts can be marked
  disabled;
- public prediction calls for disabled artifacts return a friendly disabled
  response instead of a raw server error.

This is MVP dataset deletion and delete-impact handling. It is not complete data
governance, audit logging, automatic retention enforcement, or enterprise
compliance.

## Paid Pilot Inquiry Security Notes

Commercialization PR-23 adds a lightweight pilot inquiry flow. It is protected
as a manual SaaS MVP workflow, not a billing system.

- `POST /api/pilot-inquiries` accepts guest or signed-in inquiries.
- `GET /api/admin/pilot-inquiries` and inquiry status updates require admin
  access.
- The backend filters unsafe usage snapshot keys such as token, secret,
  payment, card, API key, raw CSV, and authorization data.
- The UI tells users not to enter payment data, raw CSV contents, API tokens, or
  secrets.
- No Stripe, Toss Payments, PayPal, subscription, invoice, or billing security
  scope is implemented.

This is MVP paid-pilot readiness, not enterprise sales automation or production
payment handling.

## Railway Deployment Notes

When deploying on Railway or a similar platform:

- keep secrets in environment variables
- do not commit API keys, tokens, passwords, or database credentials to GitHub
- set `JWT_SECRET`, `ADMIN_EMAILS`, and `ADMIN_PASSWORD` through Railway
  environment variables instead of hard-coding production values
- rotate exposed keys immediately if a secret is accidentally committed
- verify the deployed bundle after each production push
- avoid storing sensitive uploaded CSV files in temporary demo storage

## Future Security Roadmap

Before production commercialization, ModelMate should add:

- stronger auth and role-based access control
- user-level project isolation
- stronger user-owned project access checks around reports, prediction tokens,
  deletion flows, and project reruns
- audit logs for uploads, training, prediction, and report access
- data retention and deletion controls
- secret scanning in CI
- documented encryption policy
- vulnerability review and dependency monitoring
