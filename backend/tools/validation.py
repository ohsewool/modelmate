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


def _has_high_leakage(leakage_warnings, evidence) -> bool:
    """Is there a high-severity leakage finding?

    This used to be `"high" in str(item).lower()` over the warning strings,
    which is wrong in both directions. It misses a real finding whose message
    does not happen to contain the English word - the leakage check writes its
    reasons in Korean, so a genuinely high-risk column sailed through this gate
    in the demo. And it fires on any warning mentioning "high cardinality",
    blocking a report over something that is not leakage at all.

    A severity is a value the upstream check already computes. Reading it back
    out of prose was the mistake; the structured field is preferred, and the
    string scan is kept only for callers that still pass plain messages.
    """
    columns = evidence.get("suspicious_columns")
    if isinstance(columns, list) and columns:
        return any(
            isinstance(item, dict) and str(item.get("severity", "")).lower() == "high"
            for item in columns
        )
    if evidence.get("leakage_risk"):
        return str(evidence["leakage_risk"]).lower() == "high"
    for item in leakage_warnings:
        if isinstance(item, dict):
            if str(item.get("severity", "")).lower() == "high":
                return True
            continue
        text = str(item).lower()
        # Narrower than before: the phrase the checker actually emits, not the
        # bare word wherever it appears.
        if "leakage risk: high" in text or "high leakage" in text:
            return True
    return False


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
    if _has_high_leakage(leakage_warnings, evidence):
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
        # The action has to agree with the tone. It previously said "cautious"
        # for every non-invalid status, so a fully grounded result was told to
        # hedge while `recommended_tone` said confident - two fields of one
        # answer contradicting each other.
        "recommended_next_action": (
            "Fix blocking issues before writing a report." if status == "invalid"
            else "Generate a cautious report from available evidence." if status == "weak"
            else "Generate a report from the grounded evidence."
        ),
        "observation": {
            "severity": "error" if status == "invalid" else "warning" if status == "weak" else "info",
            "message": f"Evidence validation status: {status}",
            "source_tool": "validation_tool",
        },
    }
