# ModelMate Deployment Checklist

This checklist describes the current Railway deployment setup for the guided CSV
predictive analysis MVP. Do not commit secrets to GitHub.

## Required Runtime

- Python 3.11
- Node.js 20
- `pip install -r requirements.txt`
- `cd frontend && npm ci && npm run build`

Railway/Nixpacks setup is defined in:

- `railway.toml`
- `nixpacks.toml`
- `Procfile`

## Start Command

```bash
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

## Build Command

```bash
pip install -r requirements.txt && cd frontend && npm ci && npm run build && cd ..
```

## Environment Variables

Current MVP deployments may use:

- `GOOGLE_CLIENT_ID` or frontend OAuth client configuration when auth is enabled
- optional LLM/provider keys only if a feature explicitly needs them
- Railway-provided `PORT`

Never commit API keys, OAuth secrets, tokens, passwords, or database credentials.

## Health Check / Smoke Check

There is no dedicated `/health` endpoint yet. Use these smoke checks:

- `GET /` should return the frontend app.
- `GET /api/state` should return app state JSON.
- `GET /api/report/summary` should return a report summary after an analysis run.

## Deployment Verification

1. Push to GitHub `main`.
2. Wait for Railway to build and redeploy.
3. Open `https://web-production-5d6fa.up.railway.app/`.
4. Confirm the served JS bundle in `index.html` matches the latest `frontend/dist`
   build.
5. Open `/pricing`.
6. Upload a sample CSV.
7. Run model comparison.
8. Open result/report and verify `/api/report/html`.
9. Create or view a shared model and check the documented prediction endpoint:
   `POST /api/v2/{model_id}/predict`.

## Common Deployment Failures

- Frontend bundle not updated yet: Railway may still be serving an older asset
  while the new build is pending.
- Missing Python package: verify `requirements.txt`.
- Node install failure: retry build or verify `npm ci` can run in `frontend`.
- Large bundle warning: currently a warning, not a build blocker.
- Missing model artifact: shared prediction API depends on saved model files.
- Secrets exposed in source: rotate the secret and remove it from history before
  public use.

## Rollback Notes

- Use GitHub commit history to identify the last known good commit.
- Revert or redeploy the previous commit through Railway/GitHub workflow.
- Verify `/`, `/api/state`, upload, model comparison, report, and prediction API
  after rollback.

## Security Caution

Do not commit secrets. For beta use, prefer demo/synthetic data and avoid
sensitive personal, medical, financial, payment, or regulated data.
