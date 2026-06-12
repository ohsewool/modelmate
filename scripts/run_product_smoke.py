import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TIMEOUT = 45


def request(method, url, *, data=None, headers=None, timeout=DEFAULT_TIMEOUT):
    body = data
    if isinstance(data, str):
        body = data.encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers or {}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            content = res.read()
            text = content.decode("utf-8", errors="replace")
            return {"ok": True, "status": res.status, "text": text, "headers": dict(res.headers)}
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8", errors="replace")
        return {"ok": False, "status": exc.code, "text": text, "headers": dict(exc.headers)}
    except Exception as exc:
        return {"ok": False, "status": None, "text": str(exc), "headers": {}}


def join(base_url, path):
    return urllib.parse.urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))


def json_body(payload):
    return json.dumps(payload).encode("utf-8")


def multipart_file(field_name, filename, content, content_type="text/csv"):
    boundary = f"----modelmate-smoke-{int(time.time() * 1000)}"
    chunks = [
        f"--{boundary}\r\n",
        f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n',
        f"Content-Type: {content_type}\r\n\r\n",
    ]
    body = "".join(chunks).encode("utf-8") + content + f"\r\n--{boundary}--\r\n".encode("utf-8")
    return body, {"Content-Type": f"multipart/form-data; boundary={boundary}"}


def add_result(results, name, passed, detail="", status=None):
    results.append({"name": name, "status": "pass" if passed else "fail", "http_status": status, "detail": detail})


def contains_any(text, values):
    lowered = text.lower()
    return any(value.lower() in lowered for value in values)


def run_smoke(base_url, skip_training=False):
    results = []

    root = request("GET", join(base_url, "/"))
    add_result(results, "landing page loads", root["ok"] and root["status"] == 200 and "ModelMate" in root["text"], "GET /", root["status"])

    pricing = request("GET", join(base_url, "/pricing"))
    add_result(results, "pricing page route loads", pricing["ok"] and pricing["status"] == 200, "GET /pricing", pricing["status"])

    state = request("GET", join(base_url, "/api/state"))
    add_result(results, "state API exists", state["status"] == 200 and contains_any(state["text"], ["has_data", "analysis_status"]), "GET /api/state", state["status"])

    session = request("GET", join(base_url, "/api/session"))
    session_ok = session["status"] == 200 and contains_any(session["text"], ["guest_demo", "capabilities", "workspace_scope"])
    add_result(results, "auth-lite session context exists", session_ok, "GET /api/session", session["status"])

    guest = request(
        "POST",
        join(base_url, "/api/session/guest"),
        data=json_body({"source": "smoke_test"}),
        headers={"Content-Type": "application/json"},
    )
    guest_ok = guest["status"] == 200 and contains_any(guest["text"], ["guest_session_id", "guest_demo", "project_persistence"])
    add_result(results, "guest demo session can start", guest_ok, "POST /api/session/guest", guest["status"])

    tools = request("GET", join(base_url, "/api/agent/tools"))
    add_result(results, "agent tools endpoint exists", tools["status"] == 200 and contains_any(tools["text"], ["data_profile_tool", "automl_training_tool"]), "GET /api/agent/tools", tools["status"])

    deployed = request("GET", join(base_url, "/api/deployed"))
    add_result(results, "shared prediction model list exists", deployed["status"] == 200, "GET /api/deployed", deployed["status"])

    report_summary = request("GET", join(base_url, "/api/report/summary"))
    add_result(results, "report summary endpoint exists", report_summary["status"] in (200, 400), "GET /api/report/summary", report_summary["status"])

    html_report = request("GET", join(base_url, "/api/report/html"))
    html_endpoint_exists = html_report["status"] == 200 and contains_any(html_report["text"], ["html", "ModelMate", "report"])
    html_endpoint_exists = html_endpoint_exists or html_report["status"] == 400
    add_result(results, "report export endpoint exists", html_endpoint_exists, "GET /api/report/html", html_report["status"])

    invalid_body, invalid_headers = multipart_file("file", "bad.txt", b"just a memo,not predictive\nhello world,only text\n", "text/plain")
    invalid = request("POST", join(base_url, "/api/upload"), data=invalid_body, headers=invalid_headers)
    friendly = invalid["status"] in (400, 422) and contains_any(invalid["text"], ["csv", "tsv", "file", "upload", "dataset"])
    add_result(results, "invalid CSV returns friendly failure", friendly, "POST /api/upload invalid file", invalid["status"])

    sample = (ROOT / "sample_data" / "customer_churn_demo.csv").read_bytes()
    upload_body, upload_headers = multipart_file("file", "customer_churn_demo.csv", sample)
    upload = request("POST", join(base_url, "/api/upload"), data=upload_body, headers=upload_headers)
    upload_ok = upload["status"] == 200 and contains_any(upload["text"], ["customer_churn", "churn", "columns"])
    add_result(results, "sample CSV upload works", upload_ok, "POST /api/upload sample", upload["status"])

    target = request(
        "POST",
        join(base_url, "/api/set-target"),
        data=json_body({"target_col": "churn", "drop_cols": ["customer_id"]}),
        headers={"Content-Type": "application/json"},
    )
    target_ok = target["status"] == 200 and contains_any(target["text"], ["churn", "task_type", "analysis_status"])
    add_result(results, "target recommendation/selection path works", target_ok, "POST /api/set-target", target["status"])

    if skip_training:
        add_result(results, "AutoML training smoke path", True, "skipped by --skip-training")
    else:
        cv = request("POST", join(base_url, "/api/run-cv"), headers={"Content-Type": "application/json"}, timeout=120)
        cv_ok = cv["status"] == 200 and contains_any(cv["text"], ["results", "best_model", "analysis_status"])
        add_result(results, "AutoML training endpoint works", cv_ok, "POST /api/run-cv", cv["status"])

        report_after = request("GET", join(base_url, "/api/report/summary"))
        report_ok = report_after["status"] == 200 and contains_any(report_after["text"], ["analysis_trace", "trust", "evidence", "best_model"])
        add_result(results, "agent timeline/trust/evidence data loads", report_ok, "GET /api/report/summary after training", report_after["status"])

    docs_ok = all((ROOT / path).exists() for path in [
        "docs/privacy.md",
        "docs/terms.md",
        "docs/pricing.md",
        "docs/prediction-api.md",
        "docs/auth-lite-session.md",
        "sample_data/metadata.json",
    ])
    add_result(results, "privacy/terms/pricing/prediction docs exist", docs_ok, "local docs check")

    passed = sum(1 for row in results if row["status"] == "pass")
    payload = {"base_url": base_url, "summary": {"total": len(results), "passed": passed, "failed": len(results) - passed}, "results": results}
    return payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True, help="Local or deployed ModelMate base URL.")
    parser.add_argument("--skip-training", action="store_true", help="Skip POST /api/run-cv for faster deployed smoke checks.")
    args = parser.parse_args()
    payload = run_smoke(args.base_url, skip_training=args.skip_training)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["summary"]["failed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    main()
