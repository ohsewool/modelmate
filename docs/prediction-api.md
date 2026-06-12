# ModelMate Prediction API

ModelMate can turn a trained project model into a reusable prediction endpoint.
PR-18 adds project-scoped prediction API tokens for the SaaS MVP direction.
The legacy model URL remains available for compatibility, but the recommended
MVP flow is now the project token flow.

This is not an enterprise API gateway. It is an MVP foundation for safer reuse
of a trained project model.

## Recommended Project-Scoped Flow

1. Sign in.
2. Upload a CSV and run model comparison.
3. Create a shared/deployed model from the project.
4. Open the prediction API section.
5. Create a project-scoped token.
6. Copy the token immediately. It is shown only once.
7. Call the project prediction endpoint with `Authorization: Bearer <token>`.

## Token Management Endpoints

All token management endpoints require the signed-in project owner.

```text
GET  /api/projects/{project_id}/prediction-tokens
POST /api/projects/{project_id}/prediction-tokens
POST /api/projects/{project_id}/prediction-tokens/{token_id}/revoke
POST /api/projects/{project_id}/prediction-tokens/{token_id}/regenerate
```

List responses return metadata only:

- `token_id`
- `project_id`
- `token_prefix`
- `status`: `active`, `revoked`, or `disabled`
- `created_at`
- `last_used_at`
- `usage_count`
- `disabled_reason`

The plaintext token is returned only by create/regenerate responses and is not
stored in plaintext.

## Project Prediction Endpoint

```text
POST /api/predict/{project_id}
```

Accepted auth headers:

```text
Authorization: Bearer <MODEL_MATE_TOKEN>
X-ModelMate-Token: <MODEL_MATE_TOKEN>
```

The endpoint checks:

- token hash and status
- linked project availability
- linked dataset availability
- deployed model artifact availability
- input feature schema compatibility

Successful prediction increments `usage_count` and updates `last_used_at`.

## Request Body

Batch form:

```json
{
  "rows": [
    {
      "tenure_months": 12,
      "monthly_fee": 49.9,
      "support_tickets": 2,
      "contract_type": "monthly",
      "last_login_days": 7
    }
  ]
}
```

Single-record compatibility form:

```json
{
  "features": {
    "tenure_months": 12,
    "monthly_fee": 49.9
  }
}
```

## Response Example

```json
{
  "status": "ok",
  "project_id": "abcd1234",
  "model_id": "model123",
  "task_type": "classification",
  "target_col": "churn",
  "best_model_name": "RandomForest",
  "count": 1,
  "prediction": {
    "task_type": "classification",
    "prediction": 1,
    "prediction_label": "yes",
    "probabilities": {
      "no": 0.2841,
      "yes": 0.7159
    },
    "confidence": 0.7159,
    "input_warnings": []
  },
  "results": []
}
```

## cURL Example

```bash
curl -X POST "https://web-production-5d6fa.up.railway.app/api/predict/<project_id>" \
  -H "Authorization: Bearer <MODEL_MATE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"rows":[{"tenure_months":12,"monthly_fee":49.9,"support_tickets":2,"contract_type":"monthly"}]}'
```

## Python requests Example

```python
import requests

response = requests.post(
    "https://web-production-5d6fa.up.railway.app/api/predict/<project_id>",
    headers={"Authorization": "Bearer <MODEL_MATE_TOKEN>"},
    json={
        "rows": [
            {
                "tenure_months": 12,
                "monthly_fee": 49.9,
                "support_tickets": 2,
                "contract_type": "monthly",
            }
        ]
    },
)

print(response.json())
```

## Token Security Behavior

- Tokens are generated with a secure random value.
- Only a SHA-256 hash is stored.
- The full token is shown only once after create/regenerate.
- Token list endpoints show only a short prefix and metadata.
- Revoked tokens cannot be used again.
- Regeneration revokes the old token and returns a new show-once token.
- Full tokens must not be committed to GitHub or shared in screenshots.

## Dataset and Project Deletion Behavior

If the linked dataset is deleted, or the project is archived/deleted:

- active prediction tokens for that project are disabled;
- the project prediction endpoint returns a friendly unavailable response;
- existing historical reports may remain as summaries;
- rerun/training flows that need the deleted source dataset are blocked.

This is an MVP delete/retention foundation, not full data lifecycle compliance.

## Friendly Error Types

Common public prediction errors:

```json
{
  "detail": {
    "error_type": "invalid_token",
    "user_friendly_message": "The prediction API token is invalid.",
    "recommended_next_action": "Create or regenerate a token from the project API section."
  }
}
```

Possible `error_type` values include:

- `invalid_token`
- `token_revoked`
- `token_disabled`
- `project_not_found`
- `project_deleted`
- `dataset_deleted`
- `model_not_ready`
- `schema_mismatch`
- `prediction_failed`

## Legacy Compatibility Endpoint

Existing shared model endpoints remain for current demo compatibility:

```text
POST /api/deploy/stable
GET  /api/deployed
POST /api/v2/{model_id}/predict
POST /api/v1/{model_id}/predict
```

Prefer `/api/predict/{project_id}` with a project-scoped token for new SaaS MVP
demos because it supports ownership, revocation, regeneration, and usage
metadata.

## Current Limitations

- No billing-based quota.
- No enterprise API gateway.
- No per-token rate limiting yet.
- No team workspace token sharing yet.
- The token system assumes a project has one current active deployed model.
- Prediction quality depends on the uploaded dataset, selected target, current
  validation results, and saved model artifact.
