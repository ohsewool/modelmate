# ModelMate Codex Run Log

Purpose:
This file records Codex automation progress so the roadmap can resume safely if a session stops, runs out of context, or is interrupted.

Repository files are the source of truth. Do not rely on chat history when resuming.

## Resume Protocol

At the start of every resumed session, read these files in this order:

1. `.codex/AGENTS.md`
2. `.codex/TASK_QUEUE.md`
3. `.codex/REVIEW_GATE.md`
4. `.codex/RUN_LOG.md`
5. The current PR task file from `.codex/TASK_QUEUE.md`

Resume from the first PR in `.codex/TASK_QUEUE.md` whose status is not `done`.

If the first non-done PR is marked:

- `todo`: start that PR.
- `in_progress`: resume that same PR.
- `self_verifying`: continue verification for that same PR.
- `fix_needed`: fix that same PR before moving on.
- `review_needed`: verify against `.codex/REVIEW_GATE.md`; mark `done` only if acceptance criteria pass.
- `blocked`: stop and explain exactly what is blocked.

Do not skip PRs. Do not start the next PR until the current PR is marked `done`.

Never mark a PR as `done` unless:

- required build passes,
- acceptance criteria pass,
- verification results are recorded in this file.

## Required Checkpoint Updates

Before starting each PR, add a checkpoint entry with:

- current PR number,
- current status,
- branch name,
- start time if available,
- task file path,
- planned verification checklist.

During each PR, update this file after major milestones:

- implementation started,
- key files changed,
- build started,
- build result,
- verification started,
- verification result,
- fixes applied if any,
- final status.

At the end of each PR, record:

- final status,
- build result,
- verification result,
- known limitations,
- next PR to start.

## Status Values

Use the task queue status values unless a temporary milestone needs more detail:

- `todo`
- `in_progress`
- `self_verifying`
- `review_needed`
- `fix_needed`
- `blocked`
- `done`

## Checkpoint Entry Template

```text
## YYYY-MM-DD HH:mm KST - PR-XX <title>

- Status:
- Branch:
- Task file:
- Start time:
- Planned verification checklist:
  - [ ] Frontend build: `cd frontend && npm run build`
  - [ ] Acceptance criteria from task file
  - [ ] Review gate checks from `.codex/REVIEW_GATE.md`
  - [ ] Existing upload/sample/starter flow not broken
  - [ ] Korean-first UI copy preserved
- Milestones:
  - [ ] implementation started:
  - [ ] key files changed:
  - [ ] build started:
  - [ ] build result:
  - [ ] verification started:
  - [ ] verification result:
  - [ ] fixes applied:
  - [ ] final status:
- Known limitations:
- Next PR:
```

## Current Checkpoint

## 2026-06-14 19:19 KST - Roadmap Resume Point

- Status: checkpoint protocol added
- Branch: `codex/pr-26-workspace-regression-fix`
- Current task queue state:
  - PR-26 Workspace Data Integration Fix: `done`
  - PR-27 Goal-first Agent Mode: `todo`
- First non-done PR to resume: PR-27
- Task file: `.codex/tasks/PR-27-goal-first-agent-mode.md`
- Planned PR-27 verification checklist:
  - [ ] Frontend build: `cd frontend && npm run build`
  - [ ] Goal input exists.
  - [ ] Korean natural-language goal works.
  - [ ] Agent Run is persisted.
  - [ ] Plan is persisted.
  - [ ] Unsupported goals are handled honestly.
  - [ ] No fake tool execution is shown.
  - [ ] Refresh does not lose the run/plan.
  - [ ] Existing upload/sample/starter flow still works.
  - [ ] Verification result recorded in `.codex/RUN_LOG.md`.
- Resume instruction: read the five required files above, then continue PR-27 only.
- Known limitations: PR-27 has not been started in this checkpoint.
- Next PR after PR-27 is done: PR-28 Tool-calling Agent Pipeline.
