# Auth-Lite and Session Foundation

This PR adds an MVP session foundation for ModelMate without turning the project
into a full auth, billing, or enterprise access-control system.

## Goal

Prepare the product for user-owned projects and access control while keeping
the existing guest demo flow working.

## Current Session Modes

### Guest demo

Guest demo mode is for trying the guided CSV predictive analysis flow without a
login.

Current capabilities:

- CSV upload
- AutoML training
- report preview/export
- prediction API demo flow

Current limitations:

- guest results are not treated as user-owned project records;
- guest work is browser/session scoped;
- account-scoped history and datasets require login;
- no payment, quota, team workspace, or RBAC is implemented.

### Authenticated user

Existing email/Google login remains available. Authenticated requests are
recognized by the current bearer token. PR-13 connects saved projects, dataset
metadata, agent analysis runs, and private deployed model metadata to
user-owned access checks at MVP level.

Current capabilities:

- CSV upload
- AutoML training
- report export
- prediction API flow
- project/history persistence

## Backend Endpoints

```text
POST /api/auth/register
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
GET  /api/session
POST /api/session/guest
```

The frontend currently uses bearer tokens in `localStorage` because the existing
API client already sends an `Authorization: Bearer <token>` header. This PR does
not migrate the app to HTTP-only cookies; that can be reviewed later with CSRF
and deployment-domain settings together.

Passwords are stored with the existing standard-library PBKDF2 hashing helper,
not as plaintext. New auth tokens include a session id (`jti`) and expiry, and
logout revokes the matching `auth_sessions` row.

`GET /api/session` returns a JSON-compatible session context:

- `mode`: `authenticated` or `guest_demo`
- `is_guest`
- `user` for authenticated sessions
- `guest_session_id` for guest sessions
- `workspace_scope`
- `capabilities`
- `limitations`
- `access_control`

`POST /api/session/guest` starts or refreshes a guest demo context. It does not
create an account and does not write a user-owned project record.

## Storage Foundation

The existing `users` table is extended with compatibility fields such as `plan`
and `updated_at`. A lightweight `auth_sessions` table records:

- session id
- user id
- hashed session identifier
- created timestamp
- expiry timestamp
- revoked timestamp

This is a foundation for MVP user-owned project checks, not a complete access
control system.

## What This PR Does Not Implement

- full login/auth redesign
- social login expansion
- enterprise SSO
- payment or billing
- account-based quota
- full RBAC
- team workspace
- full enterprise-grade user-owned project access-control enforcement

## PR-13 and PR-14 Connection

PR-13 uses this session context to add MVP user-owned project rules:

- attach analysis runs and datasets to an owner;
- separate guest, user, and admin visibility;
- add read/write checks around project endpoints;
- keep guest demo separate from private project history.

PR-14 should continue with persistent project history and rerun ownership:

- define project detail records that connect dataset, analysis run, report, and
  saved model metadata;
- require ownership checks before reopening or rerunning a saved project;
- keep public prediction invocation separate from private prediction metadata.

The existing CSV upload, AutoML, report, prediction API, and sample demo flows
must remain compatible.
