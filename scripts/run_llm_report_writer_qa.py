"""Offline QA for PR-10 LLM-enhanced report writing."""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import backend.tools.report_writer as report_writer
from backend.agents.persistence import ensure_agent_trace_schema
from backend.services.llm_service import ANALYSIS_SUMMARY_SCHEMA, build_analysis_context, validate_structured_summary


VALID_SUMMARY = {
    "summary": "설비 고장 위험을 예측하기 위한 분석 결과입니다.",
    "goal_interpretation": "예방 정비 우선순위를 정하는 목표로 해석했습니다.",
    "model_interpretation": "Random Forest의 ROC-AUC 결과를 참고할 수 있습니다.",
    "important_factor_explanation": "temperature와 vibration이 주요 요인으로 확인되었습니다.",
    "next_actions": ["고위험 설비를 우선 점검하세요."],
    "cautions": ["운영 적용 전 검토가 필요합니다."],
    "confidence_note": "현재 검증 결과 범위에서 해석했습니다.",
    "review_note": "성능과 중요 요인을 확인한 뒤 사용하세요.",
    "api_note": "검토가 끝난 뒤 API 연결을 검토할 수 있습니다.",
}


def main() -> int:
    assert set(ANALYSIS_SUMMARY_SCHEMA["required"]) == set(VALID_SUMMARY)
    assert validate_structured_summary(VALID_SUMMARY) == VALID_SUMMARY

    context = build_analysis_context({
        "user_goal": "설비 고장을 예측해 예방 정비에 활용하고 싶어",
        "dataset_name": "equipment.csv",
        "row_count": 100,
        "column_count": 8,
        "target_column": "failure_risk",
        "problem_type": "classification",
        "best_model": {"name": "Random Forest"},
        "metrics": {"roc_auc": 0.82},
        "compared_models": [{"model": "Random Forest", "roc_auc": 0.82, "raw": "excluded"}],
        "important_features": [{"feature": "temperature", "importance": 0.4}],
        "rows": [{"email": "must-not-pass@example.com"}],
        "password": "must-not-pass",
    })
    encoded = repr(context)
    assert context["best_model"] == "Random Forest"
    assert "rows" not in context and "password" not in context
    assert "must-not-pass" not in encoded and "raw" not in encoded

    original_available = report_writer.is_llm_available
    original_generate = report_writer.generate_structured_summary
    report_writer.is_llm_available = lambda: True
    report_writer.generate_structured_summary = lambda _payload: {
        "success": True, "used_llm": True, "fallback": False, "reason": None, **VALID_SUMMARY
    }
    try:
        result = report_writer.report_writer_tool({
            "user_goal": "설비 고장 예측",
            "goal_category": "equipment_failure",
            "dataset_name": "equipment.csv",
            "selected_target": "failure_risk",
            "task_type": "classification",
            "model_summary": {"best_model": "Random Forest", "models": [{"model": "Random Forest", "roc_auc": 0.82}]},
            "metric_summary": {"evaluated_metric": "roc_auc", "best_metric_value": 0.82},
            "top_features": [{"feature": "temperature", "importance": 0.4}],
            "validation_result": {"validation_status": "weak", "recommended_tone": "cautious"},
            "api_readiness_status": "needs_review",
        })
        assert result["llm_summary"]["used_llm"] is True
        assert any(section["title"] == "AI 분석 요약" for section in result["sections"])
        assert "AI 분석 요약" in result["markdown"]
    finally:
        report_writer.is_llm_available = original_available
        report_writer.generate_structured_summary = original_generate

    report_writer.is_llm_available = lambda: False
    try:
        fallback = report_writer.report_writer_tool({
            "selected_target": "failure_risk",
            "task_type": "classification",
            "metric_summary": {"roc_auc": 0.82},
            "validation_result": {"validation_status": "grounded"},
        })
        assert fallback["llm_summary"]["fallback"] is True
        assert not any(section["title"] == "AI 분석 요약" for section in fallback["sections"])
    finally:
        report_writer.is_llm_available = original_available

    conn = sqlite3.connect(":memory:")
    ensure_agent_trace_schema(conn)
    columns = {row[1] for row in conn.execute("PRAGMA table_info(artifacts)")}
    assert "payload_json" in columns
    print("LLM report writer QA: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
