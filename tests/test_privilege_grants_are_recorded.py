"""누군가 관리자가 되는 순간이 남는가.

이 앱은 미들웨어에서 **400 이상만** `monitoring_events`에 넣는다. 실패한 요청은
전부 남는다. 그런데 **권한이 올라가는 일은 전부 200으로 끝난다** — 그래서 조사할
가치가 가장 큰 사건이 하나도 남지 않았다. **탐지가 정확히 거꾸로였다.**

2026-08-22에 쟀다. `later@example.com`으로 평범하게 가입하고(역할 `user`),
`ADMIN_EMAILS`에 그 주소를 넣고 앱을 다시 띄웠다. DB의 역할은 `admin`으로 바뀌어
있었고 **감사 이벤트는 0건**이었다. 환경변수 한 줄과 재시작으로 계정 하나가
관리자가 되는데, 그 사실을 나중에 확인할 방법이 없었다.

같은 회차 앞부분에 고친 대소문자 우회 가입도 마찬가지다 — 그 일이 실제로 벌어졌다면
200으로 끝나 아무 흔적을 남기지 않았을 것이다. **한 회차 전체가 "일어난 줄도 몰랐을
일"이었다.**

남기는 지점은 넷이다. 부팅 시딩(계정 생성·역할 승격·비밀번호 로그인 개방),
가입, 이메일 로그인, 구글 로그인.

**바뀔 때만 남긴다.** 시딩은 매 부팅마다 도는데 그때마다 한 줄씩 쌓으면 그 줄은
배경 소음이 되고, 배경 소음은 아무도 읽지 않는다. 재시작 두 번에 총 2건인 것을
확인했다.

보존 정책도 함께 고쳤다. 예전에는 오래된 순으로 지웠고, 그러면 오류가 조금만
몰려도 "누가 관리자가 됐다"는 줄이 밀려난다 — 감사 기록으로 쓸 수 없는 종류의
보존이다. 이제 일반 이벤트를 먼저 버린다.
"""

import os
import sqlite3
import sys
import uuid
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

PARTS = ROOT / "backend" / "main_parts"


def auth_events(where=""):
    conn = modelmate.get_db()
    try:
        return [dict(row) for row in conn.execute(
            "SELECT event_type, severity, message, safe_details, user_id"
            f" FROM monitoring_events WHERE event_type LIKE 'auth.%' {where}"
            " ORDER BY rowid")]
    finally:
        conn.close()


class TestTheRecorderExistsAndIsUsable:
    def test_it_is_callable(self):
        assert callable(modelmate.record_security_event)

    def test_it_writes_a_row_that_can_be_read_back(self):
        marker = f"probe-{uuid.uuid4().hex[:8]}"
        modelmate.record_security_event("auth.admin_granted", f"테스트 {marker}",
                                        user_id="u-probe")
        assert any(marker in event["message"] for event in auth_events())

    def test_it_is_not_filed_as_info(self):
        """`info`로 두면 기본 조회에서 섞여 사라진다. 남겼는데 안 보이면 안 남긴 것과 같다."""
        marker = f"sev-{uuid.uuid4().hex[:8]}"
        modelmate.record_security_event("auth.admin_granted", f"테스트 {marker}")
        event = next(e for e in auth_events() if marker in e["message"])
        assert event["severity"] == "warning"

    def test_the_previous_role_is_carried(self):
        """무엇에서 무엇으로 바뀌었는지가 없으면 그 줄은 조사에 쓸 수 없다."""
        marker = f"prev-{uuid.uuid4().hex[:8]}"
        modelmate.record_security_event("auth.admin_granted", f"테스트 {marker}",
                                        safe_details={"previous_role": "user"})
        event = next(e for e in auth_events() if marker in e["message"])
        assert "previous_role" in (event["safe_details"] or "")


class TestEveryGrantPathRecords:
    """넷 중 하나라도 빠지면 그 경로로 올라간 권한은 보이지 않는다."""

    def test_the_seeding_loop_records_a_created_account(self):
        source = (PARTS / "001_imports_db.part").read_text(encoding="utf-8-sig")
        assert "auth.admin_account_created" in source

    def test_the_seeding_loop_records_a_role_change(self):
        source = (PARTS / "001_imports_db.part").read_text(encoding="utf-8-sig")
        assert "auth.admin_granted" in source

    def test_it_only_records_when_the_role_actually_changes(self):
        """매 부팅마다 남기면 배경 소음이 된다."""
        source = (PARTS / "001_imports_db.part").read_text(encoding="utf-8-sig")
        assert 'existing_admin["role"] != "admin"' in source

    def test_signup_records_an_admin_account(self):
        source = (PARTS / "051_auth_history_debug.part").read_text(encoding="utf-8-sig")
        assert "auth.admin_account_created" in source

    def test_login_records_an_upgrade(self):
        source = (PARTS / "051_auth_history_debug.part").read_text(encoding="utf-8-sig")
        assert "auth.admin_granted" in source

    def test_the_google_path_records_both(self):
        source = (PARTS / "050_columns_auth_defs.part").read_text(encoding="utf-8-sig")
        assert "auth.admin_account_created" in source
        assert "auth.admin_granted" in source


