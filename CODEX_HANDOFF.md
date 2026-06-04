# ModelMate Codex Handoff

## 현재 상태

- 배포 URL: https://web-production-5d6fa.up.railway.app/
- GitHub: https://github.com/ohsewool/-
- Branch: `main`
- 최신 확인 커밋: `7aa1279 test: add final QA harness`

## 완료된 큰 작업

- CSV 업로드/검증 고도화
- 데이터 도메인/타겟 목적 추론 확장
- 모델 비교, Optuna 안정화 설명, XAI/보고서 흐름
- 로그인, 관리자 계정, 작업공간, 프로젝트/데이터셋 메타 저장
- 저장된 데이터셋 상세 보기와 다시 분석 흐름
- 최근 분석 요약 카드
- 관리자 운영 현황 카드
- AI 에이전트 다음 행동 추천
- 데모 모드 토글
- 모바일/작은 화면 레이아웃 보강
- 최종 QA 하네스 추가

## 검증 결과

- `python scripts/run_domain_benchmark.py`: 13 / 13 pass
- `python scripts/run_training_benchmark.py`: 14 / 14 pass
- `python scripts/run_final_qa.py`: 업로드 검증 포함 8 / 8 pass
- Railway 확인: `/`, `/history`, `/agent`, `/api/validation-summary` 정상 응답
- 관리자 API는 비로그인 403이 정상

## 중요한 파일

- 백엔드 진입점: `backend/main.py`
- 백엔드 파트: `backend/main_parts/*.py`
- 업로드 검증: `backend/main_parts/004_data_quality.py`, `010_upload.py`
- 도메인 추론: `backend/main_parts/011_analyze_columns.py`
- 에이전트: `backend/main_parts/039_agent_insights.py`, `040_agent_a.py`
- 작업공간/관리자 API: `051_auth_history_debug.py`, `052_workspace_projects.py`, `053_admin_summary.py`
- 프론트 작업공간: `frontend/src/pages/History.jsx`
- 에이전트 UI: `frontend/src/pages/Agent.jsx`, `frontend/src/components/agent/*`
- QA: `scripts/run_final_qa.py`, `FINAL_QA_RESULTS.md`

## 다음 추천 작업

1. 발표 전 실제 브라우저에서 Pima, 제조, 자전거, 공공시설 CSV를 한 번씩 업로드한다.
2. 관리자 로그인 후 운영 현황 카드가 보이는지 확인한다.
3. 데모 모드 토글을 켠 상태로 AI 한 번에 실행을 시연한다.
4. 발표자료 문구와 앱 화면 용어가 같은지 마지막으로 맞춘다.
5. 큰 구조 변경은 피하고 UI 문구/QA 위주로 마감한다.
