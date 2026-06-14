# ModelMate 데모 가이드

이 문서는 졸업 발표, 포트폴리오 시연, 베타 사용자 안내에 사용할 수 있는
ModelMate 데모 흐름입니다.

## 데모 목표

ModelMate가 CSV 파일을 단순히 학습시키는 demo가 아니라, 데이터 점검,
타깃 추천, 모델 비교, 근거 기반 보고서, 예측 API 재사용, 프로젝트 기록까지
연결하는 guided AutoML SaaS MVP임을 보여줍니다.

## A. Landing Page

보여줄 것:

- ModelMate의 한 문장 설명
- CSV 분석 시작 CTA
- 샘플로 체험하기 CTA
- 파일럿 문의하기 CTA
- 작동 방식, 주요 기능, 보고서/API 재사용 메시지

설명:

> ModelMate는 CSV 데이터를 업로드하면 데이터 구조 분석, 예측 타깃 추천,
> 모델 비교, 근거 기반 보고서, 예측 API 생성까지 하나의 흐름으로 제공합니다.

## B. Starter Pack

추천 시나리오:

- `고객 이탈 예측`
- 또는 `설비 고장 위험 예측`

설명:

- 샘플 데이터는 기능 시연을 위한 합성 데이터입니다.
- 실제 의사결정에는 실제 CSV로 다시 검증해야 합니다.

## C. New Analysis

보여줄 것:

- CSV/sample 선택 상태
- 데이터 행/열, 결측값, 데이터 종류
- 추천 타깃
- 제외 컬럼/사용 컬럼 안내
- 분석 시작 버튼

핵심 설명:

> 사용자가 무엇을 예측할지 모를 수 있기 때문에 ModelMate가 먼저 데이터
> 구조를 읽고 예측 가능한 타깃 후보를 추천합니다.

## D. Project Detail

보여줄 것:

- Project overview
- latest run
- dataset 상태
- report/API 연결 상태
- run timeline 또는 trace placeholder
- failure recovery 안내가 있다면 짧게 설명

핵심 설명:

> 분석 결과가 화면에서 사라지는 것이 아니라 프로젝트와 실행 기록으로
> 저장되어 다시 열 수 있습니다.

## E. Report

보여줄 것:

- 모델 비교 결과
- 주요 metric
- best model
- data quality warning
- leakage warning
- XAI/explanation summary
- limitations
- recommended next action

핵심 설명:

> 보고서는 모델 점수만 보여주는 것이 아니라, 어떤 데이터와 검증 결과에
> 기반했는지 함께 보여줍니다.

## F. Prediction API

보여줄 것:

- API readiness
- token 생성/상태
- token 전체 값은 한 번만 표시된다는 warning
- endpoint
- cURL/Python 예시

주의:

- 실제 token 전체 값을 발표 화면에 오래 노출하지 않습니다.
- token은 필요하면 재발급하거나 비활성화할 수 있다고 설명합니다.

## G. Ops Readiness

보여줄 것:

- Jobs page: queued/running/succeeded/failed 상태
- Settings: usage limits
- request ID/error ID 개념
- Feedback form
- Pilot inquiry form

핵심 설명:

> 실제 SaaS MVP처럼 실패 복구, 사용량 상태, 오류 추적, 피드백 수집 흐름까지
> 준비했습니다. 단, 결제와 enterprise 기능은 아직 구현하지 않았습니다.

## H. Closing

마무리 문장:

> ModelMate의 핵심은 단순한 모델 추천이 아니라, CSV 데이터가 분석, 보고서,
> API로 재사용되는 전체 제품 흐름을 설계한 것입니다.

## 3분 데모 스크립트

1. 랜딩 페이지에서 한 문장 포지셔닝 설명
2. starter pack 선택
3. 추천 타깃과 데이터 점검 결과 설명
4. 모델 비교 결과와 best model 설명
5. report에서 warning/evidence/limitations 설명
6. prediction API tab에서 token 안전 안내와 endpoint 예시 설명
7. 프로젝트 저장과 재실행 가능성을 마무리로 설명

## 5분 데모 스크립트

1. 랜딩 페이지와 제품 흐름 설명
2. starter pack은 합성 데이터임을 설명
3. New analysis에서 데이터 구조 분석과 타깃 추천 설명
4. 모델 비교와 metric 설명
5. Project detail에서 runs/report/API/dataset tab 설명
6. Report에서 trust panel, XAI, limitations 설명
7. Prediction API에서 token/endpoint/cURL/Python 예시 설명
8. Jobs/Settings에서 usage, monitoring, feedback, pilot inquiry 설명
9. known limitations와 roadmap 설명

## Live Deployment Fallback

Railway 배포가 열리지 않으면:

1. 로컬 backend 실행

```bash
uvicorn backend.main:app --reload
```

2. 로컬 frontend 실행

```bash
cd frontend
npm run dev
```

3. screenshots fallback 사용

캡처해야 할 화면은 [screenshot-checklist.md](screenshot-checklist.md)를 참고합니다.

## 발표 전 확인

- 민감정보가 들어간 CSV를 사용하지 않기
- token 전체 값 노출하지 않기
- 샘플 데이터는 합성 데이터라고 말하기
- 실제 billing/enterprise 기능이 구현된 것처럼 말하지 않기
- 실패 상황이 생기면 request ID/error ID와 recovery 안내를 보여주기
