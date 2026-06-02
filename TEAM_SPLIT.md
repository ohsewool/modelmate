# ModelMate 3-Person Development Split

## Current Split Status

The backend entry file has been split so each editable backend part stays under 100 lines.

- `backend/main.py`: lightweight loader only
- `backend/main_parts/*.py`: feature sections loaded in order

This keeps the existing Railway entrypoint unchanged:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

## Person A: Data and AutoML Backend

Own these files:

- `backend/main_parts/010_upload.py`
- `backend/main_parts/011_analyze_columns.py`
- `backend/main_parts/012_set_target.py`
- `backend/main_parts/020_run_cv.py`
- `backend/main_parts/021_optuna_a.py`
- `backend/main_parts/022_optuna_b.py`
- `backend/main_parts/070_feature_predict.py`
- `backend/main_parts/071_batch_deploy_a.py`

Responsibilities:

- CSV upload and parsing
- Column analysis
- Target selection
- Classification/regression decision
- Cross validation
- Optuna tuning
- Single and batch prediction

## Person B: XAI, Reports, History, Deployment

Own these files:

- `backend/main_parts/030_shap.py`
- `backend/main_parts/031_predictions.py`
- `backend/main_parts/040_agent_a.py`
- `backend/main_parts/041_agent_b.py`
- `backend/main_parts/051_auth_history_debug.py`
- `backend/main_parts/060_state_report_a.py`
- `backend/main_parts/061_report_b.py`
- `backend/main_parts/072_deploy_static_b.py`
- `frontend/src/pages/XAI.jsx`
- `frontend/src/pages/Report.jsx`
- `frontend/src/pages/History.jsx`
- `frontend/src/pages/Deploy.jsx`

Responsibilities:

- SHAP global/local explanation
- Error and prediction analysis
- Agent workflow output
- HTML report
- Experiment history
- Model deployment and public prediction endpoint

## Person C: Frontend and User Flow

Own these files:

- `frontend/src/App.jsx`
- `frontend/src/components/Sidebar.jsx`
- `frontend/src/components/KPICard.jsx`
- `frontend/src/pages/Home.jsx`
- `frontend/src/pages/Upload.jsx`
- `frontend/src/pages/ModelLab.jsx`
- `frontend/src/pages/Predict.jsx`
- `frontend/src/pages/Login.jsx`
- `frontend/src/index.css`
- `frontend/src/api.js`

Responsibilities:

- UI layout and navigation
- Upload flow screen
- Model result screen
- Prediction screen
- Korean copy cleanup
- Responsive layout
- Frontend API integration

## Conflict Rules

- Do not edit another person's owned files without asking first.
- Treat `backend/main.py`, `frontend/src/App.jsx`, `frontend/src/api.js`, and `frontend/src/index.css` as shared files.
- Make small pull requests by feature.
- Pull latest `main` before starting work.
- Keep API request and response shapes documented before frontend/backend changes.

