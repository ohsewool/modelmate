"""Grounded report writer with optional LLM-enhanced wording."""

from __future__ import annotations

from typing import Any

from backend.tools.report_center import build_temporary_report_id
from backend.services.llm_service import fallback_summary, generate_structured_summary, is_llm_available


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

    # 검증이 "보고서를 쓰기 전에 이걸 고치라"고 판정한 사유. 그 판정은 계산만
    # 되고 보고서에는 들어오지 않았다 - 차단된 실행과 정상 실행의 한계 고지가
    # 글자 하나까지 같았고, 보고서만 받은 사람은 둘을 구분할 수 없었다.
    #
    # 데모에서 드러났다. 누출 권고를 무시하면 AUC가 1.000이 되는데(타깃을 베낀
    # 컬럼에서 나온 점수다) 검증은 "High leakage risk needs review before
    # reporting"이라 하고, 그 다음 절에서 나온 보고서는 그 말을 하지 않았다.
    # 장치 둘이 어긋나는데 대조하는 곳이 없는, 이 프로젝트가 반복해서 만나는 모양.
    #
    # 보고서를 아예 못 쓰게 막지는 않는다. 막으면 사용자는 이유를 볼 수 없고,
    # 근거를 보여주는 것이 이 제품의 요지다. 대신 보고서가 스스로 차단 상태를
    # 말한다.
    blocking = [str(issue) for issue in (validation.get("blocking_issues") or []) if issue]
    for issue in blocking:
        note = f"검증이 보고서 작성 전 해결을 요구한 사항입니다: {issue}"
        if note not in limitations:
            limitations.append(note)

    if LIMITATION_TEXT not in limitations:
        limitations.append(LIMITATION_TEXT)
    if LIMITATION_TEXT_EN not in limitations:
        limitations.append(LIMITATION_TEXT_EN)

    title = f"ModelMate 분석 보고서 - {_text(target, '타깃 미정')}"
    summary = f"{_text(target, '선택된 타깃')} 예측을 위해 {_text(task, '작업 유형 미정')} 모델 결과를 evidence 기반으로 정리했습니다."
    if blocking:
        # 요약 첫 문장에 둔다. 아래로 밀리면 요약만 읽는 사람에게는 없는 것과 같다.
        summary = (f"**검증이 이 보고서를 차단 상태로 표시했습니다 ({len(blocking)}건).** "
                   + summary)
    elif tone != "confident":
        summary += " 일부 evidence가 부족하므로 신중한 해석이 필요합니다."

    model_summary = evidence.get("model_summary") or {}
    best_model = model_summary.get("best_model") if isinstance(model_summary, dict) else None
    valid_result = bool(target and (best_model or metric_summary))
    llm_payload = {
        "user_goal": evidence.get("user_goal"),
        "goal_category": evidence.get("goal_category"),
        "dataset_name": evidence.get("dataset_name"),
        "row_count": evidence.get("row_count"),
        "column_count": evidence.get("column_count"),
        "target_column": target,
        "problem_type": task,
        "target_recommendation_reason": evidence.get("target_recommendation_reason"),
        "confidence_level": evidence.get("confidence_level"),
        "best_model": best_model or evidence.get("best_model"),
        "metrics": metric_summary,
        "compared_models": model_summary.get("models", []) if isinstance(model_summary, dict) else [],
        "important_features": evidence.get("top_features") or [],
        "review_status": validation.get("validation_status") or evidence.get("review_status"),
        "api_readiness_status": evidence.get("api_readiness_status") or evidence.get("deployment_status"),
        "warning_flags": [
            *list(evidence.get("data_quality_warnings") or []),
            *list(evidence.get("leakage_warnings") or []),
            *list(evidence.get("limitations") or []),
        ],
    }
    if valid_result and is_llm_available():
        llm_summary = generate_structured_summary(llm_payload)
    else:
        reason = "insufficient_analysis_result" if not valid_result else "unavailable"
        llm_summary = fallback_summary(reason, summary)

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
    if llm_summary.get("used_llm"):
        enhanced_sections = [
            _section("AI 분석 요약", llm_summary["summary"], ["llm_summary"]),
            _section("목표 기반 해석", llm_summary["goal_interpretation"], ["user_goal", "llm_summary"]),
            _section("모델 결과 해석", llm_summary["model_interpretation"], ["model_summary", "metric_summary", "llm_summary"]),
            _section("중요 요인 설명", llm_summary["important_factor_explanation"], ["top_features", "llm_summary"]),
            _section("다음 행동 제안", "\n".join(f"- {item}" for item in llm_summary["next_actions"]), ["llm_summary"]),
            _section("주의사항", "\n".join(f"- {item}" for item in llm_summary["cautions"]), ["llm_summary"]),
            _section("검토 및 API 안내", "\n".join(filter(None, [llm_summary["review_note"], llm_summary["api_note"]])), ["validation_result", "llm_summary"]),
        ]
        sections = enhanced_sections + sections
        markdown = "\n\n".join([f"# {title}", summary] + [f"## {row['title']}\n{row['content']}" for row in sections])
    report_id = build_temporary_report_id(evidence)
    return {
        "success": validation.get("validation_status") != "invalid",
        "report_id": report_id,
        "report_format": "markdown",
        "title": title,
        "summary": summary,
        "llm_summary": llm_summary,
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
