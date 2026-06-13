# Beta Feedback Loop

PR-21 adds a lightweight in-app feedback loop for beta users. It is intended for
5-15 early testers and internal review, not as a full customer support platform.

## What Users Can Submit

Users can send structured feedback from the workspace sidebar, Settings, or the
frontend error fallback.

Categories:

- `bug`: product bug
- `confusing_ux`: confusing screen or flow
- `wrong_result`: prediction or analysis result looks wrong
- `report_issue`: report content/export issue
- `prediction_api_issue`: prediction API issue
- `dataset_issue`: upload, deletion, or retention issue
- `performance_issue`: slow or unreliable experience
- `feature_request`: improvement request
- `other`: anything else

Severity:

- `low`: minor inconvenience
- `medium`: noticeable issue but user can continue
- `high`: blocks an important workflow
- `blocking`: user cannot continue

Status lifecycle:

- `new`
- `reviewed`
- `planned`
- `resolved`
- `dismissed`

## API

Submit feedback:

```text
POST /api/feedback
```

The endpoint accepts authenticated users and guest/demo users. When a bearer
token is present, the backend derives `user_id` and user email from the session.

Response:

```json
{
  "feedback_id": "fb_example",
  "message": "피드백이 접수되었습니다.",
  "next_action": "베타 기간 동안 보내주신 의견은 제품 개선에 반영하겠습니다."
}
```

Admin/dev review endpoints:

```text
GET  /api/admin/feedback
GET  /api/admin/feedback/{feedback_id}
POST /api/admin/feedback/{feedback_id}/status
```

These endpoints require the existing admin role. Normal users and guests cannot
list all feedback.

## Stored Fields

The `beta_feedback` table stores:

- `feedback_id`
- `user_id`
- `user_email`
- optional `project_id`
- optional `run_id`
- optional `job_id`
- optional `report_id`
- optional `dataset_id`
- optional `prediction_api_token_prefix`
- optional `request_id`
- optional `error_id`
- `category`
- `severity`
- `title`
- `message`
- `page_url`
- `route`
- `user_agent`
- `status`
- `safe_context`
- `created_at`
- `updated_at`
- optional `admin_note`

## Privacy And Safety Rules

Safe context may include:

- route or page URL;
- project/run/job/report/dataset IDs;
- request ID or error ID;
- token prefix only;
- browser user agent.

Never attach or store:

- raw CSV contents;
- full prediction API tokens;
- passwords;
- session secrets;
- private environment variables;
- full prediction payloads.

The frontend form explicitly tells users that CSV contents and full tokens are
not attached.

## Request ID / Error ID Linkage

Users can include `request ID` and `error ID` in the feedback form. The
ErrorBoundary sends a prefilled bug feedback item that includes the error context
when available.

This connects PR-20 monitoring records with beta user feedback without exposing
raw logs to normal users.

## Validation

Run backend compile:

```bash
python -m compileall backend
```

Run feedback smoke against a local or deployed app:

```bash
python scripts/run_feedback_smoke.py --base-url http://localhost:8000
python scripts/run_feedback_smoke.py --base-url https://web-production-5d6fa.up.railway.app
```

The smoke script checks:

- authenticated feedback submission;
- guest feedback submission;
- invalid category rejection;
- invalid severity rejection;
- response returns `feedback_id`;
- full fake token is not echoed;
- admin list endpoint is protected.

## Known Limitations

- No Intercom, Zendesk, Slack, email, or external support integration.
- No complex ticket assignment.
- No public feedback board.
- Admin review is intentionally lightweight.
- Feedback status changes are manual and admin-only.

Future work can add email notification, Slack forwarding, or a dedicated support
dashboard after beta if there is enough user volume.
