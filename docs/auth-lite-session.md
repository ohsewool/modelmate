# Auth-Lite and Session Foundation

This PR adds an MVP session foundation for ModelMate without turning the project
into a full auth, billing, or enterprise access-control system.

## Goal

Prepare the product for future user-owned projects and access control while
keeping the existing guest demo flow working.

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

Existing email/Google login remains available. Authenticated requests can be
recognized by the current bearer token and are ready to be connected to
user-owned projects in a later PR.

Current capabilities:

- CSV upload
- AutoML training
- report export
- prediction API flow
- project/history persistence

## Backend Endpoints

```text
GET  /api/session
POST /api/session/guest
```

`GET /api/session` returns a JSON-compatible session context:

- `mode`: `authenticated` or `guest_demo`
- `is_guest`
- `user` for authenticated sessions
- `guest_session_id` for guest sessions
- `workspace_scope`
- `capabilities`
- `limitations`
- `next_foundation`

`POST /api/session/guest` starts or refreshes a guest demo context. It does not
create an account and does not write a user-owned project record.

## What This PR Does Not Implement

- full login/auth redesign
- social login expansion
- enterprise SSO
- payment or billing
- account-based quota
- full RBAC
- team workspace
- user-owned project access-control enforcement

## Next PR Connection

The next PR can use this session context to add user-owned project rules:

- attach analysis runs and datasets to an owner;
- separate guest, user, and admin visibility;
- add read/write checks around project endpoints;
- document upgrade path from guest demo to logged-in workspace.

The existing CSV upload, AutoML, report, prediction API, and sample demo flows
must remain compatible.
