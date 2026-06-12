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
- Project detail and run detail tabs are intentionally left for UI-03.
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

## UI-05: Launch Polish

Scope:

- Landing, pricing, docs, report, and README consistency.
- Final copy polish.
- Screenshot-ready UI.
- Portfolio/demo narrative polish.

Goal:

- Prepare a coherent public demo and portfolio presentation.

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
11. PR-22: privacy/security hardening follow-up.
12. PR-23: demo data, examples, and public docs polish.
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
