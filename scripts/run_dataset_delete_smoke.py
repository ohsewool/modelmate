import argparse
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TIMEOUT = 60


def join(base_url, path):
    return urllib.parse.urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))


def parse_json(text):
    try:
        return json.loads(text)
    except Exception:
        return None


def request(method, url, *, payload=None, token=None, data=None, headers=None, timeout=DEFAULT_TIMEOUT):
    body = data
    final_headers = dict(headers or {})
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        final_headers["Content-Type"] = "application/json"
    if token:
        final_headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=final_headers, method=method)
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
    boundary = f"----modelmate-dataset-delete-{int(time.time() * 1000)}"
    head = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode("utf-8")
    tail = f"\r\n--{boundary}--\r\n".encode("utf-8")
    return head + content + tail, {"Content-Type": f"multipart/form-data; boundary={boundary}"}


def add(results, name, passed, detail="", status=None):
    results.append({"name": name, "status": "pass" if passed else "fail", "detail": detail, "http_status": status})


def register(base_url, label):
    stamp = int(time.time() * 1000)
    email = f"dataset-delete-{label}-{stamp}@example.com"
    password = "ModelMate-dataset-delete-12345"
    res = request(
        "POST",
        join(base_url, "/api/auth/register"),
        payload={"email": email, "password": password, "name": f"Dataset Delete {label}"},
    )
    return email, (res["json"] or {}).get("token"), res


def first_dataset_id(items):
    if not isinstance(items, list) or not items:
        return None
    return items[0].get("dataset_id") or items[0].get("id")


def run(base_url):
    results = []
    email_a, token_a, reg_a = register(base_url, "a")
    add(results, "user A register/login", reg_a["status"] == 200 and bool(token_a), email_a, reg_a["status"])
    email_b, token_b, reg_b = register(base_url, "b")
    add(results, "user B register/login", reg_b["status"] == 200 and bool(token_b), email_b, reg_b["status"])

    unauth_list = request("GET", join(base_url, "/api/datasets"))
    add(results, "unauthenticated private dataset list is blocked", unauth_list["status"] in (401, 403), "GET /api/datasets", unauth_list["status"])

    sample_path = ROOT / "sample_data" / "customer_churn_demo.csv"
    if not sample_path.exists():
        add(results, "sample dataset file exists", False, str(sample_path))
        return finish(base_url, results)

    upload_body, upload_headers = multipart_file("file", "customer_churn_demo.csv", sample_path.read_bytes())
    upload = request("POST", join(base_url, "/api/upload"), data=upload_body, headers=upload_headers, token=token_a, timeout=120)
    add(results, "user A can upload CSV and create dataset metadata", upload["status"] == 200, "POST /api/upload as A", upload["status"])

    datasets_a = request("GET", join(base_url, "/api/datasets"), token=token_a)
    datasets_a_json = datasets_a["json"] if isinstance(datasets_a["json"], list) else []
    dataset_id = first_dataset_id(datasets_a_json)
    project_id = (datasets_a_json[0].get("project_id") if datasets_a_json else None)
    add(results, "user A can list own dataset", datasets_a["status"] == 200 and bool(dataset_id), "GET /api/datasets as A", datasets_a["status"])

    datasets_b = request("GET", join(base_url, "/api/datasets"), token=token_b)
    datasets_b_json = datasets_b["json"] if isinstance(datasets_b["json"], list) else []
    add(results, "user B cannot list user A dataset", all((row.get("dataset_id") or row.get("id")) != dataset_id for row in datasets_b_json), "GET /api/datasets as B", datasets_b["status"])

    if dataset_id:
        detail_a = request("GET", join(base_url, f"/api/datasets/{dataset_id}"), token=token_a)
        add(results, "user A can read own dataset detail", detail_a["status"] == 200 and (detail_a["json"] or {}).get("dataset_id") == dataset_id, "GET /api/datasets/{id} as A", detail_a["status"])

        detail_b = request("GET", join(base_url, f"/api/datasets/{dataset_id}"), token=token_b)
        add(results, "user B cannot read user A dataset detail", detail_b["status"] in (403, 404), "GET /api/datasets/{id} as B", detail_b["status"])

        impact = request("GET", join(base_url, f"/api/datasets/{dataset_id}/delete-impact"), token=token_a)
        impact_json = impact["json"] or {}
        add(results, "user A can preview dataset delete impact", impact["status"] == 200 and impact_json.get("will_disable_rerun") is True, "GET /api/datasets/{id}/delete-impact", impact["status"])

        delete_b = request("DELETE", join(base_url, f"/api/datasets/{dataset_id}"), token=token_b)
        add(results, "user B cannot delete user A dataset", delete_b["status"] in (403, 404), "DELETE /api/datasets/{id} as B", delete_b["status"])

        delete_unauth = request("DELETE", join(base_url, f"/api/datasets/{dataset_id}"))
        add(results, "unauthenticated dataset delete is blocked", delete_unauth["status"] in (401, 403), "DELETE /api/datasets/{id} unauth", delete_unauth["status"])

        delete_a = request("DELETE", join(base_url, f"/api/datasets/{dataset_id}"), token=token_a)
        add(results, "user A can delete own dataset", delete_a["status"] == 200 and (delete_a["json"] or {}).get("delete_status") == "deleted", "DELETE /api/datasets/{id} as A", delete_a["status"])

        after_list = request("GET", join(base_url, "/api/datasets"), token=token_a)
        after_json = after_list["json"] if isinstance(after_list["json"], list) else []
        add(results, "deleted dataset is hidden from active dataset list", all((row.get("dataset_id") or row.get("id")) != dataset_id for row in after_json), "GET /api/datasets after delete", after_list["status"])

        job = request("POST", join(base_url, "/api/training/jobs"), payload={"project_id": project_id, "dataset_id": dataset_id}, token=token_a)
        job_text = json.dumps(job["json"], ensure_ascii=False) if job["json"] is not None else job["text"]
        blocked = job["status"] in (400, 409) and "dataset_deleted" in job_text
        add(results, "training/rerun on deleted dataset is blocked", blocked, "POST /api/training/jobs with deleted dataset", job["status"])

    guest = request("GET", join(base_url, "/api/session"))
    add(results, "guest demo session remains accessible", guest["status"] == 200 and "guest_demo" in guest["text"], "GET /api/session", guest["status"])

    return finish(base_url, results)


def finish(base_url, results):
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
    if hasattr(__import__("sys").stdout, "reconfigure"):
        __import__("sys").stdout.reconfigure(encoding="utf-8", errors="replace")
        __import__("sys").stderr.reconfigure(encoding="utf-8", errors="replace")
    main()
