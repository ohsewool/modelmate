"""Planner interface for deterministic and optional LLM-assisted planning.

The deterministic planner is always the default and safety fallback. PR-31 does
not require or call a paid external API by default.
"""

from __future__ import annotations

import json
import os
from typing import Any

from backend.agents.goal_first import build_goal_first_plan, interpret_goal


REQUIRED_LLM_KEYS = {
    "task_family",
    "task_type",
    "supported_status",
    "report_framing",
    "review_flags",
    "plan_steps",
}


def create_agent_plan(goal_text: str, target_preference: str | None = None) -> dict[str, Any]:
    deterministic = interpret_goal(goal_text, target_preference)
    planner_meta = {
        "planner_type": "deterministic",
        "fallback_reason": None,
        "llm_enabled": _llm_enabled(),
        "validation_status": "not_used",
    }
    llm_output = _load_optional_llm_output()
    if planner_meta["llm_enabled"]:
        valid, reason = _validate_llm_output(llm_output)
        if valid:
            deterministic = _merge_safe_llm_fields(deterministic, llm_output)
            planner_meta.update({"planner_type": "llm_assisted", "validation_status": "valid"})
        else:
            planner_meta.update({"fallback_reason": reason, "validation_status": "invalid"})
    deterministic["planner"] = planner_meta
    plan = build_goal_first_plan(deterministic)
    plan["planner"] = planner_meta
    return {"interpreted_goal": deterministic, "plan": plan, "planner": planner_meta}


def _llm_enabled() -> bool:
    return os.getenv("MODEL_MATE_LLM_PLANNER_ENABLED", "").lower() in {"1", "true", "yes", "on"}


def _load_optional_llm_output() -> dict[str, Any] | None:
    raw = os.getenv("MODEL_MATE_LLM_PLANNER_RESPONSE")
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else None
    except Exception:
        return None


def _validate_llm_output(output: dict[str, Any] | None) -> tuple[bool, str | None]:
    if output is None:
        return False, "LLM planner is enabled but no valid JSON response was configured."
    missing = sorted(REQUIRED_LLM_KEYS - set(output))
    if missing:
        return False, f"LLM planner output is missing keys: {', '.join(missing)}"
    if output.get("supported_status") not in {"supported", "limited", "unsupported"}:
        return False, "LLM planner supported_status is invalid."
    if not isinstance(output.get("review_flags"), list):
        return False, "LLM planner review_flags must be a list."
    if not isinstance(output.get("plan_steps"), list):
        return False, "LLM planner plan_steps must be a list."
    return True, None


def _merge_safe_llm_fields(deterministic: dict[str, Any], llm_output: dict[str, Any]) -> dict[str, Any]:
    merged = dict(deterministic)
    if deterministic.get("supported_status") == "unsupported":
        merged["planner_warning"] = "LLM output cannot override deterministic unsupported scope."
        return merged
    allowed = {
        "report_framing": llm_output.get("report_framing"),
        "target_candidates": llm_output.get("target_hints") or deterministic.get("target_candidates"),
        "likely_metrics": llm_output.get("metric_hints") or deterministic.get("likely_metrics"),
    }
    for key, value in allowed.items():
        if value:
            merged[key] = value
    review_flags = set(deterministic.get("review_flags") or [])
    review_flags.update(str(flag) for flag in (llm_output.get("review_flags") or []))
    merged["review_flags"] = sorted(review_flags)
    if llm_output.get("supported_status") == "limited" and merged.get("supported_status") == "supported":
        merged["supported_status"] = "limited"
        merged["unsupported_reason"] = llm_output.get("unsupported_reason") or merged.get("unsupported_reason")
    return merged
