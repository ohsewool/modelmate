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
    results.append({"name": name, "status": "pass" if passed else "fail", "detail": detail, "http_status": status})


def register_user(base_url, suffix):
    stamp = int(time.time() * 1000)
    email = f"project-history-{suffix}-{stamp}@example.com"
    password = "ModelMate-project-history-12345"
    res = request(
        "POST",
        join(base_url, "/api/auth/register"),
        payload={"email": email, "password": password, "name": f"Project History {suffix}"},
    )
    return email, (res["json"] or {}).get("token"), res


def run(base_url):
    results = []
    email_a, token_a, reg_a = register_user(base_url, "a")
    add(results, "user A register/login", reg_a["status"] == 200 and bool(token_a), email_a, reg_a["status"])
    email_b, token_b, reg_b = register_user(base_url, "b")
    add(results, "user B register/login", reg_b["status"] == 200 and bool(token_b), email_b, reg_b["status"])

    create = request(
        "POST",
        join(base_url, "/api/projects"),
        payload={"name": "Project History Smoke", "description": "Smoke project for persistent history."},
        token=token_a,
    )
    project_id = (create["json"] or {}).get("id")
    add(results, "user A can create project", create["status"] == 200 and bool(project_id), "POST /api/projects", create["status"])

    plan = request(
        "POST",
        join(base_url, "/api/agent/mock-plan"),
        payload={"user_goal": "Track project history smoke", "project_id": project_id},
        token=token_a,
    )
    analysis_run_id = (plan["json"] or {}).get("analysis_run_id")
    add(results, "user A can create linked analysis run", plan["status"] == 200 and bool(analysis_run_id), "POST /api/agent/mock-plan", plan["status"])

    projects_a = request("GET", join(base_url, "/api/projects"), token=token_a)
    projects_a_json = projects_a["json"] if isinstance(projects_a["json"], list) else []
    project_summary = next((row for row in projects_a_json if row.get("id") == project_id), None)
    add(results, "user A project list includes project summary", bool(project_summary), "GET /api/projects as A", projects_a["status"])
    add(results, "project summary includes history fields", bool(project_summary and "run_count" in project_summary and "last_run_id" in project_summary), "project summary shape", projects_a["status"])

    detail_a = request("GET", join(base_url, f"/api/projects/{project_id}"), token=token_a)
    detail_json = detail_a["json"] or {}
    add(results, "user A can open project detail", detail_a["status"] == 200 and detail_json.get("id") == project_id, "GET /api/projects/{id}", detail_a["status"])
    add(results, "project detail includes analysis_runs", isinstance(detail_json.get("analysis_runs"), list), "detail analysis_runs", detail_a["status"])

    runs_a = request("GET", join(base_url, f"/api/projects/{project_id}/runs"), token=token_a)
    runs_json = runs_a["json"] if isinstance(runs_a["json"], list) else []
    add(results, "user A can list project runs", runs_a["status"] == 200 and any(row.get("analysis_run_id") == analysis_run_id for row in runs_json), "GET /api/projects/{id}/runs", runs_a["status"])

    reports_a = request("GET", join(base_url, f"/api/projects/{project_id}/reports"), token=token_a)
    add(results, "user A can query project reports metadata", reports_a["status"] == 200 and isinstance(reports_a["json"], list), "GET /api/projects/{id}/reports", reports_a["status"])

    projects_b = request("GET", join(base_url, "/api/projects"), token=token_b)
    projects_b_json = projects_b["json"] if isinstance(projects_b["json"], list) else []
    add(results, "user B cannot list user A project", all(row.get("id") != project_id for row in projects_b_json), "GET /api/projects as B", projects_b["status"])

    detail_b = request("GET", join(base_url, f"/api/projects/{project_id}"), token=token_b)
    add(results, "user B cannot open user A project detail", detail_b["status"] in (403, 404), "GET /api/projects/{id} as B", detail_b["status"])

    runs_b = request("GET", join(base_url, f"/api/projects/{project_id}/runs"), token=token_b)
    add(results, "user B cannot list user A project runs", runs_b["status"] in (403, 404), "GET /api/projects/{id}/runs as B", runs_b["status"])

    unauth_detail = request("GET", join(base_url, f"/api/projects/{project_id}"))
    add(results, "unauthenticated project detail is blocked", unauth_detail["status"] in (401, 403, 404), "GET /api/projects/{id} unauth", unauth_detail["status"])

    guest_session = request("GET", join(base_url, "/api/session"))
    add(results, "guest demo session remains accessible", guest_session["status"] == 200 and "guest_demo" in guest_session["text"], "GET /api/session", guest_session["status"])

    passed = sum(1 for row in results if row["status"] == "pass")
    return {"base_url": base_url, "summary": {"total": len(results), "passed": passed, "failed": len(results) - passed}, "results": results}


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
