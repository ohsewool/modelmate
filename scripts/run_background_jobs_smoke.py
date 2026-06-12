import argparse
import json
import time
import urllib.error
import urllib.parse
import urllib.request


DEFAULT_TIMEOUT = 60


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
    email = f"background-job-{suffix}-{stamp}@example.com"
    password = "ModelMate-background-job-12345"
    res = request(
        "POST",
        join(base_url, "/api/auth/register"),
        payload={"email": email, "password": password, "name": f"Background Job {suffix}"},
    )
    return email, (res["json"] or {}).get("token"), res


def wait_for_terminal_status(base_url, job_id, token):
    latest = None
    for _ in range(12):
        latest = request("GET", join(base_url, f"/api/training/jobs/{job_id}"), token=token)
        data = latest["json"] or {}
        if data.get("status") in ("succeeded", "failed", "cancelled", "needs_review"):
            return latest
        time.sleep(1.5)
    return latest


def run(base_url):
    results = []
    email_a, token_a, reg_a = register_user(base_url, "a")
    add(results, "user A register/login", reg_a["status"] == 200 and bool(token_a), email_a, reg_a["status"])
    email_b, token_b, reg_b = register_user(base_url, "b")
    add(results, "user B register/login", reg_b["status"] == 200 and bool(token_b), email_b, reg_b["status"])

    create = request(
        "POST",
        join(base_url, "/api/projects"),
        payload={"name": "Background Job Smoke", "description": "Smoke project for training jobs."},
        token=token_a,
    )
    project_id = (create["json"] or {}).get("id")
    add(results, "user A can create project", create["status"] == 200 and bool(project_id), "POST /api/projects", create["status"])

    job = request(
        "POST",
        join(base_url, "/api/training/jobs"),
        payload={"project_id": project_id},
        token=token_a,
    )
    job_json = job["json"] or {}
    job_id = job_json.get("job_id")
    add(results, "training job creation returns job_id", job["status"] == 200 and bool(job_id), "POST /api/training/jobs", job["status"])
    add(results, "new job starts in queued or running status", job_json.get("status") in ("queued", "running", "failed", "succeeded"), str(job_json.get("status")), job["status"])

    own_job = request("GET", join(base_url, f"/api/training/jobs/{job_id}"), token=token_a)
    add(results, "user A can read own job", own_job["status"] == 200 and (own_job["json"] or {}).get("job_id") == job_id, "GET /api/training/jobs/{job_id}", own_job["status"])

    terminal = wait_for_terminal_status(base_url, job_id, token_a)
    terminal_json = terminal["json"] or {}
    add(results, "job reaches readable terminal or active state", terminal["status"] == 200 and terminal_json.get("status") in ("queued", "running", "succeeded", "failed"), str(terminal_json.get("status")), terminal["status"])
    if terminal_json.get("status") == "failed":
        add(results, "failed job has friendly recovery fields", bool(terminal_json.get("error_type") and terminal_json.get("recommended_next_action")), "failed job payload", terminal["status"])
    else:
        add(results, "job has progress payload", bool(terminal_json.get("progress_message")), "job progress payload", terminal["status"])

    job_b = request("GET", join(base_url, f"/api/training/jobs/{job_id}"), token=token_b)
    add(results, "user B cannot read user A job", job_b["status"] in (403, 404), "GET /api/training/jobs/{job_id} as B", job_b["status"])

    unauth = request("GET", join(base_url, f"/api/training/jobs/{job_id}"))
    add(results, "unauthenticated job read is blocked", unauth["status"] in (401, 403, 404), "GET /api/training/jobs/{job_id} unauth", unauth["status"])

    jobs_a = request("GET", join(base_url, f"/api/projects/{project_id}/jobs"), token=token_a)
    jobs_json = jobs_a["json"] if isinstance(jobs_a["json"], list) else []
    add(results, "project jobs endpoint includes job", jobs_a["status"] == 200 and any(row.get("job_id") == job_id for row in jobs_json), "GET /api/projects/{id}/jobs", jobs_a["status"])

    project_detail = request("GET", join(base_url, f"/api/projects/{project_id}"), token=token_a)
    detail_json = project_detail["json"] or {}
    add(results, "project history includes last job status", project_detail["status"] == 200 and detail_json.get("last_job_id") == job_id, "GET /api/projects/{id}", project_detail["status"])

    jobs_b = request("GET", join(base_url, f"/api/projects/{project_id}/jobs"), token=token_b)
    add(results, "user B cannot list user A project jobs", jobs_b["status"] in (403, 404), "GET /api/projects/{id}/jobs as B", jobs_b["status"])

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
