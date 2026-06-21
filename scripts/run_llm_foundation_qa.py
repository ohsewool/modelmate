"""Offline QA for the optional LLM integration foundation."""

from __future__ import annotations

import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.services.llm_service import (
    build_analysis_context,
    generate_structured_summary,
    get_llm_status,
    validate_structured_summary,
)
import backend.services.llm_service as llm_service


class _InvalidResponseClient:
    def __init__(self, **_kwargs):
        self.responses = self

    def create(self, **_kwargs):
        return type("Response", (), {"output_text": "not-json"})()


def main() -> int:
    previous = {name: os.environ.get(name) for name in ("LLM_ENABLED", "OPENAI_API_KEY")}
    try:
        os.environ["LLM_ENABLED"] = "false"
        os.environ.pop("OPENAI_API_KEY", None)
        status = get_llm_status()
        assert status["available"] is False and status["reason"] == "disabled"
        fallback = generate_structured_summary({"user_goal": "고장 예측", "rows": [{"secret": "must-not-pass"}]})
        assert fallback["fallback"] is True

        os.environ["LLM_ENABLED"] = "true"
        status = get_llm_status()
        assert status["available"] is False and status["reason"] == "missing_api_key"

        context = build_analysis_context({
            "user_goal": "고장 가능성을 예측해줘",
            "dataset": {"filename": "equipment.csv", "row_count": 100, "column_count": 8},
            "target_column": "failure_risk",
            "rows": [{"name": "private row"}],
            "password": "never include",
            "api_key": "never include",
            "important_features": [{"feature": "temperature", "importance": 0.42}],
        })
        encoded = repr(context)
        assert "rows" not in context and "password" not in context and "api_key" not in context
        assert "private row" not in encoded and "never include" not in encoded

        assert validate_structured_summary({"summary": "invalid"}) is None
        os.environ["OPENAI_API_KEY"] = "test-only-placeholder"
        original_openai_class = llm_service._openai_class
        llm_service._openai_class = lambda: _InvalidResponseClient
        try:
            invalid = generate_structured_summary(context)
            assert invalid["fallback"] is True and invalid["reason"] == "invalid_response"
        finally:
            llm_service._openai_class = original_openai_class
        print("LLM foundation QA: PASS")
        return 0
    finally:
        for name, value in previous.items():
            if value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = value


if __name__ == "__main__":
    raise SystemExit(main())
