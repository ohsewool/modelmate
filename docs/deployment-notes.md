# Deployment Notes

ModelMate의 현재 Railway 배포 기준을 정리합니다.

## Overview

- Hosting: Railway
- Backend: FastAPI app served by `uvicorn backend.main:app`
- Frontend: Vite build output served with the backend deployment
- Branch: `main`
- Public demo: https://web-production-5d6fa.up.railway.app/

## Build Assumptions

Railway/Nixpacks files:

- `railway.toml`
- `nixpacks.toml`
- `Procfile`

Expected build:

```bash
pip install -r requirements.txt
cd frontend
npm ci
npm run build
```

Expected start:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

## Environment Variables Checklist

- [ ] `PORT` is provided by Railway
- [ ] OAuth/client IDs are configured only if used
- [ ] API keys or provider secrets are stored in Railway variables, not GitHub
- [ ] No plaintext tokens/passwords are committed
- [ ] Demo account credentials, if used, are not hardcoded in docs

## Verification

After deploy:

1. Open `/`
2. Confirm Korean-first landing copy
3. Open `/pricing`
4. Try guest demo or sign in
5. Start starter pack flow
6. Upload CSV/sample
7. Confirm target recommendation
8. Run or load model comparison
9. Open project/report/API tab
10. Confirm token warning does not expose full token in lists
11. Run deployed smoke test if practical

```bash
python scripts/run_product_smoke.py --base-url https://web-production-5d6fa.up.railway.app --skip-training
```

## Common Issues

- Build still serving old frontend asset: wait for Railway deploy to finish and refresh
- Missing Python dependency: check `requirements.txt`
- Node install failure: retry build or verify `frontend/package-lock.json`
- Model artifact missing: rerun analysis or use sample flow
- Large JS bundle warning: currently warning only, not a deploy blocker
- Secret committed accidentally: rotate and remove from history before public use

## Fallback If Deployment Is Down

1. Run backend locally:

```bash
uvicorn backend.main:app --reload
```

2. Run frontend locally:

```bash
cd frontend
npm run dev
```

3. Use screenshots prepared from [screenshot-checklist.md](screenshot-checklist.md).

## Security Caution

Never commit secrets, full API tokens, OAuth secrets, passwords, private CSV
data, or payment information. ModelMate currently documents MVP security notes
but does not claim enterprise-grade compliance.
