# ModelMate Beta Readiness Checklist

This document prepares ModelMate for a small 5-15 person beta test. It is a
beta-ready checklist for a guided CSV predictive analysis MVP, not a statement
that the product is production-ready.

## Beta Test Goals

- Confirm whether first-time users understand what ModelMate does.
- Confirm whether users know what kind of CSV to upload.
- Validate the flow from CSV upload to target recommendation, model comparison,
  report, prediction API documentation, and project rerun.
- Identify confusing wording, missing guidance, and trust blockers.
- Learn whether Free / Pro / Team packaging feels reasonable.

## Target Beta Users

- students
- non-technical users with CSV files
- small startup operators
- marketing/sales/RevOps users
- small business owners
- freelance analysts or consultants

## Pre-Test Feature Checklist

- Landing page loads.
- Sample dataset selector is visible on the upload screen.
- Sample CSV download links work.
- CSV upload succeeds with `customer_churn_demo.csv`.
- Target recommendation appears.
- Model comparison completes.
- Result/report screen shows analysis trace, trust panel, and evidence summary.
- Report preview/export works.
- Prediction API documentation is reachable.
- Project history/re-run path is visible.
- Invalid CSV shows a friendly failure message and recommended next action.
- Privacy, terms, security notes, and pricing mock are documented.

## Questions During Test

- What are you trying to predict?
- Was it clear where to start?
- Was it clear which CSV file to upload?
- Did you understand the recommended target?
- Did warnings make the result more trustworthy or more confusing?
- Did the report feel useful enough to save or share?
- Did the prediction API concept make sense?
- Where did you hesitate?

## Feedback To Collect After Test

- User profile and technical comfort level.
- Dataset type and intended prediction goal.
- Whether the user completed upload, training, report, and reuse steps.
- Top three confusing moments.
- Trust/report feedback.
- Pricing preference: Free, Pro, or Team.
- Willingness to use again.
- Features that felt unnecessary.
- Features that would make the user pay.

## Stop Conditions

Pause the beta test if:

- a user uploads sensitive personal, payment, medical, or regulated data;
- the app repeatedly fails to upload normal CSV files;
- the training flow blocks the user without recovery guidance;
- report or prediction API output is misleading;
- the user believes the result is guaranteed or legally/medically/financially
  authoritative.

## Known Limitations

- No full LLM planner runtime.
- No production deployment automation.
- No payment or account-based quota.
- No enterprise compliance program.
- No formal retention/deletion workflow.
- No full asynchronous job queue.
- Prediction quality depends on the uploaded dataset and validation result.

## Release Checklist

- Latest main branch is deployed.
- Demo sample data can be downloaded.
- Upload validation QA passes.
- Frontend build passes.
- README links point to beta, privacy, terms, security, pricing, and demo docs.
- GitHub issue templates are available.
- A feedback form placeholder or issue workflow is ready.
