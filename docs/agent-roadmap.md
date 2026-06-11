# ModelMate Agent Upgrade Roadmap

현재 상태: PR-01 skeleton 단계입니다. 발표/시연용 기존 ModelMate 기능은 유지하고,
Agentic AutoML 전환은 아래 PR 단위로 나눠 진행합니다.

| PR | 목표 | 수정/추가 파일 | 완료 기준 | 테스트 방법 | 위험 요소 | 다음 PR 연결 |
| --- | --- | --- | --- | --- | --- | --- |
| PR-01 | 기존 기능을 건드리지 않고 agent 아키텍처 문서와 비활성 skeleton 생성 | `docs/agent-architecture.md`, `docs/agent-roadmap.md`, `backend/agents/*`, `backend/tools/*`, `backend/schemas/agent/*` | 기존 실행 흐름 변화 없음, skeleton import/compile 성공, PR-02 스키마 준비 | `python -m compileall backend/agents backend/tools backend/schemas`, 기존 앱 수동 확인 | 이름만 agent처럼 보일 수 있음 | PR-02에서 실행 trace 저장 스키마 추가 |
| PR-02 | agent 실행 기록 저장 구조 추가 | DB 모델/마이그레이션 또는 기존 DB helper, `analysis_runs`, `analysis_steps`, `tool_calls`, `observations`, `decisions` | plan/tool/observation/decision을 저장할 수 있음 | 생성/조회 API 단위 테스트, 기존 endpoint 회귀 확인 | DB 변경으로 배포 위험 | PR-03에서 planner API가 저장 구조 사용 |
| PR-03 | 목표 입력 기반 mock planner API 추가 | `backend/agents`, `backend/tools`, 새 endpoint shim | 사용 목표를 받아 계획을 만들고 trace에 저장 | mock 실행 API 호출, timeline JSON 확인 | 기존 UI와 혼동 가능 | PR-04에서 UI timeline 연결 |
| PR-04 | Agent Run Detail UI 추가 | frontend agent timeline 컴포넌트, route | plan, tool call, observation, decision이 화면에 보임 | 브라우저 수동 확인, 새로고침 회복 확인 | 화면 복잡도 증가 | PR-05에서 실제 데이터 도구 연결 |
| PR-05 | 데이터 프로파일링/스키마 검사를 tool adapter로 연결 | `data_profile_tool`, `schema_validation_tool` | CSV 판단 결과가 observation으로 저장 | 공개/비정상 CSV QA | 기존 업로드와 중복 판단 | PR-06에서 타겟 추천 연결 |
| PR-06 | 타겟 추천/제외 컬럼/누수 검사 agent tool화 | `target_recommendation_tool`, `leakage_check_tool` | 타겟 후보와 제외 이유가 decision으로 저장 | Pima, 공공자전거, 시설, 제조 데이터 QA | 잘못된 자동 제외 | PR-07에서 AutoML tool 연결 |
| PR-07 | 기존 AutoML 학습을 `automl_training_tool`로 감싸기 | 기존 학습 호출 adapter, legacy shim | 기존 모델 비교는 유지되고 agent run에서도 호출 가능 | 기존 모델 비교 회귀 + agent mock run | 학습 시간/상태 충돌 | PR-08에서 평가/재시도 분기 |
| PR-08 | 평가, Optuna, 재시도/중단 decision 추가 | `evaluation_tool`, tuning decision policy | 성능 부족/개선 없음/성능 충분 상태를 구분 | Optuna trial QA, no-improvement 문구 확인 | 과도한 자동 재시도 | PR-09에서 XAI/report 연결 |
| PR-09 | XAI와 evidence 기반 보고서 tool화 | `shap_explainer_tool`, `report_writer_tool` | 중요 변수와 한계가 final report 근거로 연결 | report/XAI 회귀 확인 | 설명 과신 위험 | PR-10에서 human review |
| PR-10 | Human review와 배포 차단/허용 흐름 추가 | review queue, deployment check tool | 약한 타겟, 누수, 배포 위험은 사람 확인 필요 | 위험 데이터셋 QA | 발표 흐름 길어짐 | PR-11에서 모델 registry |
| PR-11 | 모델 버전/alias/lineage 관리 강화 | model registry, saved model metadata | 저장 모델을 재사용하고 lineage 확인 가능 | 저장/불러오기/예측 QA | DB 구조 복잡화 | PR-12에서 상용 SaaS UX |
| PR-12 | 상용 SaaS형 workspace/API/share 정리 | workspace, API/share UI, 권한/공개 설정 | 사용자별 dataset-run-model-report 연결 완성 | 로그인/권한/공유 QA | 권한 정책 미완성 | 운영 안정화 단계 |

## PR 진행 원칙

- 기존 endpoint와 시연 흐름을 먼저 보호합니다.
- 기존 AutoML 코드는 삭제하지 않고 adapter로 감쌉니다.
- 한 PR에서 DB, backend, frontend를 동시에 크게 바꾸지 않습니다.
- 모든 agent 기능은 plan -> tool call -> observation -> decision 흔적을 남겨야 합니다.
- PR-01부터 PR-04까지는 기능보다 구조와 trace 신뢰성을 우선합니다.
- 실제 LLM 호출은 마지막에 붙이고, 먼저 deterministic/mock 흐름으로 검증합니다.

## PR-01 수동 확인 절차

1. `python -m compileall backend/agents backend/tools backend/schemas`
2. `uvicorn backend.main:app --reload`
3. 기존 화면에서 CSV 업로드와 모델 비교가 그대로 되는지 확인
4. agent skeleton 파일이 기존 앱에 자동 import되지 않는지 확인
5. 다음 PR에서 DB 스키마를 붙일 위치가 명확한지 확인
