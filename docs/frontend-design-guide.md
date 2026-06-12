# ModelMate Frontend Design Guide

UI-00 is a guardrails document for future frontend work. It does not replace the
current app shell or redesign the product in this PR.

## Product UI Direction

ModelMate should feel like a calm, trustworthy B2B SaaS data workspace. It
should not feel like a flashy AI-generated AutoML demo.

The product object should gradually move from step-based analysis screens toward
durable SaaS objects:

- Project
- Run
- Report
- Prediction API
- Dataset
- Job

"Agentic" should be visible through honest run traces, trust panels, evidence,
warnings, and decisions. It should not be communicated through decorative AI
glow, vague magic wording, or exaggerated autonomy claims.

The visual style should be restrained, structured, and trustworthy.

## Core Principles

- Clarity over decoration.
- Fewer visible choices by default.
- Progressive disclosure for advanced details.
- Project, run, report, and API as primary product objects.
- Trust-first result presentation.
- State-first UX: loading, empty, failed, deleted, unauthorized, disabled,
  success.
- Consistent components over one-off cards.
- Calm visual hierarchy.
- Concrete action labels.
- Korean-first UI copy unless the surrounding page is intentionally English.
- Avoid mixing Korean and English randomly in the same screen.

## Anti-Patterns To Avoid

- Neon gradients.
- Heavy purple or blue glow.
- Too many nested cards.
- Too many equally important panels.
- Icon-only navigation without labels.
- Random shadows.
- Random border radius.
- Random spacing.
- Overusing "AI", "Agent", "Smart", or "Magic".
- Vague buttons such as "Submit", "Run", "Check", or "Start job".
- Showing every technical detail by default.
- Spinner-only loading states.
- Empty states that only say "No data".
- Full-screen redesigns that break existing flows.

## Recommended Information Architecture Target

Public routes:

- Landing
- Pricing
- Privacy
- Login

Authenticated app:

- Dashboard
- Projects
- Jobs
- Reports
- Prediction APIs
- Settings

Project Detail tabs:

- Overview
- Runs
- Report
- Prediction API
- Dataset
- Settings

New Analysis should use a focused wizard-like flow:

1. Upload or choose sample.
2. Confirm target and excluded fields.
3. Start analysis.

The existing stepper may remain for now. Long-term, it should be scoped to New
Analysis instead of representing the whole product.

## Design Tokens

Recommended semantic token direction:

| Token | Recommended value | Rule |
| --- | --- | --- |
| background | `#f8fafc` | Quiet app canvas. |
| surface | `#ffffff` | Cards, panels, dialogs. |
| surface-muted | `#f1f5f9` | Secondary panels and empty states. |
| border | `#e2e8f0` | Default border. |
| text | `#0f172a` | Primary content. |
| muted text | `#64748b` | Captions and helper text. |
| primary | `#2563eb` or current indigo | Primary action and active state. |
| success | `#059669` | Successful states only. |
| warning | `#d97706` | Warnings, review needed, usage caution. |
| danger | `#dc2626` | Destructive or failed states. |
| info | `#0891b2` | Neutral data notes. |
| radius | `8px` or `12px` | Prefer 8px for dense work surfaces. |
| shadow | subtle 1-3px | Avoid dramatic floating cards. |
| motion | 150-250ms ease | Use for disclosure, hover, and route polish. |

Purple may be used sparingly for limited brand or AI accents. Avoid broad
gradients inside core app screens.

## Spacing Rules

- Use `4 / 8 / 12 / 16 / 24 / 32 / 48` spacing increments unless there is a
  clear reason.
- Cards should normally use 16px or 24px padding.
- Section gaps should normally be 24px or 32px.
- Buttons and inputs should generally be 40px to 44px high.
- Avoid layout shifts when loading or expanding panels.

## Typography Rules

| Role | Size | Weight | Notes |
| --- | ---: | ---: | --- |
| Page title | 24-32px | 800-850 | Use once per page. |
| Section title | 18-22px | 750-800 | Clear grouping, not hero-scale. |
| Card title | 14-17px | 750-850 | Keep compact and scannable. |
| Body | 14-16px | 400-500 | Primary reading text. |
| Caption | 12-13px | 500-650 | Metadata and helper text. |
| Metric number | 22-32px | 800-900 | Pair with label and context. |
| Badge text | 11-12px | 700-800 | Short status labels only. |

Do not scale font size with viewport width. Keep letter spacing at 0 unless a
small uppercase label already exists in the local design.

## Color Rules

- Use one primary blue/indigo accent.
- Green only for success.
- Amber/orange only for warning.
- Red only for destructive or danger states.
- Purple only for limited brand or AI accents.
- Avoid broad gradients inside core app screens.
- Export reports should look like calm decision memos, not flashy AI report
  generators.

## Component Inventory

Target shared component inventory:

