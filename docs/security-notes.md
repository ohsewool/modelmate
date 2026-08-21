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

## Published defaults (2026-08-22)

Two secrets had hardcoded fallbacks, and both fallbacks are visible in this public
repository.

`JWT_SECRET` fell back to `modelmate-secret-key-change-in-prod`. Any deployment that
did not set the variable signed and accepted tokens with a key anyone can read. This
was demonstrated, not inferred: a token carrying `{"role": "admin"}` signed with that
constant was sent to a local instance, and `/api/auth/me` returned `200` with
`role: admin` while `/api/me/usage` returned `limit_label: 제한 없음` and every limit
`null`. No account and no password were involved.

`.env.example` made it worse. It listed `JWT_SECRET=` with an empty value, and
`os.getenv` treats an empty string as configured — following the example file signed
tokens with an empty key. Two lines below, `DB_PATH` already used `.strip() or` and
avoided the same trap.

`ADMIN_PASSWORD` fell back to `admin1234`, which appears in no document. Because
`admin@modelmate.local` is always an admin (below), every deployment carried that
account. Following `.env.example` literally produced an admin whose password was the
empty string.

`docs/deployment-checklist.md` already said `JWT_SECRET` must be a long random value.
Nothing checked that it was. That is the same shape as the report-export limit found
the same day: declared in the table, in the database, and in the docs, enforced
nowhere.

Now:

- `JWT_SECRET` unset on a hosted deployment (`RAILWAY_ENVIRONMENT_NAME` set, or
  `ENVIRONMENT` in `production`/`prod`/`staging`) **refuses to boot**.
- A local run generates a per-install key in `.jwt_secret` (mode `0600`, gitignored)
  beside the database. It is stable across restarts and workers — a key regenerated
  every boot logs everyone out on restart, and that is the kind of guard people turn off.
- `ADMIN_PASSWORD` unset seeds the bootstrap admin **with no password**, and
  `/api/auth/login` already refuses an account without one. Signing up as that email
  is refused because the account exists.
- A second seeding block that read `ADMIN_EMAIL` (singular) was removed. When
  `ADMIN_EMAILS` (plural) was set, `get_admin_emails()` ignored the singular value,
  but that block still created the account and granted it `admin` — an undocumented
  second path into the admin role. `get_admin_emails()` is now the only authority.

`tests/test_no_published_default_secrets.py` holds this. The forged-token check has a
control: a token signed with the current key must still verify, otherwise the test
would pass by refusing everything.

## The pre-authentication routes had no limit (2026-08-22)

Every other limit in this application is charged to an account. `/api/auth/login`,
`/api/auth/signup` and `/api/auth/google` run before an account is known, and nothing
bounded them.

The equalisation recorded below made that worse, and it was my change. Before it, a
login for an address that does not exist returned in about 10 ms; afterwards every
attempt runs pbkdf2 260,000 times. The cost went from "you must know a real account" to
"any string will do".

Measured with sixty unauthenticated attempts at twelve at a time:

| | `/api/state` median |
|---|---|
| idle | 3.1 ms |
| during the attempts | **1,844.9 ms (603×)** |

Sixty requests, and the application is effectively down.

The timing equalisation was **not** reverted - that leak was real. What was missing is
a throttle that should have been there from the start: attempts per minute per client
address, `MODELMATE_AUTH_ATTEMPTS_PER_MINUTE`, default 10. Re-measured on the same
sequence: 17.8 s → 3.4 s, 603× → **18.9×**, ten 400s and fifty 429s.

The residual 18.9× is the ten attempts that are allowed to run; sustained load is bound
to roughly 2.8 s of CPU per minute per address. That is a bound, not zero.

Two limits are stated in the code and in
`tests/test_pre_auth_throttle.py`:

- **One process.** Several workers each keep their own counter. Counting across
  processes needs shared storage and is separate work.
- **`X-Forwarded-For` is not trusted.** It is filled in by the caller, so counting by it
  would let anyone through by varying a header. Behind a proxy several users therefore
  share one bucket; that direction of error tightens rather than loosens.

## Login timing revealed which accounts exist (2026-08-22)

`/api/auth/login` returned the same message for both failures - "이메일 또는 비밀번호가
올바르지 않습니다" - and took very different amounts of time to say it. A missing
account returned immediately; an existing one ran pbkdf2 260,000 times first. Measured
over HTTP, 25 attempts each, medians:

