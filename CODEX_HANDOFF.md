# ModelMate Codex Handoff

## 현재 기준

- 배포 URL: https://web-production-5d6fa.up.railway.app/
- GitHub: https://github.com/ohsewool/-
- Branch: `main`
- 최신 확인 커밋: `dfea369 feat: add api readiness panel`
- 최신 배포 번들: `assets/index-VfRge5CU.js`
- 11월 졸업프로젝트 방향: 고정 샘플 데모가 아니라 임의 CSV를 즉석 업로드해 판단, 학습, 설명, 예측, API 공유까지 이어지는 범용 AutoML SaaS처럼 보이게 만든다.

## 핵심 데모 스토리

1. 사용자가 CSV를 업로드한다.
2. ModelMate가 데이터 분야, 맞힐 값 후보, 예측 목적, 제외할 컬럼, 준비도를 판단한다.
3. 여러 모델을 비교하고 데이터에 맞는 모델을 고른다.
4. AI 에이전트가 모델 선택 이유, 위험 메모, 다음 행동, 발표용 결론을 보여준다.
5. 결과 요약과 이유 보기에서 비전공자도 이해할 수 있게 정리한다.
6. 새 데이터 예측과 공유 API로 모델을 실제 서비스처럼 재사용한다.
7. 로그인/작업공간/관리자 화면에서 데이터셋, 실험, 저장 모델의 연속성을 보여준다.

## 최근 완료된 고도화

- 업로드 화면
  - 즉석 CSV 판단 카드
  - 분석 준비도 점검 패널
  - 빈 파일, 단일 열, 상수값, 긴 문장형 파일, 중복 컬럼, 컬럼명 없음, 날짜만 있는 파일 친절한 거절
- AI 에이전트
  - 다음 행동 보드
  - 모델 추천 이유, 위험 메모, 판단 신뢰도, 보고서/이유/예측/API 바로가기
- 작업공간
  - 실험 상세에서 다시 분석, 새 예측, API 공유, 결과 요약으로 이어지는 재사용 액션
- 결과 요약
  - 의사결정 요약
  - CSV 업로드부터 업무 활용까지 이어지는 서비스 흐름 패널
- 공유/API
  - API 공개 준비도 패널
  - 공유 URL, 예측 테스트, 운영 관리, 외부 서비스 활용 시나리오
- QA
  - 풀 QA 하네스에 도메인, 업로드, 워크스페이스, 공유 API 예측, 프론트 빌드, 학습 벤치마크 포함

## 최신 검증

- `python scripts/run_full_qa.py`: pass
- `python scripts/run_full_qa.py --skip-slow`: pass
- `python scripts/run_workspace_flow_qa.py`: 데이터셋 저장, 실험 기록, 저장 모델, 버전, 저장 상태, 공유 API 예측 pass
- Railway 확인: 공개 URL 200, 최신 번들 `assets/index-VfRge5CU.js`
- 최신 결과 파일:
  - `FULL_QA_RESULTS.md`
  - `full_qa_results.json`
  - `workspace_flow_qa_results.json`

## 중요한 파일

- 백엔드 진입점: `backend/main.py`
- 백엔드 파트: `backend/main_parts/*.py`
- 업로드 검증: `backend/main_parts/004_data_quality.py`, `010_upload.py`
- 도메인/타겟 추론: `backend/main_parts/011_analyze_columns.py`
- 에이전트 판단: `backend/main_parts/039_agent_insights.py`, `040_agent_a.py`
- 작업공간/관리자: `051_auth_history_debug.py`, `052_workspace_projects.py`, `053_admin_summary.py`
- 리포트 API/HTML: `080_report_summary_helpers.py`, `081_report_summary_api.py`, `060_state_report_a.py`, `061_report_b.py`
- 안정 예측/API 공유: `082_predict_single_helpers.py`, `083_predict_single_api.py`, `084_predict_batch_api.py`, `085_deploy_stable_helpers.py`, `086_deploy_stable_api.py`
- 업로드 UI: `frontend/src/pages/Upload.jsx`, `frontend/src/components/upload/*`
- 에이전트 UI: `frontend/src/pages/Agent.jsx`, `frontend/src/components/agent/*`
- 작업공간 UI: `frontend/src/pages/History.jsx`, `frontend/src/components/history/*`, `frontend/src/components/workspace/*`
- 공유 UI: `frontend/src/pages/Deploy.jsx`, `frontend/src/components/deploy/*`
- 결과 요약 UI: `frontend/src/pages/Report.jsx`, `frontend/src/components/report/*`
- QA: `scripts/run_full_qa.py`, `scripts/run_workspace_flow_qa.py`, `FULL_QA_PLAN.md`

## 다음 추천 작업

1. 실제 브라우저 기준 모바일/작은 화면 스크린샷 QA를 추가한다.
2. 업로드 실패 메시지를 더 많은 실제 공공 CSV/엑셀 변형으로 검증한다.
3. 공유 API에 사용량/요청 기록처럼 SaaS 운영감이 나는 요약을 추가한다.
4. 관리자 화면에 최근 실패 업로드/도메인 불확실 데이터 같은 운영 위험 신호를 추가한다.
5. 발표 전에는 `scripts/run_full_qa.py`와 Railway 번들 확인을 루틴으로 사용한다.

## 주의

- 기본 시연은 즉석 CSV 업로드다. Pima, CH2025, 제조/품질, 공공자전거, 공공시설 데이터는 백업 QA 세트다.
- 외부 AI 토큰을 아끼려면 데모 모드 또는 no-token QA를 우선 사용한다.
- 큰 리팩터보다 100줄 안팎의 작은 컴포넌트/헬퍼 단위로 계속 고도화한다.
