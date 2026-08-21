"""대소문자만 바꾸면 관리자로 가입할 수 있었다.

**한 질문에 두 개의 동일성 기준이 있었다.** 가입의 중복 검사는
`SELECT id FROM users WHERE email=?`로 SQLite 기본 비교(대소문자 구분)를 썼고,
역할 판정은 `is_admin_email`이 소문자로 낮춰 비교했다. **엄격한 쪽이 계정 생성을
막고 느슨한 쪽이 권한을 줬다** — 최악의 짝이다.

2026-08-22 포트 8791에서 확인했다. `admin@modelmate.local`로 가입하면
`400 이미 사용 중인 이메일입니다`. **`ADMIN@modelmate.local`로 가입하면 200**,
그리고 그 토큰은 `role: admin`, `plan: admin`, `is_admin: true`,
`limit_label: 제한 없음`이었다. 비밀번호는 공격자가 정한 것이다.

바로 앞 회차에 시딩된 관리자 계정을 **비밀번호 없이** 만들도록 고쳤다
(`docs/security-notes.md`의 `Published defaults`). 이 경로는 그 수정을 통째로
지나간다 — 계정을 새로 만들어버리기 때문이다. **한 구멍을 막았는데 옆문이 열려
있었고, 옆문은 더 넓었다.**

고친 방식은 두 층이다:

- `normalize_email` 하나로 저장·조회·관리자 판정이 같은 형태를 쓴다.
  `find_user_by_email`은 `lower(email)`로 비교해 정규화 이전 행도 찾는다.
- `users(lower(email))`에 유니크 인덱스. 앱 층 검사 하나에만 기대면 **다음에
  추가되는 경로가 그것을 부르지 않는다** — 이 저장소가 반복해서 만난 모양이다.

덤으로 일반 사용자의 대소문자 문제도 사라졌다. `Person@Example.com`으로 가입하고
`PERSON@EXAMPLE.COM`으로 로그인하면 같은 계정이다.
"""

import sqlite3
import sys
import uuid
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

PARTS = ROOT / "backend" / "main_parts"


class TestOneEmailIsOneAccount:
    @pytest.mark.parametrize("written", [
        "ADMIN@MODELMATE.LOCAL",
        "Admin@Modelmate.Local",
        "  admin@modelmate.local  ",
        "admin@modelmate.local",
    ])
    def test_every_spelling_normalises_to_the_same_thing(self, written):
        assert modelmate.normalize_email(written) == "admin@modelmate.local"

    @pytest.mark.parametrize("written", [
        "ADMIN@modelmate.local", "admin@MODELMATE.LOCAL", " Admin@Modelmate.Local "])
    def test_every_spelling_is_recognised_as_the_admin(self, written):
        assert modelmate.is_admin_email(written)

    def test_a_different_address_is_not_the_admin(self):
        """대조. 전부 관리자라고 답하는 함수로도 위 검사들은 통과한다."""
        assert not modelmate.is_admin_email("notadmin@modelmate.local")
        assert not modelmate.is_admin_email("admin@example.com")
        assert not modelmate.is_admin_email("")
        assert not modelmate.is_admin_email(None)


class TestTheLookupFindsLegacyRows:
    """정규화 이전에 만들어진 대소문자 섞인 행도 찾아야 한다. 못 찾으면 기존
    사용자가 자기 계정에서 잠긴다."""

    @pytest.fixture
    def conn(self, tmp_path):
        connection = sqlite3.connect(str(tmp_path / "legacy.db"))
        connection.row_factory = sqlite3.Row
        connection.execute("CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, role TEXT)")
        connection.execute("INSERT INTO users VALUES ('u1', 'Mixed@Case.COM', 'user')")
        return connection

    def test_it_finds_a_mixed_case_row_by_a_lowercase_query(self, conn):
        row = modelmate.find_user_by_email(conn, "mixed@case.com")
        assert row is not None and row["id"] == "u1"

    def test_it_finds_it_however_the_caller_spells_it(self, conn):
        assert modelmate.find_user_by_email(conn, "MIXED@CASE.COM")["id"] == "u1"
        assert modelmate.find_user_by_email(conn, "  Mixed@Case.com ")["id"] == "u1"

    def test_it_does_not_find_a_different_address(self, conn):
        """대조. 아무거나 돌려주는 조회로도 위 검사들은 통과한다."""
        assert modelmate.find_user_by_email(conn, "other@case.com") is None


