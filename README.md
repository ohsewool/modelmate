# ModelMate

[![tests](https://github.com/ohsewool/modelmate/actions/workflows/tests.yml/badge.svg)](https://github.com/ohsewool/modelmate/actions/workflows/tests.yml)

ModelMate는 CSV 데이터를 업로드하면 데이터 구조 분석, 예측 타깃 추천, 모델 비교, 근거 기반 보고서, 예측 API 준비도까지 하나의 흐름으로 제공하는 Korean-first Agentic AutoML SaaS MVP입니다.

English summary: ModelMate turns CSV data into explainable predictions, grounded reports, and reusable APIs through a guided AI analyst workflow.

## 배포 이력

Railway에 배포해 운영했다. 그 인스턴스는 **무료 플랜 만료로 지금은 내려가 있고**, 링크를 남겨두면 방문자가 `Application not found`를 만나므로 지웠다 — 죽은 링크는 없는 링크보다 나쁘다.

배포 설정 자체는 저장소에 남아 있어 다시 띄울 수 있다: [`railway.toml`](railway.toml), [`Procfile`](Procfile), [`nixpacks.toml`](nixpacks.toml).

문서 안 링크도 같이 정리했다. `docs/` 일곱 문서가 그 죽은 주소를 그대로 들고 있었다 — **한 파일에서 원칙을 말하고 일곱 파일에서 어기고 있었다.** 따라 하라고 적힌 QA 명령은 로컬 주소로 바꿔 지금 실제로 동작하고, 과거 실행 보고서는 기록으로 선언했다. `tests/test_no_dead_deployment_links.py`가 다시 들어오는 것을 막는다 — 네트워크를 쓰지 않는다. 인터넷이 끊긴 CI에서 조용히 통과하는 검사는 검사가 아니다.

### 테스트 수를 내가 부풀렸다 — 되돌렸다

문서 검사를 문서마다 파라미터로 걸었더니 다섯 저장소에서 **119개가 늘었다.**
검사하는 성질은 5개인데 문서가 늘 때마다 숫자가 늘었다. modelmate는 한 파일이
88개를 만들어 427에서 515로 뛰었다.

이 저장소들은 README가 주장하는 테스트 수를 CI가 실제 수집 개수와 대조한다.
숫자가 두 번 어긋난 뒤에 만든 장치다. **그 숫자가 뜻을 가지려면 내가 먼저
부풀리지 말아야 한다.** 한 성질에 테스트 하나로 합치고, 어느 문서가 걸렸는지는
실패 메시지가 말하게 했다 — 파라미터 이름이 해주던 일이고, 그것 때문에 개수를
왜곡할 이유는 없다.

### Agent Mode가 절반에서 멈춰 있었다

README가 앞세우는 기능인데 **어떤 검사도 이 경로를 치지 않았다.** `backend/agents/executor.py`는 커버리지 9%였고, 앱을 띄워 스모크 13개를 전부 돌려도 움직이지 않았다 — 엔드포인트 12개가 있고 아무도 치지 않고 있었다.

돌려보니 사슬이 절반에서 멈춘다. 학습은 `AutoML training completed`로 성공 관측을 남기고, **바로 다음 설명 도구가 "Run AutoML training before explanation."으로 실패**한다. 같은 요청 안에서 한쪽은 썼고 한쪽은 못 읽었다.

원인은 스레드 경계였다. `automl_training_tool`은 이미 도는 이벤트 루프 안에서 호출되면 코루틴을 `ThreadPoolExecutor`로 넘기는데, **`ContextVar`는 스레드 경계를 넘지 않는다.** 새 스레드는 빈 문맥에서 시작해 기본 스코프를 읽고, 그래서 `set_target`과 `run_cv`가 **요청 버킷이 아니라 공유 기본 버킷**에 썼다.

**조용한 쪽이 더 나쁘다.** 요청별 격리를 넣은 이유가 정확히 그 공유 버킷을 없애는 것이었다 — A가 올린 데이터를 B의 다음 요청이 분석하던 문제. 이 경로만 그리로 되돌아가 있었고, Agent Mode가 어디에서도 실행된 적이 없어 아무도 몰랐다.

`contextvars.copy_context()`로 고쳤다. 고치기 전 7단계·설명 실패 → 고친 뒤 **10단계 전부 완료**(설명·검증·보고서·API 준비도까지).

`scripts/run_agent_mode_smoke.py`가 이 경로를 지킨다. **보는 것은 "200이 왔다"가 아니라 "사슬이 끝까지 갔다"이다** — 200은 그때도 계속 오고 있었다. 수정 전 서버에 대고 돌리면 3건이 실패한다.

### 프런트엔드가 부르는 엔드포인트가 백엔드에 있는가

두 계층이 한 계약을 공유하는데 **맞춰보는 곳이 없었다.** 백엔드 라우트 이름을 바꾸면 프런트엔드는 조용히 깨진다 — pytest는 백엔드만 보고, 제품 스모크는 HTTP API를 직접 치며(프런트가 쓰지 않는 경로도 포함해서), `vite build`는 문자열 안의 URL을 검사하지 않는다. **사용자만 안다.**

이 저장소들이 반복해서 찾아온 모양이다: 같은 질문에 답하는 장치가 둘인데 어긋나는지 보는 것이 없다. 누출 검사기와 평가 관문이 그랬고, export 검증기와 원장이 그랬고, `can_rerun`과 재실행 엔드포인트가 그랬다.

**호출 99개가 전부 실재하는 라우트를 가리킨다** — 빈손이다. 그래도 다음에 라우트 이름이 바뀌면 여기서 걸린다.

**메서드까지 함께 본다.** 경로는 있는데 그 메서드가 없는 경우가 실제 실패 모드이고, 경로만 비교하면 `DELETE /api/state`가 통과한다. 없는 경로와 없는 메서드 둘 다로 잡히는 것을 확인했다.

### 서빙되는 프런트엔드가 현재 소스에서 나온 것인가

백엔드가 `frontend/dist`를 정적으로 서빙하고 그 dist는 저장소에 커밋돼 있다 — 배포에 빌드 단계가 없다. 그런데 **아무것도 dist와 src를 묶어두지 않았다.** `src`만 고치고 빌드를 잊으면 앱은 옛 코드를 서빙하는데 **모든 검사가 통과한다**: 제품 스모크는 HTTP API를 치고, `vite build`는 성공하고, pytest는 백엔드만 본다. 사용자만 안다.

빌드 결과를 다시 만들어 비교하지 **않는다.** 그건 툴체인이 바이트 단위로 재현될 때만 성립하고, node·vite 버전이 조금만 달라도 거짓 실패를 낸다 — **거짓 실패를 내는 검사는 사람들이 끄는 검사다.** 대신 빌드 **입력의 지문**을 dist 옆에 남기고 그걸 비교한다.

(2026-08-21 기준 `npx vite build`는 커밋된 dist를 바이트 단위로 재현한다. 그래도 지문을 쓰는 이유는 위와 같다 — **오늘 재현된다는 것과 다른 기계에서도 재현된다는 것은 다른 주장이다.**)

`src`를 한 줄 고쳐 잡히는 것, 자산이 사라져도 잡는 것, 지문이 없으면 통과가 아니라 실패하는 것을 확인했다.

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
python scripts/run_product_smoke.py --base-url http://127.0.0.1:8000   # 16개 검사
```

`backend/main.py`는 `main_parts/*.part`를 import 시점에 조립한다. 테스트는 모듈을 직접 import하므로 조립이 깨져도 알 수 없다 — **스위트가 통과한다는 것과 앱이 뜬다는 것은 다른 주장이다.** 그래서 [product 워크플로](.github/workflows/product.yml)가 매 push마다 서버를 띄우고 이 스모크를 돌린다. 스모크가 **실패할 줄 아는지** 먼저 확인한 뒤에 신뢰한다 — 아무것도 듣고 있지 않은 포트를 향해 한 번 돌려 실패하는 것을 보고, 그 다음에 진짜 서버를 친다.

Frontend:

```bash
cd frontend
npm install
npm run build
python3 ../scripts/check_frontend_build_current.py --update   # 빌드 지문 갱신
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
- **클라이언트는 남의 범위에 닿을 수 없다.** 원래 여기 적혀 있던 문장은 "범위는 호출자가 고르지 않는다"였고, **절반이 틀렸다.** 계정 범위는 서명된 토큰의 `sub`라 서버가 정하지만, 데모 게스트 범위는 클라이언트가 보낸 `x-modelmate-guest-session` 헤더에서 나온다 — 클라이언트가 문자열을 고른다.
  실제로 성립하는 것은 더 좁다. 서버가 `guest:` 접두사를 붙이고 헤더에서 콜론을 지우므로 `guest:<무엇이든>`이 계정 식별자(UUID)와 같아질 수 없고, 공유 기본 버킷에도 닿을 수 없다. 계정 id 그대로·`../`·접두사 흉내·널 바이트·`__default__`를 전부 시도해도 `guest:` 아래로 떨어진다.
  **성립하지 않는 것도 적어둔다**: 같은 세션 id를 보낸 두 게스트는 버킷을 공유하고, 정제 때문에 `a:b:c`와 `abc`가 같은 범위가 된다. 세션 식별자의 본성이고 쿠키와 다르지 않다 — 감추면 같은 과신을 작은 글씨로 반복하는 것이다. `tests/test_scope_is_not_client_choosable.py`가 양쪽을 다 고정한다.
  (docstring은 지난 회차에 고쳤는데 **이 문장을 못 고쳤다.** 같은 주장이 두 곳에 살면 한 곳만 고쳐진다 — 이 프로젝트가 반복해서 만나는 모양이고, 이번엔 내가 만들었다.)

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

프로파일 → 누출 검사 → 학습 → 증거 검증 → 보고서까지 한 파일에 대해 전 과정을 출력한다. 두 번 돌리면 차이가 보인다: 권고를 적용하면 AUC가 1.0에서 0.778로 내려가고 검증은 `grounded`가 되며, 무시하면 검증이 `invalid`로 판정하고 **보고서가 스스로 차단 상태를 밝힌다** — 요약 첫 문장과 한계 고지에 차단 사유가 들어간다.

보고서 작성을 아예 막지는 않는다. 막으면 사용자는 이유를 볼 수 없고, 근거를 보여주는 것이 이 제품의 요지다.

**이 문장은 원래 "검증이 보고서 작성 자체를 막는다"였고, 그런 일은 일어나지 않았다.** 확인해보니 더 나쁜 것이 있었다 — 권고를 **따른** 실행도 똑같이 차단됐다. 증거 묶음에 넘어가는 누출 정보가 학습이 쓴 컬럼이 아니라 원본 데이터셋 전체의 것이었기 때문이다. 학습 뒤 재검사는 `low`/`high`로 정확히 갈리는데 아무도 읽지 않았다. **안전장치가 순응한 사용자를 벌하면 사람들은 그것을 끈다.**

## 권고를 따라도 결과가 같았다

한 층 위에 같은 모순이 하나 더 있었다. 관문들이 읽는 `leakage_risk`는 **데이터셋 전체**에 대한 판정인데, 관문은 그것을 **학습된 모델**에 대한 것으로 읽었다.

그래서 표시된 컬럼을 전부 제외한 사용자도 `invalid` / `blocked`에 도달했다 — **무시한 경우와 완전히 같은 판정이다.** 결과를 바꿀 수 없는 권고는 권고가 아니다.

학습이 끝난 뒤 **실제로 사용된 특징**만으로 다시 검사한다. 그것이 관문이 실제로 묻는 질문이다 — *이 모델이 누출 위에 서 있는가.* 데모 데이터에서 제외 전 `high`, 제외 후 `low`이고, 그 차이가 이 체인 전체가 만들어내려던 것이다.

| 시나리오 | 누출 | 증거검증 | 배포 |
|---|---|---|---|
| 누출 방치 | high | invalid | **blocked** |
| 권고 적용 | low | grounded | needs_review |
| 깨끗한 데이터 | low | grounded | needs_review |

재검사가 실패하면 필드를 비워 둔다 — 그러면 관문이 데이터셋 전체 판정으로 되돌아가고, 그게 안전한 방향이다. **실패가 "누출 없음"으로 읽히면 안 된다.**

## 두 안전장치가 서로 반대로 말하고 있었다

누출 검사기는 타깃을 재현하는 컬럼을 빼라고 한다. 데모 데이터에서 그러면 AUC가 1.000에서 0.778로 내려가고, **평가 관문의 통과선(0.80)을 넘지 못한다.**

즉 **권고를 따르면 무시했을 때보다 나쁜 판정을 받았다.** 나쁜 모델을 잡으라고 있는 관문이 누출에 상을 주고 있었다.

고치는 방법은 통과선을 낮추는 게 아니다 — 그건 근거 없는 숫자를 다른 근거 없는 숫자로 바꾸는 것이다. **지표는 그것이 얻어진 특징만큼만 의미가 있다.** 높은 누수 위험 위에 앉은 높은 점수는 모델에 유리한 증거가 아니라 불리한 증거다. 그래서 "의심스럽게 높음" 임계값을 새로 만드는 대신, **누출 검사기가 이미 계산한 심각도를 읽는다.**

기본 통과선 0.80/0.65는 표준이 아니라 출발점이라고 명시했다. 0.75 ROC-AUC는 값어치 있는 이탈 예측 모델일 수도, 쓸 수 없는 임상 모델일 수도 있고 이 파일은 어느 쪽인지 모른다. **이 프로젝트의 데모가 통과하도록 0.75로 낮추지 않았다** — 그건 표본에 기준을 맞추는 일이다.

## 누출 검사가 실제로 모델을 바꾼다

```bash
python3 -m pytest tests/ -q          # 689 tests
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

## 기록

이 저장소는 6월에 팀 분할 단계를 거쳤고 그때의 문서 아홉 개가 루트에 남아 있었다.
`codex/split-for-team` 브랜치와 "frontend teammates"를 가리키는 것들이라, 갓 클론한
사람이 처음 보는 화면의 절반이 존재하지 않는 팀의 인수인계 메모였다.

지우지 않고 [`docs/archive/2026-06-team-split/`](docs/archive/2026-06-team-split/README.md)
으로 옮겼다. 그때 무엇을 알고 무엇을 정했는지가 거기 있다.

- [2026-06 팀 분할 단계](docs/archive/2026-06-team-split/README.md) — API 계약 메모,
  발표 런북, 11월 로드맵, 공개 데이터셋 1차 결과 등 아홉 건
- [2026-08-21 QA 스냅숏](docs/archive/qa/2026-08-21/README.md) — 추적되고 있던
  런타임 산출물
- 루트에 남은 [`CODEX_HANDOFF.md`](CODEX_HANDOFF.md) · [`TEAM_SPLIT.md`](TEAM_SPLIT.md) ·
  [`QA_CHECKLIST.md`](QA_CHECKLIST.md) · [`DEMO_DATASET_PLAYBOOK.md`](DEMO_DATASET_PLAYBOOK.md)
  은 각자 `<!-- historical: -->`로 선언돼 있다

**선언된 낡음은 기록이고, 선언되지 않은 낡음은 결함이다.** 이 저장소는 그 규칙을
절반만 적용하고 있었다 — 넷은 선언돼 있었고 아홉은 아니었다.

## 함께 보기

이 저장소는 다섯 개 중 하나다. 전체 지도와 각각이 무엇을 발견했는지는 [프로필](https://github.com/ohsewool)에 있다.

- [`agent-safety-core`](https://github.com/ohsewool/agent-safety-core) — 승인과 실행의 결속 · 1회용 lease · UNKNOWN_OUTCOME
- [`rag-profile-selector`](https://github.com/ohsewool/rag-profile-selector) — 인용이 어디를 가리키는지 측정 · 한국어 법령 코퍼스
- [`mcp-gateway`](https://github.com/ohsewool/mcp-gateway) — MCP 서버 앞의 보안 프록시
- [`document-intelligence`](https://github.com/ohsewool/document-intelligence) — 파서에 의존하지 않는 문서 증거 모델
