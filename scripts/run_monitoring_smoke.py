import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request


DEFAULT_TIMEOUT = 30
FAKE_TOKEN = "mm_live_fake_token_never_log"


def join(base_url, path):
    return urllib.parse.urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))


def json_body(payload):
    return json.dumps(payload).encode("utf-8")


def request(method, url, *, data=None, headers=None, timeout=DEFAULT_TIMEOUT):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            text = res.read().decode("utf-8", errors="replace")
            return {"ok": True, "status": res.status, "text": text, "headers": dict(res.headers)}
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8", errors="replace")
        return {"ok": False, "status": exc.code, "text": text, "headers": dict(exc.headers)}
    except Exception as exc:
        return {"ok": False, "status": None, "text": str(exc), "headers": {}}


def parse_json(text):
    try:
        return json.loads(text)
    except Exception:
        return {}


def add_result(results, name, passed, detail="", status=None):
    results.append({"name": name, "status": "pass" if passed else "fail", "http_status": status, "detail": detail})


def has_request_id(response):
    return bool(response["headers"].get("X-Request-ID") or response["headers"].get("x-request-id"))


def run_smoke(base_url):
    results = []

    health = request("GET", join(base_url, "/api/health"))
    health_body = parse_json(health["text"])
    health_ok = (
        health["status"] == 200
        and health_body.get("status") in {"ok", "degraded"}
        and bool(health_body.get("request_id"))
        and has_request_id(health)
    )
    add_result(results, "health endpoint returns request ID", health_ok, "GET /api/health", health["status"])

    admin_errors = request("GET", join(base_url, "/api/admin/monitoring/errors"))
    admin_body = parse_json(admin_errors["text"])
    admin_protected = (
        admin_errors["status"] in {401, 403}
        and has_request_id(admin_errors)
        and isinstance(admin_body.get("error"), dict)
        and bool(admin_body["error"].get("request_id"))
        and bool(admin_body["error"].get("error_id"))
    )
    add_result(results, "admin monitoring errors endpoint is protected", admin_protected, "GET /api/admin/monitoring/errors", admin_errors["status"])

    frontend_payload = {
        "name": "SmokeFrontendError",
        "message": "Smoke frontend error",
        "route": "/smoke",
        "user_agent": "modelmate-monitoring-smoke",
        "stack": "component stack captured",
    }
    frontend = request(
        "POST",
        join(base_url, "/api/monitoring/frontend-error"),
        data=json_body(frontend_payload),
        headers={"Content-Type": "application/json"},
    )
    frontend_body = parse_json(frontend["text"])
    frontend_ok = frontend["status"] == 200 and bool(frontend_body.get("error_id")) and bool(frontend_body.get("request_id"))
    add_result(results, "frontend error report stores sanitized event", frontend_ok, "POST /api/monitoring/frontend-error", frontend["status"])

    invalid_prediction = request(
        "POST",
        join(base_url, "/api/predict/smoke-invalid"),
        data=json_body({"rows": [{"feature": 1}]}),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {FAKE_TOKEN}"},
    )
    prediction_body = parse_json(invalid_prediction["text"])
    prediction_safe = (
        invalid_prediction["status"] in {400, 401, 403, 404, 422}
        and has_request_id(invalid_prediction)
        and FAKE_TOKEN not in invalid_prediction["text"]
        and (not prediction_body.get("error") or prediction_body["error"].get("request_id"))
    )
    add_result(results, "invalid prediction API failure does not leak token", prediction_safe, "POST /api/predict/smoke-invalid", invalid_prediction["status"])

    admin_events = request("GET", join(base_url, "/api/admin/monitoring/events"))
    admin_events_protected = admin_events["status"] in {401, 403} and admin_events["status"] != 200 and has_request_id(admin_events)
    add_result(results, "admin monitoring events endpoint is protected", admin_events_protected, "GET /api/admin/monitoring/events", admin_events["status"])

    passed = sum(1 for row in results if row["status"] == "pass")
    return {
        "base_url": base_url,
        "summary": {"total": len(results), "passed": passed, "failed": len(results) - passed},
        "results": results,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True, help="Local or deployed ModelMate base URL.")
    args = parser.parse_args()
    payload = run_smoke(args.base_url)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["summary"]["failed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    main()
