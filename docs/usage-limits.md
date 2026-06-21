# ModelMate Usage Limits and Plan Flags

PR-19 adds MVP plan flags and soft usage limits. This is not a paid billing
system and does not integrate Stripe, Toss, Paddle, or any payment provider.

## Plan Flags

Supported plan flags:

- `free`
- `pro_mock`
- `team_mock`
- `admin`

New email/password users default to `free`. Admin seed users are normalized to
`admin`. Mock plans are product flags for beta/pilot testing, not paid plans.

## Default Limits

| Limit | Free | Pro mock | Team mock |
| --- | ---: | ---: | ---: |
| Projects | 3 | 30 | 100 |
| Datasets | 3 | 30 | 100 |
| CSV file size | 10 MB | 50 MB | 100 MB |
| Rows per dataset | 5,000 | 50,000 | 100,000 |
| Columns per dataset | 100 | 300 | 500 |
| Jobs per day | 5 | 50 | 150 |
| Concurrent jobs | 1 | 3 | 8 |
| Tokens per project | 1 | 5 | 20 |
| Prediction API calls per day | 100 | 5,000 | 25,000 |
| Report exports per day | 10 | 100 | 500 |

Admin accounts are treated as unlimited for development and demos. The owner
account `admin@modelmate.local` is always recognized as `admin`; additional
admin emails can be configured with:

```text
ADMIN_EMAILS=admin@modelmate.local,osw1217@gmail.com
```

For admin users, `/api/me/usage` returns `role: admin`, `plan_label: 관리자`,
and `limit_label: 제한 없음`. Admin users bypass project, dataset, daily job,
prediction API, sample/demo, quick analysis, and goal-based analysis limits.
The API does not return the configured admin email list to the frontend.

Free-plan limits can be adjusted without changing source code:

```text
FREE_MAX_PROJECTS=3
FREE_MAX_DATASETS=3
FREE_MAX_ANALYSIS_RUNS=5
FREE_MAX_PREDICTION_APIS=1
FREE_MAX_REPORTS=10
MODELMATE_MAX_FILE_SIZE_MB=10
MODELMATE_MAX_ROWS_PER_DATASET=5000
MODELMATE_MAX_COLUMNS_PER_DATASET=100
```

`FREE_MAX_PREDICTION_APIS` is the active prediction-token limit per project.
`FREE_MAX_REPORTS` currently configures the report-export counter exposed by
the usage foundation; the session-level export flow is not blocked yet.

## Usage Summary Endpoint

```text
GET /api/me/usage
```

The endpoint returns:

- current plan
- usage counters
- plan limits
- percent-used hints
- warnings near a limit
- capability flags such as `can_create_project`
- upgrade/contact placeholder metadata

Guest users receive a guest/demo response and are not treated as paid accounts.

## Soft Enforcement

ModelMate returns friendly structured errors instead of crashing.

Example:

```json
{
  "detail": {
    "code": "usage_limit_exceeded",
    "limit_key": "max_projects",
    "current": 3,
    "limit": 3,
    "plan": "free",
    "message": "현재 플랜에서 만들 수 있는 프로젝트 수를 모두 사용했습니다.",
    "user_friendly_message": "현재 플랜에서 만들 수 있는 프로젝트 수를 모두 사용했습니다.",
    "recommended_next_action": "기존 분석 결과를 확인하거나 추가 사용이 필요하면 관리자에게 문의해 주세요.",
    "upgrade_placeholder": "베타 기간에는 플랜 변경을 수동으로 처리합니다. 필요하면 관리자에게 문의하세요."
  }
}
```

## Enforcement Points

PR-19 applies soft checks to:

- project creation
- CSV upload file size
- parsed dataset row/column limits
- saved dataset count
- background training job daily limit
- goal-based Agent Run creation daily limit
- concurrent training job limit
- project prediction token creation
- project prediction API daily calls

Sample CSV download and preview are intentionally quota-free. For free/guest
users, only actual analysis execution consumes the daily job quota.

`max_report_exports_per_day` is included in the plan configuration and usage
summary for future Report Center work, but PR-19 does not force a report export
block because the existing HTML export path is still a session-level demo flow.

## Daily Counters

Daily counters are stored in `user_usage_daily` by `user_id` and date:

- `jobs_count`
- `prediction_calls_count`
- `report_exports_count`

The implementation is intentionally simple for the SaaS MVP. It is not a
distributed quota service.

## Current Limitations

- No payment integration.
- No account-based billing cycle.
- No rate-limit middleware or API gateway.
- No team billing or seat management.
- Plan changes are manual/admin/dev work for now.
- Usage limits are MVP guardrails for beta testing and demo stability.
- LLM summary generation is not separately metered yet; unavailable or failed
  LLM calls are not presented as successful usage.

## QA

```bash
python scripts/run_usage_limits_smoke.py --base-url http://localhost:8000
python scripts/run_release_qa.py --base-url http://localhost:8000 --skip-training
```

## Paid Pilot Manual Adjustments

During the paid-pilot readiness stage, usage-limit increases are not automatic.
Users can submit a pilot inquiry when they need a higher CSV, project,
training, report, or prediction API limit.

- Real payment and automatic upgrades are not connected.
- A maintainer reviews pilot inquiries manually.
- The inquiry should describe the use case and expected dataset size.
- Users must not include payment information, API tokens, secrets, or raw CSV
  contents in the inquiry.

See `docs/paid-pilot-readiness.md` for the manual pilot flow.
