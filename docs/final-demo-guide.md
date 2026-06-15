# ModelMate 최종 데모 가이드

ModelMate는 CSV 데이터를 업로드하면 데이터 구조 분석, 예측 타깃 추천, 모델 비교, 근거 기반 보고서, 예측 API 생성까지 하나의 흐름으로 제공하는 guided AutoML SaaS MVP입니다.

이 문서는 졸업 발표, 포트폴리오 시연, 베타 데모에서 사용할 최종 시연 순서를 정리합니다.

## 1. 권장 데모 흐름

1. 대시보드 열기
   - 보여줄 것: 제품 가치 문장, `CSV 올리기`, `빠른 자동 분석 시작`, `목표 기반 분석 시작`
   - 말할 것: “ModelMate는 CSV 분석을 프로젝트, 보고서, API까지 이어지는 워크스페이스로 관리합니다.”

2. CSV 업로드
   - 버튼: `CSV 올리기`
   - 보여줄 것: CSV 업로드 또는 샘플 선택 흐름
   - 말할 것: “비전문가도 파일을 올리면 먼저 데이터 구조와 예측 가능성을 확인할 수 있습니다.”

3. 목표 기반 분석 시작
   - 버튼: `목표 기반 분석 시작`
   - 보여줄 것: 선택된 CSV 카드, 추천 분석 목표, 예측할 값 추천
   - 말할 것: “Agent Mode는 바로 실행하지 않고, 어떤 값을 예측할지 먼저 정리합니다.”

4. Agent Run 생성과 실행
   - 보여줄 것: `분석 실행 만들기`, `분석 시작`, 사용자 확인 카드가 뜨는 경우
   - 말할 것: “자동으로 결정하기 애매한 지점은 사용자 확인을 거치도록 설계했습니다.”

5. Agent Run Detail
   - 보여줄 것: 요약 hero, 예측할 값, 예측 성능, 중요 요인, 주의사항, 다음 행동
   - 말할 것: “기술 trace는 기본 화면이 아니라 고급 실행 기록에 보관됩니다.”

6. 보고서
   - route: `/report` 또는 `/reports`
   - 보여줄 것: 핵심 요약, 중요 요인, 예측 성능, 주의사항, 다음 행동
   - 말할 것: “보고서는 점수 나열이 아니라 의사결정 보조 문서로 보이도록 구성했습니다.”

7. 예측 API
   - route: `/prediction-apis`
   - 보여줄 것: API 연결 상태 요약, token 상태, 요청 예시
   - 말할 것: “결과를 화면에서 끝내지 않고 재사용 가능한 API로 이어갈 수 있습니다. 단, 현재는 MVP 수준의 token/사용량 관리입니다.”

8. 운영 준비 화면
   - route: `/jobs`, `/settings`
   - 보여줄 것: 작업 상태, 실패 복구 안내, 사용량, error ID/request ID, 피드백/파일럿 문의
   - 말할 것: “상용 SaaS MVP처럼 실패와 사용량, 피드백 흐름까지 최소 구조를 갖췄습니다.”

## 2. 추천 샘플 데이터

현재 repository에는 최종 데모에 쓸 수 있는 작은 샘플 CSV가 준비되어 있습니다.

- `frontend/public/samples/customer_churn_demo.csv`
  - 목적: 고객 이탈 예측
  - 보여줄 점: 명확한 분류 타깃, 고객 유지 전략 설명

- `frontend/public/samples/equipment_failure_demo.csv`
  - 목적: 설비 고장 위험 예측
  - 보여줄 점: 고장/불량 위험 우선 점검 흐름

- `frontend/public/samples/sales_demand_demo.csv`
  - 목적: 매출/수요 예측
  - 보여줄 점: 회귀 또는 수요 예측 흐름

- `sample_data/public_bike_signup_demo.csv`
  - 목적: 공공/행정 데이터에서 예측 타깃 검토
  - 보여줄 점: 바로 예측할 만한 타깃이 불명확할 때의 정직한 안내

의료/당뇨병 스타일 CSV를 사용하는 경우, 화면에서 “의료 진단을 대체하지 않는다”는 주의 문구가 보이는지 확인합니다.

## 3. 스크린샷 체크리스트

포트폴리오와 GitHub README용으로 다음 화면을 캡처합니다.

- 대시보드: 제품 가치 문장과 주요 CTA
- CSV 업로드: 파일 선택 또는 샘플 선택
- 목표 기반 분석 첫 화면: 선택 CSV, 추천 목표, 타깃 추천
- 사용자 확인 카드: 타깃 선택 또는 검토 필요 상태
- Agent Run Detail: summary-first 결과 화면
- 보고서: 핵심 요약, 중요 요인, 주의사항
- 예측 API: readiness summary와 요청 예시
- 고급 실행 기록: 접힌 상태와 펼친 상태
- 작업/설정: 실패 복구, 사용량, error ID/request ID

주의: token 전체 값, 개인 CSV 원본, 민감정보, 실제 secret은 캡처하지 않습니다.

## 4. 라이브 배포 실패 시 대체 시나리오

1. 로컬에서 백엔드와 프론트를 실행합니다.
2. 샘플 CSV를 사용해 업로드부터 보고서까지 시연합니다.
3. Railway 배포가 지연된 경우 “GitHub에는 반영되었고 배포 번들 반영을 기다리는 상태”라고 설명합니다.
4. 캡처해 둔 스크린샷으로 Agent trace, 보고서, 예측 API 흐름을 설명합니다.

## 5. 데모 전 최종 확인

- `python -m compileall backend`
- `cd frontend && npm run build`
- 대시보드 CTA가 깨진 route로 가지 않는지 확인
- `/agent-mode`에서 `/agent-mode/undefined`로 이동하지 않는지 확인
- `/report`, `/reports`, `/prediction-apis` 빈 상태가 자연스러운지 확인
- 고급 trace 기록은 남아 있지만 기본 화면을 압도하지 않는지 확인
- Korean-first copy가 유지되는지 확인