class TestTheDatabaseEnforcesItToo:
    """앱 층 검사 하나에만 기대면 다음에 추가되는 경로가 그것을 부르지 않는다."""

    @pytest.fixture
    def seeded(self, tmp_path):
        path = str(tmp_path / "unique.db")
        connection = sqlite3.connect(path)
        connection.execute(
            "CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL,"
            " name TEXT, role TEXT, created_at TEXT)")
        connection.execute("CREATE UNIQUE INDEX users_email_ci ON users(lower(email))")
        connection.execute("INSERT INTO users VALUES ('u1', 'person@example.com', 'p', 'user', 'now')")
        connection.commit()
        return connection

    def test_a_case_variant_row_is_refused(self, seeded):
        with pytest.raises(sqlite3.IntegrityError, match="users_email_ci"):
            seeded.execute("INSERT INTO users VALUES (?, 'PERSON@example.com', 'dup', 'admin', 'now')",
                           (str(uuid.uuid4()),))

    def test_a_genuinely_different_address_is_allowed(self, seeded):
        """대조. 아무것이나 막는 인덱스로도 위 검사는 통과한다."""
        seeded.execute("INSERT INTO users VALUES (?, 'other@example.com', 'o', 'user', 'now')",
                       (str(uuid.uuid4()),))

    def test_the_application_creates_that_index(self):
        source = (PARTS / "001_imports_db.part").read_text(encoding="utf-8-sig")
        assert "users_email_ci ON users(lower(email))" in source

    def test_a_failure_to_create_it_is_not_swallowed_silently(self):
        """이미 중복이 있는 DB에서는 인덱스 생성이 실패한다. 조용히 넘어가면
        다음 사람은 인덱스가 있다고 믿는다."""
        source = (PARTS / "001_imports_db.part").read_text(encoding="utf-8-sig")
        block = source[source.index("users_email_ci ON users(lower(email))"):]
        block = block[:block.index("# 관리자 계정 자동 생성")]
        assert "print(" in block and "확인하라" in block


class TestEveryEmailLookupGoesThroughOnePlace:
    def test_no_handler_compares_the_raw_column(self):
        """`WHERE email=?`가 남아 있으면 그 경로는 다시 대소문자를 구분한다.
        시딩만 예외다 — `get_admin_emails()`가 이미 정규화한 값을 넘긴다."""
        offenders = []
        for path in sorted(PARTS.glob("*.part")):
            text = path.read_text(encoding="utf-8-sig")
            for number, line in enumerate(text.splitlines(), 1):
                if "FROM users WHERE email=?" in line:
                    offenders.append(f"{path.name}:{number}")
        assert offenders == [], offenders

    def test_signup_and_login_use_the_shared_lookup(self):
        source = (PARTS / "051_auth_history_debug.part").read_text(encoding="utf-8-sig")
        assert source.count("find_user_by_email(") == 2

    def test_the_google_path_stores_a_normalised_address(self):
        """구글 경로만 원문을 넣으면 `users.email`에 대소문자만 다른 두 행이 생긴다."""
        source = (PARTS / "050_columns_auth_defs.part").read_text(encoding="utf-8-sig")
        assert 'normalize_email(info.get("email", ""))' in source


class TestTheChecksAreNotVacuous:
    def test_the_normaliser_is_not_the_identity(self):
        """`normalize_email`이 입력을 그대로 돌려주면 위 검사 대부분이 통과하면서
        아무것도 하지 않는다."""
        assert modelmate.normalize_email("A@B.COM") != "A@B.COM"

    def test_it_handles_absent_input_without_raising(self):
        assert modelmate.normalize_email(None) == ""
        assert modelmate.normalize_email("") == ""

    def test_the_part_files_were_actually_read(self):
        source = (PARTS / "051_auth_history_debug.part").read_text(encoding="utf-8-sig")
        assert len(source) > 1000
        assert "auth_signup" in source

    def test_signup_still_refuses_a_malformed_address(self):
        """정규화가 검증을 대신하지 않는다. 빈 값이 통과하면 계정 하나가
        모든 빈 이메일의 주인이 된다."""
        source = (PARTS / "051_auth_history_debug.part").read_text(encoding="utf-8-sig")
        assert '"@" not in email' in source
