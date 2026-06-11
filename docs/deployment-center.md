# ModelMate Deployment Center

Current status: PR-11 placeholder.

PR-11 does not deploy models, change prediction APIs, create a production model
registry, add a frontend Deployment Center, or add a human review queue. It only
defines deterministic deployment advice.

## PR-11 Deployment Advice Flow

```text
evidence bundle -> validation result -> report result -> deployment_check_tool -> deployment advice
```

## What Exists

- `deployment_check_tool` returns advice only.
- Possible statuses are `deploy_recommended`, `needs_review`, `hold`,
  `blocked`, and `unknown`.
- Advice includes risk level, blocking reasons, warnings, required actions,
  policy checks, observation, and decision payload.
- `deployment_center.py` contains placeholder helpers for future deployment ids
  and center metadata.

## What Does Not Exist Yet

- Actual production deployment
- Prediction API changes
- Model storage migration
- Frontend Deployment Center
- Human review queue
- Resume flow
- PDF export
- Database schema changes
- LLM deployment review

## Future Model Stage Vocabulary

Later PRs can add these stage concepts without changing PR-11 behavior:

- `draft`: model has been trained but not reviewed
- `candidate`: model passed validation but still needs deployment review
- `staging`: model is approved for pre-production testing
- `production`: model is actively serving prediction requests
- `archived`: model is retained only for lineage or audit

ModelMate is still being extended toward Agentic AutoML. PR-11 is not a
completed real AI agent.
