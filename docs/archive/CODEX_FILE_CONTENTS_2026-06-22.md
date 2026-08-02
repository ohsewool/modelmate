# Archived Audit Notice

This file preserves the contents of the untracked root `CODEX_FILE_CONTENTS.md` as a dated audit artifact.

- Original snapshot date: 2026-06-22 KST
- Archived on: 2026-08-02 KST
- Original source: `CODEX_FILE_CONTENTS.md`
- Original SHA-256 before this archive header was added: `d52a2e85f7d3f285165fed7587bca42a67ea7bed5e10cd0bc85ea9be033131cc`

This snapshot is **non-authoritative**. Repository structure, routes, dependencies, environment variables, implementation status, and security findings may have changed after the snapshot was produced.

The live source code, current repository instructions, and current applicable `PROJECT_SPEC` documents are authoritative. When this snapshot conflicts with any of them, use the live source and current specification. Revalidate every operational, deployment, security, or completion claim before relying on it.

The original snapshot content begins below and is preserved for provenance and historical audit reference.

---

# ModelMate Important File Contents

> Updated: 2026-06-22 KST
>
> Long application files are summarized with their important declarations and contracts. Secrets and credential-like defaults are masked. This document does not replace the source files.

## File Availability

| Requested file | Repository location | Result |
|---|---|---|
| `AGENTS.md` | `AGENTS.md` | Exists |
| `README.md` | `README.md` | Exists |
| `package.json` | `frontend/package.json` | Exists only under `frontend/`; no root `package.json` |
| `requirements.txt` | `requirements.txt` | Exists |
| `pyproject.toml` | - | Does not exist |
| `docker-compose.yml` | - | Does not exist |
| `.env.example` | `.env.example` | Exists |
| Backend main app | `backend/main.py` | Exists |
| Backend DB/model files | `backend/main_parts/001_imports_db.part`, `backend/agents/persistence.py`, related parts | Exist |
| Backend API route files | `backend/main_parts/*.part` | Exist; composed at runtime |
| Frontend pages | `frontend/src/pages/**/*.jsx` | Exist |
| Frontend API client | `frontend/src/api.js` | Exists |

## 1. `AGENTS.md`

The file is 148 lines. Its operative content is summarized below.

```text
Project:
- ModelMate is a graduation/portfolio service.
- Existing workflow: CSV upload, analysis, target recommendation, model comparison,
  result summary, explanations, prediction, shared API, and workspace reuse.
- Long-term direction: Agentic AutoML with planner, tool calls, observations,
  decisions, branching, and reports.

Core rules:
1. Do not break existing ModelMate features, deployment, or demo flow.
2. Do not delete the existing AutoML pipeline.
3. Wrap existing AutoML features as tool adapters instead of replacing them.
4. Do not rewrite app.py, backend/main.py, or all main_parts in one large change.
5. Preserve existing endpoints and compatibility shims.
6. Implement one PR scope at a time.
7. Do not implement the entire roadmap at once.
8. Do not claim a real Agent without plan -> tool call -> observation -> decision.
9. Avoid large DB/frontend/API/architecture changes unless explicitly scoped.

Recommended architecture:
- One Supervisor Planner makes next-step decisions.
- Data profile, schema validation, target recommendation, leakage check,
  training, evaluation, SHAP, validation, deployment check, report writing,
  and human review are tools or handoff mechanisms, not fake agents.

Frontend:
- React/Vite JavaScript.
- Do not migrate to TypeScript without explicit request.

Validation:
- python -m compileall backend
- uvicorn backend.main:app --reload, when applicable
- cd frontend && npm run build, for frontend changes
```

Important note: the root `AGENTS.md` still contains historic PR-01 skeleton instructions. For current Agentic roadmap behavior also read `.codex/AGENTS.md`, `.codex/TASK_QUEUE.md`, `.codex/QA_GATE.md`, and `.codex/RUN_LOG.md`.

## 2. `README.md`

The README is 152 lines. It is a concise portfolio/product overview with these sections:

```markdown
# ModelMate
## Live Demo
## What It Does
## Key Features
## Product Workflow
## Agentic AutoML Workflow
## Demo Scenario
## Tech Stack
## Local Setup
## Environment Variables
## Documentation
## Current Limitations
## Portfolio Notes
## Roadmap
```

Key contents:

