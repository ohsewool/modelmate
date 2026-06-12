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


def request(method, url, *, payload=None, token=None, prediction_token=None):
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"} if payload is not None else {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if prediction_token:
        headers["Authorization"] = f"Bearer {prediction_token}"
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


def register_user(base_url, email):
    password = "ModelMate-token-smoke-12345"
    res = request("POST", join(base_url, "/api/auth/register"), payload={"email": email, "password": password, "name": "Token Smoke"})
    token = (res["json"] or {}).get("token")
    if token:
        return token
    login = request("POST", join(base_url, "/api/auth/login"), payload={"email": email, "password": password})
    return (login["json"] or {}).get("token")


def run(base_url):
    stamp = int(time.time() * 1000)
    results = []
    token_a = register_user(base_url, f"token-a-{stamp}@example.com")
    token_b = register_user(base_url, f"token-b-{stamp}@example.com")
    add(results, "two users can authenticate", bool(token_a and token_b), "auth register/login")
    if not token_a or not token_b:
        return results

    created = request("POST", join(base_url, "/api/projects"), payload={"name": f"Token smoke {stamp}", "description": "prediction token smoke"}, token=token_a)
    project_id = (created["json"] or {}).get("id")
    add(results, "owner can create a project", created["status"] == 200 and bool(project_id), "POST /api/projects", created["status"])
    if not project_id:
        return results

    listed = request("GET", join(base_url, f"/api/projects/{project_id}/prediction-tokens"), token=token_a)
    add(results, "owner can list project token metadata", listed["status"] == 200 and "plaintext_token" not in listed["text"], "GET token list", listed["status"])

    non_owner = request("GET", join(base_url, f"/api/projects/{project_id}/prediction-tokens"), token=token_b)
    add(results, "non-owner cannot list project tokens", non_owner["status"] in (403, 404), "GET token list as user B", non_owner["status"])

    no_auth = request("GET", join(base_url, f"/api/projects/{project_id}/prediction-tokens"))
    add(results, "unauthenticated token list is blocked", no_auth["status"] in (401, 403, 404), "GET token list without auth", no_auth["status"])

    invalid_predict = request("POST", join(base_url, f"/api/predict/{project_id}"), payload={"rows": [{"feature_a": 1}]}, prediction_token="mm_live_invalid")
    add(results, "invalid project token is rejected", invalid_predict["status"] == 401, "POST /api/predict invalid token", invalid_predict["status"])

    create = request("POST", join(base_url, f"/api/projects/{project_id}/prediction-tokens"), payload={"label": "smoke"}, token=token_a)
    if create["status"] == 409:
        add(results, "token creation reports model-not-ready cleanly", True, create["text"], create["status"], skipped=True)
        return results
    add(results, "owner can create token when model is ready", create["status"] == 200 and bool((create["json"] or {}).get("plaintext_token")), "POST token create", create["status"])
    plain = (create["json"] or {}).get("plaintext_token")
    token_id = ((create["json"] or {}).get("token") or {}).get("token_id")

    relisted = request("GET", join(base_url, f"/api/projects/{project_id}/prediction-tokens"), token=token_a)
    add(results, "token list never reveals plaintext token", relisted["status"] == 200 and plain not in relisted["text"], "GET token list after create", relisted["status"])

    if token_id:
        revoked = request("POST", join(base_url, f"/api/projects/{project_id}/prediction-tokens/{token_id}/revoke"), token=token_a)
        add(results, "owner can revoke token", revoked["status"] == 200 and "revoked" in revoked["text"], "POST token revoke", revoked["status"])
        revoked_predict = request("POST", join(base_url, f"/api/predict/{project_id}"), payload={"rows": [{"feature_a": 1}]}, prediction_token=plain)
        add(results, "revoked token is rejected", revoked_predict["status"] == 401, "POST predict with revoked token", revoked_predict["status"])
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
