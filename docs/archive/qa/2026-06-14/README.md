# Historical ModelMate QA Snapshot — 2026-06-14

## Status

This directory preserves a historical, non-authoritative ModelMate QA snapshot. It is useful for provenance and comparison, but it must not be presented as evidence of the current repository, runtime, security posture, deployment, or quality state.

The three preserved result files must be interpreted together as one atomic snapshot:

- `FULL_QA_RESULTS.md`
- `full_qa_results.json`
- `workspace_flow_qa_results.json`

The Markdown report is a human-readable summary, the full JSON file is the primary orchestration record, and the workspace-flow JSON file is the detailed result embedded by the full JSON record.

## Recorded provenance

- Recorded run timestamp: `2026-06-14T13:07:45`
- Timezone: unknown
- Original workspace path: `C:\Users\82105\Documents\Codex\2026-06-02\https-web-production-5d6fa-up-railway\work\github-repo\frontend`
- Recorded Git commit: not available; the run did not record its revision
- Nearest preceding commit: `83d400556a1341c40c1f94c62ebbc75d806c5196`

The nearest preceding commit is a chronological reference only. It is not a confirmed revision for this QA run and must not be described as one.

## Coverage limitations

- Training was skipped using the quick-run option.
- Deployment was not tested.
- Prediction was exercised through direct Python handler calls, not through a complete HTTP API and authentication flow.
- The frontend build completed with a warning that a generated chunk was greater than 500 kB after minification.
- The snapshot does not establish the current behavior of later runtime, security, authentication, ownership, recovery, monitoring, deployment, or quality controls.

Current runtime, security, deployment, and quality claims require a new QA run against an explicitly recorded repository revision and environment. See `provenance.json` for machine-readable source metadata and integrity hashes.
