# Known Limitations

ModelMate의 현재 한계를 정직하게 정리한 문서입니다.

## Product Scope

- ModelMate는 guided CSV predictive analysis SaaS MVP입니다.
- enterprise AutoML 플랫폼이나 full MLOps 플랫폼이 아닙니다.
- DataRobot, Vertex AI, Azure ML, Dataiku의 대체재로 포지셔닝하지 않습니다.

## Billing / Account

- 실제 결제, invoice, subscription lifecycle은 구현되어 있지 않습니다.
- Free/Pro/Team은 MVP plan flag와 pricing mock/pilot 안내 수준입니다.
- payment security 범위는 아직 없습니다.

## Access Control

- Auth-lite와 user-owned project foundation은 있습니다.
- full RBAC, enterprise SSO, team workspace는 구현되어 있지 않습니다.
- MVP access control은 계속 강화가 필요합니다.

## Data / Model

- sample/starter pack 데이터는 합성 데이터입니다.
- 모델 품질은 업로드된 데이터 품질과 검증 결과에 따라 달라집니다.
- 결과는 의사결정 보조 자료이며 정확성, 공정성, 운영 적합성을 보장하지 않습니다.
- 의료/금융/채용/법률 등 고위험 의사결정의 단독 근거로 사용하면 안 됩니다.

## Prediction API

- Prediction API는 MVP-level reuse foundation입니다.
- enterprise API gateway, rate-limit billing, advanced token governance는 아닙니다.
- token 전체 값은 생성/재발급 시 한 번만 표시되며 목록에는 prefix만 표시합니다.

## Monitoring / Ops

- request ID/error ID와 lightweight monitoring foundation이 있습니다.
- full observability, alerting, incident management, SOC2/ISO compliance는 없습니다.
- feedback과 pilot inquiry는 manual review 중심입니다.

## Automation

- automatic retraining은 구현되어 있지 않습니다.
- production deployment orchestration은 구현되어 있지 않습니다.
- feature store나 대규모 connector system은 없습니다.

## Logs / Trace

- agentic AutoML 방향의 plan/tool/observation/decision 구조는 준비되어 있습니다.
- 모든 세부 실행 log가 영구적으로 풍부하게 저장되는 단계는 아닙니다.
- trace가 없는 경우 UI는 없는 데이터를 만들어내지 않고 unavailable 상태를 표시해야 합니다.
