# Commercialization Backlog

This backlog lists follow-up work after the PR-12 and PR-13 foundations. It is
not a commitment to build all items before beta.

## Must Keep Stable

- CSV upload and validation;
- target recommendation and model comparison;
- report preview/export;
- prediction API reuse;
- sample dataset demo flow;
- auth/session flow;
- user-owned project access checks.

## PR-14 Candidates

- saved project detail view backed by persisted metadata;
- rerun endpoint or rerun adapter with ownership checks;
- report summary linkage to project and analysis run;
- smoke test coverage for rerun access control.

## Later Candidates

- report-id based export ownership;
- prediction token metadata ownership and rotation;
- lightweight usage guardrails per session/account;
- beta feedback triage workflow;
- monitoring and audit-log draft.

## Explicit Non-Goals

- payment implementation;
- team workspace;
- enterprise SSO;
- full RBAC;
- production-grade multi-tenant security claims;
- full MLOps platform.
