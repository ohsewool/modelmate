# ModelMate QA Gate

Build success is required, but it is not completion.

Do not mark a task as `done` only because `npm run build` or `python -m compileall backend` passed.

## Completion Rule

A task can be marked `done` only after all of the following are true:

1. Backend compile passes when backend code is touched.
2. Frontend build passes when frontend code is touched.
3. The actual user flow affected by the change has been smoke tested.
4. QA evidence is recorded in `.codex/RUN_LOG.md`, a PR summary, or a QA report.

If an affected user flow cannot be tested, mark it as `not verified`.
Do not report an untested flow as `passed`.

If smoke testing cannot be performed and the missing check is important to the change, mark the task as `needs_manual_verification`, not `done`.

## Required Pre-Merge Checks

변경 범위에 따라 아래 명령을 실행하고 결과를 기록한다.

```bash
python -m compileall backend
python scripts/run_sample_csv_gate.py
python scripts/qa_target_recommendation.py
python scripts/check_frontend_qa_contracts.py
python scripts/run_llm_foundation_qa.py
python scripts/run_llm_report_writer_qa.py
cd frontend && npm run build
```

통합 실행은 다음 명령을 사용한다. 배포 URL이 없으면 원격 smoke test는 사유와 함께 `skipped`로 기록된다.

```bash
python scripts/run_release_qa.py --skip-training
python scripts/run_release_qa.py --base-url <DEPLOYED_URL> --skip-training
```

`pass`가 아닌 필수 검사 결과가 있으면 merge하지 않는다. 환경상 실행할 수 없는 검사는 `not verified`로 기록하고 수동 검증 담당자를 정한다.

## Evidence Requirement

Every QA report must include concrete evidence where applicable:

- tested route
- tested CSV filename
- downloaded file first line
- response content type
- generated dataset id
- generated project id
- generated analysis run id or Agent Run ID
- final route URL
- result status
- screenshot note if manual
- pass / fail / not verified

## Standard Smoke Checklist

### A. CSV Upload

- [ ] Upload a valid CSV.
- [ ] Confirm row/column count appears.
- [ ] Confirm dataset/project reference is created.

### B. Sample CSV Download

For each sample CSV:

- [ ] Download the file.
- [ ] Confirm it does not start with `<!DOCTYPE html>`.
- [ ] Confirm the first row is a CSV header.
- [ ] Confirm the expected target column exists.
- [ ] Confirm the downloaded file can be uploaded back successfully.

Required sample targets:

- `customer_churn_demo.csv` -> `churn`
- `sales_demand_demo.csv` -> `demand`
- `equipment_failure_demo.csv` -> `failure_risk`
- `marketing_conversion_demo.csv` -> `converted`
- `student_performance_demo.csv` -> `passed`

### C. Quick Automatic Analysis

- [ ] Start quick automatic analysis.
- [ ] Confirm it still works.
- [ ] Confirm no broken route occurs.

### D. Goal-Based Analysis

- [ ] Open `/agent-mode`.
- [ ] Select or upload a CSV.
- [ ] Confirm suggested goal matches the dataset.
- [ ] Create analysis run.
- [ ] Execute plan.
- [ ] Confirm run id exists.
- [ ] Confirm dataset connection is preserved.
- [ ] Confirm no `/agent-mode/undefined`.

### E. Agent Run Detail

- [ ] Click detailed record / trace button.
- [ ] Confirm route uses a real run id.
- [ ] Refresh the detail URL directly.
- [ ] Confirm the page still renders.
- [ ] Confirm advanced trace is available.

### F. Human Review

- [ ] Trigger or inspect review-needed state.
- [ ] Confirm the UI explains why review is needed.
- [ ] Confirm action buttons are visible and meaningful.
- [ ] Confirm continuing does not lose previous trace.

### G. Report

- [ ] Report button works or shows honest empty state.
- [ ] Report screen explains result, cautions, and next actions.

### H. Prediction API

- [ ] API page works or shows honest readiness/empty state.
- [ ] API does not show false readiness for weak or unclear models.

### I. Navigation

Check these routes:

- [ ] `/dashboard`
- [ ] `/upload`
- [ ] `/agent-mode`
- [ ] `/projects`
- [ ] `/jobs`
- [ ] `/reports`
- [ ] `/prediction-apis`
- [ ] `/settings`

