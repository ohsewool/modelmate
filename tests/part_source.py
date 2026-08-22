"""`main_parts/*.part`를 **런타임과 같은 방식으로** 파싱한다.

`backend/main.py`는 조각들을 정렬 순서로 이어 붙여 한 번에 컴파일한다.

    _source = "\\n".join(part.read_text() for part in sorted(...))
    exec(compile(_source, ...), globals())

그래서 **조각 하나하나는 파이썬 파일이 아니다.** 앞 조각에서 시작한 함수 본문이
다음 조각에서 이어지는 것들이 있고, 그것만 떼어 `ast.parse`에 넣으면
`unexpected indent`로 죽는다. 열두 개가 그렇다.

이 저장소의 구조 검사들은 조각을 하나씩 파싱하면서 이렇게 썼다.

    try:
        tree = ast.parse(path.read_text(...))
    except SyntaxError:
        continue          # ← 열두 파일이 여기서 조용히 빠졌다

**앞 회차에 제품에서 고친 바로 그 모양이 검사기 안에 있었다.** 예외를 삼키고
아무 말도 안 하니, 열두 파일을 못 본 것과 그 파일에 아무것도 없는 것이 화면에서
똑같이 보였다. 실제로 숨어 있던 것:

    무보호 쓰기 함수 3개   deploy_model · delete_deployed · deploy_model_stable
                           (부팅 시 DDL이 아니라 **사용자가 닿는 배포 엔드포인트**다)
    타입 없는 `except:` 7개

앞 회차가 발표한 "쓰기 22개"와 "타입 없는 except 2개"는 각각 25개와 9개였다.

여기서는 이어 붙여 한 번에 파싱하고, 줄 번호를 원래 조각으로 되돌린다.
파싱이 실패하면 **건너뛰지 않고 죽는다** — 조립된 소스가 안 열리면 그건
확인할 것이 없다는 뜻이 아니라 확인이 불가능하다는 뜻이다.
"""

from __future__ import annotations

import ast
import bisect
from pathlib import Path

PARTS_DIR = Path(__file__).resolve().parents[1] / "backend" / "main_parts"


class AssembledParts:
    """이어 붙인 소스, 그 AST, 그리고 줄 번호 → 조각 이름."""

    def __init__(self) -> None:
        self.paths = sorted(PARTS_DIR.glob("*.part"))
        if not self.paths:
            raise AssertionError(f"조각을 하나도 못 찾았다: {PARTS_DIR}")
        self.texts = [path.read_text(encoding="utf-8-sig") for path in self.paths]

        self._starts: list[int] = []
        line = 1
        for text in self.texts:
            self._starts.append(line)
            line += text.count("\n") + 1   # main.py의 "\n".join과 같은 셈

        self.source = "\n".join(self.texts)
        self.tree = ast.parse(self.source)   # 일부러 감싸지 않는다

    def owner(self, lineno: int) -> str:
        """조립된 줄 번호가 어느 조각에서 왔는가."""
        return self.paths[bisect.bisect_right(self._starts, lineno) - 1].name

    def local_line(self, lineno: int) -> int:
        index = bisect.bisect_right(self._starts, lineno) - 1
        return lineno - self._starts[index] + 1

    def where(self, node: ast.AST) -> str:
        return f"{self.owner(node.lineno)}:{self.local_line(node.lineno)}"

    def functions(self):
        for node in ast.walk(self.tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                yield self.owner(node.lineno), node

    def nodes(self, kind):
        for node in ast.walk(self.tree):
            if isinstance(node, kind):
                yield self.owner(node.lineno), node


def assembled() -> AssembledParts:
    return AssembledParts()
