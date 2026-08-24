"""화면 스모크 — 렌더된 화면이 DESIGN.md의 원칙을 실제로 지키는가.

92회차의 교훈이 이 스크립트의 존재 이유다: **검사 2,600개가 렌더된 화면을 본 적이
한 번도 없었고**, 도메인 오분류를 스크린샷 한 장이 찾았다. 정적 래칫
(`tests/test_design_ratchet.py`)은 소스의 값을 세지만 "화면에 1등이 정말
하나인가"는 렌더해야만 안다 — 대시보드 수리 때 본문은 1등이 하나였는데 렌더에는
셋이었다. 껍데기(사이드바·상단바)가 둘을 얹고 있었다.

확인하는 것 (화면마다):

    btn-primary ≤ 1        DESIGN.md §1 — 한 화면에 1등 하나
    "없습니다" 상자 0        §5 — 빈 상태는 자리를 차지하지 않는다
    콘솔 에러 0             (허용 목록 제외 — 로컬에서 죽는 구글 로그인 등)
    화면이 비어 있지 않다     본문 글자 수 하한

**CI에서 돌지 않는다.** 서버와 크로미움이 필요해서다. 회차마다 손으로 돌리는
계기이고, 그 한계는 알려진 것이다 — 돌리는 법:

    # 서버가 떠 있어야 한다: uvicorn backend.main:app --port 8100
    LD_LIBRARY_PATH=/opt/conda/lib python3 scripts/check_screens.py
    python3 scripts/check_screens.py --base-url http://127.0.0.1:8100

계정은 스스로 만든다(데모용 일회 계정). 스크린샷은 --shots 디렉터리에 남긴다.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# (경로, 이 화면의 1등 — DESIGN.md §1. 없으면 "primary 0개도 허용"이라는 뜻이다.)
SCREENS = [
    ("/dashboard", "다음 행동 하나"),
    ("/upload", "이 설정으로 분석 준비"),
    ("/projects", None),
    ("/history", None),
    ("/reports", None),
    ("/predict", None),
    ("/settings", None),
]

# 로컬에서 어쩔 수 없이 나는 에러 — 구글 로그인 origin, 외부 리소스.
CONSOLE_ALLOW = ("GSI_LOGGER", "accounts.google.com", "Failed to load resource")


def make_account(base_url: str) -> tuple[str, str]:
    stamp = int(time.time() * 1000)
    email = f"screen-smoke-{stamp}@modelmate.test"
    password = "ModelMate-smoke-12345"
    body = json.dumps({"email": email, "password": password, "name": "화면"}).encode()
    request = urllib.request.Request(
        f"{base_url}/api/auth/signup", data=body,
        headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=30) as response:
        json.loads(response.read())
    return email, password


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--base-url", default="http://127.0.0.1:8100")
    parser.add_argument("--shots", type=Path,
                        default=Path("/home/jovyan/work/screenshots/audit"))
    options = parser.parse_args(argv)
    options.shots.mkdir(parents=True, exist_ok=True)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("FAILED — playwright가 없다. 이 계기는 브라우저가 필요하다.")
        return 1

    email, password = make_account(options.base_url)
    problems, checked = [], 0

    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        errors: list[str] = []
        page.on("console", lambda m: errors.append(m.text)
                if m.type == "error" and not any(a in m.text for a in CONSOLE_ALLOW)
                else None)

        page.goto(f"{options.base_url}/login", wait_until="networkidle")
        page.wait_for_timeout(800)
        page.fill("input[type=email]", email)
        page.fill("input[type=password]", password)
        page.get_by_role("button", name="이메일로 로그인").click()
        page.wait_for_timeout(3500)

        for route, winner in SCREENS:
            errors.clear()
            page.goto(f"{options.base_url}{route}", wait_until="networkidle",
                      timeout=30000)
            page.wait_for_timeout(1200)
            checked += 1
            name = route.strip("/").replace("/", "-") or "root"
            page.screenshot(path=str(options.shots / f"smoke-{name}.png"),
                            full_page=True)

            primaries = page.locator("button.btn-primary:visible").count()
            body = page.inner_text("body")
            empty_boxes = body.count("없습니다.")   # 문장형 빈 상태 문구
            marks = []
            if primaries > 1:
                marks.append(f"1등이 {primaries}개")
                problems.append(f"{route}: btn-primary {primaries}개 (§1)")
            if len(body.strip()) < 40:
                marks.append("화면이 거의 비었다")
                problems.append(f"{route}: 본문 {len(body.strip())}자")
            if errors:
                marks.append(f"콘솔 에러 {len(errors)}")
                problems.append(f"{route}: {errors[0][:60]}")
            status = " · ".join(marks) if marks else "ok"
            print(f"  {'✗' if marks else '✓'} {route:14} 1등 {primaries} · "
                  f"'없습니다' {empty_boxes} · {status}")

        browser.close()

    if checked == 0:
        print("FAILED — 화면을 하나도 못 봤다.")
        return 1
    if problems:
        print(f"\nFAILED — 화면 {len(problems)}건이 원칙을 어긴다:")
        for line in problems:
            print(f"    {line}")
        return 1
    print(f"\n화면 {checked}개가 원칙 안에 있다. 스크린샷: {options.shots}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
