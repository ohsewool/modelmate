"""화면 원칙(frontend/DESIGN.md)의 래칫 — 위반은 줄 수만 있고 늘 수 없다.

2026-08-24 감사의 정량 결과가 이 검사의 존재 이유다.

    색(hex)       87종   토큰 22개가 있는데 65종이 우회한다
    그림자        19종   정의된 것은 2종이어야 한다
    인라인 style  1,747곳
    글자 크기     10종   척도는 5단이다

**한 번에 못 고친다.** 1,747곳을 일괄 치환하면 그 자체가 사고다. 그래서 정확한
목표값 대신 래칫이다 — `frontend/design-baseline.json`에 현재 위반 수를 적어두고,

    늘어나면   빨간불. 새 코드가 옛 습관을 들여왔다
    줄어들면   초록불 + "기준을 내려라"가 찍힌다. 내리는 커밋까지가 수리다

기준 갱신: python3 tests/test_design_ratchet.py --tighten

측정은 전부 정적(정규식)이다. "화면에 실제로 1등이 하나인가"는 여기서 못 본다 —
그건 렌더가 필요하고 `scripts/check_screens.py`(화면 스모크)의 몫이다. 이 구분을
안 적으면 다음 사람이 이 검사만 보고 원칙 1이 지켜진다고 믿는다.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "frontend" / "src"
BASELINE = ROOT / "frontend" / "design-baseline.json"

# DESIGN.md §4의 척도. 이 목록을 바꾸려면 DESIGN.md를 고치는 커밋이 먼저다.
FONT_SCALE = {"12", "13", "14", "16", "20", "26"}   # 13은 --fs-body 보조(줄임)용
RADIUS_SCALE = {"8", "12", "999", "50"}             # 999/50%는 원형(아바타)
WEIGHT_MAX = 700


def source_files():
    files = sorted(SRC.rglob("*.jsx")) + sorted(SRC.rglob("*.js"))
    return [f for f in files if "node_modules" not in f.parts]


def measure() -> dict:
    hex_colors: set[str] = set()
    inline_styles = 0
    font_off_scale = 0
    weight_over = 0
    radius_off_scale = 0
    shadows: set[str] = set()

    for path in source_files():
        text = path.read_text(encoding="utf-8", errors="ignore")
        hex_colors |= {m.lower() for m in re.findall(r"#[0-9a-fA-F]{3,8}\b", text)}
        inline_styles += text.count("style={{")
        for m in re.findall(r"fontSize:\s*['\"]?(\d+)", text):
            if m not in FONT_SCALE:
                font_off_scale += 1
        for m in re.findall(r"fontWeight:\s*['\"]?(\d+)", text):
            if int(m) > WEIGHT_MAX:
                weight_over += 1
        for m in re.findall(r"borderRadius:\s*['\"]?(\d+)", text):
            if m not in RADIUS_SCALE:
                radius_off_scale += 1
        shadows |= set(re.findall(r"boxShadow:\s*['\"]([^'\"]{5,80})", text))

    return {
        "hex_colors_in_components": len(hex_colors),
        "inline_styles": inline_styles,
        "font_sizes_off_scale": font_off_scale,
        "font_weights_over_700": weight_over,
        "radii_off_scale": radius_off_scale,
        "shadow_definitions_in_components": len(shadows),
    }


class TestTheRatchet:
    def test_the_scan_sees_the_frontend(self):
        """**빈손을 통과로 세지 않는다.** 파일을 못 찾으면 위반 0으로 보인다."""
        files = source_files()
        assert len(files) > 50, f"프런트 소스를 {len(files)}개만 찾았다"

    def test_a_baseline_exists(self):
        assert BASELINE.exists(), (
            "frontend/design-baseline.json이 없다. "
            "python3 tests/test_design_ratchet.py --tighten 으로 만들라.")

    def test_no_violation_count_grew(self):
        baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
        current = measure()
        grew, shrank = [], []
        for key, now in current.items():
            base = baseline.get(key)
            assert base is not None, f"기준에 {key}가 없다 — --tighten으로 다시 만들라"
            if now > base:
                grew.append(f"{key}: {base} → {now}")
            elif now < base:
                shrank.append(f"{key}: {base} → {now}")
        assert grew == [], (
            "화면 원칙 위반이 늘었다(DESIGN.md §4). 새 코드는 척도 안에서 쓴다:\n  "
            + "\n  ".join(grew))
        if shrank:
            print("\n위반이 줄었다 — 기준을 내려라: "
                  "python3 tests/test_design_ratchet.py --tighten")
            for line in shrank:
                print(f"  {line}")

    def test_the_scale_matches_the_document(self):
        """검사의 척도와 DESIGN.md의 척도가 갈리면 한쪽만 낡는다."""
        doc = (ROOT / "frontend" / "DESIGN.md").read_text(encoding="utf-8")
        for size in ("12", "14", "16", "20", "26"):
            assert size in doc, f"DESIGN.md에 글자 척도 {size}가 없다"
        assert "800 이상 금지" in doc


if __name__ == "__main__":
    if "--tighten" in sys.argv:
        BASELINE.write_text(json.dumps(measure(), indent=1) + "\n", encoding="utf-8")
        print(f"기준 갱신 → {BASELINE}")
        print(json.dumps(measure(), indent=1))
    else:
        print(json.dumps(measure(), indent=1))
