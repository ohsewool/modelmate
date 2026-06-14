# ModelMate PR Review Gate

Every PR from PR-27 to PR-32 must pass this review gate before the next PR starts.

## Required status flow

Normal flow:

```text
todo → in_progress → review_needed → done
```

Fix flow:

```text
review_needed → fix_needed → in_progress → review_needed → done
```

Blocked flow:

```text
in_progress → blocked
```

Do not move to the next PR unless the current PR is done.

## Required build verification

Run:

```bash
cd frontend && npm run build
```

If backend is touched, run relevant backend tests or smoke scripts available in the repository.
If backend tests do not exist, document a manual backend smoke test.

## Required PR body sections

Every PR must include:

1. Summary
2. Implementation approach
3. Files changed
4. Build/test results
5. Manual verification
6. Screens/routes checked
7. Known limitations
8. Review status

## Global manual verification

For every PR:

* Open the app.
* Confirm the landing page still loads.
* Confirm existing sample/starter analysis flow still works or is not broken.
* Confirm workspace navigation still works.
* Confirm Korean-first UI copy is preserved.
* Confirm there is no obvious English-only regression in main user-facing screens.
* Confirm refresh does not destroy persisted workspace/agent state unless the app intentionally uses session-scoped demo storage.
* Confirm no fake workspace or fake agent records are shown as real.

## PR-27 manual verification

Goal: Confirm goal-first Agent Mode creates persisted run and plan without fake tool execution.

Check:

* Start Agent Mode.
* Enter a Korean natural-language goal.
* Example: "이 CSV로 고객 이탈 가능성을 예측하고 중요한 요인을 보고서로 정리해줘."
* Confirm an Agent Run is created.
* Confirm a deterministic plan is created.
* Confirm the plan is persisted.
* Refresh page and confirm the run/plan still exists.
* Confirm unsupported goals are handled honestly.
* Confirm tool steps are shown as planned/pending, not executed, unless real execution exists.
* Confirm existing upload/sample/starter analysis still works.

Must not happen:

* Fake "completed" tool trace.
* Hardcoded demo observations pretending to be real.
* Agent Mode requiring an LLM API key before PR-31.

## PR-28 manual verification

Goal: Confirm real tool calls and trace records are persisted.

Check:

* Start an Agent Run.
* Run the agent pipeline on a sample/starter dataset.
* Confirm actual tools are called.
* Confirm tool_call records exist.
* Confirm observation records exist.
* Confirm decision records exist.
* Confirm validation records exist.
* Confirm generated artifacts are linked.
* Confirm failed tool states are visible and not hidden.
* Confirm workspace/project/run/report/API records remain connected.
* Refresh and confirm trace records persist.

Must not happen:

* Tool trace generated only in frontend state.
* Observation/decision data hardcoded as mock.
* Completed trace shown when tools did not run.
* Existing analysis flow broken.

## PR-29 manual verification

Goal: Confirm Run Detail becomes a real agent console.

Check:

* Open Run Detail for an Agent Run.
* Confirm timeline shows persisted plan steps.
* Confirm timeline shows real tool calls.
* Confirm observations are summarized.
* Confirm decisions explain what was chosen and why.
* Confirm validation warnings are visible.
* Confirm pending/unavailable steps are labeled honestly.
* Confirm artifacts link to report/API readiness/project state.
* Refresh and confirm timeline remains.
* Confirm Project Detail and workspace navigation still work.

Must not happen:

* Decorative-only "AI is thinking" timeline.
* Fake observations.
* Fake decisions.
* Broken navigation from Dashboard/Projects/Jobs/Reports/API pages.

## PR-30 manual verification

Goal: Confirm human review and recovery works.

Check:

* Test ambiguous target.
* Confirm target ambiguity triggers review.
* Test leakage warning.
* Confirm leakage risk triggers review.
* Test low model performance or forced low-performance state.
* Confirm API readiness can warn/block.
* Confirm user can approve, retry, or stop.
* Confirm recovery does not delete previous trace.
* Confirm human review request is persisted.
* Confirm final run status is clear.

Must not happen:

* High-risk decisions silently auto-approved.
* Leakage warnings hidden.
* Low-quality model exposed as production-ready API without warning.
* Recovery corrupting previous tool trace.

## PR-31 manual verification

Goal: Confirm optional LLM planner is safe and non-blocking.

Check:

* Run Agent Mode without LLM configuration.
* Confirm deterministic planner works.
* Enable mock/configured LLM planner only if safe config exists.
* Confirm planner output is schema-constrained.
* Confirm invalid planner output falls back to deterministic planner.
* Confirm no API key or secret is exposed.
* Confirm Agent Mode does not depend on paid/external API availability.

Must not happen:

* LLM required for normal Agent Mode.
* Raw LLM output trusted without validation.
* Secret keys logged or displayed.
* Broken deterministic planner fallback.

## PR-32 manual verification

Goal: Confirm final portfolio polish is honest and demo-ready.

Check:

* Landing copy does not overclaim.
* Product is described as: "Korean-first Agentic AutoML SaaS MVP"
* Product is not described as: "fully autonomous enterprise AutoML platform"
* Demo path is clear.
* README/portfolio docs explain:
  * supported tasks
  * limitations
  * architecture
  * agentic workflow
  * traceability
  * human review
* Final QA checklist is updated.
* Screenshots/routes referenced in docs are accurate.
* Korean-first positioning is preserved.

Must not happen:

* Overclaiming full autonomy.
* Overclaiming enterprise MLOps.
* Claiming causality from SHAP.
* Hiding current limitations.

## Non-negotiable rules

Do not fake agent trace data.
Do not hardcode mock results as real results.
Do not show workspace objects unless they are persisted.
Do not proceed to the next PR if the current PR is only visually complete.
Do not proceed if build fails.
Do not proceed if the current PR breaks existing upload/sample/starter analysis.
Do not proceed if Korean-first user-facing copy is significantly degraded.
Do not mark a task as done unless the review gate passes.
