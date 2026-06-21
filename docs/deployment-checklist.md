# ModelMate Deployment Checklist

This checklist describes the current Railway deployment setup for the guided CSV
predictive analysis MVP. Do not commit secrets to GitHub.

For the final portfolio/beta package, use this checklist together with:

- [Deployment notes](deployment-notes.md)
- [Final release checklist](final-release-checklist.md)
- [Demo guide](demo-guide.md)
- [Screenshot checklist](screenshot-checklist.md)

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

Required for a public authenticated deployment:

- `JWT_SECRET`: long random value, stored only in Railway variables
- `ADMIN_PASSWORD`: set only when the configured bootstrap admin uses email/password login

Deployment-dependent variables:

- `ADMIN_EMAILS`: comma-separated trusted admin emails; an empty value keeps normal-user flows available
- `ALLOWED_ORIGINS`: comma-separated frontend origins when frontend and backend are hosted separately
- `VITE_API_URL`: backend origin or backend `/api` URL for a separately hosted frontend; leave empty for the current same-origin Railway service
- `DB_PATH`, `MODELS_DIR`, `DATASETS_DIR`: point these to a mounted Railway volume when persistence across redeploys is required
- `GOOGLE_CLIENT_ID`: OAuth client configuration when Google login is used
- `LLM_ENABLED`, `OPENAI_API_KEY`, `OPENAI_MODEL`: optional; reports use deterministic fallback when disabled or unavailable
- free-plan usage limit variables documented in `.env.example`
- Railway-provided `PORT`

The current deployment is a single same-origin service: Railway builds `frontend/dist`, then FastAPI serves both `/api/*` and the SPA. `VITE_API_URL` and cross-origin CORS are not required for this shape.

Never commit API keys, OAuth secrets, tokens, passwords, or database credentials.

## Health Check / Smoke Check

Use these smoke checks:

- `python scripts/check_runtime_config.py` should pass before deployment.
- `GET /` should return the frontend app.
- `GET /api/health` should return HTTP 200 and an `X-Request-ID` header.
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
10. Refresh `/dashboard`, `/upload`, `/agent-mode`, `/reports`, and `/prediction-apis` directly and confirm SPA fallback works.
11. Run `python scripts/run_product_smoke.py --base-url <URL> --skip-training`.
12. Run `python scripts/run_sample_csv_gate.py --base-url <URL>`.

## Common Deployment Failures

- Frontend bundle not updated yet: Railway may still be serving an older asset
  while the new build is pending.
- Missing Python package: verify `requirements.txt`.
- Node install failure: retry build or verify `npm ci` can run in `frontend`.
- Large bundle warning: currently a warning, not a build blocker.
- Missing model artifact: shared prediction API depends on saved model files.
- Lost data after redeploy: Railway filesystem is ephemeral unless `DB_PATH`, `MODELS_DIR`, and `DATASETS_DIR` point to a mounted volume.
- Cross-origin API failure: set `VITE_API_URL` at frontend build time and add the exact frontend origin to `ALLOWED_ORIGINS`.
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
