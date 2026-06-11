# ModelMate Agentic AutoML Demo Script

Current status: PR-12 skeleton demo.

This script explains the current demo flow honestly. ModelMate is being extended
toward a real tool-calling Agentic AutoML platform, but it is not yet a fully
autonomous AI data scientist.

## 1. User Goal

Start with a plain analysis goal, for example:

```text
Predict diabetes risk from this CSV and explain the strongest evidence.
```

## 2. Dataset Input

Upload a CSV through the existing ModelMate flow. The current production demo
still starts from the normal upload and AutoML screens.

## 3. Structured Plan

The agent skeleton can represent a structured plan:

```text
profile data -> validate schema -> recommend target -> check leakage -> train -> evaluate -> explain -> report -> deployment advice
```

## 4. Tool Registry

Show that the system now has named tools:

- data profile
- schema validation
- target recommendation
- leakage check
- AutoML training adapter
- evaluation
- XAI evidence
- validation
- grounded report writer
- deployment advice

## 5. Data Profiling And Schema Validation

Explain that the first safety gate checks whether the CSV is tabular,
predictive, and usable before training.

## 6. Target Recommendation And Leakage Check

Explain that ModelMate recommends a target and flags suspicious columns such as
IDs, labels, result-like columns, or high-cardinality identifiers.

## 7. AutoML Training Adapter

Explain that the existing AutoML pipeline is preserved and wrapped as a tool
adapter. This protects the working demo while preparing for agent execution.

## 8. Evaluation Decision

Show that the model result is not only summarized. It becomes an observation
and decision signal such as continue, retry recommended, hold, or needs review.

## 9. XAI And Evidence Bundle

Explain that explanation evidence is collected from SHAP or fallback feature
importance when possible. If explanation is unavailable, the system records the
limitation instead of pretending.

## 10. Grounded Report

The report writer creates a Markdown draft from the evidence bundle. It must
include metrics, target, leakage warnings, data quality warnings, XAI summary,
limitations, and next action.

## 11. Deployment Check

The deployment check returns advice only:

- deploy recommended
- needs review
- hold
- blocked

It does not actually deploy a model.

## 12. Human Review And Resume Skeleton

If a decision is risky, PR-12 can create a review item and recommend how to
resume after a reviewer resolution.

## 13. Current Limits

- No real LLM planner is connected.
- No automatic retraining loop is implemented.
- No automatic production deployment is implemented.
- No persistent human review queue is implemented.
- Existing AutoML screens remain the main demo experience.

## 14. Next Plan

Future work can connect the skeleton to a real planner, persistent trace store,
review UI, model lifecycle management, and safer deployment governance.
