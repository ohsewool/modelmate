"""XAI adapter for PR-09.

This wraps existing ModelMate explanation helpers when available and falls back
to model-provided importance values. It does not call an LLM or create reports.
"""

from __future__ import annotations

from typing import Any

from backend.tools.evidence_bundle import build_evidence_bundle


def _unavailable(message: str) -> dict[str, Any]:
    return {
        "success": False,
        "status": "failed",
        "summary": "Explanation is unavailable.",
        "explanation_type": "unavailable",
        "global_explanations": [],
        "local_explanations": [],
        "top_features": [],
        "sample_explanations": [],
        "warnings": [message],
        "limitations": ["No compatible model explanation source was available."],
        "observation": {"severity": "warning", "message": message},
        "evidence_items": [],
        "recommended_next_action": "Continue only with metric evidence or rerun training with an explainable model.",
    }


def _fallback_from_state(modelmate, limit: int) -> tuple[str, list[dict[str, Any]]]:
    model, x_data, y_data = modelmate.STATE.get("best_model"), modelmate.STATE.get("X"), modelmate.STATE.get("y")
    if model is None or x_data is None:
        raise ValueError("Run AutoML training before explanation.")
    if hasattr(modelmate, "global_explanation_items"):
        return modelmate.global_explanation_items(limit)
    values = getattr(model, "feature_importances_", None)
    source = "feature_importance"
    if values is None and hasattr(model, "coef_"):
        coef = abs(model.coef_)
        values = coef.mean(axis=0) if getattr(coef, "ndim", 1) > 1 else coef
        source = "model_coefficient"
    if values is None:
        raise ValueError("Model does not expose feature_importances_ or coef_.")
    total = float(sum(abs(float(v)) for v in values)) or 1.0
    items = [
        {"feature": col, "importance": round(abs(float(v)) / total, 4), "raw_importance": round(float(v), 4), "source": source}
        for col, v in zip(x_data.columns, values)
    ]
    return source, sorted(items, key=lambda row: row["importance"], reverse=True)[:limit]


def shap_explainer_tool(arguments: dict[str, Any]) -> dict[str, Any]:
    limit = int(arguments.get("limit") or arguments.get("max_sample_size") or 10)
    limit = max(1, min(limit, 20))
    try:
        import backend.main as modelmate
        source, top_features = _fallback_from_state(modelmate, limit)
        local = []
        if hasattr(modelmate, "local_explanation_items") and len(modelmate.STATE.get("X", [])):
            local = [modelmate.local_explanation_items(0, min(8, limit))]
        explanation_type = "shap" if source == "shap" else source or "fallback"
        summary = (
            f"{top_features[0]['feature']} is the strongest available explanation signal."
            if top_features else "No feature-level explanation signal was found."
        )
        limitations = [
            "Feature importance indicates model signal strength, not guaranteed causality.",
            "Fallback explanations are approximations when SHAP values are unavailable.",
        ]
        result = {
            "success": True,
            "status": "explained",
            "summary": summary,
            "explanation_type": explanation_type,
            "global_explanations": top_features,
            "local_explanations": local,
            "top_features": top_features[:5],
            "sample_explanations": local,
            "warnings": [],
            "limitations": limitations,
            "observation": {"severity": "info", "message": summary, "source": explanation_type},
            "evidence_items": top_features[:5],
            "recommended_next_action": "Attach this evidence bundle to the PR-10 report writer.",
        }
        result["evidence_bundle"] = build_evidence_bundle(arguments, result)
        return result
    except Exception as exc:
        failed = _unavailable(str(exc))
        failed["evidence_bundle"] = build_evidence_bundle(arguments, failed)
        failed["error_type"] = type(exc).__name__
        failed["error_message"] = str(exc)
        return failed
