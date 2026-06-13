import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request


def api_url(base_url, path):
    base = base_url.rstrip("/")
    if not base.endswith("/api"):
        base = base + "/api"
    return base + path


def request_json(method, url, payload=None, token=None, expected=None):
    data = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            body = res.read().decode("utf-8", errors="replace")
            parsed = json.loads(body) if body else {}
            status = res.getcode()
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        parsed = json.loads(body) if body else {}
        status = exc.code
    if expected and status not in expected:
        raise AssertionError(f"{method} {url} returned {status}, expected {expected}: {parsed}")
    return status, parsed


def assert_no_sensitive_echo(payload):
    dumped = json.dumps(payload, ensure_ascii=False).lower()
    blocked = ["sk-live", "secret-token", "4111111111111111", "raw_csv_should_not_store"]
    leaked = [item for item in blocked if item in dumped]
    if leaked:
        raise AssertionError(f"sensitive value echoed or stored in response: {leaked}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--admin-email", default=os.getenv("ADMIN_EMAIL", "admin@modelmate.local"))
    parser.add_argument("--admin-password", default=os.getenv("ADMIN_PASSWORD", "admin1234"))
    args = parser.parse_args()

    results = []

    status, body = request_json("GET", api_url(args.base_url, "/admin/pilot-inquiries"), expected={401, 403})
    results.append({"name": "admin_list_protected", "status": "pass", "http_status": status})

    invalid = {
        "name": "파일럿 테스트",
        "email": "not-an-email",
        "desired_plan": "pro_pilot",
        "use_case": "CSV 예측 분석 파일럿",
        "message": "한도 조정 가능 여부를 확인하고 싶습니다.",
    }
    status, body = request_json("POST", api_url(args.base_url, "/pilot-inquiries"), invalid, expected={400})
    results.append({"name": "invalid_email_rejected", "status": "pass", "http_status": status})

    stamp = int(time.time())
    valid = {
        "name": "파일럿 사용자",
        "email": f"pilot-smoke-{stamp}@example.com",
        "organization": "Smoke Test",
        "role": "운영",
        "desired_plan": "pro_pilot",
        "use_case": "CSV 업로드 후 보고서와 예측 API를 파일럿으로 검증",
        "expected_dataset_size": "월 3개 CSV, 1만 행 이하",
        "message": "파일럿 기간에 Pro Pilot 한도와 수동 플랜 변경 절차를 확인하고 싶습니다.",
        "current_plan": "free",
        "usage_snapshot": {
            "plan": "free",
            "usage": {"projects": 3},
            "limits": {"max_projects": 3},
            "token": "secret-token",
            "payment": "4111111111111111",
            "raw_csv": "raw_csv_should_not_store",
        },
        "source_route": "/pricing",
    }
    status, body = request_json("POST", api_url(args.base_url, "/pilot-inquiries"), valid, expected={200})
    assert body.get("inquiry_id"), body
    assert_no_sensitive_echo(body)
    results.append({"name": "valid_inquiry_created", "status": "pass", "http_status": status, "inquiry_id": body.get("inquiry_id")})

    admin_token = None
    login_payload = {"email": args.admin_email, "password": args.admin_password}
    status, login = request_json("POST", api_url(args.base_url, "/auth/login"), login_payload, expected={200, 400, 401})
    if status == 200 and login.get("token"):
        admin_token = login["token"]
        status, listing = request_json("GET", api_url(args.base_url, "/admin/pilot-inquiries?limit=10"), token=admin_token, expected={200})
        assert_no_sensitive_echo(listing)
        items = listing.get("items", [])
        created = next((item for item in items if item.get("inquiry_id") == body.get("inquiry_id")), None)
        if not created:
            raise AssertionError("created inquiry was not visible in admin inquiry list")
        snapshot = created.get("usage_snapshot", {})
        forbidden = {"token", "payment", "raw_csv"}
        if forbidden.intersection(snapshot.keys()):
            raise AssertionError(f"unsafe usage snapshot keys stored: {forbidden.intersection(snapshot.keys())}")
        status, updated = request_json(
            "POST",
            api_url(args.base_url, f"/admin/pilot-inquiries/{body['inquiry_id']}/status"),
            {"status": "contacted"},
            token=admin_token,
            expected={200},
        )
        results.append({"name": "admin_review_and_status_update", "status": "pass", "http_status": status})
    else:
        results.append({"name": "admin_review_and_status_update", "status": "skipped", "reason": "admin login unavailable"})

    payload = {"summary": {"total": len(results), "passed": sum(1 for row in results if row["status"] == "pass"), "skipped": sum(1 for row in results if row["status"] == "skipped")}, "results": results}
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    main()
