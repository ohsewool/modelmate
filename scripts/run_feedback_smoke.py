import argparse
import json
import time
import urllib.error
import urllib.parse
import urllib.request


DEFAULT_TIMEOUT = 45
FAKE_TOKEN = "mm_live_feedback_fake_token_never_log"


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


def run(base_url):
    stamp = int(time.time() * 1000)
    email = f"feedback-smoke-{stamp}@example.com"
    password = "ModelMate-smoke-12345"
    results = []

    register = request("POST", join(base_url, "/api/auth/register"), payload={"email": email, "password": password, "name": "Feedback Smoke"})
    token = (register["json"] or {}).get("token")
    add(results, "register feedback smoke user", register["status"] == 200 and bool(token), "POST /api/auth/register", register["status"])

    payload = {
        "category": "bug",
        "severity": "medium",
        "title": "Smoke feedback",
        "message": "This is a smoke test feedback item.",
        "route": "/settings",
        "request_id": "req_feedback_smoke",
        "prediction_api_token_prefix": "mm_live_preview",
        "plaintext_token": FAKE_TOKEN,
    }
    submitted = request("POST", join(base_url, "/api/feedback"), payload=payload, token=token)
    feedback_id = (submitted["json"] or {}).get("feedback_id")
    add(results, "authenticated user can submit feedback", submitted["status"] == 200 and bool(feedback_id), "POST /api/feedback", submitted["status"])
    add(results, "feedback response does not leak full token", FAKE_TOKEN not in submitted["text"], "token leak check", submitted["status"])

    invalid_category = request("POST", join(base_url, "/api/feedback"), payload={**payload, "category": "not_allowed"}, token=token)
    add(results, "invalid category rejected", invalid_category["status"] == 400, "POST /api/feedback invalid category", invalid_category["status"])

    invalid_severity = request("POST", join(base_url, "/api/feedback"), payload={**payload, "severity": "urgent"}, token=token)
    add(results, "invalid severity rejected", invalid_severity["status"] == 400, "POST /api/feedback invalid severity", invalid_severity["status"])

    guest = request("POST", join(base_url, "/api/feedback"), payload={**payload, "category": "other", "title": "Guest smoke feedback"})
    add(results, "guest feedback behavior supported", guest["status"] == 200 and bool((guest["json"] or {}).get("feedback_id")), "POST guest /api/feedback", guest["status"])

    admin_list_guest = request("GET", join(base_url, "/api/admin/feedback"))
    add(results, "admin feedback list is protected without auth", admin_list_guest["status"] in (401, 403), "GET /api/admin/feedback", admin_list_guest["status"])

    admin_list_user = request("GET", join(base_url, "/api/admin/feedback"), token=token)
    add(results, "admin feedback list blocks normal user", admin_list_user["status"] in (401, 403), "GET /api/admin/feedback normal user", admin_list_user["status"])

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
