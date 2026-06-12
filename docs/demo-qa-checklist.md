# ModelMate Demo QA Checklist

Run this checklist before showing ModelMate to beta users or evaluators.

## Core Flow

- [ ] Landing page loads.
- [ ] Pricing page loads.
- [ ] Privacy / terms / security / pricing docs are reachable from README or
      GitHub.
- [ ] Sample dataset selector is visible on the upload screen.
- [ ] Sample CSV download link works.
- [ ] CSV upload works with `sample_data/customer_churn_demo.csv`.
- [ ] Target recommendation works.
- [ ] Excluded-column or leakage warning appears when relevant.
- [ ] AutoML training completes.
- [ ] Model comparison appears.
- [ ] Result summary appears.
- [ ] Agent timeline appears.
- [ ] Trust panel appears.
- [ ] Evidence summary appears.
- [ ] Report preview/export works.
- [ ] Prediction API docs/link works.
- [ ] Project save/rerun path works.
- [ ] Workspace/history reuse works.
- [ ] Failure message appears for invalid CSV.

## Backup Dataset Checks

- [ ] `manufacturing_quality_demo.csv` can be uploaded.
- [ ] `defect` is usable as the target.
- [ ] `batch_id` is treated as an identifier-like column.
- [ ] `public_bike_signup_demo.csv` can be uploaded.
- [ ] `signup_count` produces a regression flow.

## Trust And Safety Checks

- [ ] Report includes limitations.
- [ ] UI does not claim guaranteed prediction accuracy.
- [ ] UI does not claim enterprise AutoML replacement.
- [ ] UI does not claim production deployment is completed.
- [ ] Privacy guidance discourages sensitive data upload.
- [ ] Terms state that ModelMate is decision support, not final authority.

## Smoke Test Commands

```bash
python -m compileall backend
python scripts/run_upload_validation_qa.py
python scripts/run_full_qa.py --skip-slow
cd frontend
npm run build
```
