# ModelMate UI Redesign Roadmap

This roadmap starts after Commercialization PR-17. It turns the current
graduation-project interface into a calmer SaaS MVP workspace through small,
reviewable PRs.

The roadmap must not be implemented all at once. Each UI PR should preserve
existing routes, backend APIs, auth/session behavior, project ownership,
dataset deletion, report export, prediction APIs, and demo flows.

## UI-00: Design Guardrails

Scope:

- Documentation and frontend guardrails only.
- No full redesign.
- No backend changes.
- No app shell replacement.
- Optional non-invasive design token reference.

Completion signal:

- `docs/frontend-design-guide.md` exists.
- Future UI PRs have clear principles, anti-patterns, status rules, and
  component targets.

## UI-01: Current Flow Polish

Scope:

- Landing
- Login
- Upload
- Model comparison
- Result summary
- Reason page
- Report export

Rules:

- Same routes and APIs.
- Reduce visual noise.
- Normalize copy and components.
- Keep the existing demo flow intact.

Goal:

- Make current screens feel calmer and more consistent without changing the
  product structure.

## UI-02: SaaS Workspace Shell

Scope:

- Dashboard
- Projects
- Jobs
- Reports
- Prediction APIs
- Settings

Rules:

- Move the global stepper into New Analysis.
- Make Project the primary object.
- Keep guest demo mode available.

Goal:

- Shift from "analysis demo" to "saved SaaS workspace".

Implementation notes:

- Implemented in the frontend app shell with primary workspace navigation.
- Added authenticated routes: `/dashboard`, `/projects`, `/jobs`, `/reports`,
  `/prediction-apis`, and `/settings`.
- Added `/new` and `/analysis/new` compatibility entry points that open the
  existing upload/new-analysis flow.
- Existing upload, model comparison, report, reason, prediction, deploy, and
  history screens are preserved.
- Project detail and run detail tabs were left to UI-03 and are now covered in
  the UI-03 implementation notes below.
- Missing or partial backend metadata is handled with empty states and graceful
  placeholders rather than new backend architecture.

## UI-03: Project Detail / Run Detail

Scope:

- Project tabs: Overview, Runs, Report, Prediction API, Dataset, Settings.
- Run timeline.
- Failure recovery.
- Honest agent trace.

Goal:

- Make each project/run understandable, reopenable, and trustable.

Implementation notes:

- Added project detail route `/projects/:projectId` with tabs for overview,
  runs, report, prediction API, dataset, and settings.
- Added run detail route `/projects/:projectId/runs/:runId` with an honest
  run timeline based on saved project/run/job metadata.
- Added failure recovery panels for failed runs and deleted dataset states.
- Added rerun actions that reuse the existing safe project run rerun endpoint
  instead of introducing a new training flow.
- Reused existing project, job, report, dataset delete impact, and prediction
  token APIs; no backend endpoint was added for UI-03.
- Cross-linked Dashboard, Projects, Jobs, Reports, and Prediction APIs pages to
  project/run detail views.
- Detailed trace steps that are not persisted by the backend are clearly shown
  as unavailable rather than fabricated.
- UI-04 should continue with operational polish for job center, token status,
  dataset retention, and beta/support states.

## UI-04: Ops UX Polish

Scope:

- Jobs center.
- Usage limits.
- Plan badges.
- Token status.
- Dataset retention.
- Delete/restore states.
- Beta feedback.

Goal:

- Make operational states visible without introducing enterprise complexity.

Implementation notes:

- Polished the Jobs center with filters for all, active, and failed jobs.
- Added Korean-first failure summaries, recovery actions, and copyable
  request/error context where job metadata provides it.
- Added compact dashboard operational sections for running jobs, failed jobs,
  usage summary, and next recommended action.
- Polished project detail and run detail recovery panels, trace labels, dataset
  deletion states, token states, and danger-zone explanations.
- Polished Prediction API workspace rows so active, revoked, disabled, deleted
  dataset, and model-not-ready states are easier to understand.
- Polished Settings usage cards with progress bars, warning/blocked states, and
  a lightweight monitoring/support section that uses PR-20 admin monitoring
  endpoints when the current user has access.
