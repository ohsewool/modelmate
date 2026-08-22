# ModelMate Canonical Project Handoff

## 1. Status and provenance

This document normalizes the still-valid technical and operational information from the uncommitted root `CODEX_HANDOFF.md` without modifying that source file.

- Source file: `CODEX_HANDOFF.md`
- Source SHA-256 at normalization: `ff949e74c4e97e2521c68193f0ad335679bef4dbfcd44db6862b02059b771f16`
- Repository baseline inspected: `main` at `afff0e442cdf0bbff616b9e18fd78e179fa251b9`
- Baseline commit subject: `chore: record Hotfix-03 Railway verification`
- Baseline commit date: 2026-06-22 07:12:04 KST
- Normalization date: 2026-08-02 KST

The baseline worktree was intentionally dirty. It contained four modified QA/handoff files and four untracked documentation files. Those files were preserved during this normalization.

### Evidence labels used here

- **Verified in source:** confirmed by reading the inspected commit and worktree.
- **Repository-recorded:** asserted by committed documentation, task records, or historical QA artifacts, but not rerun during this documentation task.
- **Historical:** useful context that may no longer describe the active code.
- **Unresolved:** requires runtime, deployment, security, or owner verification.

Code presence is not treated as proof that a deployed or end-to-end flow currently works. No backend, frontend, QA, deployment, training, or external-service command was run while creating this document.

## 2. Product identity and claim boundary

### Verified in source

The committed README describes ModelMate as a Korean-first guided CSV predictive-analysis and Agentic AutoML SaaS MVP. Its documented product flow covers CSV upload, schema/data checks, target recommendation, model comparison, explanations, persisted run/report context, and prediction API readiness.

The repository contains code for a goal-first Agent Run flow, persisted tool/observation/decision records, review records, and a deterministic planner/executor path. It also contains historical mock and skeleton interfaces.

### Safe public description

> ModelMate is a Korean-first guided CSV predictive-analysis SaaS MVP with an auditable Agentic AutoML workflow under active validation.

Do not describe ModelMate as:

- a fully autonomous data scientist;
- a general-purpose AI agent platform;
- a replacement for enterprise AutoML or MLOps platforms;
- a production-grade multi-tenant, billing, compliance, or deployment platform; or
- a system that guarantees prediction quality.

The root `AGENTS.md` retains an older conservative claim rule and PR-01 instructions. The committed README, `.codex/TASK_QUEUE.md`, and current source contain later Agentic work, but runtime capability should still be described only to the level verified by current tests and smoke evidence.

## 3. Verified repository architecture

### Backend

- Python and FastAPI source is under `backend/`.
- `backend/main.py` reads sorted `backend/main_parts/*.part` files, concatenates them, and executes the combined source in one global namespace. Lexical part ordering is therefore runtime-significant.
- The inspected tree contains 96 tracked backend paths and more than 50 `main_parts` files.
- SQLite is used through the standard `sqlite3` module; there is no ORM or formal migration framework.
- Startup schema evolution uses `CREATE TABLE IF NOT EXISTS`, `PRAGMA table_info`, and conditional `ALTER TABLE ADD COLUMN` logic.
- Default persistence paths resolve to root-local `modelmate.db`, `deployed_models`, and `uploaded_datasets` unless environment variables override them.
- The database and generated model/dataset directories are not tracked source artifacts.

### Frontend

- The frontend is React 18, React Router, Vite, and JavaScript under `frontend/`.
- The inspected package manifest contains build, development, and preview scripts but no lint, typecheck, or browser-test script.
- `frontend/package-lock.json` and built `frontend/dist` artifacts are tracked.
- `frontend/src/App.jsx` contains public landing/login/pricing routes and authenticated workspace, upload, Agent Mode, model, report, prediction, deployment, XAI, and history routes.
- No TypeScript migration is present or approved by repository instructions.

### Deployment

- `railway.toml`, `nixpacks.toml`, and `Procfile` define a Railway/Nixpacks single-service deployment.
- The build installs Python requirements, installs/builds the frontend, and the FastAPI process serves the application with Uvicorn.
- Nixpacks specifies Python 3.11 and Node.js 20.
- No `Dockerfile`, `docker-compose.yml`, or GitHub Actions workflow directory was found at the inspected baseline.

### Dependencies

- Backend dependency names are listed in `requirements.txt` without version pins.
- Verified backend dependency families include FastAPI/Uvicorn, pandas, NumPy, scikit-learn, SHAP, Optuna, XGBoost, LightGBM, authentication libraries, and optional OpenAI/Gemini integrations.
- Frontend dependencies are version-ranged and locked by `frontend/package-lock.json`.

## 4. Verified product and API surfaces

The following claims mean that source routes or modules exist; they do not assert fresh runtime success.

### CSV and AutoML flow

Source routes exist for:

- CSV upload and column analysis;
- target selection;
- cross-validation and Optuna execution;
- SHAP/XAI output;
- prediction and deployed-model operations;
- quick automatic analysis; and
- state/report output.

The existing AutoML pipeline remains a compatibility surface. Repository instructions prohibit deleting or broadly rewriting it and direct future work to wrap/reuse existing behavior.

