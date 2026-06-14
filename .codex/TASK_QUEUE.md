# ModelMate Agentic AutoML Task Queue

Status legend:

* todo
* in_progress
* review_needed
* fix_needed
* blocked
* done

Current assumption: PR-26 Workspace Data Integration Fix is done.
Do not start the next PR until the current PR is marked done.

---

## PR-26 Workspace Data Integration Fix

Status: done

Branch: codex/pr-26-workspace-data-integration

Commit message: fix: persist analysis results into workspace

Completion note: PR-26 is assumed complete. Agentic AutoML roadmap starts from PR-27.

---

## PR-27 Goal-first Agent Mode

Status: done

Task file: .codex/tasks/PR-27-goal-first-agent-mode.md

Branch: codex/pr-27-goal-first-agent-mode

Commit message: feat: add goal-first agent mode

Goal: Allow users to enter a natural-language analysis goal and create a persisted Agent Run with a structured deterministic plan.

Review gate:

* Goal input exists.
* Korean natural-language goal works.
* Agent Run is persisted.
* Plan is persisted.
* Unsupported goals are handled honestly.
* No fake tool execution is shown.
* Refresh does not lose the run/plan.
* Existing upload/sample/starter flow still works.

---

## PR-28 Tool-calling Agent Pipeline

Status: done

Task file: .codex/tasks/PR-28-tool-calling-agent-pipeline.md

Branch: codex/pr-28-tool-calling-agent-pipeline

Commit message: feat: add tool calling agent pipeline

Goal: Wrap existing AutoML functionality as typed tools and persist tool calls, observations, decisions, validation results, and artifacts.

Review gate:

* Tools execute real existing functionality.
* tool_call records are persisted.
* observation records are persisted.
* decision records are persisted.
* validation records are persisted.
* Failed tool steps are recoverable or honestly marked failed.
* No fake trace data is displayed.
* Workspace/project/run/report/API records remain connected.

---

## PR-29 Agent Trace / Decision UI

Status: todo

Task file: .codex/tasks/PR-29-agent-trace-decision-ui.md

Branch: codex/pr-29-agent-trace-decision-ui

Commit message: feat: add agent trace and decision timeline

Goal: Show real plan, tool call, observation, decision, validation, warning, artifact, and resume state in Run Detail.

Review gate:

* Run Detail shows persisted trace data.
* Timeline is based on real records.
* Pending/unavailable steps are clearly labeled.
* No decorative-only "AI is thinking" UI.
* Existing Project Detail and workspace navigation still work.
* Refresh does not lose timeline state.

---

## PR-30 Human Review / Recovery

Status: todo

Task file: .codex/tasks/PR-30-human-review-recovery.md

Branch: codex/pr-30-human-review-recovery

Commit message: feat: add human review and recovery for agent runs

Goal: Add user confirmation and recovery flow for ambiguous target, leakage risk, low performance, API readiness risk, and failed steps.

Review gate:

* Target ambiguity triggers review.
* Leakage risk triggers review.
* Low model performance can block or warn before API readiness.
* User can approve, retry, or stop when needed.
* Recovery does not corrupt existing run trace.
* Human review events are persisted.

---

## PR-31 Optional LLM Planner Integration

Status: todo

Task file: .codex/tasks/PR-31-optional-llm-planner.md

Branch: codex/pr-31-optional-llm-planner

Commit message: feat: add optional llm planner interface

Goal: Add an optional LLM planner behind configuration while keeping deterministic planner as the default and fallback.

Review gate:

* Deterministic planner still works without LLM.
* LLM planner is optional and disabled safely when not configured.
* Planner output is schema-constrained.
* Bad or invalid planner output falls back safely.
* No secrets are exposed.
* Agent Mode does not depend on paid/external API availability.

---

## PR-32 Final Agentic Portfolio Polish

Status: todo

Task file: .codex/tasks/PR-32-final-agentic-portfolio-polish.md

Branch: codex/pr-32-final-agentic-portfolio-polish

Commit message: docs: polish agentic automl portfolio package

Goal: Finalize landing/docs/demo/report wording so ModelMate is positioned honestly as a Korean-first Agentic AutoML SaaS MVP.

Review gate:

* Landing copy does not overclaim.
* Portfolio docs explain Agentic AutoML honestly.
* Demo path is clear.
* Final QA checklist is updated.
* Korean-first positioning is preserved.
* The product is not described as a fully autonomous enterprise AutoML platform.
