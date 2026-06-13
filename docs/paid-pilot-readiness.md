# Paid Pilot Readiness

ModelMate is preparing for a small paid pilot, but real payment collection is not connected yet.

## Positioning

ModelMate is a guided CSV predictive analysis SaaS MVP. Users use it to turn CSV data into explainable predictions, grounded reports, and reusable prediction APIs.

The current pricing page is pilot planning copy, not an active billing product.

## Current Policy

- Real payment, subscriptions, invoices, and automatic upgrades are not implemented.
- Plan changes and usage-limit adjustments are handled manually during the pilot.
- Users can submit a pilot inquiry from the landing page, pricing page, usage card, or workspace settings.
- Pilot inquiries must not include payment information, raw CSV contents, API tokens, passwords, or secrets.

## Inquiry Data Stored

`POST /api/pilot-inquiries` stores lightweight sales-ops metadata only:

- inquiry ID
- optional user ID and user email
- name and email
- organization and role
- desired plan: Free, Pro Pilot, Team Pilot, or Unsure
- use case
- expected dataset size
- message
- current plan
- safe usage snapshot
- source route
- status: `new`, `contacted`, or `closed`
- created/updated timestamps

The inquiry flow does not store dataset contents, payment details, API tokens, or raw authorization data.

## Admin Review

Admins can review inquiries with:

```text
GET /api/admin/pilot-inquiries
POST /api/admin/pilot-inquiries/{inquiry_id}/status
```

This is a small internal review surface, not a CRM, billing dashboard, or automated sales pipeline.

## Manual Plan Operations

Plan flags and usage limits remain MVP-level controls. If a pilot user needs higher limits, a maintainer can manually review the inquiry and adjust the user plan through the existing development/admin process.

Do not describe this as automatic billing, self-service upgrade, or production subscription management.

## Known Limitations

- No Stripe, Toss Payments, PayPal, invoices, or billing integration.
- No account-based paid subscription lifecycle.
- No automated plan approval.
- No enterprise sales workflow.
- No payment security scope.

## Future Work

- Project-scoped plan override tooling
- Safer admin audit log for plan changes
- Optional billing integration after product-market validation
- Clearer pilot onboarding for Free, Pro Pilot, and Team Pilot users
