# ModelMate Codex Handoff

## 현재 상태

- 배포 URL: https://web-production-5d6fa.up.railway.app/
- GitHub: https://github.com/ohsewool/-
- Branch: `main`
- 최신 확인 커밋: `0876f17 test: cover workspace model flow`
- 11월 졸프 목표 기준 상태: 핵심 기능은 완성권, 지금부터는 데모 신뢰도와 상용 서비스 느낌을 높이는 단계

## 완료된 큰 작업

- CSV 업로드/검증 고도화
- 데이터 도메인/타겟 목적 추론 확장
- 모델 비교, Optuna 안정화 설명, XAI/보고서 흐름
- 로그인, 관리자 계정, 작업공간, 프로젝트/데이터셋 메타 저장
- 저장된 데이터셋 상세 보기와 다시 분석 흐름
- 데이터셋과 실험 기록 연결
- 실험 비교 기능
- 저장 모델 소유자/데이터셋 연결
- 저장 모델 버전/저장 상태 표시
- 모델 공유 흐름 정리
- 최근 분석 요약 카드
- 관리자 운영 현황 카드
- AI 에이전트 다음 행동 추천
- 데모 모드 토글
- 모바일/작은 화면 레이아웃 보강
- 최종 QA 하네스와 작업공간 모델 흐름 QA 추가

## 검증 결과

- `python scripts/run_domain_benchmark.py`: 13 / 13 pass
- `python scripts/run_training_benchmark.py`: 14 / 14 pass
- `python scripts/run_workspace_flow_qa.py`: 데이터셋 저장 -> 실험 기록 -> 모델 저장 -> 버전/저장상태 pass
- `python scripts/run_final_qa.py`: Domain pass, Training pass_cached, Workspace flow pass, 업로드 검증 8 / 8 pass
- Railway 확인: `/deploy`, `/api/validation-summary` 정상 응답
- 관리자 API는 비로그인 403이 정상

## 중요한 파일

- 백엔드 진입점: `backend/main.py`
- 백엔드 파트: `backend/main_parts/*.py`
- 업로드 검증: `backend/main_parts/004_data_quality.py`, `010_upload.py`
- 도메인 추론: `backend/main_parts/011_analyze_columns.py`
- 에이전트: `backend/main_parts/039_agent_insights.py`, `040_agent_a.py`
- 작업공간/관리자 API: `051_auth_history_debug.py`, `052_workspace_projects.py`, `053_admin_summary.py`
- 프론트 작업공간: `frontend/src/pages/History.jsx`
- 모델 공유 화면: `frontend/src/pages/Deploy.jsx`
- 에이전트 UI: `frontend/src/pages/Agent.jsx`, `frontend/src/components/agent/*`
- QA: `scripts/run_final_qa.py`, `scripts/run_workspace_flow_qa.py`, `FINAL_QA_RESULTS.md`

## 다음 추천 작업

1. 11월 발표용 대표 데모 데이터셋을 2~3개로 고정한다.
2. Pima, 제조, 공공 데이터셋으로 업로드부터 공유 모델 생성까지 실제 브라우저 리허설을 반복한다.
3. AI 에이전트 화면에서 다음 행동, 위험 노트, 발표용 결론이 더 선명하게 보이도록 다듬는다.
4. UI는 큰 구조 변경보다 문구, 간격, 빈 상태, 모바일 화면을 계속 다듬는다.
5. 최종 달에는 `scripts/run_final_qa.py`와 실제 브라우저 체크를 발표 전 루틴으로 사용한다.
