# ModelMate 포트폴리오 케이스 스터디

## 요약

ModelMate는 CSV 기반 예측 분석을 비전문가도 이해할 수 있는 제품 흐름으로
제공하기 위해 설계한 guided AutoML SaaS MVP입니다. 단순히 모델을 학습하는
데서 끝나지 않고, 프로젝트 저장, 실행 기록, 근거 기반 보고서, 예측 API
재사용, 사용량 관리, 오류 추적, 피드백 수집까지 포함해 실제 SaaS 제품에
가까운 구조를 구현했습니다.

## 문제

CSV 파일을 가진 사용자는 보통 다음 지점에서 막힙니다.

- 어떤 컬럼을 예측해야 하는지 모름
- 어떤 컬럼을 제외해야 하는지 판단하기 어려움
- 모델 성능 지표가 무엇을 의미하는지 이해하기 어려움
- 결과를 보고서나 API로 재사용하기 어려움
- 실패했을 때 어디서 왜 실패했는지 알기 어려움

ModelMate는 이 흐름을 하나의 제품 경험으로 묶는 것을 목표로 했습니다.

## 대상 사용자

- CSV 파일은 있지만 머신러닝 경험이 적은 사용자
- 소규모 스타트업/운영팀/마케팅·세일즈 담당자
- 졸업 프로젝트나 포트폴리오에서 예측 분석 흐름을 시연하려는 사용자
- 분석 결과를 보고서와 API 형태로 재사용하고 싶은 사용자

## 제품 컨셉

ModelMate는 사용자가 CSV를 올리면 데이터 구조를 점검하고, 예측 타깃을
추천하며, 모델을 비교하고, 근거 기반 보고서와 예측 API까지 이어주는 guided
AutoML SaaS MVP입니다.

## 왜 단순 AutoML demo가 아닌가

일반적인 AutoML demo는 “파일 업로드 → 모델 학습 → 점수 출력”에서 끝나는
경우가 많습니다. ModelMate는 그 이후의 제품 경험을 함께 다룹니다.

- 분석 전 데이터 품질과 leakage 위험을 보여줌
- 타깃 추천과 제외 컬럼 이유를 설명함
- 모델 성능, warning, evidence를 보고서에 남김
- 프로젝트와 실행 기록을 다시 열 수 있음
- 학습 결과를 예측 API로 재사용할 수 있음
- 사용량 한도, 오류 ID, 피드백, 파일럿 문의 같은 SaaS 운영 요소를 포함함

## 핵심 흐름

```text
CSV 업로드
→ 데이터 구조 분석
→ 타깃 추천
→ leakage/제외 컬럼 점검
→ 모델 비교
→ trust/evidence 요약
→ 근거 기반 보고서
→ 예측 API token과 endpoint
→ 프로젝트 저장과 재실행
```

## Guided Analysis Design

ModelMate는 “진짜 완성된 자율 AI data scientist”라고 주장하지 않습니다.
현재는 agentic AutoML 방향을 위해 plan, tool call, observation, decision,
evidence 구조를 단계적으로 준비한 guided analysis 흐름입니다.

이 구조는 다음 목적을 가집니다.

- 분석 과정에서 어떤 판단이 있었는지 남기기
- 데이터 품질, leakage, 성능 기준, 설명 가능성의 근거를 보여주기
- 나중에 real tool-calling planner를 붙일 수 있는 구조 만들기

## SaaS Workspace Design

UI는 단발성 demo보다 workspace 중심으로 설계했습니다.

- Dashboard: 최근 프로젝트, 작업 상태, 사용량 상태
- Projects: user-owned project 목록
- Project detail: overview, runs, report, prediction API, dataset, settings
- Jobs: background training 상태와 실패 복구 안내
- Reports: 생성된 보고서 접근
- Prediction APIs: token 상태와 endpoint 재사용
- Settings: usage, monitoring, feedback, pilot inquiry

## Trust / Evidence / Report Design

보고서는 단순 요약이 아니라 evidence 기반 산출물로 설계했습니다.

- selected target
- task type
- best model
- metric summary
- data quality warnings
- leakage warnings
- explanation summary
- limitations
- recommended next action

필수 한계 문구도 포함합니다.

> 모델 성능과 설명은 업로드된 데이터와 현재 검증 결과에 기반합니다.

## Prediction API Reuse

학습 결과는 프로젝트 단위 prediction API token으로 재사용할 수 있습니다.
token 전체 값은 생성 시 한 번만 보여주고, 이후 목록에는 prefix와 상태만
표시합니다. 이는 production API gateway가 아니라 SaaS MVP 수준의 안전한
재사용 foundation입니다.

## Ops Readiness

상용 SaaS MVP처럼 보이기 위해 다음 운영 요소를 추가했습니다.

- Auth-lite와 guest demo mode
- user-owned project/access control foundation
- project history와 rerun UX
- background job 상태
- failure recovery message
- usage limits/plan flags
- monitoring, request ID/error ID
- feedback capture
- paid pilot inquiry/manual sales ops
- dataset delete/retention foundation

## Technical Architecture

- Frontend: React/Vite JavaScript
- Backend: Python/FastAPI
- ML pipeline: pandas, scikit-learn 중심 AutoML 흐름
- Persistence: 현재 repo 구조에 맞춘 lightweight JSON/file-backed metadata
- Deployment: Railway
- QA: compileall, Vite build, smoke scripts, upload validation QA

자세한 구조는 [architecture-overview.md](architecture-overview.md)를 참고합니다.

## 내가 구현한 것

- CSV 업로드와 분석 준비 흐름
- 타깃 추천, 제외 컬럼, 모델 비교, 결과 요약 UI
- agentic AutoML skeleton과 deterministic tool adapters
- grounded report/evidence bundle/report writer foundation
- project/run/report/prediction API workspace
- Auth-lite, ownership, dataset delete, usage limit, monitoring, feedback, pilot inquiry
- Korean-first SaaS UI polish
- release QA, demo guide, portfolio docs

## 배운 점

- ML 모델 성능만으로는 제품 가치가 충분하지 않음
- 사용자는 결과보다 “왜 믿을 수 있는지”와 “다음에 무엇을 해야 하는지”를 필요로 함
- AutoML도 프로젝트, 기록, 보고서, API, 운영 상태가 있어야 SaaS처럼 보임
- 과장된 AI claim보다 현재 구현 범위와 한계를 정직하게 말하는 것이 더 신뢰를 줌

## 한계

- enterprise AutoML 플랫폼 대체재가 아님
- 실제 billing, SSO, full RBAC, team workspace는 없음
- automatic retraining과 production MLOps deployment는 구현하지 않음
- starter pack 데이터는 합성 데이터
- 모델 품질은 업로드 데이터와 검증 결과에 의존
- 일부 trace/log persistence는 MVP 수준

## 다음 개선

- 더 풍부한 report export
- run trace persistence 강화
- starter pack/use case 확장
- prediction API 예시와 schema validation 강화
- mobile UX 개선
- 실제 beta 사용자 피드백 반영
- team workspace, billing, connector, scheduled retraining은 검증 이후 검토
