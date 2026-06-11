# ModelMate

ModelMate는 CSV를 업로드하면 데이터 구조 확인, 타깃 추천, 모델 비교,
결과 요약, 설명 가능성 확인, 새 데이터 예측, 공유/API 흐름을 제공하는
졸업프로젝트용 AutoML 웹 서비스입니다.

## 배포

- Railway: https://web-production-5d6fa.up.railway.app/
- GitHub: https://github.com/ohsewool/-
- Branch: `main`

## 기존 AutoML 기능

- CSV/TXT/TSV 업로드와 데이터셋 유효성 검사
- 데이터 분야와 예측 목적 추정
- 타깃 컬럼 추천과 제외 컬럼 정리
- 여러 모델 교차검증 비교
- Optuna 기반 성능 개선 옵션
- 결과 요약, XAI/이유 보기, 새 데이터 예측
- 공유/API 화면과 작업 기록 재사용

## Agentic AutoML 업그레이드 방향

ModelMate는 real tool-calling Agentic AutoML 플랫폼 방향으로 확장 중입니다.
현재 구현은 기존 AutoML을 유지하면서 agent가 사용할 수 있는 tool, evidence,
decision, review skeleton을 단계적으로 추가한 상태입니다.

아직 완전한 자율 AI 데이터사이언티스트는 아닙니다. 실제 LLM planner,
동적 tool selection runtime, 자동 재학습, 자동 운영 배포는 아직 구현하지
않았습니다.

## 현재 구현된 Agentic Flow

1. 사용자 분석 목표를 mock planner가 구조화
2. tool registry에서 사용 가능한 도구 확인
3. data profile과 schema validation 수행
4. target recommendation과 leakage check 수행
5. 기존 AutoML을 `automl_training_tool` adapter로 호출
6. evaluation tool이 metric 기준으로 판단
7. XAI adapter가 explanation evidence bundle 생성
8. validation tool이 evidence bundle 검증
9. report writer가 grounded Markdown report draft 생성
10. deployment check tool이 deploy/review/hold/blocked advice 반환
11. human review/resume skeleton이 다음 행동 추천

## Tool Registry

- `data_profile_tool`
- `schema_validation_tool`
- `target_recommendation_tool`
- `leakage_check_tool`
- `automl_training_tool`
- `evaluation_tool`
- `shap_explainer_tool`
- `validation_tool`
- `report_writer_tool`
- `deployment_check_tool`

## Trace Concepts

Agentic 확장을 위해 다음 개념을 문서와 skeleton으로 준비했습니다.

- `analysis_runs`: 하나의 분석 목표와 실행 단위
- `analysis_steps`: plan, tool call, observation, decision 단계
- `tool_calls`: 도구 이름, 입력, 상태, 결과
- `observations`: 도구 결과에서 agent가 읽은 근거
- `decisions`: 다음 행동 판단
- `review_items`: 사람이 확인해야 하는 위험 항목
- `resume_recommendations`: review 이후 재개 방향 제안

## Human Review / Resume Skeleton

PR-12에서는 human review queue와 resume flow를 skeleton 수준으로 추가했습니다.

가능한 것:

- `needs_review`, `hold`, `blocked` decision을 review item으로 변환
- review item의 status/resolution/reviewer note 구조화
- resolution에 따라 다음 행동 추천

아직 하지 않는 것:

- 실제 DB queue
- async worker
- 자동 재학습
- 자동 배포
- 실제 LLM planner 재호출
- 프론트 review center 대규모 구현

## 로컬 실행

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

프론트엔드 빌드:

```bash
cd frontend
npm run build
```

## 테스트

```bash
python -m compileall backend
python scripts/run_upload_validation_qa.py
python scripts/run_training_benchmark.py
python scripts/run_full_qa.py --skip-slow
```

## 데모 시나리오

1. 로그인
2. CSV 업로드
3. 데이터 판단과 타깃 추천 확인
4. 모델 비교 실행
5. 성능과 추천 모델 확인
6. 결과 요약과 XAI 근거 확인
7. 작업 기록 또는 공유/API 흐름 확인
8. Agentic 확장 설명: tool registry, evidence, report, deployment advice,
   human review/resume skeleton

## 관리자 계정

환경변수로 변경할 수 있습니다.

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

환경변수가 없으면 기본값은 `admin@modelmate.local` / `admin1234`입니다.