- Kept backend APIs unchanged and did not add billing, RBAC, enterprise admin
  console, or external monitoring dependencies.

## UI-05: Launch Polish

Scope:

- Landing, pricing, docs, report, and README consistency.
- Final copy polish.
- Screenshot-ready UI.
- Portfolio/demo narrative polish.

Goal:

- Prepare a coherent public demo and portfolio presentation.

## PR-21: Beta Feedback Loop

Scope:

- Lightweight in-app feedback entry points.
- Sanitized feedback persistence.
- Admin/dev feedback review surface.
- Feedback smoke test and QA documentation.

Goal:

- Let beta users report bugs, confusing UX, wrong results, report issues,
  prediction API issues, dataset problems, performance issues, and feature
  requests without introducing a full support platform.

Implementation notes:

- Added a Korean-first feedback dialog in the workspace shell and Settings.
- Added frontend error-boundary integration that can submit sanitized error
  context with `request ID` and `error ID`.
- Added `/api/feedback` for authenticated and guest/demo feedback submission.
- Added protected admin/dev feedback review endpoints under `/api/admin/feedback`.
- Stored only safe context such as route, page URL, resource IDs, request/error
  IDs, and prediction API token prefixes; raw CSV, full tokens, passwords, and
  session secrets are not attached.
- Added `scripts/run_feedback_smoke.py` and included it in release QA when a
  base URL is provided.
- Kept existing app routes, auth/session behavior, AutoML flows, prediction API
  flows, report export, and workspace reuse intact.

## PR-22: Use-case Starter Packs

Scope:

- Practical starter packs for first-time users.
- Small synthetic sample CSV files.
- Korean-first starter pack gallery on the upload flow.
- Dashboard/projects empty-state guidance.
- Starter pack metadata smoke test and documentation.

Goal:

- Help new users understand which CSV to try, what target to predict, how to
  read the report, and how prediction API reuse fits into the workflow.

Implementation notes:

- Added five starter packs: customer churn, sales/demand, equipment failure,
  marketing conversion, and student performance.
- Added local static sample CSV files under `frontend/public/samples/`.
- Added metadata in `frontend/src/data/starterPacks.js` and
  `frontend/public/samples/starter_packs.json`.
- The upload page can start analysis from a starter pack by loading the local
  CSV and sending it through the existing `/api/upload` flow.
- Recommended targets are preselected when present in the sample CSV.
- Landing, dashboard empty state, and projects empty state now point first-time
  users toward starter packs without creating fake results.
- Added `scripts/run_starter_pack_smoke.py` and release QA integration.
- Kept existing upload, AutoML, report, prediction API, project, monitoring,
  usage limit, dataset lifecycle, and feedback flows intact.

## Implementation Order

1. PR-17 completed: dataset management, delete flow, retention foundation.
2. UI-00: design guardrails.
3. UI-01: current flow polish.
4. PR-18: prediction API token hardening and API reuse polish.
5. PR-19: usage limits and plan-aware guardrails.
6. UI-02: SaaS workspace shell.
7. UI-03: Project Detail / Run Detail.
8. PR-20: report persistence/export hardening.
9. UI-04: ops UX polish.
10. PR-21: beta feedback loop and support surface.
11. PR-22: use-case starter packs.
12. PR-23: privacy/security hardening follow-up.
13. UI-05: launch polish.
14. PR-24: final beta release QA and deployment readiness.

## PR Discipline

Each UI PR should report:

- changed files;
- screens touched;
- copy changes;
- state handling changes;
- routes and APIs confirmed unchanged;
- build result;
- screenshots or visual checks when the PR changes layout;
- remaining risks.

## Out Of Scope Until Explicitly Requested

- TypeScript migration.
- New large UI framework.
- Full app shell replacement in UI-00 or UI-01.
- Payment UI connected to real billing.
- Enterprise team workspace.
- Admin dashboard redesign.
- Full MLOps console.
- New backend architecture for UI-only PRs.

## Design Direction Summary

ModelMate should become a guided CSV predictive analysis SaaS MVP. The UI should
make the product feel like a reliable workspace for projects, runs, reports, and
prediction APIs. It should not look like an AI novelty demo.
