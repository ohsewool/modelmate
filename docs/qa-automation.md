# ModelMate QA 자동화

PR-15의 QA gate는 build 성공만으로 완료를 판단하지 않는다. 실제 추천 엔진, sample asset, 인증 route 계약, LLM fallback과 배포 smoke 결과를 함께 확인한다.

## 로컬 필수 검사

```bash
python -m compileall backend
python scripts/run_sample_csv_gate.py
python scripts/qa_target_recommendation.py
python scripts/check_frontend_qa_contracts.py
python scripts/run_llm_foundation_qa.py
python scripts/run_llm_report_writer_qa.py
cd frontend
npm run build
```

`scripts/qa_target_recommendation.py`는 mock recommendation을 만들지 않고 `backend.tools.target_quality.best_meaningful_target`을 직접 호출한다. QA fixture는 `sample_data/qa/`에 있으며 개인 데이터가 없는 작은 합성 CSV다.

## 통합 QA

```bash
python scripts/run_release_qa.py --skip-training
python scripts/run_release_qa.py --base-url http://localhost:8000 --skip-training
python scripts/run_release_qa.py --base-url https://your-app.example --skip-training
```

`--base-url`이 있으면 auth, ownership, project history, background jobs, failure recovery, dataset deletion, prediction API token, usage limit, monitoring, feedback, workspace integration, product smoke를 실행한다. 환경상 사용할 수 없는 기존 script는 사유와 함께 `skipped`로 기록한다.

## 자동 확인 범위

- public/dist sample CSV가 HTML이 아니며 예상 target column을 포함하는지
- equipment, Titanic-like, churn, student, demand, public summary, ambiguous 데이터의 target recommendation 계약
- 보호 route와 landing CTA가 안전한 login redirect 계약을 유지하는지
- dataset 변경 시 upload/target/model 상태를 초기화하는 코드 경로가 유지되는지
- `/agent-mode/undefined`, `/reports/undefined`, `/prediction-apis/undefined` literal route가 없는지
- optional LLM 비활성화, key 누락, invalid response fallback
- LLM context에서 raw rows, password, API key 제외
- backend compile과 frontend production build

## 수동 확인이 필요한 범위

- 실제 브라우저에서 로그아웃 CTA와 login 후 redirect
- 데이터셋 A 분석 후 B로 전환했을 때 dashboard/report/API/history 전체의 state isolation
- quick analysis와 goal-based analysis의 최종 사용자 흐름
- review-needed 문구와 action의 이해 가능성
- report 결론, 중요 요인, 주의사항과 API readiness 표현
- admin/일반 사용자 계정의 plan 및 quota 표시

수동 결과는 `.codex/FINAL_QA_TEMPLATE.md` 형식으로 기록한다. 실행하지 못한 항목은 `passed`가 아니라 `not verified`로 표시한다.
