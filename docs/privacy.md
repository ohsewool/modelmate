# ModelMate Privacy and Data Handling Draft

This document is an MVP-stage privacy and data handling draft, not a final legal
privacy policy.

## What Users Upload

ModelMate is designed for CSV, TSV, and TXT-style tabular datasets. A user may
upload data that contains rows, columns, labels, target candidates, and feature
values used for predictive analysis.

Uploaded data can be used by ModelMate to:

- inspect dataset quality and structure
- recommend a prediction target
- compare machine learning models
- generate analysis reports
- support reusable prediction API-style flows

## Sensitive Data Warning

Do not upload production-sensitive or regulated data during the MVP/demo stage.
Avoid uploading:

- national ID numbers or resident registration numbers
- payment card or banking information
- passwords, API keys, tokens, or secrets
- medical records or protected health information
- employment, hiring, or disciplinary records tied to real people
- customer lists with direct personal identifiers

Use demo, synthetic, anonymized, or test data whenever possible.

## Current MVP Storage Limitations

The current project is a graduation project and SaaS MVP prototype. It does not
yet provide a complete commercial data governance program.

Current limitations include:

- auth-lite exists, but no full production-grade authentication policy
- MVP user-owned project checks exist, but no formal user-level data isolation
  guarantee
- no formal retention/deletion request workflow
- no complete audit log policy
- no enterprise encryption/compliance policy

## Authenticated Projects and Guest Demo Data

When a user signs in, newly saved projects, uploaded dataset metadata, agent
analysis runs, and deployed model metadata are associated with that user's
`user_id` at the MVP application layer. Project lists and private resource
detail routes are intended to show only the signed-in user's resources.
Project detail, project run history, and project report metadata are also
scoped by `user_id` at the MVP application layer.
Lightweight training job records, including job status, progress messages,
failure messages, and result summaries, are also associated with the signed-in
user and project when available.

Guest demo mode remains available for sample-data evaluation. Guest/demo data is
treated separately from private user projects and should not be used for
sensitive or production data.

This ownership layer is a foundation for commercialization work. It is not a
complete commercial privacy, retention, deletion, audit, or compliance program.

## Recommended User Practice

For presentations, evaluation, and portfolio review, use small demo datasets or
datasets that do not contain sensitive personal information.

## Future Commercialization Requirements

Before commercial use, ModelMate should add:

- stronger authentication and account management
- user-level data isolation
- retention and deletion policy
- deletion request workflow
- audit logs
- encryption policy for storage and transport
- access control and role management
- incident response and security review process
