"""Deterministic schema validation tool for PR-05."""

from __future__ import annotations

from typing import Any

from backend.tools.data_profile import data_profile_tool


def _violation(severity: str, message: str, column: str | None = None) -> dict[str, Any]:
    item = {"severity": severity, "message": message}
    if column:
        item["column"] = column
    return item


def validate_profile(profile: dict[str, Any]) -> dict[str, Any]:
    violations: list[dict[str, Any]] = []
    row_count = int(profile.get("row_count") or 0)
    column_count = int(profile.get("column_count") or 0)
    missing_ratio = profile.get("missing_value_ratio") or {}
    constant_columns = profile.get("constant_columns") or []
    possible_id_cols = profile.get("possible_id_like_columns") or []
    numeric_cols = profile.get("numeric_columns") or []
    categorical_cols = profile.get("categorical_columns") or []
    datetime_cols = profile.get("datetime_like_columns") or []

    if profile.get("status") in ("fail", "no_input"):
        violations.append(_violation("error", profile.get("summary", "No usable profile was provided.")))
    if row_count and row_count < 30:
        violations.append(_violation("warning", "Dataset has fewer than 30 rows. Training may be unstable."))
    if row_count == 0:
        violations.append(_violation("error", "Dataset has no rows."))
    if column_count < 2:
        violations.append(_violation("error", "Dataset needs at least one feature column and one target column."))

    too_missing = [col for col, ratio in missing_ratio.items() if float(ratio) >= 0.8]
    for col in too_missing:
        violations.append(_violation("warning", "Column has too many missing values.", col))
    for col in constant_columns:
        violations.append(_violation("warning", "Column has only one unique value.", col))
    for col in possible_id_cols:
        violations.append(_violation("info", "Column may be an identifier or direct personal attribute.", col))

    usable_columns = [
        col for col in (numeric_cols + categorical_cols + datetime_cols)
        if col not in set(constant_columns) and col not in set(too_missing)
    ]
    if len(usable_columns) < 2:
        violations.append(_violation("error", "Too few usable columns remain after basic validation."))
    if column_count and len(possible_id_cols) >= max(1, column_count - 1):
        violations.append(_violation("warning", "Most columns look like identifiers, names, addresses, or unique keys."))

    severity_rank = {"info": 0, "warning": 1, "error": 2}
    worst = max((severity_rank[v["severity"]] for v in violations), default=0)
    status = "fail" if worst >= 2 else "warning" if worst == 1 else "pass"
    next_action = (
        "Stop and request a better dataset or human review."
        if status == "fail"
        else "Continue only after reviewing warnings."
        if status == "warning"
        else "Continue to target recommendation."
    )
    return {
        "status": status,
        "summary": f"Schema validation {status}. {len(violations)} issue(s) found.",
        "validation_status": status,
        "violations": violations,
        "columns_with_too_many_missing_values": too_missing,
        "columns_with_only_one_unique_value": constant_columns,
        "possible_identifier_columns": possible_id_cols,
        "unsupported_column_types": [],
        "too_few_rows": row_count < 30,
        "too_few_usable_columns": len(usable_columns) < 2,
        "training_suitability_summary": {
            "row_count": row_count,
            "column_count": column_count,
            "usable_column_count": len(usable_columns),
            "usable_columns": usable_columns,
        },
        "recommended_next_action": next_action,
    }


def schema_validation_tool(arguments: dict[str, Any]) -> dict[str, Any]:
    profile = arguments.get("profile")
    if not isinstance(profile, dict):
        profile = data_profile_tool(arguments)
    return validate_profile(profile)