- Positions ModelMate as a Korean-first guided CSV predictive analysis SaaS MVP.
- Describes CSV upload, target recommendation, model comparison, explanations, grounded report, prediction API, projects/runs, usage limits, monitoring, feedback, and starter packs.
- Explains the auditable Agentic flow without claiming enterprise autonomy.
- Links the live Railway demo and documentation.
- Documents local backend/frontend commands.
- States limitations: no real billing, no enterprise SSO/full RBAC, no full deployment orchestration, no automatic retraining, and MVP-level monitoring/API behavior.

The complete README should be read directly before changing public claims because it is short enough and may evolve after this handoff.

## 3. `frontend/package.json`

Complete content:

```json
{
  "name": "failure-ai",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 3000",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@radix-ui/react-slot": "^1.2.4",
    "@react-oauth/google": "^0.13.5",
    "axios": "^1.6.5",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.303.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.3",
    "recharts": "^2.10.3",
    "tailwind-merge": "^3.6.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "vite": "^5.0.11"
  }
}
```

No lint, typecheck, or frontend test script is declared.

## 4. `requirements.txt`

Complete content:

```text
fastapi
uvicorn[standard]
pandas
numpy
scikit-learn
shap
optuna
python-multipart
google-generativeai
google-auth
python-jose[cryptography]
xgboost
lightgbm
openai
```

Versions are not pinned. Exact installed backend package versions are therefore unknown and environment-dependent.

## 5. `pyproject.toml`

Does not exist. Python configuration currently comes from `requirements.txt` and runtime files.

## 6. `docker-compose.yml`

Does not exist. The supported deployment path is Railway/Nixpacks, not Docker Compose.

## 7. `.env.example`

Sanitized complete content:

```dotenv
# Optional OpenAI summary foundation. The app works with LLM_ENABLED=false.
LLM_ENABLED=false
OPENAI_API_KEY=***
OPENAI_MODEL=gpt-5-mini
LLM_TIMEOUT_SECONDS=20
LLM_MAX_INPUT_CHARS=12000

# Auth-lite admin role and configurable free-plan guardrails.
ADMIN_EMAILS=***
ADMIN_PASSWORD=***
JWT_SECRET=***
GOOGLE_CLIENT_ID=***

# Runtime networking and persistence. Same-origin Railway deploys may leave
# VITE_API_URL empty. Set ALLOWED_ORIGINS for a separately hosted frontend.
ALLOWED_ORIGINS=http://localhost:3000
VITE_API_URL=
DB_PATH=***
MODELS_DIR=***
DATASETS_DIR=***

FREE_MAX_PROJECTS=3
FREE_MAX_DATASETS=3
FREE_MAX_ANALYSIS_RUNS=5
FREE_MAX_PREDICTION_APIS=1
FREE_MAX_REPORTS=10
MODELMATE_MAX_FILE_SIZE_MB=10
MODELMATE_MAX_ROWS_PER_DATASET=5000
MODELMATE_MAX_COLUMNS_PER_DATASET=100
```

Additional variables used in source but not fully documented in `.env.example` include:

```dotenv
PORT=***
ADMIN_EMAIL=***
MODELMATE_ADMIN_EMAIL=***
MODELMATE_ADMIN_PASSWORD=***
DATASET_RETENTION_DAYS=***
DELETED_ARTIFACT_RETENTION_DAYS=***
GEMINI_API_KEY=***
MODEL_MATE_DISABLE_GEMINI=***
MODEL_MATE_LLM_PLANNER_ENABLED=false
MODEL_MATE_LLM_PLANNER_RESPONSE=***
MODEL_MATE_MAX_MONITORING_EVENTS=***
ENVIRONMENT=***
RAILWAY_ENVIRONMENT_NAME=***
```

Never place secrets in `VITE_*`; those values are included in the browser bundle.

## 8. Backend Main App File

### `backend/main.py`

Complete content:

```python
from pathlib import Path

_PARTS_DIR = Path(__file__).with_name("main_parts")

_sources = [
    _part.read_text(encoding="utf-8-sig")
    for _part in sorted(_PARTS_DIR.glob("*.part"))
]
_source = "\n".join(_sources)
exec(compile(_source, str(_PARTS_DIR), "exec"), globals())
```

This means the backend is assembled from sorted `backend/main_parts/*.part` files into one shared global namespace. File ordering is part of runtime behavior.

Railway starts the app with:

