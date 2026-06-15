# ModelMate Final QA

This document is the final QA checklist before demo, deployment review, or small
beta testing.

Strict rule: build success is required, but not sufficient. Use
`.codex/QA_GATE.md` and `.codex/FINAL_QA_TEMPLATE.md` before marking a task
done. If a user flow cannot be tested, record it as `not verified`.

## Manual QA Checklist

- [ ] Landing page loads.
- [ ] Pricing page loads.
- [ ] Sample dataset selector appears on the upload screen.
- [ ] Sample CSV download links work.
  - [ ] Downloaded file content type is CSV or CSV-compatible.
  - [ ] Downloaded first line is a CSV header, not `<!DOCTYPE html>`.
  - [ ] Expected target column exists in each sample.
  - [ ] Downloaded sample can be uploaded back successfully.
- [ ] CSV upload works with `customer_churn_demo.csv`.
- [ ] Target recommendation appears.
- [ ] Excluded-column/leakage warning appears when relevant.
- [ ] AutoML training completes.
- [ ] Model comparison appears.
- [ ] Result summary appears.
- [ ] Agent timeline appears.
- [ ] Trust panel appears.
- [ ] Evidence summary appears.
- [ ] Report preview/export works through `/api/report/html`.
- [ ] Prediction API documentation matches `POST /api/v2/{model_id}/predict`.
- [ ] Project save/rerun path works.
- [ ] Workspace/history reuse works.
- [ ] Invalid CSV shows friendly failure guidance.
- [ ] Privacy, terms, security, and pricing docs are reachable.

## Automated Test Commands

```bash
python -m compileall backend
python scripts/run_sample_csv_gate.py
python scripts/run_upload_validation_qa.py
python scripts/run_training_benchmark.py
python scripts/run_full_qa.py --skip-slow
cd frontend
npm run build
```

## Demo Script Checklist

- [ ] Explain ModelMate in one sentence.
- [ ] Show sample CSV cards.
- [ ] Upload a sample CSV.
- [ ] Confirm target recommendation.
- [ ] Run model comparison.
- [ ] Show report, trust panel, and evidence summary.
- [ ] Show report export.
- [ ] Show prediction API documentation.
- [ ] Show project history or rerun flow.
- [ ] Mention known limitations honestly.

## Known Limitations

- No full LLM planner runtime.
- No automatic retraining loop.
- No production deployment automation.
- No payment or account-based quota.
- No full async job queue.
- No enterprise compliance program.
- Prediction quality depends on the uploaded dataset and validation results.

## Release Blockers

Treat these as blockers before demo or beta:

- CSV upload fails for normal sample files.
- AutoML training cannot complete on sample datasets.
- Report page does not show trust/evidence information.
- Report export endpoint fails.
- Prediction API docs name an endpoint that does not exist.
- README claims guarantees or enterprise readiness that are not implemented.
- Railway serves an old bundle after reasonable deployment wait time.
- Sample CSV download returns HTML or a missing target column.

## Beta Launch Checklist

- [ ] `docs/beta-readiness.md` reviewed.
- [ ] `docs/feedback-guide.md` reviewed.
- [ ] GitHub issue templates visible.
- [ ] Demo sample data verified.
- [ ] Railway deployment verified.
- [ ] Known limitations are visible in README/docs.
