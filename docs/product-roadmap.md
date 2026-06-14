# ModelMate Product Roadmap

이 문서는 현재 구현된 MVP와 이후 개선 가능성을 구분합니다.

## Current MVP

현재 구현된 방향:

- CSV upload
- data profiling
- schema validation
- target recommendation
- leakage check
- model comparison
- grounded report
- XAI/fallback explanation
- prediction API reuse
- projects/runs/reports
- Auth-lite와 guest demo mode
- user-owned project foundation
- dataset delete/retention foundation
- background job status
- failure recovery/rerun UX
- usage limits/plan flags
- monitoring/request ID/error ID
- feedback collection
- use-case starter packs
- paid pilot inquiry/manual sales ops

## Near-Term Improvements

다음 단계에서 제품 완성도를 높일 수 있는 항목:

- run trace persistence 강화
- report export 품질 개선
- prediction API examples와 schema 안내 개선
- starter pack/use case 추가
- upload validation과 leakage 설명 강화
- mobile UX 개선
- 프로젝트별 demo state 정리
- 실패 케이스별 recovery action 세분화
- screenshot 기반 포트폴리오 문서 보강

## Future Commercial Possibilities

아래 항목은 아직 구현되지 않았으며, beta/pilot 검증 이후 검토할 수 있습니다.

- team workspace
- billing/payment integration
- external data connectors
- scheduled retraining
- advanced deployment workflow
- SSO/RBAC
- audit logs
- stronger data retention automation
- richer monitoring/alerting
- role-based admin console

## Out Of Scope Today

ModelMate는 현재 DataRobot, Vertex AI, Azure ML, Dataiku 같은 enterprise AutoML
플랫폼의 대체재가 아닙니다. full MLOps, feature store, production deployment
orchestration, guaranteed prediction accuracy를 제공한다고 표현하지 않습니다.