```text
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

## 9. Backend Database and Model Files

### `backend/main_parts/001_imports_db.part`

Responsibilities:

- Imports FastAPI, pandas, NumPy, scikit-learn, SQLite, auth, and utility dependencies.
- Defines password hashing/verification with PBKDF2-HMAC-SHA256.
- Defines JWT/auth configuration and `get_db()`.
- Resolves `DB_PATH`, `MODELS_DIR`, and `DATASETS_DIR`.
- Creates parent directories.
- Initializes foundational tables and compatibility columns.

Important sanitized configuration shape:

```python
JWT_SECRET = os.getenv("JWT_SECRET", "***development fallback masked***")
DB_PATH = os.getenv("DB_PATH", "").strip() or os.path.join(REPO_ROOT, "modelmate.db")
MODELS_DIR = os.getenv("MODELS_DIR", "").strip() or os.path.join(REPO_ROOT, "deployed_models")
DATASETS_DIR = os.getenv("DATASETS_DIR", "").strip() or os.path.join(REPO_ROOT, "uploaded_datasets")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
```

Core tables initialized across this and later parts:

```text
users
projects
datasets
deployed_models
experiments
auth_sessions
user_usage_daily
training_jobs
prediction_api_tokens
beta_feedback
pilot_inquiries
monitoring_events
```

Important warning: this file contains development fallback admin/JWT settings in source. Their literal values are intentionally omitted here. Public Railway deployment must define strong environment values.

### `backend/agents/persistence.py`

This is the agent trace database layer. It creates and updates:

```text
analysis_runs
agent_plans
analysis_steps
tool_calls
observations
decisions
validations
artifacts
human_review_requests
```

Important function signatures:

```python
def ensure_agent_trace_schema(conn: sqlite3.Connection) -> None: ...

