# ModelMate

ModelMate는 CSV 데이터를 업로드하면 데이터 구조 분석, 예측 타깃 추천, 모델 비교, 근거 기반 보고서, 예측 API 준비도까지 하나의 흐름으로 제공하는 Korean-first Agentic AutoML SaaS MVP입니다.

English summary: ModelMate turns CSV data into explainable predictions, grounded reports, and reusable APIs through a guided AI analyst workflow.

## Live Demo

- Railway: https://web-production-5d6fa.up.railway.app/
- GitHub: https://github.com/ohsewool/-
- Branch: `main`

## What It Does

ModelMate는 비전문가도 CSV 기반 예측 분석 흐름을 이해하고 재사용할 수 있도록 만든 졸업 프로젝트이자 포트폴리오 서비스입니다. 단순히 모델을 학습하는 데서 끝나지 않고, 사용자의 분석 목표를 계획으로 바꾸고, tool call, observation, decision, validation, human review, artifact 기록을 남기는 방향으로 확장했습니다.

## Key Features

- CSV 업로드와 데이터 구조 분석
- schema validation, target recommendation, leakage check
- classification/regression 모델 비교와 AutoML training adapter
- Agent Mode: goal -> plan -> tool call -> observation -> decision -> validation -> artifact
- Agent Run Detail에서 persisted trace 확인
- human review/recovery foundation
- grounded report preview/export
- project/run/report/workspace reuse
- project-scoped prediction API token/readiness
- usage limits, monitoring/error ID, feedback/pilot inquiry foundation
- starter pack/sample dataset demo flow

## Product Workflow

```text
CSV 업로드 또는 샘플 선택
-> 분석 목표 입력
-> Agent Run / Plan 생성
-> 데이터 점검과 타깃 추천
-> leakage 검토
-> AutoML 모델 비교
-> 성능 평가와 XAI 요약
-> validation / human review
-> grounded report
-> prediction API readiness
```

## Agentic AutoML Workflow

ModelMate의 Agent Mode는 현재 tabular CSV predictive analysis에 집중합니다.

- PR-27: goal-first Agent Run과 deterministic plan 저장
- PR-28: tool handler 실행과 trace record 저장
- PR-29: trace/decision UI
- PR-30: human review/recovery
- PR-31: optional planner interface와 deterministic fallback
- PR-32: portfolio/demo/docs polish

Agent Mode는 “완전 자율 데이터 과학자”를 의미하지 않습니다. 지원하지 않는 목표나 위험한 분석은 제한, 경고, human review 또는 unavailable 상태로 정직하게 표시합니다.

## Demo Scenario

1. Landing page에서 ModelMate의 CSV 예측 분석 흐름을 소개합니다.
2. starter pack 또는 샘플 CSV로 분석을 시작합니다.
3. 한국어 분석 목표를 입력합니다.
4. Agent Run과 Plan이 생성되는 것을 확인합니다.
5. pipeline 실행 후 Run Detail을 엽니다.
6. tool calls, observations, decisions, validations, artifacts를 확인합니다.
7. 모델 비교, report, prediction API readiness를 보여줍니다.
8. human review/recovery가 필요한 상황은 경고와 다음 행동으로 설명합니다.

## Tech Stack

- Frontend: React, Vite, JavaScript
- Backend: FastAPI, Python
- Data/ML: pandas, scikit-learn 기반 pipeline adapters
- Deployment: Railway
- QA: Python smoke scripts, Vite build

## Local Setup

Backend:

```bash
python -m compileall backend
uvicorn backend.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run build
npm run dev
```

Release QA examples:

```bash
python scripts/run_product_smoke.py --base-url http://localhost:8000
python scripts/run_release_qa.py --base-url http://localhost:8000
```

## Environment Variables

실제 secret은 GitHub에 커밋하지 않습니다. Railway 또는 로컬 `.env`에서 관리합니다.

- `MODEL_MATE_LLM_PLANNER_ENABLED`: optional planner interface 사용 여부
- `MODEL_MATE_LLM_PLANNER_RESPONSE`: 개발/검증용 schema-constrained planner response
- 기타 배포 변수는 `docs/deployment-notes.md`와 `docs/deployment-checklist.md`를 참고합니다.

## Documentation

- `docs/README.md`: 문서 인덱스
- `docs/agent-mode-mvp.md`: Agent Mode 범위와 한계
- `docs/architecture-overview.md`: 시스템 구조 요약
- `docs/demo-guide.md`: 발표/시연 흐름
- `docs/final-release-checklist.md`: 최종 릴리스 체크리스트
- `docs/final-qa-report.md`: 최종 QA 결과
- `docs/portfolio-summary.md`: 포트폴리오 요약
- `docs/known-limitations.md`: 알려진 한계
- `docs/prediction-api.md`: 예측 API 사용 안내

## Current Limitations

- ModelMate는 full enterprise AutoML 또는 full MLOps 플랫폼이 아닙니다.
- 현재 핵심 범위는 tabular CSV 기반 classification/regression 예측 분석입니다.
- time-series는 명확한 날짜/예측 기간 정보가 있을 때 제한적으로만 다룹니다.
- SHAP/feature importance는 feature contribution 설명이며 causality를 의미하지 않습니다.
- LLM planner는 optional이며, 기본 흐름은 deterministic planner로 동작합니다.
- prediction API, monitoring, feedback, pilot inquiry는 MVP 수준의 기반 기능입니다.
- billing, enterprise SSO, full RBAC, feature store, 자동 재학습 루프는 아직 구현 범위 밖입니다.

## Portfolio Notes

이 프로젝트의 핵심은 단순히 머신러닝 모델을 학습하는 것이 아니라, CSV 데이터가 실제 제품 흐름 안에서 분석, 보고서, API로 재사용되는 과정을 설계하고 구현한 것입니다. 이를 위해 데이터 업로드, 타깃 추천, 모델 비교, 설명 가능한 결과, 프로젝트 저장, 실행 기록, 예측 API, 사용량 제한, 오류 추적, 피드백 수집까지 SaaS MVP 관점의 기능을 단계적으로 확장했습니다.

## Roadmap

Near-term:

- 더 안정적인 run trace persistence
- report export 품질 개선
- prediction API 예시 강화
- starter pack 확장
- 모바일/반응형 UX 개선

Future possibilities:

- team workspace
- billing
- connectors
- scheduled retraining
- advanced deployment
- SSO/RBAC
- audit logs

이 항목들은 현재 구현 완료 기능이 아니라 향후 상용화 가능성입니다.