| case | median |
|---|---|
| existing account, wrong password | 280.3 ms |
| no such account | 10.3 ms |

270 ms does not disappear into network noise. The message was equalised and the clock
answered anyway: enumerating accounts needed nothing but a stopwatch.

The missing-account branch now verifies the supplied password against a fixed dummy
hash, so both branches pay the same cost. Re-measured: 293.3 ms against 284.4 ms, a
ratio of 1.03. **The residual 8.9 ms is the database read and does not go to zero this
way.** 27× and 1.03× are different stories; saying where this stops is better than
claiming zero.

Signup is a different case and is left as it is. `/api/auth/signup` answers "이미 사용
중인 이메일입니다", which states outright that an account exists. Hiding that requires
finishing signup with a success response and telling the real owner by email, and this
application sends no email. That is a chosen disclosure, not a leak, and enumeration
through signup remains possible. `tests/test_login_does_not_leak_accounts.py` pins the
login property and records this decision.

Prediction API tokens were checked at the same time and need no change: the token is
hashed and looked up with `WHERE token_hash=?`, so a caller cannot steer a partial
match - they would have to control the preimage.

## Privilege grants were invisible (2026-08-22)

The monitoring middleware persists a `monitoring_events` row only when a response is
`400` or worse. Every failed request was recorded. **Every privilege grant returns
`200`**, so none of them were. Detection was exactly the wrong way round: the events
most worth investigating were the ones that left no trace.

Measured. A user signed up normally and held `role: user`. Their address was added to
`ADMIN_EMAILS` and the app was restarted. The database then held `role: admin` for that
account and the audit table held **zero** matching events. One environment variable and
a restart turn an account into an administrator, with no way to establish afterwards
that it happened.

The case-only signup bypass recorded above has the same property: had anyone used it,
the request would have returned `200` and left nothing behind.

Grants are now recorded at all four places they can happen - boot-time seeding (account
created, role raised, password login opened), email signup, email login and Google
login. Each row carries the previous role and what caused the change.

Two details that decide whether the record is usable:

- **Only on change.** Seeding runs on every boot; writing a row each time would make
  the line background noise, and background noise is not read. Two restarts produce two
  events, not four.
- **Retention no longer evicts it.** The table is capped and used to delete oldest
  first, so a burst of ordinary errors would push out "someone became an admin". Now
  non-security rows are dropped first. Verified with a cap of 10, one security event and
  thirty errors: the security events survived.

`init_db()` is assembled before `098_monitoring.part`, so boot-time grants are queued in
`PENDING_SECURITY_EVENTS` and flushed once the recorder exists. A failure to flush is
printed rather than swallowed. `tests/test_privilege_grants_are_recorded.py` holds this.

## Case-only signup as the admin (2026-08-22)

The account lookup and the admin check used **two different notions of the same
email**. Signup's duplicate check ran `SELECT id FROM users WHERE email=?`, which uses
SQLite's default case-sensitive comparison; the role decision ran `is_admin_email`,
which lowercases. The strict one gated account creation and the loose one granted
authority.

Measured, not inferred. Signing up as `admin@modelmate.local` returned
`400 이미 사용 중인 이메일입니다`. Signing up as `ADMIN@modelmate.local` returned `200`,
and that token carried `role: admin`, `plan: admin`, `is_admin: true`, and
`limit_label: 제한 없음` - with a password the caller chose.

This walked straight around the fix recorded above under `Published defaults`. That
change stopped the bootstrap admin from having a usable password; this path did not
need one, because it created a second admin account instead.

Now:

- `normalize_email` is the single spelling used for storage, lookup and the admin
  check. `find_user_by_email` compares on `lower(email)`, so rows written before the
  change are still found and their owners are not locked out.
- A unique index on `users(lower(email))` makes the database enforce it as well. An
  application-level check alone is one that a future handler can forget to call.
- The bootstrap seeding loop was changed in the same commit. It looked accounts up
  with the old case-sensitive comparison, so on a database holding a legacy
  `Admin@Modelmate.Local` row it would have missed it, tried to insert, hit the new
  index and **failed to boot**. A new control that breaks existing deployments is not
  a control.
- If the index cannot be created because a database already holds case-duplicate
  rows, the failure is printed with the query that finds them, and boot continues.
  Swallowing it would leave the next reader believing the index exists.

Ordinary users benefit too: `Person@Example.com` and `PERSON@EXAMPLE.COM` are now one
account. `tests/test_email_identity_is_one_thing.py` holds all of this.

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
