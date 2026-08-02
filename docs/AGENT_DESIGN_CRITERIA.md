# ModelMate Agent Design Criteria

## 1. Purpose and provenance

This document preserves and normalizes the unique rationale from the untracked root `AGENT_DESIGN_CRITERIA.md` for the current ModelMate repository.

- Source file: `AGENT_DESIGN_CRITERIA.md`
- Source SHA-256 at normalization: `fd178351bcb4a858f11df2d3d8c044074150b8506e007ac5949cb68245e8c9d1`
- Repository baseline inspected: `main` at `afff0e442cdf0bbff616b9e18fd78e179fa251b9`
- Normalization date: 2026-08-02 KST

The original rationale cites an external Korean design PDF. That PDF was not found in the inspected tracked repository, so its contents were not independently validated. The design reasoning below is retained because it is useful and consistent with ModelMate's repository constraints where verified.

This document concerns ModelMate's CSV-based Agentic AutoML direction only. It does not introduce RAG, MCP, multimodal PDF, or unrelated research scope.

## 2. Honest claim standard

An application is not an agent merely because it uses an LLM, presents an agent-themed interface, or executes a fixed pipeline.

The design target is an auditable flow in which the system:

1. accepts and interprets a user goal;
2. creates an explicit plan;
3. selects an allowed action or tool;
4. executes that action;
5. stores the resulting observation;
6. records a decision and rationale based on available evidence;
7. continues, stops, retries, or requests human review under bounded rules; and
8. produces an evidence-grounded final artifact or an honest unavailable result.

The useful shorthand is:

`goal -> plan -> tool call -> observation -> decision -> validation/review -> next action -> artifact`

Do not claim unrestricted autonomy, general intelligence, or a fully autonomous data scientist. Describe only the flow that current source and current verification evidence support.

## 3. Component taxonomy

ModelMate should distinguish global decision ownership from bounded judgments and ordinary software behavior.

### 3.1 Orchestration decision-maker

An orchestration decision-maker may interpret the user goal, choose among allowed next actions, read prior observations, and decide whether to continue, stop, replan, or request review. It owns the workflow-level next-step decision within explicit policy and safety bounds.

The intended architectural role is a single supervisor/planner rather than a collection of decorative agents.

Current-source qualification:

- The primary Agent Run creation route calls `create_agent_plan` in `backend/agents/planner_interface.py`.
- The primary execution route calls `execute_agent_run` in `backend/agents/executor.py`.
- `SupervisorPlanner` also exists, but inspected references show it is used by legacy/mock-plan and mock-timeline paths. Its name alone is not proof of current autonomous orchestration.
- The inspected planner defaults to deterministic behavior. Optional LLM-assisted fields cannot override a deterministic unsupported-scope decision.

### 3.2 Bounded decision or policy modules

A bounded decision module returns a structured judgment inside a narrow domain. It may recommend an action or trigger a gate, but it does not own the full workflow.

Examples in the inspected source include:

- target recommendation and target-quality checks;
- leakage checks;
- evaluation and metric-threshold policy;
- validation checks;
- deployment/API-readiness advice; and
- human-review eligibility checks.

These modules should expose inputs, outputs, reasons, confidence or limitation fields where meaningful, and deterministic failure behavior. They remain tools/policies, not independent agents.

### 3.3 Tool adapters and executors

Tool adapters perform or wrap work and return observations. Examples include:

- data profiling;
- schema validation;
- AutoML training adaptation;
- SHAP/explanation extraction;
- evidence-bundle construction;
- report writing; and
- persistence of artifacts.

A tool does not become an agent because it has a human-like name. It should not select unrelated next actions or claim decision authority it does not own.

### 3.4 Ordinary software and infrastructure

The following are ordinary software components unless they independently meet the decision criteria:

- API routes and request schemas;
- database repositories and persistence helpers;
- job/status records;
- frontend pages, cards, and timelines;
- authentication and access-control helpers;
- model storage and prediction endpoints;
- logging, monitoring, and audit rendering; and
- report/export formatting.

These components may display, transport, or persist decisions, but they are not decision-makers.

## 4. State and audit requirements

A credible Agentic flow needs persistent evidence of what happened, not a timeline synthesized after completion.

The inspected repository defines persistence for:

- analysis runs;
- plans and plan steps;
- tool calls;
- observations;
- decisions;
- validations;
- artifacts; and
- human-review requests.

Each decision should be attributable to:

