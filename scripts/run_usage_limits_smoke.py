import argparse
import json
import os
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


def add(results, name, passed, detail="", status=None, skipped=False):
    results.append({
        "name": name,
        "status": "skipped" if skipped else ("pass" if passed else "fail"),
        "detail": detail,
        "http_status": status,
    })


def run(base_url):
    stamp = int(time.time() * 1000)
    email = f"usage-smoke-{stamp}@example.com"
    password = "ModelMate-usage-smoke-12345"
    results = []

    register = request("POST", join(base_url, "/api/auth/register"), payload={"email": email, "password": password, "name": "Usage Smoke"})
    token = (register["json"] or {}).get("token")
    add(results, "new user can register", register["status"] == 200 and bool(token), "POST /api/auth/register", register["status"])
    if not token:
        return results

    usage = request("GET", join(base_url, "/api/me/usage"), token=token)
    usage_json = usage["json"] or {}
    add(
        results,
        "usage summary returns Korean free plan metadata",
        usage["status"] == 200
        and usage_json.get("plan") == "free"
        and usage_json.get("plan_label") == "무료"
        and usage_json.get("limit_label") == "무료 플랜 한도 적용",
        "GET /api/me/usage",
        usage["status"],
    )
    limits = usage_json.get("limits") or {}
    add(results, "usage summary includes project and token limits", "max_projects" in limits and "max_prediction_tokens_per_project" in limits, "limits keys", usage["status"])

    max_projects = int(limits.get("max_projects", 3))
    created = 0
    for idx in range(max_projects):
        res = request("POST", join(base_url, "/api/projects"), payload={"name": f"Usage limit smoke {idx}", "description": "usage smoke"}, token=token)
        if res["status"] == 200:
            created += 1
    add(results, "free user can create projects up to limit", created == max_projects, f"created={created}, limit={max_projects}")

    blocked = request("POST", join(base_url, "/api/projects"), payload={"name": "Over limit", "description": "usage smoke"}, token=token)
    detail = blocked["json"].get("detail") if isinstance(blocked["json"], dict) else {}
    add(
        results,
        "project limit blocks extra project with structured error",
        blocked["status"] == 429 and isinstance(detail, dict) and detail.get("code") == "usage_limit_exceeded",
        blocked["text"],
        blocked["status"],
    )

    after = request("GET", join(base_url, "/api/me/usage"), token=token)
    after_json = after["json"] or {}
    add(results, "usage summary updates project count", (after_json.get("usage") or {}).get("projects", 0) >= max_projects, "GET /api/me/usage after projects", after["status"])

    configured_admins = os.getenv("ADMIN_EMAILS", "").split(",")
    admin_email = os.getenv("MODELMATE_ADMIN_EMAIL") or next((item.strip() for item in configured_admins if item.strip()), "admin@modelmate.local")
    admin_password = os.getenv("MODELMATE_ADMIN_PASSWORD", os.getenv("ADMIN_PASSWORD", "admin1234"))
    admin_login = request("POST", join(base_url, "/api/auth/login"), payload={"email": admin_email, "password": admin_password})
    admin_token = (admin_login["json"] or {}).get("token")
    add(results, "admin can login", admin_login["status"] == 200 and bool(admin_token), admin_email, admin_login["status"])
    if admin_token:
        admin_usage = request("GET", join(base_url, "/api/me/usage"), token=admin_token)
        admin_json = admin_usage["json"] or {}
        admin_limits = admin_json.get("limits") or {}
        admin_unlimited = all(admin_limits.get(key) is None for key in (
            "max_projects",
            "max_datasets",
            "max_jobs_per_day",
            "max_prediction_api_calls_per_day",
        ))
        add(
            results,
            "admin usage summary shows unlimited admin role",
            admin_usage["status"] == 200
            and admin_json.get("role") == "admin"
            and admin_json.get("plan") == "admin"
            and admin_json.get("plan_label") == "관리자"
            and admin_json.get("limit_label") == "제한 없음"
            and "admin_emails" not in admin_json
            and admin_unlimited,
            json.dumps({
                "email": admin_email,
                "role": admin_json.get("role"),
                "plan": admin_json.get("plan"),
                "plan_label": admin_json.get("plan_label"),
                "limit_label": admin_json.get("limit_label"),
                "limits": admin_limits,
            }, ensure_ascii=False),
            admin_usage["status"],
        )

    sample = request("GET", join(base_url, "/api/samples/customer_churn_demo.csv/download"))
    first_line = (sample["text"] or "").splitlines()[0] if sample["text"] else ""
    add(
        results,
        "sample CSV download remains public and quota-free",
        sample["status"] == 200 and not first_line.lower().startswith("<!doctype html") and "churn" in first_line,
        first_line,
        sample["status"],
    )
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True)
    args = parser.parse_args()
    results = run(args.base_url)
    failed = sum(1 for row in results if row["status"] == "fail")
    payload = {
        "base_url": args.base_url,
        "summary": {
            "total": len(results),
            "passed": sum(1 for row in results if row["status"] == "pass"),
            "skipped": sum(1 for row in results if row["status"] == "skipped"),
            "failed": failed,
        },
        "results": results,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
