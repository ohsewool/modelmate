"""공개 저장소에 적힌 값으로 앱에 들어올 수 있는가.

`JWT_SECRET`의 기본값이 `"modelmate-secret-key-change-in-prod"`였다. 그 문자열은
**이 저장소에 그대로 적혀 있다.** 설정하지 않은 배포에서는 누구나 `{"role": "admin"}`
을 그 키로 서명해 관리자로 통과한다 — 계정도, 비밀번호도 필요 없다.

2026-08-22에 실제로 해봤다. 로컬 인스턴스에 위조 토큰을 보내니 `/api/auth/me`가
200과 `role: admin`을, `/api/me/usage`가 `limit_label: 제한 없음`과 전 항목 `null`
한도를 돌려줬다. 고친 뒤 같은 토큰은 401이다.

`.env.example`은 `JWT_SECRET=`(빈 값)으로 안내한다. `os.getenv`는 빈 문자열도
"설정됨"으로 보므로 **그 안내를 그대로 따르면 빈 키로 서명한다** — 기본 상수보다
나쁘다. 바로 두 줄 아래 `DB_PATH`는 `.strip() or`로 같은 함정을 이미 피하고 있었다.
같은 파일 안에서 한 줄은 맞고 한 줄은 틀린 상태였다.

`ADMIN_PASSWORD`도 같은 모양이었다. 기본값 `admin1234`로 관리자 계정이 자동
생성됐고, 그 비밀번호는 **어느 문서에도 없다.** `docs/security-notes.md`는
`admin@modelmate.local`이 항상 관리자라고 밝히지만 비밀번호 이야기는 없다.
`.env.example`의 `ADMIN_PASSWORD=`(빈 값)을 그대로 쓰면 **빈 문자열이 비밀번호인
관리자 계정**이 만들어졌다.

이 회차의 앞선 결함(요금제 한도를 선언만 하고 강제하지 않음)과 같은 모양이다:
`docs/deployment-checklist.md`는 "`JWT_SECRET`: long random value"라고 적어두었고
**확인하는 것이 없었다.**
"""

import os
import re
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

PARTS = ROOT / "backend" / "main_parts"
DB_PART = (PARTS / "001_imports_db.part").read_text(encoding="utf-8-sig")

PUBLISHED_SECRET = "modelmate-secret-key-change-in-prod"
PUBLISHED_PASSWORD = "admin1234"


def executable_source(text: str) -> str:
    """주석과 독스트링을 걷어낸 나머지.

    처음에는 파일 전체에서 문자열을 찾았고 **내가 쓴 주석에 걸렸다** — 고친 경위를
    적으면서 옛 값을 인용했기 때문이다. `rag-profile-selector`에서 정정문이 "HotpotQA"를
    인용해 같은 함정에 빠진 적이 있다(그때도 검사가 옳았고, 없던 것은 **인용과 사용의
    구분**이었다). 확인하려는 것은 그 값이 **동작하느냐**다.
    """
    without_docstrings = re.sub(r'("""|\'\'\')(?:.|\n)*?\1', '""', text)
    return "\n".join(re.sub(r"#.*$", "", line) for line in without_docstrings.splitlines())


class TestTheDefaultsAreGone:
    def test_the_signing_key_has_no_hardcoded_fallback(self):
        """이 문자열이 실행되는 자리에 다시 나타나면 위조가 다시 가능해진다."""
        offenders = [
            path.name
            for path in sorted(PARTS.glob("*.part"))
            if PUBLISHED_SECRET in executable_source(path.read_text(encoding="utf-8-sig"))
        ]
        assert not offenders, f"{offenders}에 공개된 서명 키가 있다"

    def test_the_admin_password_has_no_hardcoded_fallback(self):
        code = [path for path in sorted((ROOT / "backend").rglob("*"))
                if path.suffix in {".py", ".part"}
                and PUBLISHED_PASSWORD in executable_source(
                    path.read_text(encoding="utf-8-sig", errors="replace"))]
        assert not code, f"{[p.name for p in code]}에 기본 관리자 비밀번호가 있다"

    def test_the_stripper_keeps_real_code(self):
        """주석만 지우고 코드를 남기는지. 전부 지워버리면 위 두 검사는
        무엇이 있어도 통과한다 — 정확히 아무것도 확인하지 않는 상태."""
        stripped = executable_source(DB_PART)
        assert "def resolve_jwt_secret" in stripped
        assert 'os.getenv("JWT_SECRET"' in stripped
        assert PUBLISHED_SECRET in DB_PART  # 경위는 주석으로 남아 있다
        assert PUBLISHED_SECRET not in stripped

    def test_the_smoke_scripts_do_not_assume_it_either(self):
        """스크립트가 기본값을 들고 있으면, 앱이 그 계정을 다시 만들어야만 통과한다 —
        고친 것을 되돌리라는 압력이 된다."""
        offenders = [
            path.name for path in sorted((ROOT / "scripts").glob("*.py"))
            if re.search(rf'["\']{PUBLISHED_PASSWORD}["\']',
                         path.read_text(encoding="utf-8", errors="replace"))
        ]
        assert not offenders, f"{offenders}가 아직 기본 비밀번호를 쓴다"


