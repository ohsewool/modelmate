"""Optional OpenAI Responses API foundation.

This module is deliberately not connected to report generation yet. Only
whitelisted analysis metadata may be sent; raw CSV rows and secrets are never
included in the request context.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any


logger = logging.getLogger(__name__)

DEFAULT_MODEL = "gpt-5-mini"
DEFAULT_TIMEOUT_SECONDS = 20.0
DEFAULT_MAX_INPUT_CHARS = 12000

ANALYSIS_SUMMARY_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "summary": {"type": "string"},
        "goal_interpretation": {"type": "string"},
        "model_interpretation": {"type": "string"},
        "important_factor_explanation": {"type": "string"},
        "next_actions": {"type": "array", "items": {"type": "string"}},
        "cautions": {"type": "array", "items": {"type": "string"}},
        "confidence_note": {"type": "string"},
        "review_note": {"type": "string"},
        "api_note": {"type": "string"},
    },
    "required": [
        "summary",
        "goal_interpretation",
        "model_interpretation",
        "important_factor_explanation",
        "next_actions",
        "cautions",
        "confidence_note",
        "review_note",
        "api_note",
    ],
}


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_float(name: str, default: float) -> float:
    try:
        return max(1.0, float(os.getenv(name, default)))
    except (TypeError, ValueError):
        return default


def _env_int(name: str, default: int) -> int:
    try:
        return max(1000, int(os.getenv(name, default)))
    except (TypeError, ValueError):
        return default


def get_llm_status() -> dict[str, Any]:
    enabled = _env_bool("LLM_ENABLED")
    key_configured = bool(os.getenv("OPENAI_API_KEY", "").strip())
    sdk_available = _openai_class() is not None
    reason = None
    if not enabled:
        reason = "disabled"
    elif not key_configured:
        reason = "missing_api_key"
    elif not sdk_available:
        reason = "sdk_unavailable"
    return {
        "enabled": enabled,
        "available": enabled and key_configured and sdk_available,
        "model": os.getenv("OPENAI_MODEL", DEFAULT_MODEL) if enabled else None,
        "reason": reason,
    }


def is_llm_available() -> bool:
    return bool(get_llm_status()["available"])


def build_analysis_context(run_result: dict[str, Any] | None) -> dict[str, Any]:
    """Build a compact allowlisted context without raw rows or credentials."""
    source = run_result if isinstance(run_result, dict) else {}
    dataset = source.get("dataset") if isinstance(source.get("dataset"), dict) else {}
    model = source.get("model") if isinstance(source.get("model"), dict) else {}
    metric = source.get("metric") if isinstance(source.get("metric"), dict) else {}
    features = source.get("important_features") or source.get("top_features") or []
    safe_features = []
    for item in features[:10] if isinstance(features, list) else []:
        if isinstance(item, dict):
            safe_features.append({
                "name": item.get("name") or item.get("feature") or item.get("column"),
                "score": item.get("score") if item.get("score") is not None else item.get("importance"),
            })
        elif isinstance(item, str):
            safe_features.append({"name": item, "score": None})

    compared_models = []
    for item in source.get("compared_models", [])[:10] if isinstance(source.get("compared_models"), list) else []:
        if isinstance(item, dict):
            compared_models.append({
                str(key): value
                for key, value in item.items()
                if key in {"model", "name", "accuracy", "f1", "roc_auc", "r2", "rmse", "mae"}
                and isinstance(value, (str, int, float, bool))
            })
    metrics_source = source.get("metrics") if isinstance(source.get("metrics"), dict) else metric
    safe_metrics = {
        str(key): value
        for key, value in metrics_source.items()
        if isinstance(value, (str, int, float, bool))
    }
    best_model = source.get("best_model") or model.get("name")
    if isinstance(best_model, dict):
        best_model = best_model.get("name") or best_model.get("model")
    context = {
        "user_goal": source.get("user_goal"),
        "goal_category": source.get("goal_category"),
        "dataset_name": source.get("dataset_name") or dataset.get("filename") or dataset.get("name"),
        "row_count": source.get("row_count") if source.get("row_count") is not None else dataset.get("row_count"),
        "column_count": source.get("column_count") if source.get("column_count") is not None else dataset.get("column_count"),
        "target_column": source.get("target_column") or dataset.get("target_column") or dataset.get("target_col"),
        "problem_type": source.get("problem_type") or source.get("task_type"),
        "best_model": best_model,
        "target_recommendation_reason": source.get("target_recommendation_reason"),
        "confidence_level": source.get("confidence_level"),
        "metrics": safe_metrics,
        "compared_models": compared_models,
        "important_features": safe_features,
        "review_status": source.get("review_status") or source.get("status"),
        "api_readiness_status": source.get("api_readiness_status"),
        "warning_flags": [str(item)[:500] for item in source.get("warning_flags", [])[:20]] if isinstance(source.get("warning_flags"), list) else [],
    }
    compact = {key: value for key, value in context.items() if value not in (None, "", [], {})}
    max_chars = _env_int("LLM_MAX_INPUT_CHARS", DEFAULT_MAX_INPUT_CHARS)
    encoded = json.dumps(compact, ensure_ascii=False, default=str)
    if len(encoded) <= max_chars:
        return compact
    return {
        "user_goal": str(compact.get("user_goal", ""))[:1000],
        "dataset_name": str(compact.get("dataset_name", ""))[:300],
        "target_column": str(compact.get("target_column", ""))[:300],
        "problem_type": compact.get("problem_type"),
        "best_model": compact.get("best_model"),
        "metrics": compact.get("metrics", {}),
        "compared_models": compared_models[:5],
        "important_features": safe_features[:5],
        "review_status": compact.get("review_status"),
        "warning_flags": compact.get("warning_flags", [])[:10],
        "context_truncated": True,
    }


def fallback_summary(reason: str = "unavailable", fallback_text: str | None = None) -> dict[str, Any]:
    return {
        "success": False,
        "used_llm": False,
        "fallback": True,
        "reason": reason,
        "summary": fallback_text or "AI 요약을 사용할 수 없어 기본 분석 요약을 표시합니다.",
        "goal_interpretation": "",
        "important_factor_explanation": "",
        "next_actions": [],
        "cautions": ["AI 설명 기능은 현재 비활성화되어 있습니다."],
        "confidence_note": "기존 규칙 기반 분석 결과를 확인해 주세요.",
        "model_interpretation": "",
        "review_note": "",
        "api_note": "",
    }


def validate_structured_summary(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    normalized: dict[str, Any] = {}
    for field in (
        "summary",
        "goal_interpretation",
        "model_interpretation",
        "important_factor_explanation",
        "confidence_note",
        "review_note",
        "api_note",
    ):
        if not isinstance(value.get(field), str):
            return None
        normalized[field] = value[field].strip()
    for field in ("next_actions", "cautions"):
        items = value.get(field)
        if not isinstance(items, list) or not all(isinstance(item, str) for item in items):
            return None
        normalized[field] = [item.strip() for item in items if item.strip()][:10]
    return normalized


def call_llm_json(prompt: str, schema: dict[str, Any], instructions: str | None = None) -> dict[str, Any]:
    status = get_llm_status()
    if not status["available"]:
        return fallback_summary(status["reason"] or "unavailable")
    client_class = _openai_class()
    try:
        client = client_class(
            api_key=os.getenv("OPENAI_API_KEY"),
            timeout=_env_float("LLM_TIMEOUT_SECONDS", DEFAULT_TIMEOUT_SECONDS),
        )
        response = client.responses.create(
            model=status["model"],
            instructions=instructions,
            input=prompt,
            text={
                "format": {
                    "type": "json_schema",
                    "name": "analysis_summary",
                    "schema": schema,
                    "strict": True,
                }
            },
        )
        raw = getattr(response, "output_text", None)
        try:
            parsed = json.loads(raw) if isinstance(raw, str) else None
        except json.JSONDecodeError:
            return fallback_summary("invalid_response")
        valid = validate_structured_summary(parsed)
        if not valid:
            return fallback_summary("invalid_response")
        return {"success": True, "used_llm": True, "fallback": False, "reason": None, **valid}
    except Exception as exc:  # SDK error classes vary by installed version.
        logger.warning("Optional LLM call failed (%s). Falling back to deterministic output.", type(exc).__name__)
        return fallback_summary(_safe_error_reason(exc))


def generate_structured_summary(input_payload: dict[str, Any]) -> dict[str, Any]:
    context = build_analysis_context(input_payload)
    prompt = "분석 메타데이터:\n" + json.dumps(context, ensure_ascii=False, default=str)
    instructions = (
        "당신은 CSV 예측 분석 보고서 작성 보조자입니다. 반드시 한국어로 간결하게 작성하고, 제공된 구조화 메타데이터만 사용하세요. "
        "모델명, 예측값, 성능 지표, 중요 요인을 만들거나 추측하지 마세요. 비전문가도 이해할 수 있게 설명하되 예측을 보장하거나 "
        "운영 준비가 완료되었다고 과장하지 마세요. review_status가 검토 필요이면 사용 전 검토 항목을 review_note에 명시하고, "
        "api_readiness_status에 따라 API 사용 가능 여부를 api_note에 정확히 설명하세요. 목표와 데이터가 맞지 않는 경고가 있으면 이를 숨기지 마세요."
    )
    return call_llm_json(prompt, ANALYSIS_SUMMARY_SCHEMA, instructions=instructions)


def _safe_error_reason(exc: Exception) -> str:
    name = type(exc).__name__.lower()
    if "timeout" in name:
        return "timeout"
    if "rate" in name or "quota" in name:
        return "rate_limited"
    if "auth" in name or "permission" in name:
        return "authentication_failed"
    if "notfound" in name or "model" in name:
        return "model_unavailable"
    return "provider_error"


def _openai_class():
    try:
        from openai import OpenAI
    except ImportError:
        return None
    return OpenAI
