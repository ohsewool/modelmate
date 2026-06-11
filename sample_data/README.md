# ModelMate Demo Datasets

These files are small synthetic demo datasets for presentation and QA use.
They are not real personal or business records.

## Recommended Demo Order

1. `customer_churn_demo.csv`
   - Recommended target: `churn`
   - Expected task type: classification
   - Demo story: predict whether a customer is likely to leave based on usage,
     contract, support, and login behavior.
   - Useful screen to show: target recommendation, excluded `customer_id`,
     model comparison, report/XAI.

2. `manufacturing_quality_demo.csv`
   - Recommended target: `defect`
   - Expected task type: classification
   - Demo story: predict product defects from machine and environment signals.
   - Useful screen to show: quality-domain judgment, leakage/ID caution for
     `batch_id`, model comparison.

3. `public_bike_signup_demo.csv`
   - Recommended target: `signup_count`
   - Expected task type: regression
   - Demo story: predict public bike signups from month, user group, promotions,
     station count, and weather.
   - Useful screen to show: public-transport/public-service judgment,
     regression model comparison, grounded report.

## Positioning

Use these files as backup demo data. The main product story remains: a user can
upload an arbitrary CSV and ModelMate guides the analysis from data check to
prediction, report, and reusable prediction API.