class TestBlankIsNotConfigured:
    """`.env.example`이 안내하는 빈 값이 '설정됨'으로 읽히면 안 된다."""

    def test_the_resolver_strips_before_deciding(self):
        assert 'os.getenv("JWT_SECRET", "").strip()' in DB_PART

    def test_an_empty_value_does_not_become_the_key(self, monkeypatch):
        import backend.main as modelmate

        monkeypatch.setenv("JWT_SECRET", "   ")
        assert modelmate.resolve_jwt_secret().strip() != ""

    def test_a_configured_value_is_used_as_is(self, monkeypatch):
        import backend.main as modelmate

        monkeypatch.setenv("JWT_SECRET", "operator-chosen-value")
        assert modelmate.resolve_jwt_secret() == "operator-chosen-value"


class TestAHostedDeploymentRefusesToBoot:
    """로컬은 생성된 키로 계속 돌아도 되지만, 배포는 운영자가 정해야 한다."""

    def test_it_recognises_a_platform_environment(self, monkeypatch):
        import backend.main as modelmate

        monkeypatch.setenv("RAILWAY_ENVIRONMENT_NAME", "production")
        assert modelmate.is_hosted_deployment()

    def test_a_local_run_is_not_hosted(self, monkeypatch):
        import backend.main as modelmate

        monkeypatch.delenv("RAILWAY_ENVIRONMENT_NAME", raising=False)
        monkeypatch.setenv("ENVIRONMENT", "development")
        assert not modelmate.is_hosted_deployment()

    def test_it_raises_instead_of_inventing_a_key(self, monkeypatch):
        import backend.main as modelmate

        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.delenv("JWT_SECRET", raising=False)
        with pytest.raises(RuntimeError, match="JWT_SECRET"):
            modelmate.resolve_jwt_secret()

    @pytest.mark.slow
    def test_the_import_itself_fails_in_a_hosted_run(self, tmp_path):
        """단위 호출이 아니라 **부팅**이 막히는지. 함수만 고치고 배선을 잊는 것이
        이 저장소들의 단골 결함이라 실제 import를 돌려본다."""
        environment = dict(os.environ)
        environment.pop("JWT_SECRET", None)
        environment.update({
            "ENVIRONMENT": "production",
            "DB_PATH": str(tmp_path / "hosted.db"),
            "MODELS_DIR": str(tmp_path / "models"),
            "DATASETS_DIR": str(tmp_path / "datasets"),
        })
        finished = subprocess.run(
            [sys.executable, "-c", "import backend.main"],
            cwd=ROOT, env=environment, capture_output=True, text=True, timeout=600)
        assert finished.returncode != 0
        assert "JWT_SECRET" in finished.stderr


class TestTheGeneratedKeyIsUsable:
    def test_it_is_written_with_owner_only_permissions(self, monkeypatch, tmp_path):
        import backend.main as modelmate

        monkeypatch.delenv("JWT_SECRET", raising=False)
        monkeypatch.delenv("RAILWAY_ENVIRONMENT_NAME", raising=False)
        monkeypatch.setenv("ENVIRONMENT", "development")
        monkeypatch.setattr(modelmate, "DB_PATH", str(tmp_path / "local.db"))

        first = modelmate.resolve_jwt_secret()
        stamp = tmp_path / ".jwt_secret"
        assert stamp.exists()
        assert oct(stamp.stat().st_mode & 0o777) == "0o600"
        # 재시작해도 같은 키여야 한다. 매번 새로 만들면 워커를 늘리거나 앱을
        # 다시 띄울 때마다 로그인이 풀리고, 그건 사람들이 꺼버리는 안전장치다.
        assert modelmate.resolve_jwt_secret() == first

    def test_it_is_not_a_short_or_guessable_value(self, monkeypatch, tmp_path):
        import backend.main as modelmate

        monkeypatch.delenv("JWT_SECRET", raising=False)
        monkeypatch.setenv("ENVIRONMENT", "development")
        monkeypatch.setattr(modelmate, "DB_PATH", str(tmp_path / "local.db"))
        generated = modelmate.resolve_jwt_secret()
        assert len(generated) >= 32
        assert generated != PUBLISHED_SECRET

    def test_the_file_is_ignored_by_git(self):
        """생성한 키를 커밋하면 기본 상수와 똑같은 상태가 된다."""
        assert ".jwt_secret" in (ROOT / ".gitignore").read_text(encoding="utf-8")


