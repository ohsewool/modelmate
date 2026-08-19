"""Deployment readiness checker for PR-11.

The tool returns advice only. It never deploys a model, changes prediction APIs,
calls an LLM, or modifies the existing AutoML pipeline.
"""

from __future__ import annotations

from typing import Any

from backend.tools.deployment_center import build_deployment_advice_id


def _merge(arguments: dict[str, Any]) -> dict[str, Any]:
    evidence = arguments.get("evidence_bundle") or {}
    validation = arguments.get("validation_result") or {}
    report = arguments.get("report_result") or {}
    merged = {**arguments, **evidence}
    merged["validation_result"] = validation
    merged["report_result"] = report
    return merged


def _metric_available(metric_summary: dict[str, Any]) -> bool:
    return any(metric_summary.get(key) is not None for key in ("best_metric", "evaluated_metric", "best_metric_value"))


def _risk_from_warnings(warnings: list[Any], evidence: dict[str, Any] | None = None) -> str:
    """How bad the leakage findings are, from the severities upstream computed.

    This scanned the warning text for the word "high", which is wrong in both
    directions and was wrong here at the last gate before a model is exposed as
    an API. The leakage check writes its reasons in Korean, so a column it had
    rated high came back `medium`; and "customer_id has high cardinality" - not
    leakage at all - came back `high`.

    The same defect was found and fixed in validation.py. The sweep afterwards
    missed this one because it searched for `"literal" in variable` and this
    line reads `word in text`, with the variable first. A pattern narrow enough
    to miss the second instance of a bug is a pattern that has not finished.

    Severity is a value the leakage check already returns. Reading it back out
    of prose was the mistake; the structured field is preferred, and the string
    scan is kept for callers still passing plain messages.
    """
    evidence = evidence or {}
    columns = evidence.get("suspicious_columns")
    if isinstance(columns, list) and columns:
        severities = {str(item.get("severity", "")).lower()
                      for item in columns if isinstance(item, dict)}
        if "high" in severities:
            return "high"
        if severities & {"medium", "low"}:
            return "medium"
    if evidence.get("leakage_risk"):
        risk = str(evidence["leakage_risk"]).lower()
        if risk in ("high", "medium", "low"):
            return risk

    for item in warnings:
        if isinstance(item, dict) and str(item.get("severity", "")).lower() == "high":
            return "high"
    text = " ".join(str(item).lower() for item in warnings)
    # Narrower than the bare word: the phrases the checker actually emits.
    if any(phrase in text for phrase in
           ("leakage risk: high", "high leakage", "severe", "critical")):
        return "high"
    return "medium" if warnings else "low"


def _check(name: str, passed: bool, detail: str, severity: str = "info") -> dict[str, Any]:
    return {"name": name, "passed": passed, "detail": detail, "severity": severity}


def deployment_check_tool(arguments: dict[str, Any]) -> dict[str, Any]:
    data = _merge(arguments)
    validation = data.get("validation_result") or {}
    report = data.get("report_result") or {}
    metric_summary = data.get("metric_summary") or {}
    leakage_warnings = data.get("leakage_warnings") or []
    data_warnings = data.get("data_quality_warnings") or []
    limitations = data.get("limitations") or []

    validation_status = validation.get("validation_status") or data.get("validation_status") or "unknown"
    threshold = data.get("threshold_status") or "unknown"
    leakage_risk = _risk_from_warnings(leakage_warnings, data)
    explanation = data.get("explanation_summary") or data.get("explanation_result")
    intended_use = data.get("intended_use") or data.get("user_goal")
    report_success = report.get("success", True)

    blocking: list[str] = []
    warnings: list[str] = []
    required: list[str] = []
    policy_checks = [
        _check("validation_grounded", validation_status == "grounded", f"validation_status={validation_status}"),
        _check("metric_available", _metric_available(metric_summary), "metric evidence present" if _metric_available(metric_summary) else "metric evidence missing"),
        _check("threshold_pass", threshold in ("pass", "acceptable"), f"threshold_status={threshold}"),
        _check("leakage_not_high", leakage_risk != "high", f"leakage_risk={leakage_risk}"),
        _check("explanation_available", bool(explanation), "explanation evidence present" if explanation else "explanation evidence missing"),
        _check("report_grounded", bool(report_success), f"report_success={report_success}"),
        _check("limitations_disclosed", bool(limitations), "limitations disclosed" if limitations else "limitations missing"),
    ]

    if validation_status == "invalid":
        blocking.append("Validation result is invalid.")
    if leakage_risk == "high":
        blocking.append("High leakage risk blocks deployment advice.")
    if not _metric_available(metric_summary):
        blocking.append("Metric evidence is missing.")
    if threshold == "fail":
        blocking.append("Metric threshold failed.")
    if data.get("training_success") is False:
        blocking.append("Training failed.")
    if data.get("target_suitability") == "poor":
        blocking.append("Target suitability is poor.")
    if report_success is False:
        blocking.append("Report result is not grounded.")
    if not explanation and not limitations:
        blocking.append("Explanation is unavailable and limitations are not disclosed.")

    if validation_status == "weak":
        warnings.append("Evidence validation is weak.")
    if leakage_risk == "medium":
        warnings.append("Leakage or feature review warning exists.")
    if data_warnings:
        warnings.append("Data quality warnings exist.")
    if not intended_use:
        warnings.append("Intended use is unclear.")
    if not explanation:
        warnings.append("Explanation evidence is missing or unavailable.")

    if blocking:
        status, risk = ("blocked" if len(blocking) >= 2 else "hold"), "high"
        required = ["Resolve blocking issues before production deployment."]
    elif warnings or validation_status != "grounded" or threshold not in ("pass", "acceptable"):
        status, risk = "needs_review", "medium"
        required = ["Review warnings and confirm intended use before deployment."]
    else:
        status, risk = "deploy_recommended", "low"
        required = ["Keep monitoring data drift and model performance after deployment."]

    advice_id = build_deployment_advice_id(arguments)
    return {
        "success": status == "deploy_recommended",
        "deployment_advice_id": advice_id,
        "deployment_status": status,
        "risk_level": risk,
        "blocking_reasons": blocking,
        "warnings": warnings,
        "required_actions": required,
        "recommended_next_action": required[0],
        "decision": {
            "decision_type": "deployment_advice",
            "action": status,
            "rationale": "Deployment advice was derived from validation, metric, leakage, report, and explanation evidence.",
            "confidence": 0.82 if status == "deploy_recommended" else 0.55 if status == "needs_review" else 0.25,
        },
        "observation": {
            "severity": "info" if status == "deploy_recommended" else "warning" if status == "needs_review" else "error",
            "message": f"Deployment check status: {status}",
            "source_tool": "deployment_check_tool",
        },
        "policy_checks": policy_checks,
    }
