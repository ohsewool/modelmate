import argparse
import csv
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from io import StringIO
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SAMPLE_DIRS = [
    ROOT / "frontend" / "public" / "samples",
    ROOT / "frontend" / "dist" / "samples",
]
SAMPLES = {
    "customer_churn_demo.csv": "churn",
    "sales_demand_demo.csv": "demand",
    "equipment_failure_demo.csv": "failure_risk",
    "marketing_conversion_demo.csv": "converted",
    "student_performance_demo.csv": "passed",
}


def is_html(text):
    lowered = text.lstrip().lower()
    return lowered.startswith("<!doctype html") or lowered.startswith("<html") or "<head" in lowered[:500]


def validate_csv_text(name, target, text, content_type=None, source="local"):
    lines = text.splitlines()
    first_line = lines[0] if lines else ""
    result = {
        "name": f"{source}:{name}",
        "status": "pass",
        "source": source,
        "file": name,
        "target": target,
        "content_type": content_type,
        "first_line": first_line,
        "rows": 0,
        "columns": [],
    }
    if is_html(text):
        result["status"] = "fail"
        result["reason"] = "content starts with HTML"
        return result
    if "," not in first_line:
        result["status"] = "fail"
        result["reason"] = "first line does not look like a comma-delimited CSV header"
        return result
    try:
        reader = csv.DictReader(StringIO(text))
        rows = list(reader)
        columns = reader.fieldnames or []
    except Exception as exc:
        result["status"] = "fail"
        result["reason"] = f"csv parse failed: {exc}"
        return result
    result["rows"] = len(rows)
    result["columns"] = columns
    if target not in columns:
        result["status"] = "fail"
        result["reason"] = f"target column missing: {target}"
        return result
    if len(rows) < 12:
        result["status"] = "fail"
        result["reason"] = "not enough demo rows"
        return result
    return result


def read_local_sample(path):
    return path.read_text(encoding="utf-8-sig")


def fetch_url(url, timeout=30):
    req = urllib.request.Request(url, headers={"Accept": "text/csv,*/*"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            body = res.read()
            return {
                "ok": True,
                "status_code": res.status,
                "content_type": res.headers.get("Content-Type", ""),
                "text": body.decode("utf-8-sig", errors="replace"),
            }
    except urllib.error.HTTPError as exc:
        body = exc.read()
        return {
            "ok": False,
            "status_code": exc.code,
            "content_type": exc.headers.get("Content-Type", ""),
            "text": body.decode("utf-8-sig", errors="replace"),
        }
    except Exception as exc:
        return {"ok": False, "status_code": None, "content_type": "", "text": str(exc)}


def join_url(base_url, path):
    return urllib.parse.urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", help="Optional deployed/local URL to verify sample download routes.")
    args = parser.parse_args()

    results = []
    for sample_dir in SAMPLE_DIRS:
        for name, target in SAMPLES.items():
            path = sample_dir / name
            if not path.exists():
                results.append({
                    "name": f"local:{sample_dir.name}:{name}",
                    "status": "fail",
                    "source": str(sample_dir),
                    "file": name,
                    "target": target,
                    "reason": "missing sample file",
                })
                continue
            results.append(validate_csv_text(name, target, read_local_sample(path), source=str(sample_dir.relative_to(ROOT))))

    if args.base_url:
        for name, target in SAMPLES.items():
            for route in [f"/api/samples/{name}/download", f"/samples/{name}"]:
                response = fetch_url(join_url(args.base_url, route))
                if not response["ok"] or response["status_code"] != 200:
                    results.append({
                        "name": f"remote:{route}",
                        "status": "fail",
                        "source": args.base_url,
                        "file": name,
                        "target": target,
                        "http_status": response["status_code"],
                        "content_type": response["content_type"],
                        "first_line": response["text"].splitlines()[0] if response["text"].splitlines() else "",
                        "reason": "download route did not return HTTP 200",
                    })
                    continue
                item = validate_csv_text(
                    name,
                    target,
                    response["text"],
                    content_type=response["content_type"],
                    source=f"remote:{route}",
                )
                item["http_status"] = response["status_code"]
                results.append(item)
    else:
        results.append({
            "name": "remote sample download routes",
            "status": "not_verified",
            "reason": "--base-url not provided",
        })

    failed = sum(1 for row in results if row["status"] == "fail")
    not_verified = sum(1 for row in results if row["status"] == "not_verified")
    payload = {
        "summary": {
            "total": len(results),
            "passed": sum(1 for row in results if row["status"] == "pass"),
            "failed": failed,
            "not_verified": not_verified,
        },
        "results": results,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    main()
