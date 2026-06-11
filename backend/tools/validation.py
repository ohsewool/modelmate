"""Evidence validation tool for PR-10.

This is a deterministic safety gate. It does not call an LLM, train models, or
modify existing ModelMate endpoints.
"""

from __future__ import annotations

from typing import Any


REQUIRED_EVIDENCE = [
    "selected_target",
    "task_type",
    "model_summary",
    "metric_summary",
    "explanation_summary",
]


def _bundle(arguments: dict[str, Any]) -> dict[str, Any]:
    evidence = arguments.get("evidence_bundle") or {}
    merged = {**arguments, **evidence}
    return merged


def _has_metric(metric_summary: dict[str, Any]) -> bool:
    return any(metric_summary.get(key) is not None for key in ("best_metric", "evaluated_metric", "best_metric_value"))


def validation_tool(arguments: dict[str, Any]) -> dict[str, Any]:
    evidence = _bundle(arguments)
    metric_summary = evidence.get("metric_summary") or {}
    limitations = evidence.get("limitations") or []
    leakage_warnings = evidence.get("leakage_warnings") or []
    data_quality_warnings = evidence.get("data_quality_warnings") or []
    source_calls = set(evidence.get("source_tool_calls") or [])

    missing = [key for key in REQUIRED_EVIDENCE if not evidence.get(key)]
    if not _has_metric(metric_summary):
        missing.append("evaluation_metric")
    if "data_profile_tool" not in source_calls:
        missing.append("data_profile_evidence")
    if "schema_validation_tool" not in source_calls:
        missing.append("schema_validation_evidence")
    if "leakage_check_tool" not in source_calls:
        missing.append("leakage_check_evidence")

    blocking = []
    warnings = list(data_quality_warnings)
    unsupported = []
    threshold = evidence.get("threshold_status")
    explanation = evidence.get("explanation_summary")

    if threshold == "fail":
        blocking.append("Metric threshold failed.")
    if any("high" in str(item).lower() for item in leakage_warnings):
        blocking.append("High leakage risk needs review before reporting.")
    if evidence.get("training_success") is False:
        blocking.append("Training failed, so a success report cannot be grounded.")
    if not explanation:
        warnings.append("Explanation evidence is missing or unavailable.")

    if blocking:
        status, tone, confidence = "invalid", "limited", 0.25
    elif missing:
        status, tone, confidence = "weak", "cautious", 0.55
    else:
        status, tone, confidence = "grounded", "confident", 0.82

    return {
        "success": status != "invalid",
        "validation_status": status,
        "confidence": confidence,
        "blocking_issues": blocking,
        "warnings": warnings,
        "missing_evidence": sorted(set(missing)),
        "unsupported_claims": unsupported,
        "recommended_tone": tone,
        "recommended_next_action": "Generate a cautious report from available evidence." if status != "invalid" else "Fix blocking issues before writing a report.",
        "observation": {
            "severity": "error" if status == "invalid" else "warning" if status == "weak" else "info",
            "message": f"Evidence validation status: {status}",
            "source_tool": "validation_tool",
        },
    }
