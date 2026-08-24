"""필드를 안 보낸 것은 **고칠 수 있는 실수**다 — 500으로 답하면 못 고친다.

UI가 주는 샘플 다섯이 끝까지 도는지 재보다가 나왔다. 업로드는 200인데 그다음
`/api/set-target`이 이렇게 답했다.

    500  "예상하지 못한 내부 오류가 발생했습니다."

원인은 한 줄이었다.

    tgt = body["target_col"]      # 없으면 KeyError → 잡히지 않으면 500

**바로 위와 바로 아래는 친절한 400을 낸다.** 업로드 원본이 없을 때, 없는 컬럼을
골랐을 때 — 둘 다 `failure_detail`로 무엇이 잘못됐고 다음에 뭘 하라고 말한다.
가운데 이 자리만 서버가 진 것처럼 답했다.

    df 없음 + 필드 없음   400   "업로드 원본이 없습니다"
    df 있음 + 필드 없음   500   ← 여기
    df 있음 + 없는 컬럼   400   "선택한 타깃 컬럼을 찾을 수 없습니다"

가운데 조건이라 **빈 몸통을 보내는 훑기로는 안 걸린다** — 그때는 첫 번째 가드가
먼저 걸려 400이 나온다. 업로드를 한 다음에 필드를 빼야 보인다.

### 왜 이 구분이 중요한가

`500`은 *"우리 잘못이고 당신이 할 수 있는 건 없다"*로 읽힌다. `400`은 *"이걸 고쳐
다시 보내라"*다. 이 제품의 사용자는 비전문가이고, **고칠 수 있는 것을 못 고치게
만드는 답이 가장 나쁘다.**
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.main as modelmate  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

PARTS = ROOT / "backend" / "main_parts"


@pytest.fixture
def client():
    return TestClient(modelmate.app, raise_server_exceptions=False)


@pytest.fixture
def uploaded():
    """업로드가 끝난 상태를 만든다. **이 상태여야 그 갈래가 보인다.**"""
    before = dict(modelmate.STATE)
    modelmate.STATE.clear()
    modelmate.STATE["df"] = pd.DataFrame({"a": [1, 2, 3], "y": [0, 1, 0]})
    yield
    modelmate.STATE.clear()
    modelmate.STATE.update(before)


class TestSetTargetWithoutATarget:
    @pytest.mark.parametrize("payload", [{}, {"target_col": ""}, {"target_col": None}])
    def test_it_is_a_four_hundred(self, client, uploaded, payload):
        response = client.post("/api/set-target", json=payload)
        assert response.status_code == 400, (
            f"{payload} → {response.status_code}. 500이면 호출자는 자기가 고칠 수 "
            f"있는 것을 못 고친다: {response.text[:140]}")

    def test_it_says_what_is_missing(self, client, uploaded):
        detail = client.post("/api/set-target", json={}).json()["detail"]
        assert "맞히려는 값" in detail["user_friendly_message"]
        assert detail.get("recommended_next_action")

    def test_the_other_two_branches_still_answer_as_before(self, client, uploaded):
        """**되돌림 방향.** 새 가드가 아래 갈래를 가리면 안 된다."""
        missing_column = client.post("/api/set-target", json={"target_col": "없는컬럼"})
        assert missing_column.status_code == 400
        assert "찾을 수 없습니다" in missing_column.json()["detail"]["user_friendly_message"]

    def test_a_real_target_still_works(self, client, uploaded):
        assert client.post("/api/set-target", json={"target_col": "y"}).status_code == 200

    def test_without_an_upload_the_first_guard_answers(self, client):
        """이 갈래는 원래 400이었다. **빈 몸통 훑기로 그 결함이 안 걸린 이유다.**"""
        before = dict(modelmate.STATE)
        modelmate.STATE.clear()
        try:
            detail = client.post("/api/set-target", json={}).json()["detail"]
            assert "업로드" in detail["user_friendly_message"]
        finally:
            modelmate.STATE.clear()
            modelmate.STATE.update(before)


class TestNoRouteReadsABodyKeyWithBrackets:
    """새 라우트가 같은 실수를 하면 여기서 걸린다.

    `body["x"]`는 없을 때 `KeyError`가 되고, 잡히지 않으면 500이다.

    **정규식으로 훑다가 한 번 헛짚었다.** 고친 코드가 실패 상세에
    `"body['target_col'] is missing or empty"`라는 **문자열**을 담고 있어서, 그
    산문이 대괄호 접근으로 읽혔다. 규칙을 *설명하는* 문장이 규칙을 *쓰는* 코드로
    읽히는 것 — 이 저장소가 세 번째로 만난 함정이다.

    그래서 AST로 본다. 문자열 안의 글자는 `Subscript` 노드가 아니다.
    """

    def unguarded(self):
        import ast
        from part_source import assembled

        source = assembled().source
        tree = ast.parse(source)
        found = []
        for node in ast.walk(tree):
            if not isinstance(node, ast.Subscript):
                continue
            if not (isinstance(node.value, ast.Name) and node.value.id == "body"):
                continue
            key = node.slice
            if not (isinstance(key, ast.Constant) and isinstance(key.value, str)):
                continue
            found.append((node.lineno, key.value))
        return found

    def test_there_are_none(self):
        remaining = [f"line {n}: body[{k!r}]" for n, k in self.unguarded()
                     if not self._guarded(n, k)]
        assert remaining == [], (
            "요청 몸통을 대괄호로 꺼내는 자리가 있다. 없으면 500이 난다 — "
            f"`.get`으로 꺼내고 400으로 답하라: {remaining}")

    def _guarded(self, lineno, key):
        """`if body.get("k"):` 뒤의 대괄호는 안전하다 — 이미 확인한 뒤다."""
        from part_source import assembled
        lines = assembled().source.splitlines()
        window = "\n".join(lines[max(0, lineno - 3):lineno])
        return f'body.get("{key}")' in window or f"body.get('{key}')" in window

    def test_the_scan_would_notice_one(self):
        """**대조.** 훑기가 빈손을 내는 것과 없는 것은 다르다.

        AST 훑기에 진짜 대괄호 접근을 하나 심어 잡는지 본다. 그리고 **문자열 안의
        같은 글자는 안 잡는지**도 본다 — 그것이 정규식이 틀렸던 지점이다.
        """
        import ast

        def count(snippet):
            tree = ast.parse(snippet)
            return sum(1 for n in ast.walk(tree)
                       if isinstance(n, ast.Subscript)
                       and isinstance(n.value, ast.Name) and n.value.id == "body"
                       and isinstance(n.slice, ast.Constant))

        assert count('tgt = body["target_col"]') == 1, "진짜 접근을 못 잡는다"
        assert count('msg = "body[\'target_col\'] is missing"') == 0, (
            "문자열 안의 글자를 접근으로 센다 — 정규식이 틀렸던 그 지점이다")


class TestEveryDictBodyRouteRefusesInsteadOfCrashing:
    """`body: dict` 라우트에 빈 몸통을 보내면 **4xx여야 한다.**

    재보니 열셋 전부 4xx였다(2026-08-24). 빈손 결과지만, 새 라우트가 5xx를 내면
    여기서 걸린다.
    """

    def routes(self):
        found = []
        for path in sorted(PARTS.glob("*.part")):
            lines = path.read_text(encoding="utf-8-sig").splitlines()
            for number, line in enumerate(lines):
                if not re.search(r"async def \w+\([^)]*body: dict", line):
                    continue
                for back in range(number - 1, max(number - 6, -1), -1):
                    decorator = re.match(r'@app\.(post|put|patch)\("([^"]+)"\)',
                                         lines[back].strip())
                    if decorator:
                        found.append((decorator.group(1).upper(), decorator.group(2)))
                        break
        return found

    def test_the_scan_found_routes(self):
        """빈손을 통과로 세지 않는다."""
        assert len(self.routes()) >= 10, f"라우트를 {len(self.routes())}개만 찾았다"

    def test_none_answers_with_a_server_error(self, client):
        token = modelmate.make_token("probe-body", "probe@body.test", "probe")
        headers = {"Authorization": f"Bearer {token}"}
        crashed = []
        for method, route in self.routes():
            url = re.sub(r"\{[^}]+\}", "x", route)
            response = client.request(method, url, json={}, headers=headers)
            if response.status_code >= 500:
                crashed.append(f"{method} {route} → {response.status_code}")
        assert crashed == [], (
            "빈 몸통에 5xx를 내는 라우트가 있다. 무엇이 빠졌는지 말해주는 4xx가 "
            f"있어야 한다: {crashed}")