- Button
- Input
- Select
- Textarea
- Checkbox
- Tabs
- Dialog
- Dropdown
- Toast
- Tooltip
- PageHeader
- SectionHeader
- EmptyState
- LoadingSkeleton
- ErrorState
- StatusBadge
- MetricCard
- JobStatusCard
- ProjectRow
- ReportSection
- DangerZone
- TrustSignalCard
- EvidenceSummary
- RunTimeline
- ApiTokenBox
- DeleteImpactList

Prefer extending this inventory over adding one-off panels.

## Status And State Matrix

| State | Badge type | User-facing message | Next action | Blocking |
| --- | --- | --- | --- | --- |
| loading | info | 불러오는 중입니다. | 잠시 기다리기 | No |
| empty | neutral | 아직 저장된 항목이 없습니다. | 새 분석 시작 | No |
| queued | info | 분석이 대기 중입니다. | 상태 새로고침 | No |
| running | info | 분석이 진행 중입니다. | 진행 상태 보기 | No |
| succeeded | success | 분석이 완료되었습니다. | 결과 보기 | No |
| failed | danger | 분석에 실패했습니다. | 다시 실행 | Yes, for result |
| canceled | neutral | 작업이 취소되었습니다. | 새로 실행 | No |
| needs_review | warning | 검토가 필요합니다. | 세부 내용 확인 | Sometimes |
| unauthorized | warning | 로그인이 필요합니다. | 로그인하기 | Yes |
| disabled | warning | 이 기능은 현재 비활성화되었습니다. | 새 분석 만들기 | Yes |
| deleted | danger | 삭제된 데이터입니다. | CSV 다시 업로드 | Yes |
| archived | neutral | 보관된 프로젝트입니다. | 새 프로젝트 만들기 | No |
| export_failed | danger | 내보내기에 실패했습니다. | 다시 내보내기 | No |
| token_revoked | warning | 토큰이 비활성화되었습니다. | 토큰 재발급 | Yes |
| usage_limited | warning | 현재 사용 한도에 도달했습니다. | 사용량 줄이기 | Yes |

Every state should include a clear next action. Avoid spinner-only or raw error
states.

## Button And Microcopy Guide

Use concrete labels:

- "Start job" -> "분석 시작" or "Start analysis"
- "Run" -> "분석 실행"
- "Check" -> "상태 확인"
- "Export" -> "보고서 내보내기"
- "Delete" -> "데이터셋 삭제"
- "Retry" -> "다시 실행"
- "View details" -> "세부 내용 보기"
- "Create API" -> "예측 API 만들기"
- "Regenerate token" -> "토큰 재발급"
- "Revoke token" -> "토큰 비활성화"

Language rules:

- Korean-first for user-facing app screens.
- English is acceptable for recognized technical labels such as ROC-AUC, F1,
  API, token, endpoint, CSV, or JSON.
- Do not mix English section titles into Korean pages unless the term is a
  recognized technical label.
- Pricing mock should not look like an unfinished prototype.
- Background job text should be translated or integrated into the product's
  Korean UX.

## Screen-Specific Guardrails

### Landing

- Keep it result-oriented.
- Focus on CSV -> explainable prediction -> grounded report -> reusable API.
- Avoid overusing "Agentic" in customer-facing copy.

### Login

- Reduce decorative purple background circles and heavy gradients over time.
- Keep auth focused and trustworthy.
- Guest demo should remain, but visually secondary.

### Upload / New Analysis

- Do not show every detail at once.
- Use progressive disclosure.
- Prioritize upload/sample selection, target confirmation, and start analysis.

### Model Comparison

- Do not show duplicate primary CTAs.
- Background job should become part of run creation/status, not a random block
  inside model comparison.

### Result Summary

- Lead with one clear decision summary.
- Then show best model, metric, task type, and target.
- Then show risks, trust, and next action.
- Reduce same-level card overload.

### Reason / Explanation

- Treat as "Why this model?" or "Prediction reasons".
- Show top features and caveats.
- Avoid making feature importance look like causal proof.

### Report Export

- Move toward decision memo style.
- Reduce strong gradients.
- Put detailed tables in appendix-style lower sections.

### Right Rail

- Avoid icon-only vertical quick action bars.
- Prefer tabs, anchor navigation, or labeled secondary actions.

### Dataset Delete / Retention

- Use a clear DangerZone pattern.
- Show delete impact before destructive action.
- Explain what happens to runs, reports, API tokens, and active jobs.

### Prediction API

- Explain user value before technical endpoint details.
- Include copyable examples only after the value proposition.

## Review Checklist For Future UI PRs

- Does the change preserve existing routes and backend API behavior?
- Does it reduce visual noise instead of adding more same-level panels?
- Is the main action concrete and visible?
- Are loading, empty, failed, unauthorized, deleted, and disabled states handled?
- Does user-facing copy avoid exaggerated AI claims?
- Does the screen still feel like a B2B data workspace?
