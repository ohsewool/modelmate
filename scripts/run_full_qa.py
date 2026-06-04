import argparse
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import backend.main as m  # noqa: E402


def run_cmd(name, args, timeout=300):
    try:
        proc = subprocess.run(args, cwd=ROOT, text=True, capture_output=True, timeout=timeout)
        return {
            "name": name,
            "status": "pass" if proc.returncode == 0 else "fail",
            "returncode": proc.returncode,
            "stdout_tail": proc.stdout[-1600:],
            "stderr_tail": proc.stderr[-1600:],
        }
    except subprocess.TimeoutExpired as e:
        return {
            "name": name,
            "status": "timeout",
            "returncode": None,
            "stdout_tail": (e.stdout or "")[-1600:] if isinstance(e.stdout, str) else "",
            "stderr_tail": f"Timed out after {timeout} seconds.",
        }


def invalid_upload_cases():
    long = "이 파일은 예측용 표 데이터가 아니라 발표 준비 대화와 긴 설명 문장으로 이루어진 내용입니다."
    return [
        ("empty", pd.DataFrame(), "empty.csv"),
        ("one_column", pd.DataFrame({"memo": list("abcdef")}), "one.csv"),
        ("constant", pd.DataFrame({"a": [1] * 8, "b": [1] * 8}), "constant.csv"),
        ("long_text", pd.DataFrame({"text": [long] * 6, "reply": ["네"] * 6}), "chat.csv"),
        ("duplicate_columns", pd.DataFrame([[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]], columns=["x", "x"]), "dup.csv"),
        ("unnamed_columns", pd.DataFrame([[1, 0], [2, 1], [3, 0], [4, 1], [5, 0]], columns=["Unnamed: 0", ""]), "unnamed.csv"),
        ("dates_only", pd.DataFrame({
            "start_date": pd.date_range("2026-01-01", periods=8),
            "end_date": pd.date_range("2026-02-01", periods=8),
        }), "dates.csv"),
    ]


def check_upload_matrix():
    rows = []
    for name, df, filename in invalid_upload_cases():
        ok, message, quality = m.validate_dataset_file(df, filename)
        rows.append({"name": name, "expected": "reject", "status": "pass" if not ok else "fail", "message": message, "quality": quality})
    for folder in ["tmp_datasets", "tmp_public_downloads"]:
        for path in sorted((ROOT / folder).glob("*.csv")):
            raw, _ = m.decode_upload_bytes(path.read_bytes())
            df, _ = m.read_table_text(raw, path.name)
            ok, message, quality = m.validate_dataset_file(df, path.name)
            rows.append({"name": f"{folder}/{path.name}", "expected": "accept", "status": "pass" if ok else "fail", "shape": list(df.shape), "message": message, "quality": quality})
    return {"status": "pass" if all(r["status"] == "pass" for r in rows) else "fail", "results": rows}


def write_reports(payload):
    lines = [
        "# Full QA Results",
        "",
        f"Generated: `{payload['generated_at']}`",
        "",
        "## Summary",
        "",
    ]
    for name, result in payload["stages"].items():
        lines.append(f"- {name}: {result.get('status')}")
    lines += ["", "## Upload Matrix", "", "| Case | Expected | Result | Note |", "|---|---|---|---|"]
    for row in payload["stages"]["upload_matrix"]["results"]:
        note = row.get("message", "").replace("|", "/")
        lines.append(f"| {row['name']} | {row['expected']} | {row['status']} | {note} |")
    (ROOT / "full_qa_results.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    (ROOT / "FULL_QA_RESULTS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-slow", action="store_true", help="Skip training benchmark for quick resume checks.")
    args = parser.parse_args()
    stages = {
        "domain": run_cmd("domain", [sys.executable, str(ROOT / "scripts" / "run_domain_benchmark.py")], 120),
        "upload_matrix": check_upload_matrix(),
        "workspace_flow": run_cmd("workspace_flow", [sys.executable, str(ROOT / "scripts" / "run_workspace_flow_qa.py")], 180),
    }
    if args.skip_slow:
        stages["training"] = {"status": "skipped", "reason": "skip-slow option"}
    else:
        stages["training"] = run_cmd("training", [sys.executable, str(ROOT / "scripts" / "run_training_benchmark.py")], 420)
    payload = {"generated_at": datetime.now().isoformat(timespec="seconds"), "stages": stages}
    write_reports(payload)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    allowed = {"pass", "skipped"}
    if any(result.get("status") not in allowed for result in stages.values()):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
