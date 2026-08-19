# ModelMate

[![tests](https://github.com/ohsewool/modelmate/actions/workflows/tests.yml/badge.svg)](https://github.com/ohsewool/modelmate/actions/workflows/tests.yml)

ModelMate는 CSV 데이터를 업로드하면 데이터 구조 분석, 예측 타깃 추천, 모델 비교, 근거 기반 보고서, 예측 API 준비도까지 하나의 흐름으로 제공하는 Korean-first Agentic AutoML SaaS MVP입니다.

English summary: ModelMate turns CSV data into explainable predictions, grounded reports, and reusable APIs through a guided AI analyst workflow.

## 배포 이력

Railway에 배포해 운영했다. 그 인스턴스는 **무료 플랜 만료로 지금은 내려가 있고**, 링크를 남겨두면 방문자가 `Application not found`를 만나므로 지웠다 — 죽은 링크는 없는 링크보다 나쁘다.

배포 설정 자체는 저장소에 남아 있어 다시 띄울 수 있다: [`railway.toml`](railway.toml), [`Procfile`](Procfile), [`nixpacks.toml`](nixpacks.toml).

로컬 실행은 아래 **Local Setup** 참조. 저장소는 `github.com/ohsewool/modelmate`이며, 예전 주소 `ohsewool/-`는 이름을 바꾼 것이라 리다이렉트된다.

## What It Does

ModelMate는 비전문가도 CSV 기반 예측 분석 흐름을 이해하고 재사용할 수 있도록 만든 졸업 프로젝트이자 포트폴리오 서비스입니다. 단순히 모델을 학습하는 데서 끝나지 않고, 사용자의 분석 목표를 계획으로 바꾸고, tool call, observation, decision, validation, human review, artifact 기록을 남기는 방향으로 확장했습니다.

## Key Features

- CSV 업로드와 데이터 구조 분석
- schema validation, target recommendation, leakage check
- classification/regression 모델 비교와 AutoML training adapter
- Agent Mode: goal -> plan -> tool call -> observation -> decision -> validation -> artifact
- Agent Run Detail에서 persisted trace 확인
- human review/recovery foundation
- grounded report preview/export
- project/run/report/workspace reuse
- project-scoped prediction API token/readiness
- usage limits, monitoring/error ID, feedback/pilot inquiry foundation
- starter pack/sample dataset demo flow

## Product Workflow

```text
CSV 업로드 또는 샘플 선택
-> 분석 목표 입력
-> Agent Run / Plan 생성
-> 데이터 점검과 타깃 추천
-> leakage 검토
-> AutoML 모델 비교
-> 성능 평가와 XAI 요약
-> validation / human review
-> grounded report
-> prediction API readiness
```

## Agentic AutoML Workflow

ModelMate의 Agent Mode는 현재 tabular CSV predictive analysis에 집중합니다.

- PR-27: goal-first Agent Run과 deterministic plan 저장
- PR-28: tool handler 실행과 trace record 저장
- PR-29: trace/decision UI
- PR-30: human review/recovery
- PR-31: optional planner interface와 deterministic fallback
- PR-32: portfolio/demo/docs polish

Agent Mode는 “완전 자율 데이터 과학자”를 의미하지 않습니다. 지원하지 않는 목표나 위험한 분석은 제한, 경고, human review 또는 unavailable 상태로 정직하게 표시합니다.

## Demo Scenario

1. Landing page에서 ModelMate의 CSV 예측 분석 흐름을 소개합니다.
2. starter pack 또는 샘플 CSV로 분석을 시작합니다.
3. 한국어 분석 목표를 입력합니다.
4. Agent Run과 Plan이 생성되는 것을 확인합니다.
5. pipeline 실행 후 Run Detail을 엽니다.
6. tool calls, observations, decisions, validations, artifacts를 확인합니다.
7. 모델 비교, report, prediction API readiness를 보여줍니다.
8. human review/recovery가 필요한 상황은 경고와 다음 행동으로 설명합니다.

## Tech Stack

- Frontend: React, Vite, JavaScript
- Backend: FastAPI, Python
- Data/ML: pandas, scikit-learn 기반 pipeline adapters
- Deployment: Railway (설정은 유지, 인스턴스는 만료로 종료)
- QA: Python smoke scripts, Vite build

## Local Setup

Backend:

```bash
python -m compileall backend
uvicorn backend.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run build
npm run dev
```

Release QA examples:

```bash
python scripts/run_product_smoke.py --base-url http://localhost:8000
python scripts/run_release_qa.py --base-url http://localhost:8000
```

## Environment Variables

실제 secret은 GitHub에 커밋하지 않습니다. Railway 또는 로컬 `.env`에서 관리합니다.

- `MODEL_MATE_LLM_PLANNER_ENABLED`: optional planner interface 사용 여부
- `MODEL_MATE_LLM_PLANNER_RESPONSE`: 개발/검증용 schema-constrained planner response
- 기타 배포 변수는 `docs/deployment-notes.md`와 `docs/deployment-checklist.md`를 참고합니다.

## Documentation

- `docs/README.md`: 문서 인덱스
- `docs/agent-mode-mvp.md`: Agent Mode 범위와 한계
- `docs/architecture-overview.md`: 시스템 구조 요약
- `docs/demo-guide.md`: 발표/시연 흐름
- `docs/final-release-checklist.md`: 최종 릴리스 체크리스트
- `docs/final-qa-report.md`: 최종 QA 결과
- `docs/portfolio-summary.md`: 포트폴리오 요약
- `docs/known-limitations.md`: 알려진 한계
- `docs/prediction-api.md`: 예측 API 사용 안내

## Current Limitations

- ModelMate는 full enterprise AutoML 또는 full MLOps 플랫폼이 아닙니다.
- 현재 핵심 범위는 tabular CSV 기반 classification/regression 예측 분석입니다.
- time-series는 명확한 날짜/예측 기간 정보가 있을 때 제한적으로만 다룹니다.
- SHAP/feature importance는 feature contribution 설명이며 causality를 의미하지 않습니다.
- LLM planner는 optional이며, 기본 흐름은 deterministic planner로 동작합니다.
- prediction API, monitoring, feedback, pilot inquiry는 MVP 수준의 기반 기능입니다.
- billing, enterprise SSO, full RBAC, feature store, 자동 재학습 루프는 아직 구현 범위 밖입니다.

## Portfolio Notes

이 프로젝트의 핵심은 단순히 머신러닝 모델을 학습하는 것이 아니라, CSV 데이터가 실제 제품 흐름 안에서 분석, 보고서, API로 재사용되는 과정을 설계하고 구현한 것입니다. 이를 위해 데이터 업로드, 타깃 추천, 모델 비교, 설명 가능한 결과, 프로젝트 저장, 실행 기록, 예측 API, 사용량 제한, 오류 추적, 피드백 수집까지 SaaS MVP 관점의 기능을 단계적으로 확장했습니다.

## Roadmap

Near-term:

- 더 안정적인 run trace persistence
- report export 품질 개선
- prediction API 예시 강화
- starter pack 확장
- 모바일/반응형 UX 개선

Future possibilities:

- team workspace
- billing
- connectors
- scheduled retraining
- advanced deployment
- SSO/RBAC
- audit logs

이 항목들은 현재 구현 완료 기능이 아니라 향후 상용화 가능성입니다.

## 요청 격리

업로드된 데이터프레임·학습된 모델·SHAP 값은 `STATE`에 산다. 그것이 **프로세스 전체가 공유하는 딕셔너리 하나**였다. 로그인이 붙은 배포 환경에서 그 뜻은, A가 올린 데이터셋을 B의 다음 요청이 분석한다는 것이다 — B가 자기 데이터를 함께 보내지 않는 한.

직전 업로드를 재사용하는 것 자체는 의도된 동작이다(데이터셋이 없을 때의 오류 메시지도 "기존 업로드된 데이터셋을 쓰라"고 안내한다). 결함은 재사용이 아니라 **"기존"의 범위**였다.

`backend/scoped_state.py`가 `STATE`를 같은 매핑 인터페이스로 유지하면서 어느 버킷을 가리킬지를 요청별 컨텍스트 변수로 정한다. **`.part` 파일 20여 곳의 STATE 사용 232건은 한 줄도 바뀌지 않았다.** 범위 키를 232곳에 꿰는 것은 배포된 앱에 가할 변경으로 너무 크고, 그 대부분은 스코핑을 알 이유가 없는 세 줄짜리 핸들러다.

두 가지가 성립해야 했고 성립한다.

- **범위를 설정하지 않으면 이전과 똑같이 동작한다.** 스크립트·테스트·신원 없는 경로는 공용 기본 버킷을 쓴다. 이 변경이 설치되는 것만으로 무언가를 깨뜨릴 수 없다.
- **범위는 호출자가 고르지 않는다.** 키는 서버가 서명된 토큰이나 게스트 헤더에서 해석한 `sub`에서 나온다. 클라이언트가 남의 범위를 지정할 수 없는 이유는 애초에 범위를 지명하지 않기 때문이다.

## 사람 검토 관문이 거부 목록으로 만들어져 있었다

검토 큐도 테스트가 0개였고, **잃는 방향이 같은 결함이 둘** 있었다.

`should_create_review_item`이 "검토가 필요한 판단" 집합을 **거부 목록**으로 썼다. 목록에 없는 판단은 검토가 생기지 않는다 — executor가 실제로 내보내는 `block_execution`이 그냥 지나갔고, `abort_and_delete_dataset` 같은 것도 마찬가지였다.

**진행하면 안 되는 것을 잡는 큐를 "진행하면 안 되는 것 목록"으로 만들 수는 없다.** 위험한 경우는 언제나 아무도 목록에 넣을 생각을 못 한 그것이기 때문이다. 허용 목록으로 뒤집었다 — 모르는 판단은 사람이 본다. 이 방향으로 틀리면 검토자가 평범한 항목 하나를 더 보고, 반대 방향으로 틀리면 파괴적 동작이 아무도 못 본 채 지나간다.

`review_id`는 실행+단계+사유였다. 그래서 **같은 단계의 서로 다른 문제 둘이 같은 id를 가졌다** — `critical` 관측과 `error` 관측이 같은 식별자를 받았고, id로 저장하는 쪽은 하나를 잃는다. 내용 지문을 붙여 분리하되, 같은 판단을 재처리하면 같은 id가 나오게 유지했다(재시도가 큐를 복제본으로 채우지 않도록).

## 감사 기록이 없는 근거를 가리킬 수 있었다

에이전트가 무엇을 보고 왜 그렇게 했는지는 `persistence.py`(977줄)에 남는다. **테스트가 하나도 없었다.**

모든 테이블이 `FOREIGN KEY`를 선언한다. **SQLite는 `PRAGMA foreign_keys`가 켜져야 그걸 지키고, 기본값은 꺼짐이다.** 즉 결정이 존재한 적 없는 관측을 인용할 수 있었고, 만들어진 적 없는 실행에 매달릴 수도 있었다. 둘 다 실증한 뒤 고쳤다.

일반 데이터베이스보다 여기서 더 나쁘다. 이 행들은 자동화된 판단의 **근거**이고, 참조가 아무 데도 닿지 않는 근거는 근거가 아니다. 제약은 적혀 있었고 켜는 것만 빠져 있었다 — 정의만 되고 배선 안 된 통제와 같은 형태다.

## 설명이 모델보다 틀렸던 곳

설명 도구에는 테스트가 하나도 없었다. `feature_importances_`가 없는 모델(로지스틱 회귀 등)에서는 **계수 크기를 그대로 중요도 순위로** 썼는데, 계수는 "이 컬럼 1단위당 효과"이고 단위는 컬럼끼리 비교되지 않는다. 그렇게 매긴 순위는 중요도가 아니라 **측정 단위**를 매긴다.

데모 데이터는 `scripts/make_demo_data.py`가 생성하므로 참값이 있다. 모델이 학습한 계수는 생성에 쓴 값과 소수점 둘째 자리까지 일치했다 — **모델은 옳았고 설명이 틀렸다.**

| | 옛 순위 (계수) | 참 영향력 (계수 × σ) |
|---|---|---|
| 1위 | support_tickets | **tenure_months** |
| 2위 | contract_type | last_login_days |
| 3위 | **tenure_months** | support_tickets |

`support_tickets`는 0~6, `tenure_months`는 1~71을 오간다. 단위당 계수는 전자가 크지만 관측 범위 전체의 영향력은 후자가 약 3배다. 표준편차로 정규화해 고쳤고, 이름도 `standardized_coefficient`로 바꿨다 — **SHAP이 아닌 것을 SHAP이라 부르지 않는다.**

고치는 과정에서 하나 더 있었다. 처음에 `backend/tools/shap_explainer.py`를 고쳤는데 **그 경로는 돌지 않는다** — `backend.main`에 `global_explanation_items`가 있으면 그쪽이 먼저 반환한다. 진짜 로직은 `main_parts/032`에 있었다.

## 30초 데모 — 서버 없이

```bash
python3 scripts/make_demo_data.py
python3 scripts/demo.py --leaky                    # 검사 적용
python3 scripts/demo.py --leaky --ignore-leakage   # 권고를 무시하면
```

프로파일 → 누출 검사 → 학습 → 증거 검증 → 보고서까지 한 파일에 대해 전 과정을 출력한다. 두 번 돌리면 차이가 보인다: 권고를 적용하면 AUC가 1.0에서 0.778로 내려가고, 무시하면 검증이 **보고서 작성 자체를 막는다.**

## 누출 검사가 실제로 모델을 바꾼다

```bash
python3 -m pytest tests/ -q          # 281 tests
```

게이트를 하나씩 검증하는 것과 그 권고가 모델에 도달하는지는 다른 문제다. 무시되는 권고는 안전이 아니라 서류다. 같은 데이터를 두 번 학습해 실측했다.

| | ROC-AUC |
|---|---:|
| 누출을 둔 채 학습 | **1.0** — 교과서적 누출 신호 |
| 검사기 권고 적용 | **0.778** — 깨끗한 데이터와 일치 |

이 격차가 제품이 작동한다는 증거다.

검사는 이름이 아니라 **컬럼이 무엇을 하는지**를 잰다. 이름만 보던 시절에는 `exit_survey_score`가 잡혔지만 이유가 "score"라는 단어였고, `wellbeing_index`로 이름만 바꾸면 같은 값·같은 분리력(8.43 대 2.08)으로 그냥 통과했다. 경위는 [`docs/DEMO_DATA.md`](docs/DEMO_DATA.md).

## 데모 데이터

```bash
python3 scripts/make_demo_data.py
```

라이선스가 얽히지 않도록 외부 데이터셋을 넣지 않고 합성한다. 그중 하나에는 서로 다른 방식으로 새는 컬럼 셋이 의도적으로 심어져 있어, 누출 검사가 실제로 작동하는 것을 볼 수 있다. 이 데이터를 만드는 과정에서 검사기의 결함 세 가지가 드러났고 그 경위는 [`docs/DEMO_DATA.md`](docs/DEMO_DATA.md)에 있다.

## 라이선스

Apache License 2.0. [`LICENSE`](LICENSE) 참조.

## 함께 보기

이 저장소는 다섯 개 중 하나다. 전체 지도와 각각이 무엇을 발견했는지는 [프로필](https://github.com/ohsewool)에 있다.

- [`agent-safety-core`](https://github.com/ohsewool/agent-safety-core) — 승인과 실행의 결속 · 1회용 lease · UNKNOWN_OUTCOME
- [`rag-profile-selector`](https://github.com/ohsewool/rag-profile-selector) — 인용이 어디를 가리키는지 측정 · 한국어 법령 코퍼스
- [`mcp-gateway`](https://github.com/ohsewool/mcp-gateway) — MCP 서버 앞의 보안 프록시
- [`document-intelligence`](https://github.com/ohsewool/document-intelligence) — 파서에 의존하지 않는 문서 증거 모델
