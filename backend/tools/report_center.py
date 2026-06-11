"""Minimal Report Center placeholders for PR-10.

No database or file storage is introduced in this PR.
"""

from __future__ import annotations

from typing import Any


def build_temporary_report_id(evidence: dict[str, Any]) -> str:
    run_id = evidence.get("analysis_run_id") or evidence.get("experiment_run_id") or "draft"
    return f"report-{run_id}"


def get_report_center_placeholder() -> dict[str, Any]:
    return {
        "status": "placeholder",
        "storage": "not_implemented",
        "message": "PR-10 defines report output structure only. Persistent Report Center storage is a later PR.",
    }