Confirm no broken links and no route like `/undefined`.

### J. Dataset-Specific Target Matrix

- [ ] `equipment_failure.csv`: `Machine failure`, classification. `TWF/HDF/PWF/OSF`는 주 타깃으로 선택하지 않는다.
- [ ] `titanic_like.csv`: `Survived`, classification. `Pclass`와 `PassengerId`는 주 타깃으로 선택하지 않는다.
- [ ] `customer_churn_demo.csv`: `churn`, classification.
- [ ] `student_performance_demo.csv`: `passed`, classification.
- [ ] `sales_demand_demo.csv`: `demand`, regression.
- [ ] `public_bike_summary.csv`: 타깃을 강제하지 않고 사용자 검토를 요구한다.
- [ ] `ambiguous.csv`: 후보를 제시할 수 있지만 낮거나 중간 confidence로 사용자 검토를 요구하고 자동 실행하지 않는다.

### K. Dataset State Isolation

- [ ] 데이터셋 A 분석 후 데이터셋 B를 선택한다.
- [ ] B의 업로드 요약, 타깃, 모델 결과, 보고서, API, Agent Mode에 A의 값이 남지 않는다.
- [ ] 무관한 데이터에서 `BMI`, `Age`, `diabetes`, `pregnant`, `plasma`가 나타나지 않는다.
- [ ] 무관한 데이터에서 `Machine failure`, `TWF`, `HDF`, `PWF`, `OSF`가 나타나지 않는다.
- [ ] dashboard/history 항목은 각 dataset/run/project 참조와 일치한다.

### L. Auth, LLM, Admin

- [ ] 로그아웃 상태의 분석 CTA와 보호 route는 안전한 `redirect`를 포함해 login으로 이동한다.
- [ ] login 후 원래 route로 돌아오며 `//` 형태의 외부 redirect는 허용하지 않는다.
- [ ] `LLM_ENABLED=false`, API key 누락, invalid response 모두 deterministic fallback으로 동작한다.
- [ ] raw CSV row, password, API key가 LLM context나 frontend에 포함되지 않는다.
- [ ] admin은 설정된 `ADMIN_EMAILS`에 의해서만 결정되고 제한을 우회한다.
- [ ] 일반 사용자는 무료 plan과 실제 사용량 한도를 본다.
- [ ] 공개 UI에 admin 전환 toggle이 없다.

## Known Regression Risks

- SPA fallback이 sample CSV 요청에 HTML을 반환할 수 있다.
- dataset 전환 시 이전 target/model/report state가 남을 수 있다.
- run/report/API 식별자가 없는 상태에서 `/undefined` route가 만들어질 수 있다.
- Target Recommendation 변경으로 ID, 코드, feature column이 결과 타깃보다 높게 평가될 수 있다.
- optional LLM 설정 오류가 deterministic report 생성을 막을 수 있다.
- admin 판정과 plan 표시가 서로 다른 source를 사용하면 quota가 잘못 적용될 수 있다.

## Rollback Notes

1. 실패한 QA case와 마지막 정상 commit을 기록한다.
2. product data migration이나 저장 데이터 삭제 없이 해당 PR 변경만 되돌린다.
3. rollback 후 sample gate, target QA, auth smoke, frontend build를 다시 실행한다.
4. Railway에서는 마지막 정상 deployment로 rollback하고 health/product smoke를 확인한다.

## Demo-Safe Checklist

- [ ] demo CSV에 개인정보와 민감정보가 없다.
- [ ] sample download가 실제 CSV이며 target column을 포함한다.
- [ ] LLM key 없이 demo가 동작한다.
- [ ] API token, secret, raw CSV row가 화면과 로그에 노출되지 않는다.
- [ ] report/API가 준비되지 않았으면 준비 완료로 과장하지 않는다.
- [ ] quick analysis와 goal-based analysis가 각각 정상 진입한다.
- [ ] 주요 route와 새로고침에서 full-page crash가 없다.

## Reporting Language

Use:

- `passed`: tested and confirmed with evidence.
- `failed`: tested and failed.
- `not verified`: not tested or could not be tested.
- `needs_manual_verification`: cannot mark done until a human checks the flow.
