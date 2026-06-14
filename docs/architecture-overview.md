# ModelMate Architecture Overview

이 문서는 ModelMate의 현재 SaaS MVP 구조를 실용적으로 요약합니다.

## Frontend

- React/Vite JavaScript
- Public landing, pricing/pilot 안내, auth 화면
- Workspace shell: dashboard, projects, jobs, reports, prediction APIs, settings
- Project detail: overview, runs, report, API, dataset, settings
- Starter pack gallery와 upload/new analysis flow
- Feedback dialog와 pilot inquiry dialog

프론트는 TypeScript로 migration하지 않았고, 기존 React/Vite 구조를 유지합니다.

## Backend

- Python/FastAPI
- `backend/main.py`와 `backend/main_parts` 기반 endpoint 구성
- 기존 AutoML pipeline을 유지하면서 agent/tool/report/prediction API 관련 adapter를 추가
- Auth-lite/session, ownership, usage limit, monitoring, feedback, pilot inquiry, dataset lifecycle endpoint 포함

## Storage

현재 MVP는 repo 구조에 맞춘 lightweight metadata/persistence 방식을 사용합니다.
enterprise database, feature store, audit log platform은 구현하지 않았습니다.

주요 저장 대상:

- users/sessions
- projects
- datasets
- analysis runs
- training jobs
- reports/evidence
- saved/deployed model metadata
- prediction API token metadata
- usage state
- monitoring/error records
- feedback/pilot inquiries

## Analysis Pipeline

핵심 흐름:

1. CSV 업로드
2. data profile
3. schema validation
4. target recommendation
5. leakage check
6. AutoML training
7. evaluation
8. XAI/fallback explanation
9. validation/report writer
10. deployment readiness/prediction API reuse

기존 AutoML 기능은 삭제하지 않고 tool adapter와 report/evidence 구조로 감쌌습니다.

## Project / Run / Report Model

Project는 사용자가 다시 열 수 있는 주요 단위입니다.

- project: 이름, user ownership, dataset/report/API 연결 상태
- run: target, task type, model result, job status, trace/evidence 요약
- report: metric, warnings, XAI, limitations, next action
- dataset: metadata, deletion state, retention note

## Prediction API Token Flow

- project owner가 token 생성
- plaintext token은 생성/재발급 시 한 번만 표시
- 목록에는 token prefix, status, usage count만 표시
- `POST /api/predict/{project_id}`에서 bearer token 또는 `X-ModelMate-Token` 사용
- deleted dataset/model unavailable 상태에서는 friendly error 반환

이는 MVP-level reuse API foundation이며 enterprise API gateway가 아닙니다.

## Usage Limits

Free/Pro/Team plan flag와 lightweight usage guardrail을 제공합니다.
실제 결제, quota billing, payment integration은 구현하지 않았습니다.

## Monitoring / Error Reporting

- request ID/error ID 표시
- frontend error reporting endpoint
- admin/dev monitoring endpoint
- smoke test에서 friendly error와 token redaction 확인

full observability platform, alerting, SOC2/ISO compliance는 범위 밖입니다.

## Feedback / Pilot Inquiry

- beta feedback capture
- admin/dev feedback review
- paid pilot inquiry/manual sales ops
- 실제 결제, CRM, subscription lifecycle은 구현하지 않음

## Railway Deployment

- Railway/Nixpacks/Procfile 기반 배포
- frontend build output을 backend가 제공하는 구조
- 배포 확인은 smoke test와 수동 demo flow로 진행

## Current Limitations

- full enterprise AutoML/MLOps 아님
- 실제 결제 없음
- full RBAC/SSO/team workspace 없음
- automatic retraining 없음
- feature store/connectors 없음
- 일부 trace/log persistence는 MVP 수준
