# Final Release Checklist

## PR-32 Agentic AutoML Final Checks

- [ ] Landing page가 Korean-first copy로 로드된다.
- [ ] CSV 업로드 또는 starter/sample analysis가 동작한다.
- [ ] 기존 빠른 자동 분석 경로가 Agent Mode와 별도로 접근 가능하다.
- [ ] Workspace navigation이 dashboard, projects, jobs, reports, prediction API, settings를 연결한다.
- [ ] Agent Mode에서 한국어 목표 입력이 가능하다.
- [ ] Agent Run이 저장된다.
- [ ] Agent Plan이 저장된다.
- [ ] tool call records가 실제 실행 결과에 기반해 저장된다.
- [ ] observations가 저장된다.
- [ ] decisions가 저장된다.
- [ ] validations와 warnings가 표시된다.
- [ ] artifacts/report/API readiness가 연결된다.
- [ ] Run Detail에서 persisted trace가 새로고침 후에도 유지된다.
- [ ] human review/recovery가 필요한 상황을 경고하거나 조치로 표시한다.
- [ ] report가 열리고 limitation 문구를 포함한다.
- [ ] prediction API readiness가 production deployment 완료처럼 과장되지 않는다.
- [ ] SHAP/feature importance를 causality로 표현하지 않는다.
- [ ] README와 docs가 fully autonomous enterprise AutoML처럼 과장하지 않는다.
- [ ] `python -m compileall backend` 통과.
- [ ] `cd frontend && npm run build` 통과.

## PR-32 Demo Script Check

1. Landing page에서 “CSV 예측 분석 SaaS MVP” 포지셔닝을 설명한다.
2. 샘플 또는 starter pack으로 분석을 시작한다.
3. Agent Mode에서 한국어 목표를 입력한다.
4. 생성된 Plan을 확인한다.
5. pipeline 실행 후 Run Detail을 연다.
6. tool call, observation, decision, validation, artifact를 보여준다.
7. report와 prediction API readiness를 보여준다.
8. human review/recovery는 안전장치로 설명한다.
9. 마지막에 현재 한계와 향후 roadmap을 정직하게 말한다.

ModelMate 포트폴리오, 졸업 발표, beta demo 전 최종 확인 목록입니다.

## Build / Test

- [ ] `python -m compileall backend`
- [ ] `cd frontend && npm run build`
- [ ] `python scripts/run_product_smoke.py --base-url http://localhost:8000`
- [ ] `python scripts/run_release_qa.py --base-url http://localhost:8000`
- [ ] Railway 배포 후 deployed smoke test

## Deployment

- [ ] GitHub `main` 최신 commit 확인
- [ ] Railway build 성공 확인
- [ ] `/` 랜딩 페이지 로드 확인
- [ ] 최신 frontend bundle 반영 확인
- [ ] 환경변수에 secret이 노출되지 않는지 확인
- [ ] rollback 가능한 마지막 commit 확인

## Demo Flow

- [ ] guest demo mode 접근 가능
- [ ] starter pack flow 정상
- [ ] CSV upload 정상
- [ ] target recommendation 표시
- [ ] model comparison 실행
- [ ] report/export 확인
- [ ] prediction API tab 확인
- [ ] project save/rerun 확인
- [ ] jobs status 확인
- [ ] usage limit state 확인
- [ ] feedback form 확인
- [ ] pilot inquiry form 확인

## Safety / Trust

- [ ] token 전체 값이 목록에 노출되지 않음
- [ ] token 생성 warning 표시
- [ ] raw CSV/log/secret이 화면에 노출되지 않음
- [ ] deleted dataset 상태가 친절하게 표시됨
- [ ] deleted dataset 기반 rerun이 차단되거나 안내됨
- [ ] request ID/error ID가 있는 오류는 무섭지 않게 표시됨
- [ ] 실제 결제 수집이 없다는 문구 확인
- [ ] 샘플 데이터가 합성 데이터임을 표시

## Korean UI Copy

- [ ] 랜딩 페이지 한국어 우선
- [ ] Dashboard/Projects/Jobs/Reports/Settings 한국어 우선
- [ ] Prediction API와 token은 자연스럽게 영어 technical term 유지
- [ ] 버튼/empty/loading/error state가 한국어 우선
- [ ] 과장 표현 없음

## Responsive

- [ ] desktop 화면 확인
- [ ] tablet 폭 확인
- [ ] mobile 폭에서 nav/card/table overflow 확인
- [ ] project detail tab overflow 확인
- [ ] 버튼 클릭 영역 확인

## Docs

- [ ] README 최신화
- [ ] docs/README.md 링크 확인
- [ ] demo guide 확인
- [ ] screenshot checklist 확인
- [ ] portfolio case study 확인
- [ ] known limitations 확인
- [ ] deployment notes 확인
- [ ] product roadmap에서 future item을 구현 완료처럼 표현하지 않음

## Release Blockers

아래 중 하나라도 발생하면 public demo 전에 수정합니다.

- [ ] 랜딩 또는 dashboard가 로드되지 않음
- [ ] CSV 업로드가 500으로 실패
- [ ] 정상 샘플 분석이 완료되지 않음
- [ ] report/export가 열리지 않음
- [ ] token 전체 값이 목록/로그에 노출됨
- [ ] 남의 project/report/dataset 접근 가능
- [ ] 실제 billing이 연결된 것처럼 보임
- [ ] README/docs가 enterprise-grade 또는 guaranteed claim을 포함
## Workspace Data Integration

- [ ] 로그인 상태에서 CSV 업로드 후 `/api/projects`에 project가 표시됨
- [ ] 분석 완료 후 Dashboard/Projects에 최근 실행 정보가 표시됨
- [ ] Project Detail에서 runs/timeline/report/API 탭이 같은 project 기준으로 열림
- [ ] Jobs 화면에 일반 분석 완료 기록 또는 background job 기록이 표시됨
- [ ] Reports 화면에 analysis run 기반 report metadata가 표시됨
- [ ] Prediction APIs 화면에 준비 상태 또는 model-not-ready 안내가 표시됨
- [ ] guest demo는 private workspace 목록과 섞이지 않음
- [ ] `python scripts/run_workspace_integration_smoke.py --base-url http://localhost:8000` 통과

## PR-26 Workspace Regression Checklist

- [ ] 로그인 후 CSV 업로드를 완료하면 Dashboard와 Projects에 같은 project가 표시된다.
- [ ] `/api/run-cv` 완료 후 Jobs 화면에 해당 분석 실행 기록이 표시된다.
- [ ] Reports 화면에 분석 결과 기반 report metadata가 표시된다.
- [ ] Prediction APIs 화면은 모델 준비 여부 또는 준비 전 안내를 표시한다.
- [ ] Project Detail에서 overview/runs/report/API 정보가 같은 project 기준으로 열린다.
- [ ] Settings 사용량에 프로젝트, 데이터셋, 오늘 작업 카운터가 반영된다.
- [ ] 새로고침 후에도 같은 로그인/게스트 세션의 workspace data가 유지된다.
- [ ] guest demo mode에서도 같은 브라우저 session 안에서는 workspace data flow가 유지된다.
- [ ] guest demo resource와 로그인 사용자의 private project 목록이 섞이지 않는다.
- [ ] desktop에서는 불필요한 hamburger button이 보이지 않는다.
- [ ] mobile에서는 hamburger button이 sidebar drawer를 열고 닫는다.
- [ ] `python scripts/run_workspace_integration_smoke.py --base-url http://localhost:8000`가 통과한다.
