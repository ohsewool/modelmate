import argparse
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TIMEOUT = 90


def join(base_url, path):
    return urllib.parse.urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))


def parse_json(text):
    try:
        return json.loads(text)
    except Exception:
        return None


def request(method, url, *, payload=None, body=None, headers=None, token=None, timeout=DEFAULT_TIMEOUT):
    data = body
    merged_headers = dict(headers or {})
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        merged_headers["Content-Type"] = "application/json"
    if token:
        merged_headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=merged_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            text = res.read().decode("utf-8", errors="replace")
            return {"status": res.status, "ok": True, "text": text, "json": parse_json(text)}
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8", errors="replace")
        return {"status": exc.code, "ok": False, "text": text, "json": parse_json(text)}
    except Exception as exc:
        return {"status": None, "ok": False, "text": str(exc), "json": None}


def multipart_file(field_name, filename, content, content_type="text/csv"):
    boundary = f"----modelmate-workspace-{int(time.time() * 1000)}"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode("utf-8")
    body += content + f"\r\n--{boundary}--\r\n".encode("utf-8")
    return body, {"Content-Type": f"multipart/form-data; boundary={boundary}"}


def add(results, name, passed, detail="", status=None):
    results.append({"name": name, "status": "pass" if passed else "fail", "detail": detail, "http_status": status})


def contains_any(text, values):
    lowered = text.lower()
    return any(value.lower() in lowered for value in values)


def run(base_url):
    results = []
    stamp = int(time.time() * 1000)
    email = f"workspace-integration-{stamp}@example.com"
    password = "ModelMate-workspace-12345"

    register = request(
        "POST",
        join(base_url, "/api/auth/register"),
        payload={"email": email, "password": password, "name": "Workspace Integration Smoke"},
    )
    token = (register["json"] or {}).get("token")
    add(results, "로그인 사용자 생성", register["status"] == 200 and bool(token), "POST /api/auth/register", register["status"])

    sample = (ROOT / "sample_data" / "customer_churn_demo.csv").read_bytes()
    upload_body, upload_headers = multipart_file("file", "customer_churn_demo.csv", sample)
    upload = request("POST", join(base_url, "/api/upload"), body=upload_body, headers=upload_headers, token=token)
    upload_json = upload["json"] or {}
    dataset_meta = upload_json.get("saved_dataset") or upload_json.get("dataset") or upload_json.get("dataset_meta") or {}
    dataset_id = dataset_meta.get("id") or dataset_meta.get("dataset_id")
    project_id = dataset_meta.get("project_id")
    add(results, "인증된 CSV 업로드가 dataset/project 메타데이터를 생성", upload["status"] == 200 and bool(project_id), "POST /api/upload", upload["status"])

    target = request(
        "POST",
        join(base_url, "/api/set-target"),
        payload={"target_col": "churn", "drop_cols": ["customer_id"]},
        token=token,
    )
    add(results, "타깃 설정 완료", target["status"] == 200 and contains_any(target["text"], ["churn", "task_type"]), "POST /api/set-target", target["status"])

    cv = request("POST", join(base_url, "/api/run-cv"), payload={}, token=token, timeout=180)
    cv_json = cv["json"] or {}
    add(results, "AutoML 분석 완료", cv["status"] == 200 and bool(cv_json.get("best_model")), "POST /api/run-cv", cv["status"])

    projects = request("GET", join(base_url, "/api/projects"), token=token)
    project_rows = projects["json"] if isinstance(projects["json"], list) else []
    project = next((row for row in project_rows if row.get("id") == project_id), project_rows[0] if project_rows else None)
    project_id = (project or {}).get("id") or project_id
    add(results, "Projects 목록에 분석 프로젝트 표시", projects["status"] == 200 and bool(project_id), "GET /api/projects", projects["status"])
    add(results, "Dashboard용 프로젝트 요약에 최근 실행 정보 표시", bool(project and (project.get("last_run_id") or project.get("run_count", 0) > 0)), "project summary", projects["status"])

    detail = request("GET", join(base_url, f"/api/projects/{project_id}"), token=token)
    detail_json = detail["json"] or {}
    runs = detail_json.get("analysis_runs") or []
    add(results, "Project Detail에서 실행 기록 조회", detail["status"] == 200 and bool(runs), "GET /api/projects/{id}", detail["status"])

    jobs = request("GET", join(base_url, f"/api/projects/{project_id}/jobs"), token=token)
    job_rows = jobs["json"] if isinstance(jobs["json"], list) else []
    add(results, "Jobs 페이지용 완료 작업 기록 조회", jobs["status"] == 200 and any(row.get("status") == "succeeded" for row in job_rows), "GET /api/projects/{id}/jobs", jobs["status"])

    reports = request("GET", join(base_url, f"/api/projects/{project_id}/reports"), token=token)
    report_rows = reports["json"] if isinstance(reports["json"], list) else []
    add(results, "Reports 페이지용 리포트 메타데이터 조회", reports["status"] == 200 and bool(report_rows), "GET /api/projects/{id}/reports", reports["status"])

    datasets = request("GET", join(base_url, "/api/datasets"), token=token)
    dataset_rows = datasets["json"] if isinstance(datasets["json"], list) else []
    add(results, "Datasets 목록에 업로드 데이터셋 표시", datasets["status"] == 200 and any(row.get("id") == dataset_id for row in dataset_rows), "GET /api/datasets", datasets["status"])

    prediction = request("GET", join(base_url, f"/api/projects/{project_id}/prediction-tokens"), token=token)
    prediction_json = prediction["json"] or {}
    availability = prediction_json.get("availability") if isinstance(prediction_json, dict) else None
    token_rows = prediction_json.get("tokens") if isinstance(prediction_json, dict) else []
    no_full_token = all("token_secret" not in row and "plain_token" not in row for row in token_rows or [])
    add(results, "Prediction API 준비 상태 조회", prediction["status"] == 200 and isinstance(availability, dict), "GET /api/projects/{id}/prediction-tokens", prediction["status"])
    add(results, "Prediction API 목록이 전체 token을 노출하지 않음", prediction["status"] == 200 and no_full_token, "token safety check", prediction["status"])

    guest = request("GET", join(base_url, "/api/session"))
    add(results, "guest demo session은 계속 접근 가능", guest["status"] == 200 and "guest_demo" in guest["text"], "GET /api/session", guest["status"])

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
