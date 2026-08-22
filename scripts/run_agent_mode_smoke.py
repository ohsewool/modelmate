"""Agent Mode를 끝까지 몰아본다 — 어떤 검사도 이 경로를 치지 않았다.

README가 앞세우는 기능이다(goal → plan → tool call → observation → decision →
validation → human review → artifact). 그런데 `backend/agents/executor.py`는 pytest
커버리지 9%였고, 스모크 스크립트 13개를 전부 돌려도 움직이지 않았다. **엔드포인트
12개가 있고 아무도 치지 않고 있었다.**

돌려보니 결함이 나왔다. 학습은 "AutoML training completed"로 성공하고 바로 다음
설명 도구가 "Run AutoML training before explanation."으로 실패했다 — 요청 스코프가
작업 스레드로 전파되지 않아 학습 결과가 공유 기본 버킷에 쓰였기 때문이다. 그 아래
검증·보고서·API 준비도까지 전부 실행되지 않았다. 고친 뒤 열 단계가 전부 완료된다.

**이 스크립트가 확인하는 것은 "200이 왔다"가 아니라 "사슬이 끝까지 갔다"이다.**
200은 계속 오고 있었다.

    python3 scripts/run_agent_mode_smoke.py --base-url http://127.0.0.1:8000
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TIMEOUT = 300


def join(base_url, path):
    return urllib.parse.urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))


def request(method, url, *, payload=None, token=None, data=None, headers=None,
            timeout=TIMEOUT):
    body = json.dumps(payload).encode("utf-8") if payload is not None else data
    headers = dict(headers or ({"Content-Type": "application/json"}
                               if payload is not None else {}))
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            text = response.read().decode("utf-8", errors="replace")
            return {"status": response.status, "json": _parse(text)}
    except urllib.error.HTTPError as error:
        return {"status": error.code, "json": _parse(error.read().decode("utf-8", "replace"))}
    except Exception as error:  # noqa: BLE001 - a dead server is a failed check
        return {"status": None, "json": None, "error": str(error)}


def _parse(text):
    try:
        return json.loads(text)
    except Exception:
        return None


def add(results, name, passed, detail="", status=None):
    results.append({"name": name, "status": "pass" if passed else "fail",
                    "detail": detail, "http_status": status})


def run(base_url):
    results = []
    stamp = int(time.time() * 1000)
    email = f"agent-mode-{stamp}@example.com"

    registered = request("POST", join(base_url, "/api/auth/register"),
                         payload={"email": email, "password": "Passw0rd!123"})
    token = (registered["json"] or {}).get("token")
    add(results, "user can register", registered["status"] == 200 and bool(token),
        email, registered["status"])
    if not token:
        return {"base_url": base_url,
                "summary": {"total": len(results), "passed": 0,
                            "failed": len(results)}, "results": results}

    sample = (ROOT / "sample_data" / "customer_churn_demo.csv").read_bytes()
    boundary = f"----modelmate-agent-{stamp}"
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; "
            f"filename=\"customer_churn_demo.csv\"\r\nContent-Type: text/csv\r\n\r\n"
            ).encode("utf-8") + sample + f"\r\n--{boundary}--\r\n".encode("utf-8")
    upload = request("POST", join(base_url, "/api/upload"), data=body,
                     headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
                     token=token)
    add(results, "CSV upload works", upload["status"] == 200, "POST /api/upload",
        upload["status"])

    # 업로드가 데이터셋에 프로젝트를 붙인다. 따로 만든 프로젝트를 넘기면 executor의
    # dataset gate가 정확히 거부한다 - 처음에 그렇게 짜서 "Agent Mode가 실행되지
    # 않는다"고 볼 뻔했다. 게이트가 옳았고 흐름이 틀렸다.
    state = request("GET", join(base_url, "/api/state"), token=token)
    current = ((state["json"] or {}).get("current_dataset") or {})
    dataset_id = current.get("id") or current.get("dataset_id")
    project_id = current.get("project_id")
    add(results, "upload attaches a dataset and a project",
        bool(dataset_id and project_id), f"dataset={dataset_id} project={project_id}",
        state["status"])

    created = request("POST", join(base_url, "/api/agent-runs"), token=token,
                      payload={"project_id": project_id, "dataset_id": dataset_id,
                               "goal_text": "이탈할 고객을 예측하고 싶다",
                               "target_preference": "churn"})
    run_id = (created["json"] or {}).get("analysis_run_id")
    plan = (created["json"] or {}).get("plan") or []
    add(results, "a goal becomes a plan", created["status"] == 200 and len(plan) >= 5,
        f"{len(plan)} steps", created["status"])
    if not run_id:
        return _payload(base_url, results)

    first = request("POST", join(base_url, f"/api/agent-runs/{run_id}/execute"),
                    payload={}, token=token)
    trace = first["json"] or {}
    reviews = trace.get("human_reviews") or []
    add(results, "execution runs tools and records observations",
        len(trace.get("tool_calls") or []) >= 3 and len(trace.get("observations") or []) >= 3,
        f"{len(trace.get('tool_calls') or [])} tool calls", first["status"])
    add(results, "an ambiguous target pauses for human review",
        any(item.get("review_type") == "target_ambiguity" for item in reviews),
        f"{len(reviews)} review(s)", first["status"])
    if not reviews:
        return _payload(base_url, results)

    resolved = request("POST",
                       join(base_url, f"/api/agent-runs/{run_id}/reviews/{reviews[0]['id']}/resolve"),
                       payload={"selected_option": "select:churn",
                                "user_note": "smoke: churn 선택"}, token=token)
    add(results, "a human review can be resolved", resolved["status"] == 200,
        "POST resolve", resolved["status"])

    second = request("POST", join(base_url, f"/api/agent-runs/{run_id}/execute"),
                     payload={}, token=token)
    after = second["json"] or {}
    steps = after.get("steps") or []
    finished = [step for step in steps if step.get("status") == "completed"]
    failed = [step.get("tool_name") for step in steps if step.get("status") == "failed"]

    # 요지. 이 검사가 없으면 200만 보고 통과했을 것이고, 실제로 사슬은 절반에서
    # 멈춰 있었다 - 설명·검증·보고서·API 준비도가 전부 실행되지 않은 채로.
    add(results, "the chain finishes after the review is resolved",
        len(finished) >= 9 and not failed,
        f"{len(finished)}/{len(steps)} completed, failed={failed}", second["status"])
    explanation = next((step for step in steps
                        if step.get("tool_name") == "shap_explainer_tool"), None)
    add(results, "the explanation step actually runs",
        bool(explanation) and explanation.get("status") == "completed",
        "shap_explainer_tool", second["status"])

    # **이름이 아니라 무엇이 나왔는지를 본다.** 단계 이름은 `shap_explainer_tool`이고
    # 그 이름을 그대로 읽으면 SHAP이 돌았다고 믿게 되는데, 그 모듈에는 `import shap`이
    # 한 줄도 없다. 실제로 나오는 것은 feature importance 또는 표준화 계수다.
    # 이 저장소는 같은 정정을 한 번 했고("SHAP이 아닌 것을 SHAP이라 부르지 않는다")
    # 그 규칙이 스모크 출력까지는 오지 않았다.
    produced = ((explanation or {}).get("result") or {}).get("explanation_type") \
        or ((explanation or {}).get("output") or {}).get("explanation_type")
    add(results, "the smoke names what the explanation actually was",
        produced in ("feature_importance", "standardized_coefficient",
                     "model_coefficient", "fallback", "unavailable", None),
        f"explanation_type={produced!r}", second["status"])
    add(results, "a report is produced",
        any(step.get("tool_name") == "report_writer_tool"
            and step.get("status") == "completed" for step in steps),
        "report_writer_tool", second["status"])

    for label, path in (("trace", f"/api/agent-runs/{run_id}/trace"),
                        ("detail", f"/api/agent-runs/{run_id}"),
                        ("reviews", f"/api/agent-runs/{run_id}/reviews")):
        found = request("GET", join(base_url, path), token=token)
        add(results, f"the {label} endpoint answers", found["status"] == 200,
            f"GET {path}", found["status"])

    return _payload(base_url, results)


def _payload(base_url, results):
    passed = sum(1 for row in results if row["status"] == "pass")
    return {"base_url": base_url,
            "summary": {"total": len(results), "passed": passed,
                        "failed": len(results) - passed},
            "results": results}


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--base-url", required=True)
    arguments = parser.parse_args()
    payload = run(arguments.base_url)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["summary"]["failed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    main()
