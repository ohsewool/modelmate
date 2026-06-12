import argparse
import json
import time
import urllib.error
import urllib.parse
import urllib.request


DEFAULT_TIMEOUT = 45


def join(base_url, path):
    return urllib.parse.urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))


def parse_json(text):
    try:
        return json.loads(text)
    except Exception:
        return None


def request(method, url, *, payload=None, token=None):
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"} if payload is not None else {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=DEFAULT_TIMEOUT) as res:
            text = res.read().decode("utf-8", errors="replace")
            return {"status": res.status, "ok": True, "text": text, "json": parse_json(text)}
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8", errors="replace")
        return {"status": exc.code, "ok": False, "text": text, "json": parse_json(text)}
    except Exception as exc:
        return {"status": None, "ok": False, "text": str(exc), "json": None}


def add(results, name, passed, detail="", status=None):
    results.append({
        "name": name,
        "status": "pass" if passed else "fail",
        "detail": detail,
        "http_status": status,
    })


def register_user(base_url, suffix):
    email = f"ownership-{suffix}-{int(time.time() * 1000)}@example.com"
    password = "ModelMate-owner-smoke-12345"
    res = request(
        "POST",
        join(base_url, "/api/auth/register"),
        payload={"email": email, "password": password, "name": f"Ownership {suffix}"},
    )
    return email, password, res


def run(base_url):
    results = []

    email_a, _, reg_a = register_user(base_url, "a")
    token_a = (reg_a["json"] or {}).get("token")
    add(results, "user A register/login", reg_a["status"] == 200 and bool(token_a), email_a, reg_a["status"])

    email_b, _, reg_b = register_user(base_url, "b")
    token_b = (reg_b["json"] or {}).get("token")
    add(results, "user B register/login", reg_b["status"] == 200 and bool(token_b), email_b, reg_b["status"])

    unauth_projects = request("GET", join(base_url, "/api/projects"))
    unauth_json = unauth_projects["json"]
    unauth_safe = unauth_projects["status"] in (401, 403) or (
        unauth_projects["status"] == 200 and isinstance(unauth_json, list) and len(unauth_json) == 0
    )
    add(results, "unauthenticated project list exposes no private projects", unauth_safe, "GET /api/projects", unauth_projects["status"])

    project_payload = {"name": "Ownership Smoke Project", "description": "Created by ownership smoke test."}
    create_project = request("POST", join(base_url, "/api/projects"), payload=project_payload, token=token_a)
    project_id = (create_project["json"] or {}).get("id")
    add(results, "user A can create a project", create_project["status"] == 200 and bool(project_id), "POST /api/projects", create_project["status"])

    list_a = request("GET", join(base_url, "/api/projects"), token=token_a)
    list_a_json = list_a["json"] if isinstance(list_a["json"], list) else []
    add(results, "user A can list own project", any(row.get("id") == project_id for row in list_a_json), "GET /api/projects as A", list_a["status"])

    list_b = request("GET", join(base_url, "/api/projects"), token=token_b)
    list_b_json = list_b["json"] if isinstance(list_b["json"], list) else []
    add(results, "user B cannot list user A project", all(row.get("id") != project_id for row in list_b_json), "GET /api/projects as B", list_b["status"])

    detail_b = request("GET", join(base_url, f"/api/projects/{project_id}"), token=token_b)
    add(results, "user B cannot access user A project detail", detail_b["status"] in (403, 404), "GET /api/projects/{id} as B", detail_b["status"])

    plan_payload = {"user_goal": "Check ownership access control", "project_id": project_id}
    plan_a = request("POST", join(base_url, "/api/agent/mock-plan"), payload=plan_payload, token=token_a)
    analysis_run_id = (plan_a["json"] or {}).get("analysis_run_id")
    add(results, "user A can create agent run under own project", plan_a["status"] == 200 and bool(analysis_run_id), "POST /api/agent/mock-plan as A", plan_a["status"])

    plan_b = request("POST", join(base_url, "/api/agent/mock-plan"), payload=plan_payload, token=token_b)
    add(results, "user B cannot create agent run under user A project", plan_b["status"] in (403, 404), "POST /api/agent/mock-plan as B", plan_b["status"])

    trace_a = request("GET", join(base_url, f"/api/agent/runs/{analysis_run_id}"), token=token_a)
    add(results, "user A can read own agent run", trace_a["status"] == 200, "GET /api/agent/runs/{id} as A", trace_a["status"])

    trace_b = request("GET", join(base_url, f"/api/agent/runs/{analysis_run_id}"), token=token_b)
    add(results, "user B cannot read user A agent run", trace_b["status"] in (403, 404), "GET /api/agent/runs/{id} as B", trace_b["status"])

    guest_session = request("GET", join(base_url, "/api/session"))
    add(results, "guest demo session context still accessible", guest_session["status"] == 200 and "guest_demo" in guest_session["text"], "GET /api/session", guest_session["status"])

    passed = sum(1 for row in results if row["status"] == "pass")
    return {
        "base_url": base_url,
        "summary": {"total": len(results), "passed": passed, "failed": len(results) - passed},
        "results": results,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True)
    args = parser.parse_args()
    payload = run(args.base_url)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["summary"]["failed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
