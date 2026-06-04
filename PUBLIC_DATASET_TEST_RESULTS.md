# Public Dataset Test Results

Branch: `codex/split-for-team`

This file records the first AutoML robustness pass for the Part 1 backend owner.

## Summary

| Dataset | Type | Rows x Cols | Best Model | Features After Preprocess | Failed Models | Result |
|---|---:|---:|---|---:|---:|---|
| iris_classification | classification | 120 x 8 | Logistic Regression | 4 | 0 | pass |
| breast_cancer_classification | classification | 120 x 34 | Logistic Regression | 30 | 0 | pass |
| wine_multiclass_classification | classification | 120 x 17 | Random Forest | 13 | 0 | pass |
| diabetes_regression | regression | 120 x 14 | Random Forest | 10 | 0 | pass |
| california_housing_regression | regression | 120 x 12 | Ridge Regression | 8 | 0 | pass |

## What Was Tested

- CSV-shaped public datasets generated from scikit-learn public datasets.
- Added synthetic `row_id`, `created_at`, and `constant_col` columns to verify auto-drop logic.
- Ran `set_target`, `run_cv`, `feature_info`, and `predict_single` for every dataset.
- Confirmed classification and regression workflows both pass.

## Auto-Drop Behavior

| Dataset | Suggested Drops |
|---|---|
| iris_classification | row_id, created_at, constant_col |
| breast_cancer_classification | row_id, created_at, constant_col |
| wine_multiclass_classification | row_id, created_at, constant_col |
| diabetes_regression | row_id, created_at, constant_col |
| california_housing_regression | row_id, created_at, constant_col |

## Notes

- ID-like, datetime-like, and constant columns are now filtered more conservatively.
- Model failures are represented with `status: failed` and `error_message` instead of fake `0.0` metrics.
- Next recommended step: test real uploaded CSV files from UCI/Kaggle-style sources and verify the frontend rendering of failed model rows.

## Real CSV Regression Pass - 2026-06-04

The overnight enhancement pass tested real CSV files previously used in the project discussion.
Both the manual model comparison path and the AI analysis coach path completed without errors.

| Dataset | Inferred Domain | Target Purpose | Task | Target | Best Model | Score | Result |
|---|---|---|---|---|---|---:|---|
| pima.csv | 의료/건강 진단 | 당뇨 여부 | classification | diabetes | Logistic Regression | 0.8314 ROC-AUC | pass |
| ch2025.csv | 수면/건강 라이프로그 | 수면/건강 상태 분류 | classification | S3 | Logistic Regression | 0.7336 ROC-AUC | pass |
| seoul_bike.csv | 공공교통/이용자 통계 | 가입자 수 예측 | regression | 가입건수 | Gradient Boosting | 0.9449 R2 | pass |
| playground.csv | 공공시설/안전 관리 | 시설 상태/여부 분류 | classification | 의무시설여부코드명 | Random Forest | 0.9535 ROC-AUC | pass |

### Fixes Found During This Pass

- Public bicycle signup data was a numeric regression target, but the agent path previously used classification CV. It now uses regression models and KFold when the target is a continuous numeric value.
- Playground facility data used a Korean string target with pandas string dtype. Target encoding now handles object and string dtype safely.
- `의무시설여부코드명` had a near-duplicate leakage feature `의무시설여부코드`. The auto-drop logic now removes target-code/code-name pairs before training.
- Small or imbalanced classification data now chooses a safe fold count instead of forcing 3-fold StratifiedKFold.

## Domain Benchmark Pass - 2026-06-04

Added `scripts/run_domain_benchmark.py` to repeatedly verify dataset-domain and target-purpose inference.
This is the base for adding more public datasets from UCI, Dacon, public data portals, and Kaggle-style CSVs.
Current checked cases: 13 / passed: 13 / failed: 0. The script exits with failure if a checked domain or purpose expectation breaks.

| Benchmark | Expected Domain | Expected Purpose | Result |
|---|---|---|---|
| heart_health | 의료/건강 진단 | 질병/진단 여부 | pass |
| manufacturing_quality | 제조/설비 품질 | 고장 여부 | pass |
| customer_churn | 고객 이탈/CRM | 이탈 여부 | pass |
| sales_amount | 금액/매출 | 금액 예측 | pass |
| education_performance | 교육/학습 성과 | 합격/수료 여부 | pass |
| finance_credit | 금융/신용 리스크 | 대출/연체 위험 판단 | pass |
| real_estate_price | 부동산/가격 예측 | 부동산 가격 예측 | pass |
| marketing_conversion | 마케팅/구매 전환 | 구매/전환 여부 | pass |
| hr_attrition | 인사/HR | 퇴사/이직 여부 | pass |
| weather_environment | 날씨/환경 | 환경 지표 예측 | pass |
| logistics_delay | 물류/배송 | 배송 지연 여부 | pass |
| security_fraud | 보안/이상 탐지 | 사기/이상 여부 | pass |
| unknown_table | 도메인 확인 필요 | 두 값 분류 | pass |

The same script also summarizes the four real CSV files used in the project:
`ch2025.csv`, `pima.csv`, `playground.csv`, and `seoul_bike.csv`.

## Training Benchmark Pass - 2026-06-04

Added `scripts/run_training_benchmark.py` to run end-to-end training checks without using external AI tokens.
The script prepares each dataset, selects the target, runs preprocessing, trains candidate models, and records the best model/score.

Current result: 14 / passed: 14 / failed: 0.

| Group | Cases |
|---|---|
| scikit-learn public datasets | iris, wine, breast cancer, diabetes regression, linnerud weight |
| synthetic representative CSVs | fault/failure classification, sales regression |
| real project CSVs | CH2025, Pima diabetes, playground facility, Seoul bike signup |
| public institution CSVs | Seoul subway monthly passenger files from Seoul Open Data Plaza |

Fixes found during this pass:

- Numeric column names now work in feature-drop checks.
- Numeric targets with mostly unique values are treated as regression instead of small-code classification.
- Benchmark scripts disable history writes so QA runs do not pollute user experiment history.
- Subway passenger-count files are recognized as public transport/user statistics and passenger-count regression.

Downloaded public institution files used during the benchmark are kept in `tmp_public_downloads/` and ignored by Git.
