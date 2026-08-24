"""README의 30초 데모가 아직 무엇인가를 보여주는가 — **돌았다가 아니라 갈렸다.**

README는 방문자에게 세 줄을 시킨다.

    python3 scripts/make_demo_data.py
    python3 scripts/demo.py --leaky                    # 검사 적용
    python3 scripts/demo.py --leaky --ignore-leakage   # 권고를 무시하면

그리고 무엇이 보일지까지 적어둔다.

    권고를 적용하면 AUC가 1.0에서 0.778로 내려가고 검증은 `grounded`가 되며,
    무시하면 검증이 `invalid`로 판정하고 보고서가 스스로 차단 상태를 밝힌다.

**이 세 줄을 CI가 한 번도 돌린 적이 없었다.** 포트폴리오에서 이건 스위트가 깨지는
것보다 나쁘다 — 읽는 사람이 가장 먼저 치는 명령이고, 여기서 막히면 나머지는 안 본다.

### 종료 코드는 이 질문에 답하지 않는다

`exit 0`은 **돌았다**만 말한다. 데모의 값은 두 실행이 **갈린다**는 데 있다. 누출
컬럼을 빼든 넣든 같은 점수가 나오면 데모는 여전히 종료 코드 0으로 끝나고, 보여주는
것은 아무것도 없다.

이 저장소는 그 구분을 이미 한 번 적어뒀다 — Agent Mode 스모크에 *"이 검사가 보는
것은 '200이 왔다'가 아니라 '사슬이 끝까지 갔다'이다"*라고. 여기도 같다.

### 숫자는 README에서 읽는다

`0.778`과 `1.0`을 이 파일에 다시 적지 않는다. **README가 기록이고**, 여기서는 그것을
읽어 측정과 맞춰본다 — 두 곳에 적으면 한쪽만 낡는다(이 포트폴리오가 가장 자주 잡은
모양이다). 그래서 README의 숫자를 고치면 이 검사가 바로 그것을 확인한다.

재현성은 확인했다. `make_demo_data.py`는 시드를 쓰고, 데이터를 지우고 다시 만들어도
0.7782 / 1.0이 그대로 나온다 — 세 번 돌려 확인했다. **재현되지 않는 값을 관문에
박으면 그 관문은 무작위로 빨간불이 되고, 결국 꺼진다.**

    python3 scripts/check_demo_still_demonstrates.py
    python3 scripts/check_demo_still_demonstrates.py --skip-generate   # 이미 만들어뒀다면

전부 합쳐 46초다.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"

ANSI = re.compile(r"\x1b\[[0-9;]*m")
AUC = re.compile(r"ROC-AUC\s+([0-9.]+)")
# **"판정"은 출력에 두 번 나온다.** 앞의 것은 데이터 품질(`판정 warning · 모델 품질
# acceptable`)이고, 데모가 말하는 증거 검증은 뒤의 것이다. 처음엔 앞의 것을 집어
# 멀쩡한 데모를 "grounded가 아니다"로 판정할 뻔했다 — 정규식이 무엇을 집는지
# 확인하지 않으면 검사가 틀린 것을 검사한다.
VERDICT = re.compile(r"판정\s+(\w+)\s*·\s*권고 서술 톤")
# README: "권고를 적용하면 AUC가 1.0에서 0.778로 내려가고"
CLAIM = re.compile(r"AUC가\s+([0-9.]+)에서\s+([0-9.]+)로")

LEAKED = ("churn_reason", "exit_survey_score")


def run(arguments: list[str]) -> str:
    finished = subprocess.run([sys.executable, *arguments], cwd=ROOT,
                              capture_output=True, text=True, timeout=900)
    if finished.returncode != 0:
        raise SystemExit(
            f"FAILED — README가 시키는 명령이 실패했다: {' '.join(arguments)}\n"
            f"{finished.stdout[-1500:]}\n{finished.stderr[-800:]}")
    return ANSI.sub("", finished.stdout)


def only(pattern: re.Pattern, text: str, what: str) -> str:
    found = pattern.search(text)
    if not found:
        # **못 찾은 것을 통과로 세지 않는다.** 출력 문구가 바뀌면 정규식이 빈손을
        # 내고, 그러면 아래 비교는 아무것도 확인하지 않는다.
        raise SystemExit(f"FAILED — 데모 출력에서 {what}를 못 찾았다. 문구가 바뀌었으면 "
                         "이 검사의 정규식도 함께 고쳐라.")
    return found.group(1)


def features_used(text):
    """그 실행이 실제로 학습에 쓴 컬럼 이름들."""
    found = re.search(r"사용된 특징\s+\[(.*?)\]", text, re.S)
    if not found:
        return None
    return {name.strip().strip("'\"") for name in found.group(1).split(",")}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--skip-generate", action="store_true")
    options = parser.parse_args(argv)

    readme = README.read_text(encoding="utf-8")
    claim = CLAIM.search(readme)
    if not claim:
        raise SystemExit("FAILED — README에서 'AUC가 A에서 B로' 문장을 못 찾았다. "
                         "데모의 주장이 사라졌거나 문구가 바뀌었다.")
    claimed_ignored, claimed_guarded = float(claim.group(1)), float(claim.group(2))
    print(f"README의 주장: 무시하면 {claimed_ignored} · 적용하면 {claimed_guarded}")

    if not options.skip_generate:
        run(["scripts/make_demo_data.py"])

    guarded = run(["scripts/demo.py", "--leaky"])
    ignored = run(["scripts/demo.py", "--leaky", "--ignore-leakage"])

    measured_guarded = float(only(AUC, guarded, "적용한 쪽의 ROC-AUC"))
    measured_ignored = float(only(AUC, ignored, "무시한 쪽의 ROC-AUC"))
    verdict_guarded = only(VERDICT, guarded, "적용한 쪽의 검증 판정")
    verdict_ignored = only(VERDICT, ignored, "무시한 쪽의 검증 판정")
    print(f"측정:         무시하면 {measured_ignored} · 적용하면 {measured_guarded}")
    print(f"검증 판정:    적용 {verdict_guarded} · 무시 {verdict_ignored}")

    problems = []
    # README가 적어둔 자릿수까지만 본다 — 0.778로 적혀 있으면 0.7782는 맞는 값이다.
    places = len(claim.group(2).split(".")[-1])
    if round(measured_guarded, places) != claimed_guarded:
        problems.append(f"적용한 쪽 AUC: README {claimed_guarded} vs 측정 {measured_guarded}")
    if round(measured_ignored, len(claim.group(1).split(".")[-1])) != claimed_ignored:
        problems.append(f"무시한 쪽 AUC: README {claimed_ignored} vs 측정 {measured_ignored}")

    # **여기가 요점이다.** 위 둘이 다 맞아도 갈리지 않으면 데모는 아무것도 안 보여준다.
    if not measured_guarded < measured_ignored:
        problems.append(
            f"두 실행이 갈리지 않는다({measured_guarded} vs {measured_ignored}). "
            "데모의 값은 종료 코드가 아니라 이 차이에 있다.")
    if verdict_guarded != "grounded":
        problems.append(f"적용한 쪽 판정이 grounded가 아니다: {verdict_guarded}")
    if verdict_ignored != "invalid":
        problems.append(f"무시한 쪽 판정이 invalid가 아니다: {verdict_ignored}")
    if "차단 상태" not in ignored:
        problems.append("무시한 쪽 보고서가 스스로 차단 상태를 밝히지 않는다 — "
                        "README가 그렇게 적어뒀다.")

    # 누출 컬럼이 실제로 빠지고 실제로 들어갔는가. **점수만 보면 왜 갈렸는지는
    # 모른다** — 두 수가 달라도 이유가 누출이 아닐 수 있다.
    used_ignored = features_used(ignored)
    used_guarded = features_used(guarded)
    if used_ignored is None or used_guarded is None:
        problems.append("'사용된 특징' 목록을 못 찾았다 — 문구가 바뀌었으면 이 "
                        "검사도 함께 고쳐라")
    else:
        if not (set(LEAKED) & used_ignored):
            problems.append(
                f"무시한 쪽이 누출 컬럼을 안 쓴다({sorted(used_ignored)}). 그러면 "
                "높은 점수가 누출에서 나온 것이 아니고, 데모의 설명이 틀린 것이다")
        if set(LEAKED) & used_guarded:
            problems.append(
                f"적용한 쪽이 누출 컬럼을 쓰고 있다: "
                f"{sorted(set(LEAKED) & used_guarded)} — 제외 권고가 안 먹었다")

    if problems:
        print("\nFAILED — 데모가 더 이상 README가 말하는 것을 보여주지 않는다:")
        for problem in problems:
            print(f"    {problem}")
        return 1
    print("\n데모가 아직 갈린다. README의 숫자와 판정이 측정과 같다.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
