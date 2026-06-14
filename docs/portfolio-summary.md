# ModelMate 포트폴리오 요약

ModelMate는 CSV 기반 예측 분석을 비전문가도 이해할 수 있는 제품 흐름으로 제공하기 위해 만든 guided AutoML SaaS MVP입니다. 핵심은 모델 하나를 학습하는 데서 끝나는 것이 아니라, 데이터 업로드부터 타깃 추천, 모델 비교, 근거 기반 보고서, 예측 API readiness, 프로젝트 재사용까지 이어지는 흐름을 제품처럼 설계한 점입니다.

## 해결하려는 문제

많은 사용자는 CSV 파일을 가지고 있지만, 어떤 값을 예측해야 하는지, 어떤 컬럼을 제외해야 하는지, 모델 성능을 어떻게 해석해야 하는지 알기 어렵습니다. ModelMate는 이 과정을 단계별로 안내하고, 결과가 어떤 근거로 만들어졌는지 trace와 report로 남깁니다.

## 만든 것

- CSV upload와 데이터 품질 점검
- target recommendation과 leakage check
- AutoML 기반 모델 비교
- evaluation과 XAI/fallback explanation
- grounded report와 limitations
- project/run/report/workspace 저장 흐름
- prediction API readiness와 token 관리 기반
- usage limits, monitoring/error ID, feedback, pilot inquiry
- Agent Mode와 Run Detail trace UI

## Agentic AutoML 설계

Agent Mode는 사용자의 한국어 목표를 Agent Run으로 저장하고, Plan을 만든 뒤 tool call, observation, decision, validation, artifact를 순서대로 남깁니다. 이 구조는 “AI가 알아서 다 했다”는 표현을 피하고, 실제로 어떤 도구가 어떤 결과를 냈는지 사용자가 확인할 수 있게 하는 데 초점을 둡니다.

## 제품처럼 보이는 이유

- 저장된 프로젝트와 실행 기록을 다시 열 수 있습니다.
- 보고서와 prediction API readiness가 단발성 화면이 아니라 재사용 가능한 산출물처럼 연결됩니다.
- 사용량 한도, 실패 복구, 삭제/보관 정책, 모니터링, 피드백 수집 같은 SaaS 기본기를 포함합니다.
- 베타 테스트와 파일럿 문의 문서까지 준비되어 있습니다.

## 한계

- full enterprise AutoML 또는 MLOps 플랫폼이 아닙니다.
- classification/regression 중심이며, time-series는 제한적입니다.
- SHAP/feature importance는 causality를 보장하지 않습니다.
- billing, enterprise SSO, full RBAC, feature store, 자동 재학습은 아직 구현하지 않았습니다.
- LLM planner는 optional이며, 기본 흐름은 deterministic planner입니다.

## 다음 개선 방향

- report export 품질 개선
- 더 많은 starter pack
- run trace persistence 강화
- prediction API 예시와 token policy 강화
- 모바일 UX 개선
- 실제 베타 사용자 피드백 기반 개선
