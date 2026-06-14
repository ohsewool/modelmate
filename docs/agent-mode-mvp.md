# Agent Mode MVP

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

- 실제 tool execution은 PR-28에서 연결합니다.
- observation / decision / validation / artifact 기록은 PR-28 이후에 채워집니다.
- LLM planner는 사용하지 않습니다.
- Agent Mode는 기존 빠른 자동 분석을 대체하지 않습니다.