def create_analysis_run(
    conn,
    user_goal,
    *,
    user_id=None,
    project_id=None,
    dataset_id=None,
    status="draft",
    interpreted_goal=None,
    task_type=None,
    task_family=None,
    supported_status=None,
    unsupported_reason=None,
    plan_id=None,
) -> str: ...
```

The rest of the file persists plans, steps, real tool calls, observations, decisions, validations, artifacts, human reviews, status changes, and trace retrieval. It uses UUID text IDs and JSON text columns.

### `backend/main_parts/003_models_helpers.part`

Contains model/data helper behavior used by CV/training flows. It is not an ORM model file. Machine-learning estimators and feature preprocessing are constructed in code.

### Database migration status

There is no migration framework. Schema changes use `CREATE TABLE IF NOT EXISTS`, `PRAGMA table_info`, and conditional `ALTER TABLE ADD COLUMN` calls during initialization.

## 10. Backend API Route Files

All API routes are defined in `backend/main_parts/*.part`. The longest files are summarized below rather than copied in full.

| File | Main responsibility |
|---|---|
| `001_imports_db.part` | App/bootstrap/database/auth foundations |
| `002_auth_integrations.part` | Session/JWT/Google auth integration and auth tables |
| `004_data_quality.part` | CSV/data-quality validation |
| `008_usage_limits.part` | Plan limits, usage counters, structured 429 errors |
| `010_upload.part` | `POST /api/upload` |
| `011_analyze_columns.part` | `POST /api/analyze-columns`, target recommendation |
| `012_set_target.part` | `POST /api/set-target` |
| `020_run_cv.part` | `POST /api/run-cv` |
| `021-023_optuna_*.part` | `POST /api/run-optuna` implementation |
| `030_shap.part` | SHAP routes |
| `031_predictions.part` | Prediction result routes |
| `033_xai_api.part` | Explanation APIs |
| `040_agent_a.part` | Legacy agent endpoint |
| `044_access_control.part` | Ownership/access checks |
| `045_agent_runs.part` | Agent Run CRUD, execution, trace, review, retry, stop |
| `046_llm_status.part` | LLM status route |
| `050_columns_auth_defs.part` | Column/auth request definitions and Google auth route |
| `051_auth_history_debug.part` | Email auth, history/profile/admin users, debug route |
| `052_workspace_projects.part` | Projects, datasets, reports, delete/impact APIs |
| `053_session_foundation.part` | Session and guest-session APIs |
| `055_training_jobs.part` | Training job/list/rerun APIs |
| `060-061_report_*.part` | State and HTML report behavior |
| `070-072_*.part` | Feature info, prediction, deploy, deployed-model APIs |
| `081_report_summary_api.part` | Grounded report summary API |
| `083-086_*.part` | Single/batch prediction and stable deploy APIs |
| `087_validation_summary.part` | Validation summary |
| `088_prediction_tokens.part` | Project token management and project prediction call |
| `097_beta_feedback.part` | Feedback APIs |
| `097_pilot_inquiries.part` | Pilot inquiry APIs |
| `098_monitoring.part` | Health, frontend error ingestion, admin monitoring |
| `098_sample_files.part` | Valid CSV sample downloads/static serving |
| `099_quick_analysis.part` | Quick automatic analysis |
| `099_static_frontend.part` | Built frontend assets and SPA fallback |

Current route inventory:

```text
GET  /api/health
POST /api/upload
POST /api/analyze-columns
POST /api/set-target
POST /api/run-cv
POST /api/run-optuna
POST /api/run-shap
GET  /api/predictions
GET  /api/explain/summary
GET  /api/explain/local/{idx}
POST /api/quick-analysis/start

POST /api/agent-runs
GET  /api/agent-runs
GET  /api/agent-runs/{analysis_run_id}
POST /api/agent-runs/{analysis_run_id}/execute
GET  /api/agent-runs/{analysis_run_id}/trace
GET  /api/agent-runs/{analysis_run_id}/reviews
POST /api/agent-runs/{analysis_run_id}/reviews/{review_id}/resolve
POST /api/agent-runs/{analysis_run_id}/retry-step
POST /api/agent-runs/{analysis_run_id}/stop

POST /api/auth/signup
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/google
GET  /api/session
POST /api/session/guest

GET/POST /api/projects
GET/DELETE /api/projects/{project_id}
GET /api/projects/{project_id}/runs
GET /api/projects/{project_id}/reports
GET /api/projects/{project_id}/jobs
POST /api/projects/{project_id}/runs/{analysis_run_id}/rerun

GET /api/datasets
GET/DELETE /api/datasets/{dataset_id}
GET /api/datasets/{dataset_id}/delete-impact

POST /api/training/jobs
GET  /api/training/jobs/{job_id}
GET  /api/jobs
POST /api/training/jobs/{job_id}/rerun

GET /api/report/html
GET /api/report/summary
GET /api/validation-summary
GET /api/reports

POST /api/predict
POST /api/predict/single
POST /api/predict/batch
POST /api/deploy
GET  /api/deployed

GET/POST /api/projects/{project_id}/prediction-tokens
POST /api/projects/{project_id}/prediction-tokens/{token_id}/revoke
POST /api/projects/{project_id}/prediction-tokens/{token_id}/regenerate
POST /api/predict/{project_id}

GET  /api/me/usage
POST /api/feedback
POST /api/pilot-inquiries
POST /api/monitoring/frontend-error
GET  /api/samples/{file_name}/download
GET  /samples/{file_name}
```

Security note: `/api/debug-env` is registered in `051_auth_history_debug.part`, appears incomplete, and should be removed or admin-protected before public release.

## 11. Frontend Main Page Files

### Route map from `frontend/src/App.jsx`

```jsx
<Route path="/" element={<Home />} />
<Route path="/login" element={<Login />} />
<Route path="/pricing" element={<Pricing />} />

// Protected by the app's auth guard:
<Route path="/dashboard" element={<WorkspaceDashboard />} />
<Route path="/projects" element={<WorkspaceProjects />} />
<Route path="/projects/:projectId" element={<ProjectDetail />} />
<Route path="/projects/:projectId/runs/:runId" element={<RunDetail />} />
<Route path="/jobs" element={<WorkspaceJobs />} />
<Route path="/reports" element={<WorkspaceReports />} />
<Route path="/prediction-apis" element={<WorkspacePredictionApis />} />
<Route path="/settings" element={<WorkspaceSettings />} />
<Route path="/upload" element={<Upload />} />
<Route path="/agent-mode" element={<AgentMode />} />
<Route path="/agent-mode/:agentRunId" element={<AgentRunDetail />} />
<Route path="/model-lab" element={<ModelLab />} />
<Route path="/predict" element={<Predict />} />
<Route path="/deploy" element={<Deploy />} />
<Route path="/xai" element={<XAI />} />
<Route path="/history" element={<History />} />
<Route path="/report" element={<Report />} />
```

### Page responsibilities

| File | Purpose |
|---|---|
| `pages/Home.jsx` | Korean-first public landing and authenticated/unauthenticated CTAs |
| `pages/Login.jsx` | Email/Google login and safe `redirect` handling |
| `pages/Pricing.jsx` | Planned/mock pricing, no payment |
| `pages/Upload.jsx` | Manual/sample CSV selection, validation, project/dataset creation |
| `pages/ModelLab.jsx` | Model comparison/training workflow |
| `pages/AgentMode.jsx` | Dataset-aware goal input, target candidates, Agent Run creation/execution |
| `pages/AgentRunDetail.jsx` | Summary-first run status, review/recovery, results, advanced real trace |
| `pages/Report.jsx` | Current/legacy report view and export behavior |
| `pages/Predict.jsx` | New-data prediction flow |
| `pages/Deploy.jsx` | Prediction API/model readiness and compatibility flow |
| `pages/XAI.jsx` | Explanation view |
| `pages/History.jsx` | Legacy experiment/workspace reuse view |
| `pages/workspace/WorkspaceDashboard.jsx` | Workspace overview and next actions |
| `pages/workspace/WorkspaceProjects.jsx` | Owned projects and history |
| `pages/workspace/ProjectDetail.jsx` | Project overview, datasets/runs/reports/API tabs |
| `pages/workspace/RunDetail.jsx` | Persisted analysis run detail |
| `pages/workspace/WorkspaceJobs.jsx` | Job status/failure/recovery |
| `pages/workspace/WorkspaceReports.jsx` | Report list and honest empty state |
| `pages/workspace/WorkspacePredictionApis.jsx` | API readiness/list and honest empty state |
| `pages/workspace/WorkspaceSettings.jsx` | Account, plan, usage, operational guidance |

Important behavior:

- Protected routes redirect unauthenticated users to `/login?redirect=<path>`.
- Normal landing analysis CTAs do not silently create a guest/demo session.
- Agent Run routes validate IDs and must never navigate to `/agent-mode/undefined`.
- Missing subsection data should render a local Korean recovery card, not crash the entire app.
- Technical trace remains real and available under advanced disclosure.

## 12. Frontend API Client Files

### `frontend/src/api.js`

Core behavior summary:

```javascript
import axios from "axios"

const configuredApiUrl = (import.meta.env.VITE_API_URL || "").trim()
// Normalizes same-origin, backend-origin, and explicit /api configurations.
const apiBaseUrl = configuredApiUrl /* normalized */