class TestTheBootstrapAdminHasNoPasswordUnlessAsked:
    def test_no_password_means_no_hash(self, tmp_path):
        row = _seed_and_read(tmp_path, password=None)
        assert row["password_hash"] is None
        assert row["role"] == "admin"

    def test_a_configured_password_is_honoured(self, tmp_path):
        row = _seed_and_read(tmp_path, password="operator-chosen")
        assert row["password_hash"]

    def test_login_refuses_an_account_with_no_password(self):
        """`/api/auth/login`이 `password_hash` 없는 행을 거부해야 위 결정이 성립한다.
        거부하지 않으면 비밀번호 없는 계정이 오히려 더 나쁜 상태다."""
        source = (PARTS / "051_auth_history_debug.part").read_text(encoding="utf-8-sig")
        assert 'not row["password_hash"]' in source

    def test_the_seeded_admin_cannot_be_claimed_by_signup(self):
        """계정을 비밀번호 없이 두는 것의 명백한 공격: 그 이메일로 가입해버리기.
        가입은 기존 이메일을 400으로 막고, 부팅 때 이미 만들어져 있다."""
        source = (PARTS / "051_auth_history_debug.part").read_text(encoding="utf-8-sig")
        assert "이미 사용 중인 이메일입니다" in source


class TestThereIsOnlyOneAdminList:
    """`ADMIN_EMAIL`(단수)을 따로 읽어 계정을 만드는 두 번째 블록이 있었다.

    `ADMIN_EMAILS`(복수)가 설정되면 `get_admin_emails()`는 단수를 **무시한다.**
    그런데 그 블록은 단수 값으로 계정을 만들고 `role='admin'`을 줬다 — 문서화된
    목록에 없는 이메일이 관리자가 되는 두 번째 경로였고, 어느 문서에도 없다.
    """

    def test_the_seeding_loop_is_the_only_one(self):
        assert DB_PART.count("INSERT INTO users") == 1

    def test_it_seeds_from_the_documented_list(self):
        assert "for configured_admin_email in sorted(get_admin_emails())" in DB_PART

    def test_the_documented_always_admin_account_still_is_one(self, monkeypatch):
        """`docs/security-notes.md`가 밝힌 동작이다. 조용히 바꾸면 문서가 틀려진다."""
        import backend.main as modelmate

        monkeypatch.setenv("ADMIN_EMAILS", "someone@example.com")
        assert "admin@modelmate.local" in modelmate.get_admin_emails()
        assert "someone@example.com" in modelmate.get_admin_emails()


class TestTheChecksAreNotVacuous:
    def test_the_part_file_was_actually_read(self):
        assert len(DB_PART) > 2000
        assert "resolve_jwt_secret" in DB_PART

    def test_the_offending_string_would_be_found_if_present(self):
        """검사가 문자열을 정말 찾을 수 있는지. 못 찾는 검사는 조용히 통과한다."""
        assert PUBLISHED_SECRET in Path(__file__).read_text(encoding="utf-8")

    def test_a_forged_token_fails_verification(self, monkeypatch, tmp_path):
        """이 결함의 본체. 공개 상수로 서명한 토큰이 현재 키로 검증되면 안 된다."""
        from jose import jwt

        import backend.main as modelmate

        monkeypatch.delenv("JWT_SECRET", raising=False)
        monkeypatch.setenv("ENVIRONMENT", "development")
        monkeypatch.setattr(modelmate, "DB_PATH", str(tmp_path / "local.db"))
        current = modelmate.resolve_jwt_secret()
        forged = jwt.encode({"sub": "forged", "role": "admin"},
                            PUBLISHED_SECRET, algorithm="HS256")
        with pytest.raises(Exception):
            jwt.decode(forged, current, algorithms=["HS256"])
        # 대조: 현재 키로 서명한 것은 통과해야 한다. 안 그러면 위 검사는
        # "무엇이든 거부한다"는 뜻이고 아무것도 확인하지 않는다.
        honest = jwt.encode({"sub": "real", "role": "user"}, current, algorithm="HS256")
        assert jwt.decode(honest, current, algorithms=["HS256"])["sub"] == "real"


def _seed_and_read(tmp_path, password):
    """별도 프로세스에서 앱을 부팅하고 관리자 행을 읽는다.

    `backend.main`은 import 시점에 DB를 만들고 계정을 심으므로, 같은 프로세스에서는
    이미 벌어진 뒤다. 환경변수를 바꿔 다시 겪으려면 새 프로세스여야 한다.
    """
    import json

    environment = dict(os.environ)
    environment.pop("ADMIN_PASSWORD", None)
    environment.pop("ADMIN_EMAILS", None)
    environment.pop("ADMIN_EMAIL", None)
    if password is not None:
        environment["ADMIN_PASSWORD"] = password
    environment.update({
        "ENVIRONMENT": "development",
        "DB_PATH": str(tmp_path / "seed.db"),
        "MODELS_DIR": str(tmp_path / "models"),
        "DATASETS_DIR": str(tmp_path / "datasets"),
    })
    program = (
        "import json, backend.main as m;"
        "conn = m.get_db();"
        "row = conn.execute("
        "\"SELECT email, password_hash, role FROM users WHERE email='admin@modelmate.local'\""
        ").fetchone();"
        "print('<<'+json.dumps(dict(row))+'>>')"
    )
    finished = subprocess.run([sys.executable, "-c", program], cwd=ROOT,
                              env=environment, capture_output=True, text=True, timeout=600)
    assert finished.returncode == 0, finished.stderr[-2000:]
    payload = finished.stdout.split("<<")[1].split(">>")[0]
    return json.loads(payload)
