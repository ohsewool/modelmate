"""커밋된 `frontend/dist`가 현재 `frontend/src`에서 나온 것인가.

백엔드는 `frontend/dist`를 **정적으로 서빙한다**(`main_parts/099_static_frontend.part`).
그래서 dist가 저장소에 커밋돼 있고, 그 자체는 의도된 것이다 — 배포에 빌드 단계가
없다.

문제는 아무것도 그 둘을 묶어두지 않는다는 것이다. `src`만 고치고 빌드를 잊으면
**앱은 옛 코드를 서빙하는데 모든 검사가 통과한다**: 제품 스모크는 HTTP API를 치고,
`vite build`는 성공하고, pytest는 백엔드만 본다. 사용자만 안다.

**빌드 결과를 다시 만들어 비교하지 않는다.** 그 방법은 툴체인이 바이트 단위로
재현 가능할 때만 성립하고, node·vite 버전이 조금만 달라도 거짓 실패를 낸다. 거짓
실패를 내는 검사는 사람들이 끄는 검사다.

대신 **입력의 지문**을 비교한다. 빌드할 때 `src`와 빌드 설정의 해시를 dist 옆에
남기고, 이 검사는 그 지문이 지금 입력과 같은지 본다. 다르면 "빌드를 다시 하라"고
말한다 — 무엇이 달라졌는지도 함께.

    python3 scripts/check_frontend_build_current.py            # 검사
    python3 scripts/check_frontend_build_current.py --update   # 빌드 뒤 지문 갱신

참고로 2026-08-21 기준 `npx vite build`는 커밋된 dist를 **바이트 단위로 재현한다**.
그래도 지문 방식을 쓰는 이유는 위와 같다 - 오늘 재현된다는 것과 다른 기계·다른
버전에서도 재현된다는 것은 다른 주장이다.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
STAMP = FRONTEND / "dist" / ".source-stamp.json"

# 빌드 결과를 바꿀 수 있는 입력. 여기 없는 것을 고치면 이 검사는 침묵한다 -
# 그래서 목록을 좁게 두고, 넓히는 것은 의식적인 결정이 되게 한다.
SOURCES = ("src",)
FILES = ("index.html", "package.json", "package-lock.json", "vite.config.js")
SKIP_NAMES = {".DS_Store"}


def fingerprint() -> dict[str, str]:
    """빌드 입력의 파일별 해시. 정렬된 상대 경로가 키다."""
    found: dict[str, str] = {}
    for name in SOURCES:
        base = FRONTEND / name
        if not base.exists():
            continue
        for path in sorted(base.rglob("*")):
            if path.is_dir() or path.name in SKIP_NAMES:
                continue
            found[str(path.relative_to(FRONTEND))] = hashlib.sha256(
                path.read_bytes()).hexdigest()[:16]
    for name in FILES:
        path = FRONTEND / name
        if path.exists():
            found[name] = hashlib.sha256(path.read_bytes()).hexdigest()[:16]
    return found


def digest(found: dict[str, str]) -> str:
    return hashlib.sha256(
        "\n".join(f"{k}:{v}" for k, v in sorted(found.items())).encode("utf-8")
    ).hexdigest()[:16]


def referenced_assets() -> list[str]:
    """`dist/index.html`이 부르는 자산. 지문과 별개로, 있어야 할 파일이 있는지."""
    import re

    index = FRONTEND / "dist" / "index.html"
    if not index.exists():
        return []
    return re.findall(r'(?:src|href)="/?(assets/[^"]+)"',
                      index.read_text(encoding="utf-8"))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--update", action="store_true",
                        help="현재 입력으로 지문을 다시 쓴다 (빌드 직후에만)")
    arguments = parser.parse_args(argv)

    if not (FRONTEND / "dist").exists():
        print("frontend/dist가 없다 — 이 검사는 아무것도 확인하지 않았다.")
        return 1

    found = fingerprint()
    if not found:
        # 입력을 하나도 못 찾으면 "일치"는 아무 뜻이 없다.
        print("빌드 입력을 하나도 찾지 못했다 — 이 결과는 아무 뜻도 없다.")
        return 1

    if arguments.update:
        STAMP.write_text(json.dumps(
            {"digest": digest(found), "files": found}, indent=2, sort_keys=True) + "\n",
            encoding="utf-8")
        print(f"지문 갱신: 파일 {len(found)}개, digest {digest(found)}")
        return 0

    missing = [name for name in referenced_assets()
               if not (FRONTEND / "dist" / name).exists()]
    if missing:
        print(f"dist/index.html이 없는 자산을 부른다: {missing}")
        return 1

    if not STAMP.exists():
        print(f"{STAMP.relative_to(ROOT)}가 없다. "
              f"빌드 뒤 `--update`로 만들어야 이 검사가 무언가를 확인한다.")
        return 1

    recorded = json.loads(STAMP.read_text(encoding="utf-8"))
    if recorded.get("digest") == digest(found):
        print(f"dist는 현재 src에서 나온 것이다 "
              f"(입력 {len(found)}개, digest {digest(found)}, 자산 {len(referenced_assets())}개 확인)")
        return 0

    before, after = recorded.get("files", {}), found
    changed = sorted(set(before) | set(after))
    lines = [name for name in changed if before.get(name) != after.get(name)]
    print("dist가 현재 src에서 나온 것이 아니다. `npm run build` 뒤 "
          "`python3 scripts/check_frontend_build_current.py --update`.")
    for name in lines[:12]:
        state = ("추가" if name not in before else
                 "삭제" if name not in after else "변경")
        print(f"    {state}  {name}")
    if len(lines) > 12:
        print(f"    … 외 {len(lines) - 12}개")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