- the run and plan step;
- the observation(s) used;
- a bounded decision type;
- a rationale and selected value/action;
- the relevant tool/configuration version where available; and
- its terminal or follow-up state.

An analysis run is not the same as a model-training experiment. One user goal may create multiple bounded execution attempts or artifacts.

## 5. Required branch behavior

The design rationale requires visible, testable branches rather than unconditional execution.

Representative bounded branches include:

- missing or unusable dataset -> refuse execution and request a valid dataset;
- ambiguous target -> request human target selection;
- severe schema failure -> stop and explain remediation;
- medium/high leakage risk -> warn, block, or request review according to policy;
- insufficient model performance -> report limits, request review, or allow a bounded retry;
- validation/evidence failure -> weaken or withhold the report claim;
- API/deployment-readiness failure -> advise hold/blocked rather than deploying; and
- tool exception -> record the failure and offer only approved recovery actions.

The inspected executor contains branches for several of these conditions. Their end-to-end behavior was not rerun during this documentation task.

## 6. Human review and recovery

Human review must be a persisted control point, not a decorative confirmation modal.

A review item should identify:

- the triggering observation or tool call;
- the risk or ambiguity;
- the allowed reviewer choices;
- the reviewer decision and optional note;
- the state from which execution may resume; and
- what the system will and will not do automatically.

The repository contains review persistence and review/retry/stop API routes. Some standalone resume helpers retain earlier skeleton language and explicitly do not perform automatic retraining or deployment. Treat that limitation as real until the active route behavior is verified.

## 7. Report and UI criteria

The UI should make the execution path inspectable without overwhelming the default view.

- Show the user goal and interpreted scope.
- Show the current plan and status.
- Distinguish tool calls, observations, decisions, validations, reviews, and artifacts.
- Link report claims to real evidence records.
- Surface limitations, unavailable data, and blocked actions.
- Never generate fake completed steps or observations for visual completeness.
- Keep summary views concise and expose technical trace through progressive disclosure.

The recommended product surfaces remain a goal-first analysis entry, run detail/timeline, review controls, experiment history, reports, and API/deployment-readiness views. Existing routes should be evolved compatibly rather than replaced wholesale.

## 8. Pseudo-agent risk test

Ask:

> If the planner or decision layer were removed, would the system execute essentially the same fixed steps and produce the same next actions?

If yes, the behavior is automation rather than meaningful agentic decision-making.

Warning signs include:

- no user goal beyond file upload;
- the same plan for every supported request without justified variation;
- no stored observations or decision rationales;
- a timeline assembled from templates rather than execution records;
- an LLM used only to rewrite leaderboard text;
- tool-like components marketed as independent agents; or
- review/retry buttons that do not alter persisted execution state.

Automation is not a failure. It should simply be named accurately.

## 9. Design principles for future changes

1. Preserve the existing AutoML pipeline and wrap it through narrow adapters.
2. Keep one primary orchestration decision owner.
3. Keep tool and policy responsibilities small and testable.
4. Prefer deterministic rules for scope, safety, authorization, and hard gates.
5. Keep optional LLM behavior non-essential and fail-safe.
6. Persist evidence before displaying agentic trace claims.
7. Make stop/review/retry behavior explicit and bounded.
8. Preserve API compatibility and avoid broad rewrites of `backend.main` or `main_parts`.
9. Add one reviewed capability at a time with concrete verification.
10. Treat runtime verification as separate from code presence.

## 10. Minimum evidence before stronger claims

Before describing ModelMate as including a verified working Agentic AutoML flow, retain current evidence for:

- goal-first run creation;
- plan persistence;
- real handler selection and execution;
- observation and decision persistence;
- at least several distinct branch outcomes;
- human review resolution affecting subsequent state;
- evidence-grounded report output;
- blocked deployment/API-readiness behavior; and
- safe deterministic operation without an LLM key.

Evidence should include the repository revision, environment, commands, run IDs, state transitions, and failures. Historical run logs are useful provenance but do not replace a current release check.

## 11. Preserved direction

The unique original rationale is retained in this bounded form:

> ModelMate should evolve by placing a goal-aware, evidence-reading, bounded decision layer over its existing CSV analysis and AutoML capabilities. The decision layer selects registered tools, stores observations and rationales, branches safely, requests human review when needed, and produces an evidence-grounded report without pretending ordinary components are independent agents.

The original root `AGENT_DESIGN_CRITERIA.md` remains unchanged as provenance.
