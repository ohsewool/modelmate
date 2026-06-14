# ModelMate

ModelMate는 CSV 데이터를 업로드하면 데이터 구조 분석, 예측 타깃 추천,
모델 비교, 근거 기반 보고서, 예측 API 생성까지 하나의 흐름으로 제공하는
guided AutoML SaaS MVP입니다.

English portfolio summary:
ModelMate turns CSV data into explainable predictions, grounded reports, and
reusable APIs through a guided AI analyst workflow.

## Live Demo

- Railway: https://web-production-5d6fa.up.railway.app/
- GitHub: https://github.com/ohsewool/-
- Branch: `main`

## What It Does

ModelMate는 비전문가도 CSV 기반 예측 분석 흐름을 이해하고 다시 사용할 수
있도록 설계한 웹 서비스입니다. 단순히 모델을 학습하는 데서 끝나지 않고,
데이터 점검, 타깃 추천, 모델 비교, 설명 가능한 결과, 보고서, 예측 API,
프로젝트 저장, 실행 기록, 사용량 상태, 피드백 수집까지 SaaS MVP 관점으로
연결합니다.

## Key Features

- CSV/TXT/TSV 업로드와 데이터 품질 검증
- 데이터 프로파일링, 스키마 검증, 타깃 변수 추천, leakage 점검
- 분류/회귀 모델 비교와 선택
- 근거 기반 보고서와 HTML/Markdown/JSON export 흐름
- SHAP 또는 fallback 기반 설명 가능성 요약
- 프로젝트, 실행 기록, 보고서, 데이터셋 재사용
- 프로젝트 단위 예측 API token과 endpoint 예시
- Auth-lite, guest demo mode, user-owned project foundation
- 사용량 한도, 작업 상태, 실패 복구 안내
- 데이터셋 삭제/보관정책 foundation
- 모니터링, request ID/error ID, 피드백, 파일럿 문의 흐름
- 합성 샘플 데이터 기반 starter pack

## Product Workflow

```text
CSV 업로드
→ 데이터 구조 분석
→ 예측 타깃 추천
→ 제외 컬럼/leakage 점검
→ 모델 비교
→ 실행 기록과 trust/evidence 요약
→ 근거 기반 보고서
→ 예측 API 재사용
→ 프로젝트 저장/재실행
```

## Screenshots To Add

포트폴리오 공개 전 다음 화면을 캡처하세요. 자세한 기준은
[docs/screenshot-checklist.md](docs/screenshot-checklist.md)를 참고합니다.

- 랜딩 페이지
- starter pack gallery
- CSV 업로드/타깃 추천
- dashboard/projects
- project detail/run timeline
- report/export
- prediction API token 관리
- jobs/settings/usage
- feedback/pilot inquiry

## Architecture

- Frontend: React/Vite JavaScript
- Backend: Python/FastAPI
- ML: pandas, scikit-learn 계열 AutoML 파이프라인
- UI: SaaS workspace shell, project/run/report 중심 화면
- Deployment: Railway, Nixpacks/Procfile 기반
- QA: Python smoke scripts, upload validation QA, frontend build

자세한 구조는 [docs/architecture-overview.md](docs/architecture-overview.md)를
참고하세요.

## Local Setup

### Backend

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Build

```bash
cd frontend
npm run build
```

### QA Commands

```bash
python -m compileall backend
python scripts/run_product_smoke.py --base-url http://localhost:8000
python scripts/run_release_qa.py --base-url http://localhost:8000
```

일부 smoke test는 서버가 실행 중일 때만 동작합니다. 더 자세한 명령은
[docs/automated-qa.md](docs/automated-qa.md)를 참고하세요.

## Environment Variables

실제 secret은 GitHub에 커밋하지 않습니다.

- `PORT`: Railway가 제공하는 서버 포트
- `GOOGLE_CLIENT_ID`: OAuth 설정을 사용하는 경우에만 필요
- LLM/provider key: 현재 기본 demo flow에는 필수 아님

배포 기준은 [docs/deployment-notes.md](docs/deployment-notes.md)와
[docs/deployment-checklist.md](docs/deployment-checklist.md)를 참고합니다.

## Demo Scenarios

1. 랜딩 페이지에서 제품 포지셔닝 설명
2. starter pack에서 `고객 이탈 예측` 또는 `설비 고장 위험 예측` 선택
3. CSV/sample 분석 준비와 타깃 추천 확인
4. 모델 비교 실행
5. project detail, run timeline, report 확인
6. 예측 API tab에서 token 안전 안내와 endpoint 예시 확인
7. jobs/settings에서 사용량, request ID/error ID, 피드백/파일럿 문의 확인

발표용 흐름은 [docs/demo-guide.md](docs/demo-guide.md)에 정리되어 있습니다.

## Documentation

문서 인덱스는 [docs/README.md](docs/README.md)를 참고하세요.

중요 문서:

- [포트폴리오 케이스 스터디](docs/portfolio-case-study.md)
- [데모 가이드](docs/demo-guide.md)
- [최종 릴리즈 체크리스트](docs/final-release-checklist.md)
- [제품 로드맵](docs/product-roadmap.md)
- [알려진 한계](docs/known-limitations.md)
- [Prediction API](docs/prediction-api.md)
- [Privacy](docs/privacy.md)
- [Security notes](docs/security-notes.md)

## Portfolio Notes

이 프로젝트의 핵심은 단순히 머신러닝 모델을 학습하는 것이 아니라, CSV
데이터가 실제 제품 흐름 안에서 분석·보고서·API로 재사용되는 과정을 설계하고
구현한 것입니다. 이를 위해 데이터 업로드, 타깃 추천, 모델 비교, 설명 가능한
결과, 프로젝트 저장, 실행 기록, 예측 API, 사용량 제한, 오류 추적, 피드백
수집까지 SaaS MVP 관점의 기능을 단계적으로 확장했습니다.

## Limitations

ModelMate는 현재 guided CSV predictive analysis MVP입니다.

- enterprise AutoML 또는 full MLOps 플랫폼이 아닙니다.
- 실제 결제/billing은 구현되어 있지 않습니다.
- team workspace, SSO, full RBAC는 아직 구현되지 않았습니다.
- 자동 재학습, feature store, production deployment orchestration은 범위 밖입니다.
- 샘플 데이터는 합성 데이터입니다.
- 모델 품질은 업로드된 데이터 품질과 검증 결과에 따라 달라집니다.
- Prediction API와 모니터링은 MVP 수준 foundation입니다.

자세한 내용은 [docs/known-limitations.md](docs/known-limitations.md)를 참고하세요.

## Roadmap

현재 MVP는 CSV 예측 분석, 프로젝트 재사용, 보고서, 예측 API, 운영/피드백
foundation에 집중합니다. 이후 개선 후보는 richer report export, 더 나은
run trace persistence, starter pack 확장, mobile UX 개선, team workspace,
billing, connector, scheduled retraining 등입니다.

자세한 계획은 [docs/product-roadmap.md](docs/product-roadmap.md)에 정리되어
있습니다.

## Status

Portfolio / graduation presentation / beta demo ready package.

ModelMate는 현재 상용 SaaS MVP 방향의 포트폴리오 프로젝트이며, production-grade
enterprise security, billing, full MLOps, guaranteed prediction accuracy를
보장하지 않습니다.
