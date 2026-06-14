# Agent Mode MVP

## PR-32 최종 포지셔닝

ModelMate Agent Mode는 CSV 기반 예측 분석을 위한 Korean-first Agentic AutoML SaaS MVP 기능입니다. 사용자의 한국어 분석 목표를 받아 Agent Run과 Plan을 만들고, 실행 가능한 도구를 순서대로 호출하며, tool call, observation, decision, validation, artifact, human review 기록을 남기는 것을 목표로 합니다.

이 기능은 기존 빠른 자동 분석 흐름을 대체하지 않습니다. 빠른 자동 분석은 사용자가 바로 CSV 분석을 진행하는 경로이고, Agent Mode는 분석 목표와 실행 근거를 더 명시적으로 남기는 별도 경로입니다.

### 시연 경로

1. Landing page 또는 Workspace에서 Agent Mode를 엽니다.
2. 한국어 목표를 입력합니다.
3. Agent Run과 Plan이 생성되는지 확인합니다.
4. pipeline을 실행합니다.
5. Run Detail에서 tool calls, observations, decisions, validations, artifacts를 확인합니다.
6. 보고서와 prediction API readiness를 확인합니다.
7. human review가 필요한 경우 approve, retry, stop 흐름을 보여줍니다.

### 정직한 한계

- 현재 핵심 범위는 tabular CSV 기반 classification/regression입니다.
- time-series는 명확한 timestamp/horizon 정보가 있을 때 제한적으로만 다룹니다.
- RAG, 문서 분석, causal inference, full enterprise MLOps는 범위 밖입니다.
- SHAP/feature importance는 feature contribution 설명이며 causality가 아닙니다.
- LLM planner는 optional이며, 구성되지 않아도 deterministic planner로 동작합니다.
- 위험하거나 불명확한 목표는 completed처럼 꾸미지 않고 unsupported, needs_review, unavailable 상태로 표시합니다.

PR-27은 ModelMate의 목표 기반 Agent Mode 첫 단계를 추가합니다.

이 단계의 목적은 사용자가 자연어로 분석 목표를 입력하면, ModelMate가 지원 범위를 판단하고 실행 전 계획을 저장하는 것입니다. 아직 실제 tool 실행, observation, decision, artifact 생성은 수행하지 않습니다.

## 현재 구현 범위

- 한국어 자연어 분석 목표 입력
- deterministic goal interpreter
- supported / limited / unsupported 범위 판단
- Agent Run 저장
- Agent Plan 저장
- 계획 단계 미리보기
- unsupported goal에 대한 정직한 안내
- 기존 빠른 자동 분석(`/agent`)과 분리된 Agent Mode(`/agent-mode`)

## 지원 범위

지원:

- Binary classification
- Multiclass classification
- Single-target regression

제한적 지원:

- 날짜 컬럼과 예측 기간 확인이 필요한 단순 time-series 스타일 예측

지원 범위 밖:

- RAG/document analysis
- clustering 중심 분석
- anomaly detection 중심 분석
- causal inference
- multi-target prediction
- full enterprise MLOps

## 계획 단계

PR-27에서 생성되는 plan step은 모두 `planned` 또는 `blocked` 상태입니다.

기본 계획은 다음 tool을 실행할 준비만 합니다.

1. `data_profile_tool`
2. `schema_validation_tool`
3. `target_recommendation_tool`
4. `leakage_check_tool`
5. `automl_training_tool`
6. `evaluation_tool`
7. `shap_explainer_tool`
8. `validation_tool`
9. `report_writer_tool`
10. `api_readiness_tool`

## 현재 한계

- PR-28부터 저장된 plan을 순서대로 실행하는 tool-calling pipeline이 추가되었습니다.
- 실행 시 `tool_calls`, `observations`, `decisions`, `validations`, `artifacts`가 backend trace로 저장됩니다.
- PR-29에서 Run Detail 중심의 자세한 trace/decision UI를 정리할 예정입니다.
- LLM planner는 사용하지 않습니다.
- Agent Mode는 기존 빠른 자동 분석을 대체하지 않습니다.

## PR-28 실행 흐름

1. Agent Run과 Plan을 불러옵니다.
2. 각 plan step의 `tool_name`에 맞는 registry handler를 호출합니다.
3. tool 실행 전후로 `tool_call` 상태를 기록합니다.
4. tool output은 observation payload로 저장합니다.
5. target 선택, best model 선택, metric gate, API readiness 같은 선택은 decision으로 분리 저장합니다.
6. schema fail, high leakage, metric fail, API readiness block 같은 상황은 validation으로 저장하고 안전하게 멈춥니다.
7. report, evaluation, explanation, API readiness 같은 산출물은 artifact metadata로 연결합니다.

PR-28은 실제 tool handler를 호출하지만, 새로운 AutoML 학습기를 만들지 않습니다. 기존 ModelMate tool adapter와 registry를 재사용합니다.

## PR-29 trace UI

PR-29부터 `/agent-mode/:agentRunId`에서 저장된 Agent Run trace를 확인할 수 있습니다.

표시 항목:

- 원본 목표와 interpreted goal
- supported / limited / unsupported 상태
- plan step timeline
- step별 tool call 상태와 input/output summary
- observation summary
- decision summary
- validation severity
- 연결된 artifact metadata

이 화면은 저장된 backend record만 표시합니다. 실행되지 않은 단계는 completed로 꾸미지 않고 planned, blocked, unavailable 상태로 안내합니다.

Full human review와 recovery action은 PR-30 범위입니다.

## PR-30 human review / recovery

PR-30부터 위험하거나 모호한 분석 판단은 human review request로 저장됩니다.

Review가 생성되는 대표 상황:

- 타깃 후보가 모호한 경우
- leakage risk가 높거나 검토가 필요한 경우
- time-series 목표에서 날짜/예측 기간 확인이 필요한 경우
- 모델 성능이 낮거나 기준에 가까운 경우
- 예측 API readiness가 `needs_review`, `hold`, `blocked`인 경우
- tool 실행이 실패해 복구가 필요한 경우

Review는 `/agent-mode/:agentRunId` 화면에서 확인할 수 있습니다.

가능한 처리:

- 권장 옵션 승인
- 경고 확인 후 계속
- 재시도
- 중단

중요한 원칙:

- review를 처리해도 기존 trace는 삭제하지 않습니다.
- retry는 같은 step에 새 tool call attempt를 추가합니다.
- stop은 run 상태만 중단으로 바꾸고 기존 기록은 보존합니다.
- PR-30은 안전한 human-in-the-loop foundation이며, LLM planner는 PR-31 전까지 사용하지 않습니다.

## PR-31 optional planner

PR-31부터 planner interface가 추가되었습니다.

기본값:

- deterministic planner
- LLM API key 불필요
- 외부 유료 API 의존 없음

선택 옵션:

- `MODEL_MATE_LLM_PLANNER_ENABLED=true`
- `MODEL_MATE_LLM_PLANNER_RESPONSE`에 schema-compatible JSON을 넣은 안전한 보조 planner path

Fallback 정책:

- 설정이 없으면 deterministic planner 사용
- JSON이 없거나 invalid하면 deterministic planner로 대체
- LLM output이 unsupported scope를 supported로 바꾸려고 해도 deterministic scope rule이 우선
- LLM output은 tool execution, observation, metric, report를 만들 수 없음
- raw secrets, API key, CSV 원본은 planner log나 UI에 노출하지 않음

정리하면 PR-31의 LLM planner는 선택적 보조 계층이며, ModelMate의 기본 demo와 Agent Mode는 계속 규칙 기반 planner만으로 동작합니다.
