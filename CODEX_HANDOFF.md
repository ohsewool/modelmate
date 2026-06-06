# ModelMate Codex Handoff

## 현재 기준

- 배포 URL: https://web-production-5d6fa.up.railway.app/
- GitHub: https://github.com/ohsewool/-
- Branch: `main`
- 최신 확인 커밋: `8ad39ed chore: trigger Railway deploy for latest frontend bundle`
- 최신 배포 번들 확인: JS `assets/index-BmbxMz9e.js`, CSS `assets/index-eq45KJV1.css`
- 11월 방향성: 고정 샘플 데모가 아니라, 사용자가 임의 CSV를 올리면 데이터 분야, 예측 목적, 맞힐 값, 제외 컬럼, 모델 선택, 위험 요소, 다음 행동, 공유/API까지 이어지는 범용 AutoML SaaS처럼 보이게 만든다.

## 발표용 핵심 흐름

1. 사용자가 CSV를 업로드한다.
2. ModelMate가 데이터 분야, 예측 목적, 맞힐 값 후보, 제외할 컬럼, 분석 준비도를 판단한다.
3. 여러 모델을 비교하고 데이터셋에 맞는 모델을 추천한다.
4. AI 에이전트가 모델 선택 이유, 위험 요소, 다음 행동, 발표용 결론을 정리한다.
5. 결과 요약과 이유 보기에서 비전공자도 이해할 수 있게 설명한다.
6. 저장 모델, 새 데이터 예측, 공유/API 흐름으로 실제 서비스처럼 이어진다.
7. 로그인 작업공간과 관리자 화면에서 데이터셋, 실험, 보고서, 저장 모델의 연속성을 보여준다.

## 최근 완료된 고도화

- Railway 배포 반영 문제 확인 및 트리거 커밋으로 최신 번들 반영 확인.
- 업로드 화면에 즉석 CSV 판단, 데이터 종류, 맞힐 값, 예측 목적, 사용/제외 정보 표시.
- 보조 정보는 사이드 패널로 분리해 화면 과밀도를 줄임.
- 결과 요약 화면에 작은 사이드 패널을 추가하고 클릭 시 크게 볼 수 있게 구성.
- 에이전트 결과에 자동 판단 요약, 사람이 확인할 점, 다음 행동을 표시.
- 실험 기록에서 이전 실험 설정을 다시 분석 흐름으로 넘기는 기능 추가.
- API 접근 관리, 모델 생명주기, 저장 모델 관리 미리보기 추가.
- no-token QA 스크립트로 도메인 분류와 작업공간 흐름을 검증.

## 현재 상태 판단

- 중간 발표 가능성: 약 80~85%.
- 11월 최종 졸프 목표 기준: 약 45~50%.
- 실제 상용 MVP 느낌 기준: 약 30~35%.
- 지금부터 핵심은 기능 추가보다 저장, 재사용, 관리, 안정성이다.

## 다음 우선순위

1. 배포 안정성: GitHub main, Railway 번들, 운영 URL을 변경 후마다 확인한다.
2. 작업공간/계정: 사용자별 데이터셋, 실험 기록, 보고서, 저장 모델을 다시 열 수 있게 강화한다.
3. 실험 재사용: 이전 맞힐 값, 제외 컬럼, 선택 모델, 점수, 보고서를 복원한다.
4. 모델 관리: 이름 있는 저장 모델, 버전 기록, 저장 모델 기반 새 데이터 예측을 강화한다.
5. 공유/API: 공유 링크, 공개/비공개, API 키 형태 UX, 사용 예시를 정리한다.
6. AI 에이전트: 데이터 판단, 타겟 선정 이유, 모델 선정 이유, 위험 요소, 다음 행동, 발표용 결론을 강화한다.
7. 업로드 QA: 공공, 의료, 제조, 교통, 시설/안전, invalid, tiny, text-like, malformed CSV를 점검한다.
8. UI/UX: 긴 화면은 사이드 패널로 분리하고 모바일/좁은 화면을 검증한다.
9. 문서: 다른 Codex 환경이 이어받을 수 있게 handoff와 roadmap을 최신화한다.

## 중요 파일

- 백엔드 진입점: `backend/main.py`
- 백엔드 파트: `backend/main_parts/*.py`
- 업로드 검증: `backend/main_parts/004_data_quality.py`, `010_upload.py`
- 도메인/타겟 추론: `backend/main_parts/011_analyze_columns.py`
- 에이전트 판단: `backend/main_parts/039_agent_insights.py`, `040_agent_a.py`
- 작업공간/관리자: `051_auth_history_debug.py`, `052_workspace_projects.py`, `053_admin_summary.py`
- 리포트 API/HTML: `080_report_summary_helpers.py`, `081_report_summary_api.py`, `060_state_report_a.py`, `061_report_b.py`
- 예측/API 공유: `082_predict_single_helpers.py`, `083_predict_single_api.py`, `084_predict_batch_api.py`, `085_deploy_stable_helpers.py`, `086_deploy_stable_api.py`
- 업로드 UI: `frontend/src/pages/Upload.jsx`, `frontend/src/components/upload/*`
- 에이전트 UI: `frontend/src/pages/Agent.jsx`, `frontend/src/components/agent/*`
- 작업공간 UI: `frontend/src/pages/History.jsx`, `frontend/src/components/history/*`, `frontend/src/components/workspace/*`
- 공유 UI: `frontend/src/pages/Deploy.jsx`, `frontend/src/components/deploy/*`
- 결과 요약 UI: `frontend/src/pages/Report.jsx`, `frontend/src/components/report/*`
- QA: `scripts/run_full_qa.py`, `scripts/run_workspace_flow_qa.py`, `scripts/run_domain_benchmark.py`

## 검증 루틴

1. `python scripts/run_domain_benchmark.py`
2. `python scripts/run_workspace_flow_qa.py`
3. 프론트엔드 빌드
4. GitHub main push
5. Railway URL에서 최신 JS/CSS 번들 확인
6. 실제 브라우저에서 즉석 CSV 1개와 백업 CSV 1개 업로드 리허설

## 주의사항

- 기본 데모 전략은 즉석 CSV 업로드다. Pima, CH2025, 제조/품질, 공공자전거, 공공시설 데이터는 백업 QA 세트다.
- 일반 공개 URL에 발표자 전용 데모 데이터가 노출되면 안 된다.
- 외부 AI 토큰이 부족하면 no-token QA와 저장 결과 기반 시연을 우선한다.
- 새 컴포넌트나 헬퍼는 가능하면 100줄 안팎으로 작게 유지한다.
- Railway가 예전 번들을 서빙하면 먼저 GitHub main, 로컬 빌드 산출물, Railway 번들을 비교한다.
