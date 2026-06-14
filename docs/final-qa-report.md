# Final QA Report

Date: 2026-06-14

## 요약

ModelMate PR-25 최종 QA를 완료했습니다. 이번 작업은 새 기능 개발이 아니라
졸업 발표, 포트폴리오, beta demo 전에 전체 흐름을 검증하고 결과를 문서화하는
QA 작업입니다.

현재 상태: 최종 demo review 준비 완료.

이번 PR에서 backend API redesign, billing, enterprise 기능, TypeScript migration,
대규모 UI 변경은 하지 않았습니다.

## Build Result

| 항목 | 결과 | 비고 |
| --- | --- | --- |
| Backend compile | Pass | `python -m compileall backend` |
| Frontend build | Pass | 명시적으로 Vite build 실행 |
| Local release QA wrapper | Pass | 16 pass, 1 skipped |
| Railway product smoke | Pass | 15 pass, 0 fail |

Frontend build 참고:
Vite가 기존 main bundle size warning을 표시합니다. 현재는 build 실패가 아닌
경고이며, 이후 code splitting으로 개선할 수 있습니다.

## Smoke Test Result

로컬 서버 기준 실행:

```bash
python scripts/run_release_qa.py --base-url http://127.0.0.1:8000 --skip-training
```

결과:

- total: 17
- passed: 16
- skipped: 1
- failed: 0

skipped 항목:

- `training_benchmark`: 최종 QA 시간을 줄이기 위해 `--skip-training`으로 의도적으로
  제외했습니다. upload, target selection, auth, ownership, jobs, dataset delete,
  prediction API token metadata, usage limits, monitoring, feedback, pilot inquiry,
  public route smoke는 통과했습니다.

Railway 배포 기준 실행:

```bash
python scripts/run_product_smoke.py --base-url https://web-production-5d6fa.up.railway.app --skip-training
```

결과:

- total: 15
- passed: 15
- failed: 0

## Checked Flows

### Public Flow

- Landing route 로드 확인
- Pricing route 로드 확인
- Guest demo session 시작 확인
- Starter pack metadata 유효성 확인
- Pilot inquiry smoke 통과

### New Analysis Flow

- Upload validation QA 통과
- invalid CSV가 friendly failure를 반환하는지 확인
- sample CSV upload 확인
- target recommendation / selection path 확인
- slow AutoML training benchmark는 이번 final QA에서 skip

### Workspace Flow

- Auth smoke 통과
- User-owned project / ownership smoke 통과
- Project history smoke 통과
- Background jobs smoke 통과
- Failure recovery smoke 통과
- Dataset delete / retention smoke 통과
- Usage limits smoke 통과

### Report Flow

- Report summary endpoint 접근 가능
- Report export endpoint 접근 가능
- active report context가 없을 때도 controlled response를 반환함
- docs와 UI는 report를 guaranteed decision이 아니라 grounded/evidence-based
  report로 설명함

### Prediction API Flow

- Prediction token smoke 통과
- Token metadata list는 owner-protected
- invalid project token은 거부됨
- model/data readiness 부족 시 friendly response 반환
- list endpoint는 full plaintext token을 반환하지 않음

### Ops Flow

- Monitoring smoke 통과
- invalid prediction API failure가 fake full token을 echo하지 않음
- Feedback smoke 통과
- authenticated/guest feedback 제출 확인
- admin/dev feedback, monitoring, pilot inquiry review endpoint 보호 확인
- Pilot inquiry smoke 통과

## Korean UI Copy Verification

Frontend 검색 결과, target phrase 기준으로 blocking generic English user-facing
copy는 발견되지 않았습니다. 남아 있는 English는 API, token, request ID,
error ID, cURL, Python, route path, function name, component name 같은 허용된
기술 용어 또는 code-facing 문자열입니다.

## Safety / Privacy Verification

Smoke test와 문서 검토 기준으로 확인한 내용:

- Prediction API token list에서 full token을 노출하지 않음
- invalid token smoke가 fake token 값을 echo하지 않음
- feedback submission이 민감한 token-like 값을 반환하지 않음
- pilot inquiry는 invalid email을 거부하고 민감정보/결제정보 입력 금지를 안내함
- admin monitoring, feedback, pilot inquiry review endpoint가 보호됨
- sample data는 합성 데이터라고 문서화됨
- payment는 연결되어 있지 않다고 문서화됨
- prediction API, monitoring, feedback, pilot ops는 MVP/manual foundation으로 설명됨

## Documentation Verification

확인한 문서:

- `README.md`
- `docs/README.md`
- `docs/demo-guide.md`
- `docs/portfolio-case-study.md`
- `docs/final-release-checklist.md`
- `docs/screenshot-checklist.md`
- `docs/architecture-overview.md`
- `docs/product-roadmap.md`
- `docs/known-limitations.md`
- `docs/deployment-notes.md`

Markdown link check:

- missing links: 0

Claim check:

- active real billing, real paid users, guaranteed accuracy, completed enterprise
  MLOps, full RBAC/SSO, production deployment orchestration claim은 발견되지 않음

## Known Issues / Limitations

- slow training benchmark는 이번 final QA run에서 skip했습니다.
- browser screenshot tool을 이용한 visual responsive QA는 이번 pass에서 수행하지
  않았습니다. public portfolio capture 전 `docs/screenshot-checklist.md` 기준으로
  직접 캡처 확인이 필요합니다.
- Vite bundle size warning이 남아 있습니다.
- ModelMate는 MVP입니다. real billing, full RBAC/SSO, automatic retraining,
  full MLOps deployment orchestration, enterprise compliance claim은 없습니다.

## Deployment Notes

- Railway public product smoke는
  `https://web-production-5d6fa.up.railway.app` 기준으로 통과했습니다.
- push 직후 Railway frontend bundle 반영이 늦을 수 있으므로, public demo 직전에는
  최신 bundle이 제공되는지 한 번 더 확인하세요.
- 발표 중 full token, secrets, raw CSV contents, payment information을 노출하지
  마세요.

## Final Demo Readiness

Status: ready for final demo review.

추천 수동 마무리:

1. `docs/screenshot-checklist.md` 기준으로 스크린샷 캡처
2. Railway URL에서 `docs/demo-guide.md`의 3분 demo path 직접 클릭
3. 로컬 fallback 준비

```bash
uvicorn backend.main:app --reload
cd frontend
npm run dev
```

4. 발표 중 full prediction API token과 실제 개인정보를 노출하지 않기
## PR-26 Workspace Data Integration Check

PR-26에서는 분석 완료 후 workspace 화면이 실제 저장 데이터와 연결되는지 확인했습니다.

확인 기준:

- 로그인 사용자가 CSV를 업로드하면 dataset/project metadata가 생성됩니다.
- `/api/run-cv`로 완료된 일반 분석도 workspace Jobs에서 볼 수 있는 완료 기록으로 남습니다.
- Projects/Dashboard는 최근 실행, best model, target, dataset 요약을 같은 project 기준으로 표시합니다.
- Reports는 저장된 analysis run metadata를 기반으로 report metadata를 표시합니다.
- Prediction APIs 화면은 project의 모델 준비 상태 또는 준비 전 안내를 표시합니다.
- guest demo mode는 private workspace 저장과 분리되어 유지됩니다.

추가 smoke:

```bash
python scripts/run_workspace_integration_smoke.py --base-url http://localhost:8000
```

이 smoke는 로그인, CSV 업로드, target 설정, AutoML 분석, projects/jobs/reports/datasets/prediction API metadata 조회를 한 번에 확인합니다.
