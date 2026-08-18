"""Reporting: the LLM may phrase things, but it may not remove them.

The report is what a user reads and quotes. The risk is not that the model
writes badly — it is that a fluent summary displaces the grounded sections, so
a caveat that was in the evidence never reaches the page. These tests pin what
survives regardless of whether the model ran.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.tools.report_writer import LIMITATION_TEXT, report_writer_tool


def evidence(**overrides):
    base = {
        "selected_target": "churn",
        "task_type": "classification",
        "metric_summary": {"evaluated_metric": "roc_auc", "best_metric_value": 0.91},
        "model_summary": {"best_model": "lightgbm", "models": ["lightgbm", "rf"]},
        "user_goal": "고객 이탈을 예측하고 싶어요",
        "data_summary": "1000행 7열",
        "explanation_summary": "상위 특징: monthly_fee, tenure",
        "top_features": ["monthly_fee", "tenure"],
        "limitations": ["학습 데이터는 2024년까지만 포함합니다."],
    }
    base.update(overrides)
    return base


def call(**overrides):
    return report_writer_tool({
        "evidence_bundle": evidence(**overrides.pop("evidence", {})),
        "validation_result": overrides.pop("validation_result",
                                           {"validation_status": "grounded"}),
        **overrides,
    })


def titles(result):
    return [section["title"] for section in result["sections"]]


class TestGroundedSections:
    def test_every_grounded_section_is_present(self):
        result = call()
        for title in ("분석 목표", "데이터 개요", "추천 타깃", "성능 평가",
                      "한계와 주의사항", "다음 추천 행동"):
            assert title in titles(result)

    def test_a_section_without_evidence_says_so_rather_than_inventing(self):
        """Absent evidence must read as absent, not be filled in."""
        result = call(evidence={"user_goal": None, "data_summary": None})
        goal = next(s for s in result["sections"] if s["title"] == "분석 목표")
        assert "evidence 없음" in goal["content"]

    def test_every_section_names_the_evidence_it_rests_on(self):
        for section in call()["sections"]:
            assert section["evidence_keys"], section["title"]

    def test_the_metric_section_reports_the_measured_value(self):
        result = call()
        metric = next(s for s in result["sections"] if s["title"] == "성능 평가")
        assert "roc_auc" in metric["content"]
        assert "0.91" in metric["content"]

    def test_a_missing_metric_is_not_reported_as_a_number(self):
        result = call(evidence={"metric_summary": {}})
        metric = next(s for s in result["sections"] if s["title"] == "성능 평가")
        assert "evidence 없음" in metric["content"]


class TestLimitationsAlwaysSurvive:
    def test_the_standing_limitation_is_always_added(self):
        assert LIMITATION_TEXT in call()["limitations"]

    def test_supplied_limitations_are_kept_alongside_it(self):
        result = call()
        assert "학습 데이터는 2024년까지만 포함합니다." in result["limitations"]
        assert LIMITATION_TEXT in result["limitations"]

    def test_limitations_appear_in_the_rendered_report(self):
        """A caveat that exists only in a field nobody renders is not disclosed."""
        assert LIMITATION_TEXT in call()["markdown"]

    def test_the_limitation_is_not_duplicated(self):
        result = call(evidence={"limitations": [LIMITATION_TEXT]})
        assert result["limitations"].count(LIMITATION_TEXT) == 1


class TestToneFollowsValidation:
    def test_weak_validation_produces_a_cautious_summary(self):
        result = call(validation_result={"validation_status": "weak",
                                         "recommended_tone": "cautious"})
        assert "신중한 해석" in result["summary"]
        assert result["observation"]["severity"] == "warning"

    def test_confident_validation_drops_the_hedge(self):
        result = call(validation_result={"validation_status": "grounded",
                                         "recommended_tone": "confident"})
        assert "신중한 해석" not in result["summary"]
        assert result["observation"]["severity"] == "info"

    def test_the_default_tone_is_cautious(self):
        """When nobody said the evidence was strong, do not imply it was."""
        result = report_writer_tool({"evidence_bundle": evidence()})
        assert "신중한 해석" in result["summary"]

    def test_invalid_validation_marks_the_report_unsuccessful(self):
        result = call(validation_result={"validation_status": "invalid"})
        assert result["success"] is False


class TestWithoutAnLlm:
    def test_a_report_is_produced_when_no_model_is_available(self, monkeypatch):
        monkeypatch.setattr("backend.tools.report_writer.is_llm_available", lambda: False)
        result = call()
        assert result["markdown"]
        assert result["llm_summary"]["used_llm"] is False

    def test_the_grounded_sections_are_unaffected(self, monkeypatch):
        monkeypatch.setattr("backend.tools.report_writer.is_llm_available", lambda: False)
        assert "성능 평가" in titles(call())

    def test_an_incomplete_analysis_never_reaches_the_model(self, monkeypatch):
        """Nothing to summarise means nothing to hand to a model."""
        called = []
        monkeypatch.setattr("backend.tools.report_writer.is_llm_available", lambda: True)
        monkeypatch.setattr("backend.tools.report_writer.generate_structured_summary",
                            lambda payload: called.append(payload) or {"used_llm": True})
        report_writer_tool({"evidence_bundle": {"selected_target": None}})
        assert called == []


class TestWithAnLlm:
    @pytest.fixture
    def enhanced(self, monkeypatch):
        monkeypatch.setattr("backend.tools.report_writer.is_llm_available", lambda: True)
        monkeypatch.setattr(
            "backend.tools.report_writer.generate_structured_summary",
            lambda payload: {
                "used_llm": True,
                "summary": "모델이 쓴 요약",
                "goal_interpretation": "목표 해석",
                "model_interpretation": "모델 해석",
                "important_factor_explanation": "요인 설명",
                "next_actions": ["다음 행동"],
                "cautions": ["주의"],
                "review_note": "검토 필요",
                "api_note": "API 안내",
            },
        )
        return call()

    def test_the_model_sections_are_added(self, enhanced):
        assert "AI 분석 요약" in titles(enhanced)

    def test_the_grounded_sections_are_not_replaced(self, enhanced):
        """The failure to fear: a fluent summary displacing the evidence."""
        for title in ("성능 평가", "한계와 주의사항", "Leakage 검사 결과"):
            assert title in titles(enhanced)

    def test_the_limitations_still_reach_the_page(self, enhanced):
        assert LIMITATION_TEXT in enhanced["markdown"]

    def test_model_sections_are_labelled_as_model_output(self, enhanced):
        """A reader must be able to tell which sentences came from a model."""
        ai_section = next(s for s in enhanced["sections"] if s["title"] == "AI 분석 요약")
        assert "llm_summary" in ai_section["evidence_keys"]

    def test_the_evidence_payload_carries_no_secrets_beyond_the_bundle(self, monkeypatch):
        captured = {}
        monkeypatch.setattr("backend.tools.report_writer.is_llm_available", lambda: True)
        monkeypatch.setattr(
            "backend.tools.report_writer.generate_structured_summary",
            lambda payload: captured.update(payload) or {"used_llm": False, "summary": ""},
        )
        call()
        assert set(captured) <= {
            "user_goal", "goal_category", "dataset_name", "row_count", "column_count",
            "target_column", "problem_type", "target_recommendation_reason",
            "confidence_level", "best_model", "metrics", "compared_models",
            "important_features", "review_status", "api_readiness_status",
            "warning_flags",
        }


class TestReportIdentity:
    def test_a_report_is_identifiable(self):
        assert call()["report_id"]

    def test_the_format_is_declared(self):
        assert call()["report_format"] == "markdown"

    def test_the_title_names_the_target(self):
        assert "churn" in call()["title"]

    def test_a_missing_target_is_stated_in_the_title(self):
        result = call(evidence={"selected_target": None, "target_column": None})
        assert "타깃 미정" in result["title"]