### Workspace and SaaS-MVP flow

Source routes exist for:

- authentication and session handling;
- projects, datasets, runs, reports, and delete-impact operations;
- lightweight training-job status and rerun behavior;
- usage summaries;
- project prediction tokens and prediction calls;
- monitoring/error events;
- feedback and pilot inquiries; and
- sample-file delivery.

These are MVP foundations, not evidence of enterprise RBAC, durable distributed jobs, billing, or full observability.

### Agentic workflow code path

The active Agent Run API source imports and calls:

- `create_agent_plan` from `backend/agents/planner_interface.py` when creating a run;
- `execute_agent_run` from `backend/agents/executor.py` when executing or retrying a run; and
- persistence functions for plans, steps, tool calls, observations, decisions, validations, artifacts, and human-review requests.

Verified source behavior includes:

- deterministic planning as the default;
- optional schema-constrained LLM assistance controlled through environment configuration;
- prevention of an LLM override of deterministic unsupported-scope decisions;
- registry-based tool lookup and handler execution;
- persistence of execution observations and decisions;
- stop/review branches for schema, leakage, performance, API-readiness, and tool-failure conditions; and
- review, retry-step, stop, trace, and timeline API routes.

Important qualification: `backend/tools/registry.py`, `backend/agents/supervisor.py`, `backend/agents/resume.py`, and related names/comments retain older PR skeleton or mock terminology. `SupervisorPlanner` is referenced by legacy/mock endpoints, while the primary Agent Run creation path uses `create_agent_plan`. Do not infer dynamic autonomous planning from class names or old comments.

## 5. Persistence model

### Verified in source

Core application tables are initialized across `backend/main_parts`, including users, projects, datasets, experiments, deployed models, sessions, usage, training jobs, prediction tokens, feedback, monitoring, and related operational records.

`backend/agents/persistence.py` defines tables and operations for:

- `analysis_runs`;
- `agent_plans`;
- `analysis_steps`;
- `tool_calls`;
- `observations`;
- `decisions`;
- `validations`;
- `artifacts`; and
- `human_review_requests`.

`analysis_run` is the orchestration/audit unit. It should remain distinct from individual model-training or experiment execution records.

### Operational limitation

SQLite and local filesystem persistence are process-local deployment choices. Repository documentation warns that Railway filesystem state is ephemeral unless `DB_PATH`, `MODELS_DIR`, and `DATASETS_DIR` point to mounted persistent storage. The repository does not prove whether the current external Railway service has the required volume and variables.

## 6. Security and reliability risks that must remain visible

### Verified in source

1. **Unsafe development fallbacks — RESOLVED.** The default `JWT_SECRET` is gone. The behaviour is not "always raise", and saying so would overstate it: when the process looks like a hosted deployment an unset or blank value **raises at boot**, and locally it generates a random secret and stores it beside the database. That split is deliberate — a developer running the app should not have to configure a secret, and a deployment must not sign with a value written in the repository. The admin account is seeded only for addresses in `ADMIN_EMAILS`, and password login is enabled only when `ADMIN_PASSWORD` is supplied — the second seeding path that read the singular `ADMIN_EMAIL` was removed because `get_admin_emails()` ignored it, which made an address outside the documented list an admin.
2. **Public incomplete debug route — RESOLVED 2026-08-22 (removed).** `/api/debug-env` was registered without an authentication dependency, collected the names of environment variables containing "GEMINI" or "API", and had no `return` — so it answered `null` while one restored line would have made an unauthenticated path disclose key names.

   It was removed rather than protected: the frontend never called it (all 99 `api.<method>` call sites were scanned), none of the fifteen smoke scripts touched it, and with no return value there was no behaviour to keep. `tests/test_no_environment_disclosure.py` now refuses the path, the handler name, and any part that enumerates `os.environ`.

   **It sat here for two months.** This entry and §8.1 both said to remove it, and so did the 2026-06-22 audit snapshot. Nothing checked. It surfaced only when CI coverage was measured for the first time and the forty routes with no executed line were listed — a written instruction is not an action until something verifies it.
3. **Unpinned Python dependencies — RESOLVED 2026-08-22 (direct dependencies pinned).** All sixteen entries now carry `==` constraints. The versions were not written by hand: the development machine has no `shap` and no `optuna` installed, so two of the sixteen could not be read there, and a pin written from memory looks verified without being verified. A `pip freeze` step was added to the `tests` job, a fresh install was run, and its resolution was copied in — Python 3.11.16, and it differed from what the development machine held (`fastapi` 0.140.7 vs 0.141.1, `numpy` 2.1.2 vs 2.4.6, `openai` 2.49.0 vs 3.3.1). That difference is the reason to pin.

   **Transitive dependencies are deliberately not locked.** A full lock resolved under one interpreter is not guaranteed to install under another, and this repository's CI uses both 3.11 (`tests`) and 3.12 (`product`). Pinning stops at the range that was proved installable on both — and it was: with these sixteen pins, `tests` (3.11) and `product` (3.12) both went green on 2026-08-22. What is *not* recorded is the resolution 3.12 produces, so locking transitives would need that log first. `tests/test_dependencies_are_pinned.py` refuses a floating line and refuses losing one.
