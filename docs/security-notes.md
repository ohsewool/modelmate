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
- user-facing failure recovery messages
- documentation warning users not to upload secrets or sensitive data
- environment-variable based deployment configuration

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

Guest demo mode remains separate. Ownerless demo or legacy data should not be
treated as another user's private project, and public prediction endpoints are
not forcibly blocked by this PR. Prediction token hardening is a later roadmap
item.

This is an MVP access-control foundation, not enterprise-grade access control,
SOC2 readiness, complete tenant isolation, or full RBAC.

## Railway Deployment Notes

When deploying on Railway or a similar platform:

- keep secrets in environment variables
- do not commit API keys, tokens, passwords, or database credentials to GitHub
- set `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` through Railway
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
