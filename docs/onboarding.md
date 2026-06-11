# ModelMate Onboarding Templates

This document helps a first-time user understand what kind of CSV works well and
what analysis goal to enter. It is a guided demo workflow, not a fully automated
demo runner.

## What ModelMate Solves

ModelMate helps a user turn a tabular CSV into:

1. a prediction target,
2. model comparison,
3. explanation and trust summary,
4. grounded report,
5. reusable prediction API or project rerun flow.

## Good CSV Examples

Good demo CSVs usually have:

- one row per case, customer, product, event, or time period
- several feature columns that are known before prediction
- one target column that the user wants to predict
- limited sensitive personal data
- enough rows for a basic model comparison

Avoid CSVs that are only IDs, names, addresses, free-form notes, or one-column
lists.

## Goal Templates

English:

- I want to predict which customers may churn.
- I want to score leads based on conversion likelihood.
- I want to predict whether a student may pass or fail.
- I want to predict appointment no-shows.
- I want to estimate sales from historical CSV data.
- I want to predict manufacturing defects from machine signals.

Korean:

- 고객 이탈 가능성을 예측하고 싶습니다.
- 리드가 전환될 가능성을 점수화하고 싶습니다.
- 학생의 합격/불합격 가능성을 예측하고 싶습니다.
- 예약 노쇼 가능성을 예측하고 싶습니다.
- 과거 CSV 데이터로 매출을 예측하고 싶습니다.
- 제조 설비 신호로 불량 가능성을 예측하고 싶습니다.

## Recommended Sample Flow

1. Download one sample CSV from `sample_data`.
2. Open the upload screen.
3. Upload the sample CSV.
4. Confirm the recommended target and excluded columns.
5. Run model comparison.
6. Open the report screen and review analysis trace, trust panel, evidence
   summary, and limitations.
7. Open prediction/API documentation or project history to show reuse.

## Demo Mode Boundary

The current demo mode is guided, not automatic. ModelMate does not automatically
run every step from upload to report without user confirmation. This keeps the
MVP transparent and avoids pretending that a full production-grade autonomous
agent exists.
