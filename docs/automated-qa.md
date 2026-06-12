# ModelMate Automated QA

This document explains the automated checks available before a demo, Railway
deployment review, or beta test.

## Local QA Commands

```bash
python -m compileall backend
python scripts/run_upload_validation_qa.py
python scripts/run_training_benchmark.py
python scripts/run_full_qa.py --skip-slow
python scripts/run_auth_smoke.py --base-url http://localhost:8000
python scripts/run_ownership_smoke.py --base-url http://localhost:8000
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
- ownership smoke can register two users, create a project for user A, confirm
  user B cannot list or open user A's project, and confirm user B cannot read
  user A's agent analysis run;
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
- docs for privacy, terms, pricing, prediction API, and sample metadata exist.

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
