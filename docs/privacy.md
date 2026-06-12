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
- no formal user-level data isolation guarantee
- no formal retention/deletion request workflow
- no complete audit log policy
- no enterprise encryption/compliance policy

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