class TestTheBootQueueBridgesTheAssemblyOrder:
    """`init_db()`는 `098_monitoring.part`보다 먼저 돈다 — 그때는 기록 장치가 없다.
    대기열이 그 간격을 메운다. 없으면 부팅 중 승격은 영영 남지 않는다."""

    def test_the_queue_exists(self):
        assert isinstance(modelmate.PENDING_SECURITY_EVENTS, list)

    def test_it_is_empty_after_boot(self):
        """비우지 않으면 대기열에만 남고 DB에는 없다 — 남겼다고 믿게 되는 상태."""
        assert modelmate.PENDING_SECURITY_EVENTS == []

    def test_flushing_moves_them_into_the_table(self):
        marker = f"flush-{uuid.uuid4().hex[:8]}"
        modelmate.note_security_event("auth.admin_granted", f"대기열 {marker}")
        assert modelmate.PENDING_SECURITY_EVENTS
        assert modelmate.flush_pending_security_events() >= 1
        assert modelmate.PENDING_SECURITY_EVENTS == []
        assert any(marker in event["message"] for event in auth_events())

    def test_a_failing_record_does_not_stop_the_boot(self, monkeypatch, capsys):
        """기록에 실패해도 부팅은 계속한다. 다만 조용히 넘어가지는 않는다."""
        def explode(**_):
            raise RuntimeError("디스크가 가득 찼다")

        modelmate.note_security_event("auth.admin_granted", "실패할 이벤트")
        monkeypatch.setattr(modelmate, "record_security_event", explode)
        assert modelmate.flush_pending_security_events() == 1
        assert "이벤트 기록 실패" in capsys.readouterr().out


class TestRetentionDoesNotEvictTheAuditTrail:
    def test_ordinary_events_are_dropped_first(self, monkeypatch):
        """예전 보존은 오래된 순이었다. 오류가 조금만 몰리면 감사 줄이 밀려난다."""
        marker = f"keep-{uuid.uuid4().hex[:8]}"
        conn = modelmate.get_db()
        try:
            conn.execute("DELETE FROM monitoring_events")
            conn.commit()
        finally:
            conn.close()
        monkeypatch.setattr(modelmate, "MAX_MONITORING_EVENTS", 10)
        modelmate.record_security_event("auth.admin_granted", f"지켜야 할 줄 {marker}")
        for index in range(30):
            modelmate.persist_monitoring_event(event_type="api.error",
                                               message=f"오류 {index}",
                                               error_code="http_400", severity="warning")
        assert any(marker in event["message"] for event in auth_events())

    def test_the_ordering_clause_is_what_does_it(self):
        source = (PARTS / "098_monitoring.part").read_text(encoding="utf-8-sig")
        assert "ORDER BY (event_type LIKE 'auth.%') ASC, created_at ASC" in source


class TestTheChecksAreNotVacuous:
    def test_ordinary_requests_are_still_not_recorded_as_security_events(self):
        """전부 보안 이벤트로 남기면 위 검사들이 통과하면서 아무 신호도 남지 않는다."""
        before = len(auth_events())
        modelmate.persist_monitoring_event(event_type="api.error", message="평범한 오류",
                                           error_code="http_400", severity="warning")
        assert len(auth_events()) == before

    def test_the_middleware_still_only_persists_failures(self):
        """이 회차가 바꾼 것은 **권한 사건을 추가로 남기는 것**이지, 성공한 요청을
        전부 남기는 것이 아니다. 그렇게 하면 표가 트래픽 로그가 된다."""
        source = (PARTS / "098_monitoring.part").read_text(encoding="utf-8-sig")
        assert "if response.status_code >= 400 and not response.headers.get(ERROR_ID_HEADER):" in source

    def test_the_retention_query_still_deletes_something(self):
        """지우지 않는 보존 정책은 표를 무한히 키운다."""
        conn = modelmate.get_db()
        try:
            conn.execute("DELETE FROM monitoring_events")
            conn.commit()
        finally:
            conn.close()
        original = modelmate.MAX_MONITORING_EVENTS
        modelmate.MAX_MONITORING_EVENTS = 5
        try:
            for index in range(20):
                modelmate.persist_monitoring_event(event_type="api.error",
                                                   message=f"n{index}",
                                                   error_code="http_400")
            conn = modelmate.get_db()
            total = conn.execute("SELECT COUNT(*) FROM monitoring_events").fetchone()[0]
            conn.close()
            assert total <= 6, total
        finally:
            modelmate.MAX_MONITORING_EVENTS = original
