# Legacy Analysis Flow Audit

Date: 2026-06-14

Purpose: PR-28 work is paused until the older analysis-flow features are checked against the current SaaS workspace UI. This audit classifies each legacy feature without blindly restoring the old sidebar UI.

## Summary

The legacy analysis capabilities are still reachable through the current workspace or analysis routes. Most changes are intentional consolidation into the SaaS workspace shell, project pages, report view, prediction API pages, and dedicated analysis pages.

The old `Sidebar.jsx` analysis flow component still exists in the codebase, but `AppLayout.jsx` now renders `WorkspaceShell` for authenticated app routes. The old sidebar is therefore not the active navigation surface. This appears intentional after the workspace redesign.

## Feature Audit Table

| Legacy feature | Old location | Current location | Current status | Intentional? | Same task possible? | Recommended action |
| --- | --- | --- | --- | --- | --- | --- |
| AI 한 번에 실행 | Legacy sidebar additional tools, `/agent` | `/agent`, plus `POST /api/run-agent` | Preserved | Yes | Yes. The endpoint still uploads/selects target through the quick file path and then runs model comparison, best model fit, predictions, explanation evidence, and history save. | Keep separate from future Agent Mode. Do not replace it with plan-only agent behavior unless an equivalent quick automatic analysis path remains. |
| 새 데이터 예측 | Legacy sidebar additional tools, `/predict` | `/predict`; project-scoped prediction API also under `/prediction-apis` and project API tab | Preserved / moved | Yes | Yes. Single-row and batch CSV prediction remain available after a model exists. Reusable API prediction lives in the workspace API area. | Keep both: `/predict` for interactive new-data prediction and workspace API pages for reusable API flows. |
| API 공유 | Legacy sidebar as model sharing, `/deploy` | `/deploy`, `/prediction-apis`, project detail API tab | Renamed / consolidated | Yes | Yes. Users can create shared/deployed prediction model artifacts and manage project-scoped prediction API tokens. | Use current Korean label `예측 API` or `모델 공유` depending on context. No old UI restore needed. |
| 분석 흐름 sidebar | Left legacy analysis-flow sidebar | `WorkspaceShell` global nav plus analysis-route hint; direct pages `/upload`, `/model-lab`, `/report`, `/xai`, `/agent`, `/predict`, `/deploy` | Intentionally consolidated | Yes | Mostly yes. The exact vertical stepper is no longer active, but the same pages remain reachable and the workspace shell provides a simpler SaaS navigation model. | Do not restore old sidebar globally. If users remain confused, add a compact flow helper inside `/upload` or `/model-lab` later. |
| 현재 상태 card | Legacy sidebar state card using `/api/state` | Per-page `StatusRecoveryPanel`, workspace dashboard, jobs/reports/API pages | Moved / consolidated | Yes | Yes for status and recovery. The always-visible small card is gone, but status appears in the relevant workflow and workspace pages. | Keep page-level status. Consider a small analysis status chip in the workspace header only if usability testing shows confusion. |
| 모델 비교 시작 | `/model-lab`, after upload setup | `/model-lab`, upload completion CTA, background training job controls | Preserved | Yes | Yes. Users can run immediate CV comparison or start a saved training job. | No fix needed. |
| 결과 요약 | `/report` | `/report`, `/reports`, project detail report metadata | Preserved / moved | Yes | Yes. Current session report summary and HTML export remain on `/report`; saved report metadata is surfaced in workspace/project pages. | No fix needed. Empty workspace reports are expected when no saved report metadata exists for the current user/session. |
| 이유 보기 | `/xai` | `/xai`, report trust/evidence panels | Preserved | Yes | Yes. Global and local explanations remain available after a model exists; report pages also show evidence summaries. | No fix needed. |

## Intentional Removals

No core capability appears intentionally removed. The old always-visible legacy sidebar has been superseded by the workspace shell, but its underlying routes remain registered.

## Accidental Removals

None found in this audit.

## Moved Or Consolidated Features

- `API 공유` is now split between `/deploy` for creating model/API artifacts and `/prediction-apis` or project API tabs for token/status management.
- `분석 흐름 sidebar` is consolidated into the SaaS workspace navigation and route-level workflow pages.
- `현재 상태 card` is consolidated into page-level status panels, jobs, reports, dashboard, and project detail views.
- `결과 요약` has both current-session report view and workspace/project metadata views.

## Fixes Applied

No code restoration was required. This audit document records the current mapping and confirms that no old core analysis capability should be blindly restored before PR-28.

## Remaining Limitations

- Workspace pages such as Jobs and Reports can look empty if the current session has no saved project/run/report metadata, even if an analysis was performed only in the live session.
- The current `/agent` quick path is a real automatic analysis shortcut, not the newer plan-only agent skeleton. Future Agent Mode work must keep this distinction clear.
- The legacy `Sidebar.jsx` file still exists but is not used by `AppLayout`; it can confuse future maintainers if they inspect it first. Removing or archiving it should be a separate cleanup PR, not part of this audit.
