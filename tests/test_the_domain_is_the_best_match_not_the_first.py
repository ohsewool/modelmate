"""도메인 판정은 **첫 일치가 아니라 근거가 많은 쪽**이어야 한다.

화면을 보다가 찾았다. 고객 이탈 CSV를 올렸더니 첫 화면이 이렇게 말했다.

    데이터 종류: 보안/이상 탐지     신뢰: 높음
    "로그인, 거래, 보안 기록으로 이상 여부를 예측하는 문제로 보입니다."

`last_login_days`의 `login`이 보안 규칙에 걸리고, **그 규칙이 이탈 규칙보다 앞**이라
먼저 이긴 것이다. 이탈 신호는 넷이었다 — `customer`, `tenure`, `contract`, `churn`.

저장소가 들고 다니는 샘플 여섯 개로 재보니 **다섯이 틀렸고 여섯 다 "높음"**이었다.
자전거 신청 데이터는 `avg_temperature` 하나로 "제조/설비 품질"이 됐다.

**첫 화면에서 "샘플로 체험하기"를 누른 사람이 보는 것이 그 판정이다.**

### 여기서 고정하는 것 셋

    근거가 많은 쪽이 이긴다      우연한 부분일치 하나가 진짜 신호 넷을 못 이긴다
    신뢰도는 세어본 결과다        예전엔 규칙 스물둘 중 열아홉이 상수 "높음"이었다
    무엇을 맞았는지 돌려준다      판정이 이상할 때 왜 그렇게 봤는지 물어볼 수 있어야 한다
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

# 저장소가 실제로 들고 다니는 샘플과 그 정답.
SAMPLES = {
    "sample_data/customer_churn_demo.csv": "고객 이탈/CRM",
    "sample_data/generated/customer_churn.csv": "고객 이탈/CRM",
    "sample_data/generated/customer_churn_leaky.csv": "고객 이탈/CRM",
    "sample_data/manufacturing_quality_demo.csv": "제조/설비 품질",
    "sample_data/public_bike_signup_demo.csv": "공공교통/이용자 통계",
    "sample_data/generated/bike_signups.csv": "공공교통/이용자 통계",
}


def frame(columns):
    return pd.DataFrame({name: [0] for name in columns})


class TestTheShippedSamplesAreClassifiedRight:
    """**이 파일이 있는 이유.** 여섯 중 다섯이 틀려 있었다."""

    @pytest.mark.parametrize("path, expected", sorted(SAMPLES.items()))
    def test_each_sample(self, path, expected):
        target = ROOT / path
        assert target.exists(), f"{path}가 없다 — 샘플이 사라졌으면 이 검사도 함께 고쳐라"
        got = modelmate.infer_dataset_domain(pd.read_csv(target, nrows=5))
        assert got["dataset_domain"] == expected, (
            f"{path} → {got['dataset_domain']} (근거 {got.get('dataset_domain_evidence')})")


class TestOneAccidentalMatchDoesNotWin:
    """찾은 결함 그대로. **부분일치 하나가 진짜 신호 넷을 이기면 안 된다.**"""

    CHURN = ["customer_id", "tenure_months", "monthly_fee", "support_tickets",
             "contract_type", "last_login_days", "churn"]

    def test_login_does_not_turn_churn_into_security(self):
        got = modelmate.infer_dataset_domain(frame(self.CHURN))
        assert got["dataset_domain"] == "고객 이탈/CRM"

    def test_the_accidental_word_really_is_there(self):
        """**대조가 먼저다.** `login`이 보안 규칙 낱말이 아니라면 위 검사는 아무것도
        확인하지 않는다 — 이기지 못할 상대를 이겼다고 말하는 셈이다."""
        security = next(words for domain, _reason, words in modelmate.DOMAIN_RULES
                        if domain == "보안/이상 탐지")
        assert "login" in security
        assert any("login" in column for column in self.CHURN)

    def test_removing_the_churn_signals_lets_security_win(self):
        """되돌림 방향. 이탈 신호를 빼면 보안이 이겨야 한다 — 그래야 이 판정이
        **점수 때문**이지 보안 규칙을 죽여서가 아니다."""
        got = modelmate.infer_dataset_domain(
            frame(["row_id", "last_login_days", "value"]))
        assert got["dataset_domain"] == "보안/이상 탐지"
        assert got["dataset_domain_confidence"] == "낮음", (
            "근거 하나로 내린 판정이 '높음'이면 예전 결함이 돌아온 것이다")


class TestConfidenceIsCounted:
    """예전에는 규칙 스물둘 중 열아홉이 상수 `"높음"`을 반환했다."""

    @pytest.mark.parametrize("columns, expected", [
        (["churn", "customer_id", "tenure_months"], "높음"),      # 근거 3
        (["signup_count", "station_count"], "중간"),               # 근거 2
        (["last_login_days"], "낮음"),                             # 근거 1
    ])
    def test_it_follows_the_evidence(self, columns, expected):
        got = modelmate.infer_dataset_domain(frame(columns))
        assert got["dataset_domain_confidence"] == expected, (
            f"{columns} → {got['dataset_domain_confidence']} "
            f"(근거 {got['dataset_domain_evidence']})")

    def test_the_three_levels_are_actually_reachable(self):
        """셋 다 나올 수 있어야 한다. 하나만 나오면 예전과 같다."""
        levels = {modelmate.infer_dataset_domain(frame(cols))["dataset_domain_confidence"]
                  for cols in (["churn", "customer_id", "tenure_months"],
                               ["signup_count", "station_count"],
                               ["last_login_days"])}
        assert levels == {"높음", "중간", "낮음"}


class TestItSaysWhatItMatched:
    def test_the_evidence_comes_back(self):
        got = modelmate.infer_dataset_domain(
            frame(["customer_id", "churn", "tenure_months"]))
        assert set(got["dataset_domain_evidence"]) >= {"churn", "customer", "tenure"}

    def test_every_word_of_evidence_is_really_in_a_column(self):
        """**돌려준 근거가 실제로 컬럼에 있어야 한다.** 없는 근거를 대는 판정은
        판정이 아니라 주장이다."""
        columns = ["customer_id", "churn", "last_login_days", "avg_temperature"]
        got = modelmate.infer_dataset_domain(frame(columns))
        joined = " ".join(columns)
        for word in got["dataset_domain_evidence"]:
            assert word in joined, f"{word!r}는 어느 컬럼에도 없다"

    def test_nothing_matched_says_so(self):
        got = modelmate.infer_dataset_domain(frame(["aaa", "bbb", "ccc"]))
        assert got["dataset_domain"] == "도메인 확인 필요"
        assert got["dataset_domain_confidence"] == "낮음"
        assert got["dataset_domain_evidence"] == []


class TestNoRuleIsUnreachable:
    """보안·금융·공공시설은 같은 규칙이 두 벌씩 있었고 뒤엣것은 닿을 수 없었다."""

    def test_each_domain_appears_once(self):
        domains = [domain for domain, _reason, _words in modelmate.DOMAIN_RULES]
        duplicates = sorted({d for d in domains if domains.count(d) > 1})
        assert duplicates == [], f"두 번 적힌 도메인: {duplicates}"

    def test_every_rule_can_win_on_its_own_words(self):
        """규칙마다 자기 낱말만으로 이길 수 있어야 한다. 못 이기는 규칙이 있으면
        그건 목록에 있으나 닿지 않는 가지다."""
        unreachable = []
        for domain, _reason, words in modelmate.DOMAIN_RULES:
            got = modelmate.infer_dataset_domain(frame(list(words)))
            if got["dataset_domain"] != domain:
                unreachable.append((domain, got["dataset_domain"]))
        assert unreachable == [], f"자기 낱말로도 못 이기는 규칙: {unreachable}"

    def test_the_generic_fallbacks_stay_last(self):
        """날짜 컬럼은 어느 데이터에나 있다. 도메인 판정으로 쓰면 늘 이긴다."""
        got = modelmate.infer_dataset_domain(
            frame(["order_date", "churn", "customer_id", "tenure_months"]))
        assert got["dataset_domain"] == "고객 이탈/CRM", (
            "날짜가 있다고 '시계열 기록'이 되면 구체 도메인이 영영 안 나온다")