4. **Startup DDL instead of migrations:** schema evolution can become difficult to audit and reproduce.
5. **Best-effort in-process jobs:** committed operational documentation states that background work is not backed by a durable distributed queue and may be interrupted by process restart.
6. **Legacy naming and comments:** old mock/skeleton terminology can mislead maintainers about which execution path is active.
7. **Generated and cached files in the working tree — RESOLVED.** Runtime state (`modelmate.db`, uploaded datasets, trained models, caches) is ignored, and the state at the moment tracking stopped was preserved under `docs/archive/qa/` with provenance. What remains tracked under `sample_data/` and `frontend/*/samples/` is deliberate demo content, not runtime output.

### Repository-recorded, not freshly verified

- Committed deployment documentation records a Railway URL and same-origin architecture.
- `.codex/TASK_QUEUE.md` marks PR-27 through PR-32 as done.
- `.codex/RUN_LOG.md` contains historical smoke and Railway verification evidence.
- The uncommitted June 14 QA snapshot reports domain, upload, workspace, and frontend-build success while training was skipped.
- Historical Vite output recorded a large-bundle advisory.

These statements are historical evidence. Recheck them before making a current release, deployment, security, or end-to-end functionality claim.

## 7. Historical material and unresolved claims

- Root `AGENTS.md` still describes PR-01 as the active implementation scope even though later task records and source exist. Its compatibility and honesty rules remain useful, but the PR-stage description is historical.
- Some committed architecture and roadmap documents describe earlier skeleton stages. Use source code and the newest verified task/run records to resolve conflicts.
- Root `app.py` is a legacy entrypoint; the deployment files point to `backend.main:app`.
- The original `CODEX_HANDOFF.md` accumulated presentation, commercialization, Agentic, deployment, and hotfix context over time. This canonical handoff retains verifiable facts while treating old progress percentages, live-deployment assertions, bundle names, and completion claims as historical unless rechecked.
- `CODEX_FILE_CONTENTS.md` is a sanitized 2026-06-22 audit snapshot. Its archived copy is non-authoritative.
- The source PDF cited by the original root `AGENT_DESIGN_CRITERIA.md` was not found under the inspected tracked repository paths; the unique rationale is preserved, but the external source itself was not validated here.

## 8. Recommended next priorities

These are recommendations, not completed work.

1. **Security/configuration gate — partly resolved.** `/api/debug-env` was **removed** on 2026-08-22 (see §6.2). Strong production settings are enforced rather than recommended: a hosted deployment without `JWT_SECRET` refuses to boot (locally it generates one), and the admin account is seeded only from `ADMIN_EMAILS` — without `ADMIN_PASSWORD` the account exists with no password login at all, rather than with a default one. **Still open:** proving that no client bundle or log contains secrets — the leak scanner covers the source tree, not the built bundle.
2. **Persistence gate:** verify the actual Railway volume mount and the effective `DB_PATH`, `MODELS_DIR`, and `DATASETS_DIR`; prove persistence across a redeploy before using real user data.
3. **Focused release smoke:** in an approved environment, run one bounded upload-to-Agent-Run-to-report-to-prediction-token flow and record concrete IDs, states, and failures without overwriting unrelated QA evidence.
4. **Documentation alignment:** reconcile historical PR-01/PR-12 mock and skeleton wording with the active planner/executor path, without erasing useful provenance.
5. **Reproducibility planning:** propose version constraints, a migration strategy, and browser-level coverage as separate reviewed changes.

Do not begin billing, enterprise identity, team workspaces, connector platforms, distributed training, automatic retraining, or broad architecture rewrites before the security, persistence, and release-smoke gates are resolved.

## 9. Change-safety rules

- Preserve the existing CSV/AutoML pipeline and endpoint compatibility.
- Make one bounded change at a time.
- Inspect Git status before any command that writes QA outputs.
- Do not overwrite the current uncommitted QA artifacts without explicit authorization.
- Do not claim a pass for anything not executed in the current environment.
- Keep deterministic fallback behavior available when optional LLM configuration is absent or invalid.
- Persist real observations and decisions; never fabricate trace success in the UI.
- Do not expose uploaded rows, tokens, credentials, private emails, stack traces, or backend filesystem paths.
- Keep Korean-first product language and honest MVP limitations.

## 10. Minimal verification references

Repository-documented commands include:

```text
python -m compileall backend
cd frontend
npm run build
```

Focused smoke scripts exist under `scripts/`, including product, auth, ownership, workspace, background-job, recovery, dataset-deletion, prediction-token, usage-limit, monitoring, feedback, pilot-inquiry, and release checks. Choose the smallest relevant command, run it only with authorization and suitable dependencies, and record concrete evidence rather than relying on an old result file.

## 11. Source preservation

The original root `CODEX_HANDOFF.md` remains unchanged as provenance. This normalized document does not silently replace its historical record and does not certify deployment or runtime status.