const api = axios.create({ baseURL: apiBaseUrl })

// Request interceptor:
// - attaches Authorization: Bearer <token> when authenticated
// - otherwise attaches/uses guest session metadata where applicable

// Response interceptor:
// - clears expired/invalid authentication on 401 where appropriate
// - preserves structured API errors for page-level Korean handling

export function readGuestSession() { ... }
export function ensureGuestSession() { ... }
export function clearStoredAuth() { ... }
export default api
```

No secret or API key should be placed in this file or `VITE_API_URL`.

### `frontend/src/AuthContext.jsx`

Although not explicitly requested as an API client, it is tightly coupled to API auth:

- Restores user/token state.
- Calls `/api/auth/me` to validate authentication.
- Exposes login/logout/current-user state.
- Uses bearer JWT behavior rather than a full enterprise identity/session platform.

### Other API call locations

The project does not use a generated SDK. Pages and components call the shared Axios client directly. Important callers include:

- `Upload.jsx`: upload/analyze/target APIs
- `AgentMode.jsx`: datasets/projects and Agent Run creation/execution
- `AgentRunDetail.jsx`: run/trace/review/retry/stop APIs
- workspace pages: projects/jobs/reports/usage/token APIs
- `Report.jsx`, `Predict.jsx`, `Deploy.jsx`: report/predict/deploy compatibility routes

## Security Review of This Document

- Real OpenAI/Gemini keys: not included
- JWT secret: masked
- Admin password/email: masked
- Google client value: masked
- Railway/GitHub tokens: not included
- Prediction API tokens: not included
- Private QA account emails: not included
- Development fallback credential literals found in source: intentionally omitted

Read the real source files only in a trusted local environment. Do not paste raw `.env`, Railway variables, database rows, or generated token values into chat, issues, docs, or frontend code.
