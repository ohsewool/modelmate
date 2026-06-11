# ModelMate Prediction API

ModelMate can turn a trained result into a reusable prediction endpoint. This
document describes the existing shared prediction API. It does not introduce a
new production deployment system.

## Purpose

The prediction API lets a user reuse a saved ModelMate model after CSV upload,
target selection, model comparison, and shared model creation.

Typical flow:

1. Upload a CSV.
2. Select or confirm the target column.
3. Run model comparison.
4. Open the model sharing screen.
5. Create a shared model.
6. Call the generated prediction URL.

## Endpoint

```text
POST /api/v2/{model_id}/predict
```

`model_id` is returned by:

```text
POST /api/deploy/stable
```

Shared models can be listed with:

```text
GET /api/deployed
```

There is also a legacy endpoint:

```text
POST /api/v1/{model_id}/predict
```

Prefer `v2` for new demos because it returns input warnings and normalized
feature values.

## Request Body

The existing endpoint expects a `features` object.

```json
{
  "features": {
    "tenure_months": 12,
    "monthly_fee": 49.9,
    "support_tickets": 2,
    "contract_type": "monthly",
    "last_login_days": 7
  }
}
```

For backward compatibility, the API can also accept the feature object directly,
but the documented format should use `features`.

## Response Example

Classification response:

```json
{
  "status": "ok",
  "model_id": "abcd1234",
  "task_type": "classification",
  "prediction": 1,
  "prediction_label": "yes",
  "probabilities": {
    "no": 0.2841,
    "yes": 0.7159
  },
  "confidence": 0.7159,
  "input_features": {
    "tenure_months": 12,
    "monthly_fee": 49.9,
    "support_tickets": 2,
    "contract_type": 0,
    "last_login_days": 7
  },
  "input_warnings": [],
  "target_col": "churn",
  "best_model_name": "RandomForest"
}
```

Regression response:

```json
{
  "status": "ok",
  "model_id": "efgh5678",
  "task_type": "regression",
  "prediction": 234.82,
  "input_features": {
    "promotion_count": 5,
    "station_count": 52,
    "avg_temperature": 19.3
  },
  "input_warnings": [],
  "target_col": "signup_count",
  "best_model_name": "GradientBoosting"
}
```

## Input Schema

The feature names and example values are returned by `GET /api/deployed`.

Each deployed model item contains:

- `id`: model identifier used in the URL
- `name`: display name
- `version_label`: UI-level version label
- `target_col`: predicted target column
- `task_type`: `classification` or `regression`
- `best_model_name`: model selected by ModelMate
- `features`: list of feature metadata
- `metrics`: stored model metrics snapshot
- `dataset_ref`: source dataset metadata when available
- `storage_status`: whether the model artifact file is available

Feature metadata can include:

- `name`
- `label`
- `type`
- `example`
- `options` for categorical values

## curl Example

```bash
curl -X POST "https://web-production-5d6fa.up.railway.app/api/v2/<model_id>/predict" \
  -H "Content-Type: application/json" \
  -d '{"features":{"tenure_months":12,"monthly_fee":49.9,"support_tickets":2,"contract_type":"monthly","last_login_days":7}}'
```

## Python requests Example

```python
import requests

response = requests.post(
    "https://web-production-5d6fa.up.railway.app/api/v2/<model_id>/predict",
    json={
        "features": {
            "tenure_months": 12,
            "monthly_fee": 49.9,
            "support_tickets": 2,
            "contract_type": "monthly",
            "last_login_days": 7,
        }
    },
)

print(response.json())
```

## Error Response Examples

Model not found:

```json
{
  "detail": "Model not found: abcd1234"
}
```

Invalid request body:

```json
{
  "detail": "예측 요청은 features 객체 형태로 보내야 합니다."
}
```

## Usage Limitations

- The shared API depends on the saved model artifact still existing on the
  server.
- Input features should match the model's saved feature schema.
- Unknown categorical values can be adjusted to a known category, and the API
  may return `input_warnings`.
- This API is intended for a SaaS MVP demo and portfolio workflow, not high-scale
  production traffic.

## Security Limitations

- The current preview-style shared URL is not a full production secret
  management system.
- Do not treat the demo endpoint as a replacement for enterprise authentication,
  rate limiting, audit logging, or billing controls.
- For real production use, add proper API keys, user-level access control, usage
  limits, logging, and model lifecycle governance.

## Production Use Caution

Prediction results are based on the uploaded dataset, selected target, current
validation results, and saved model artifact. They are not guaranteed to be
correct for future data distributions.
