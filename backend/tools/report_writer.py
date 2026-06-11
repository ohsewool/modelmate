"""Grounded report writer tool for PR-10.

The report is generated only from supplied evidence. It does not call an LLM.
"""

from __future__ import annotations

from typing import Any

from backend.tools.report_center import build_temporary_report_id


LIMITATION_TEXT = "모델 성능과 설명은 업로드된 데이터와 현재 검증 결과에 기반합니다."
LIMITATION_TEXT_EN = "Model performance and explanations are based on the uploaded dataset and the current validation results."


def _bundle(arguments: dict[str, Any]) -> dict[str, Any]:
    evidence = arguments.get("evidence_bundle") or {}
    return {**arguments, **evidence}


def _text(value: Any, fallback: str = "제공된 evidence 없음") -> str:
    if value in (None, "", [], {}):
        return fallback
    return str(value)


def _metric(metric_summary: dict[str, Any]) -> str:
    label = metric_summary.get("evaluated_metric") or metric_summary.get("best_metric", {}).get("label")
    value = metric_summary.get("best_metric_value") or metric_summary.get("best_metric", {}).get("value")
    return f"{label}: {value}" if label and value is not None else "성능 지표 evidence 없음"


def _section(title: str, content: str, evidence_keys: list[str]) -> dict[str, Any]:
    return {"title": title, "content": content, "evidence_keys": evidence_keys}


def report_writer_tool(arguments: dict[str, Any]) -> dict[str, Any]:
    evidence = _bundle(arguments)
    validation = arguments.get("validation_result") or {}
    tone = validation.get("recommended_tone") or arguments.get("recommended_tone") or "cautious"
    target = evidence.get("selected_target") or evidence.get("target_column")
    task = evidence.get("task_type")
    metric_summary = evidence.get("metric_summary") or {}
    limitations = list(evidence.get("limitations") or [])
    if LIMITATION_TEXT not in limitations:
        limitations.append(LIMITATION_TEXT)
    if LIMITATION_TEXT_EN not in limitations:
        limitations.append(LIMITATION_TEXT_EN)

    title = f"ModelMate 분석 보고서 - {_text(target, '타깃 미정')}"
    summary = f"{_text(target, '선택된 타깃')} 예측을 위해 {_text(task, '작업 유형 미정')} 모델 결과를 evidence 기반으로 정리했습니다."
    if tone != "confident":
        summary += " 일부 evidence가 부족하므로 신중한 해석이 필요합니다."

    sections = [
        _section("분석 목표", _text(evidence.get("user_goal"), "사용자 목표 evidence 없음"), ["user_goal"]),
        _section("데이터 개요", _text(evidence.get("data_summary"), "데이터 개요 evidence 없음"), ["data_summary"]),
        _section("추천 타깃", f"타깃: {_text(target)} / 작업 유형: {_text(task)}", ["selected_target", "task_type"]),
        _section("데이터 품질 및 스키마 검증", _text(evidence.get("data_quality_warnings"), "중요 경고 evidence 없음"), ["data_quality_warnings"]),
        _section("Leakage 검사 결과", _text(evidence.get("leakage_warnings"), "누수 경고 evidence 없음"), ["leakage_warnings"]),
        _section("모델 학습 결과", _text(evidence.get("model_summary"), "모델 summary evidence 없음"), ["model_summary"]),
        _section("성능 평가", _metric(metric_summary), ["metric_summary", "threshold_status"]),
        _section("설명 가능성/XAI 요약", _text(evidence.get("explanation_summary")), ["explanation_summary", "top_features"]),
        _section("한계와 주의사항", "\n".join(f"- {item}" for item in limitations), ["limitations"]),
        _section("다음 추천 행동", _text(validation.get("recommended_next_action"), "검증 결과를 확인한 뒤 다음 단계로 진행하세요."), ["validation_result"]),
    ]

    markdown = "\n\n".join([f"# {title}", summary] + [f"## {row['title']}\n{row['content']}" for row in sections])
    report_id = build_temporary_report_id(evidence)
    return {
        "success": validation.get("validation_status") != "invalid",
        "report_id": report_id,
        "report_format": "markdown",
        "title": title,
        "summary": summary,
        "sections": sections,
        "markdown": markdown,
        "limitations": limitations,
        "evidence_links": evidence.get("source_tool_calls") or [],
        "recommended_next_action": "Review the grounded report before PR-11 deployment checks.",
        "observation": {
            "severity": "warning" if tone != "confident" else "info",
            "message": "Grounded report draft created from available evidence.",
            "source_tool": "report_writer_tool",
        },
    }
