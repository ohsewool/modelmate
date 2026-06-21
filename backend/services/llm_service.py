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
        "important_factor_explanation": {"type": "string"},
        "next_actions": {"type": "array", "items": {"type": "string"}},
        "cautions": {"type": "array", "items": {"type": "string"}},
        "confidence_note": {"type": "string"},
    },
    "required": [
        "summary",
        "goal_interpretation",
        "important_factor_explanation",
        "next_actions",
        "cautions",
        "confidence_note",
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

    context = {
        "user_goal": source.get("user_goal"),
        "dataset_name": source.get("dataset_name") or dataset.get("filename") or dataset.get("name"),
        "row_count": source.get("row_count") if source.get("row_count") is not None else dataset.get("row_count"),
        "column_count": source.get("column_count") if source.get("column_count") is not None else dataset.get("column_count"),
        "target_column": source.get("target_column") or dataset.get("target_column") or dataset.get("target_col"),
        "problem_type": source.get("problem_type") or source.get("task_type"),
        "best_model": source.get("best_model") or model.get("name"),
        "metrics": source.get("metrics") if isinstance(source.get("metrics"), dict) else metric,
        "important_features": safe_features,
        "review_status": source.get("review_status") or source.get("status"),
        "warning_flags": source.get("warning_flags") if isinstance(source.get("warning_flags"), list) else [],
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
    }


def validate_structured_summary(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    normalized: dict[str, Any] = {}
    for field in ("summary", "goal_interpretation", "important_factor_explanation", "confidence_note"):
        if not isinstance(value.get(field), str):
            return None
        normalized[field] = value[field].strip()
    for field in ("next_actions", "cautions"):
        items = value.get(field)
        if not isinstance(items, list) or not all(isinstance(item, str) for item in items):
            return None
        normalized[field] = [item.strip() for item in items if item.strip()][:10]
    return normalized


def call_llm_json(prompt: str, schema: dict[str, Any]) -> dict[str, Any]:
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
    prompt = (
        "다음은 CSV 예측 분석의 요약 메타데이터입니다. 원본 행을 추측하거나 근거 없는 사실을 추가하지 말고, "
        "제공된 값만 사용해 한국어 분석 요약을 JSON schema에 맞춰 작성하세요.\n"
        + json.dumps(context, ensure_ascii=False, default=str)
    )
    return call_llm_json(prompt, ANALYSIS_SUMMARY_SCHEMA)


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
