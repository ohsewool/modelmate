import argparse
import json
import time
import urllib.error
import urllib.parse
import urllib.request


DEFAULT_TIMEOUT = 45


def join(base_url, path):
    return urllib.parse.urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))


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


def parse_json(text):
    try:
        return json.loads(text)
    except Exception:
        return None


def add(results, name, passed, detail="", status=None):
    results.append({"name": name, "status": "pass" if passed else "fail", "detail": detail, "http_status": status})


def run(base_url):
    stamp = int(time.time() * 1000)
    email = f"auth-smoke-{stamp}@example.com"
    password = "ModelMate-smoke-12345"
    results = []

    register = request("POST", join(base_url, "/api/auth/register"), payload={"email": email, "password": password, "name": "Auth Smoke"})
    token = (register["json"] or {}).get("token")
    add(results, "register success", register["status"] == 200 and bool(token), "POST /api/auth/register", register["status"])

    duplicate = request("POST", join(base_url, "/api/auth/register"), payload={"email": email, "password": password, "name": "Auth Smoke"})
    add(results, "duplicate email handling", duplicate["status"] in (400, 409), "POST duplicate /api/auth/register", duplicate["status"])

    login = request("POST", join(base_url, "/api/auth/login"), payload={"email": email, "password": password})
    login_token = (login["json"] or {}).get("token")
    add(results, "login success", login["status"] == 200 and bool(login_token), "POST /api/auth/login", login["status"])

    invalid = request("POST", join(base_url, "/api/auth/login"), payload={"email": email, "password": "wrong-password"})
    add(results, "invalid password failure", invalid["status"] in (400, 401), "POST invalid /api/auth/login", invalid["status"])

    me = request("GET", join(base_url, "/api/auth/me"), token=login_token)
    me_json = me["json"] or {}
    add(results, "me endpoint success after login", me["status"] == 200 and me_json.get("email") == email, "GET /api/auth/me", me["status"])
    leaked_keys = {"password", "password_hash"} & set(me_json.keys())
    add(results, "auth response does not expose password fields", me["status"] == 200 and not leaked_keys, f"leaked keys: {sorted(leaked_keys)}", me["status"])

    logout = request("POST", join(base_url, "/api/auth/logout"), token=login_token)
    add(results, "logout success", logout["status"] == 200 and (logout["json"] or {}).get("ok") is True, "POST /api/auth/logout", logout["status"])

    me_after = request("GET", join(base_url, "/api/auth/me"), token=login_token)
    add(results, "me endpoint after logout is unauthenticated", me_after["status"] in (401, 403), "GET /api/auth/me after logout", me_after["status"])

    session = request("GET", join(base_url, "/api/session"))
    add(results, "guest session context still accessible", session["status"] == 200 and "guest_demo" in session["text"], "GET /api/session", session["status"])

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
