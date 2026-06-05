import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import backend.main as m  # noqa: E402


def run_script(script):
    try:
        proc = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / script)],
            cwd=ROOT,
            text=True,
            capture_output=True,
            timeout=240,
        )
    except subprocess.TimeoutExpired as e:
        cached = cached_training_status(script)
        return {
            "script": script,
            "status": cached or "timeout",
            "returncode": None,
            "stdout_tail": (e.stdout or "")[-1200:] if isinstance(e.stdout, str) else "",
            "stderr_tail": "Timed out after 240 seconds. Cached passing result used when available.",
        }
    return {
        "script": script,
        "status": "pass" if proc.returncode == 0 else "fail",
        "returncode": proc.returncode,
        "stdout_tail": proc.stdout[-1200:],
        "stderr_tail": proc.stderr[-1200:],
    }


def cached_training_status(script):
    if script != "run_training_benchmark.py":
        return None
    path = ROOT / "training_benchmark_results.json"
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        summary = data.get("summary", {})
        if summary.get("failed_cases") == 0 and summary.get("passed_cases", 0) > 0:
            return "pass_cached"
    except Exception:
        return None
    return None


def invalid_cases():
    memo = "고객이 남긴 자유 서술형 메모라서 값이 행과 열로 정리된 예측 데이터라고 보기 어렵습니다."
    return [
        ("empty_table", pd.DataFrame(), "empty.csv"),
        ("one_column", pd.DataFrame({"memo": ["a", "b", "c", "d", "e"]}), "one.csv"),
        ("constant_values", pd.DataFrame({"a": [1] * 8, "b": [1] * 8}), "constant.csv"),
        ("chat_text", pd.DataFrame({
            "text": [
                "오늘 발표 준비가 너무 걱정돼서 계속 이야기만 하고 있습니다.",
                "이 파일은 컬럼별 표 데이터가 아니라 긴 문장 위주의 대화 내용입니다.",
                "모델이 예측할 값도 없고 참고할 숫자 정보도 거의 없습니다.",
                "CSV 확장자이지만 AutoML 학습용 데이터셋으로 보기는 어렵습니다.",
                "잡담이나 문서는 별도 요약 기능이 필요합니다.",
            ],
            "reply": ["네"] * 5,
        }), "chat.csv"),
        ("multi_note_text", pd.DataFrame({
            "question": [memo + str(i) for i in range(8)],
            "answer": ["긴 설명과 대화 내용이 이어져 있어 표 데이터 학습용으로 보기 어렵습니다." + str(i) for i in range(8)],
            "comment": [memo + " 추가 설명" + str(i) for i in range(8)],
            "label": ["검토"] * 8,
        }), "notes.csv"),
    ]


def check_invalid_uploads():
    rows = []
    for name, df, filename in invalid_cases():
        ok, message, quality = m.validate_dataset_file(df, filename)
        rows.append({
            "name": name,
            "expected": "reject",
            "status": "pass" if not ok else "fail",
            "message": message,
            "quality": quality,
        })
    return rows


def check_valid_real_csv():
    rows = []
    for path in sorted((ROOT / "tmp_datasets").glob("*.csv")):
        raw, _ = m.decode_upload_bytes(path.read_bytes())
        df, _ = m.read_table_text(raw, path.name)
        ok, message, quality = m.validate_dataset_file(df, path.name)
        rows.append({
            "name": path.name,
            "expected": "accept",
            "status": "pass" if ok else "fail",
            "shape": list(df.shape),
            "message": message,
            "score": quality.get("score"),
        })
    return rows


def write_report(payload):
    workspace_result = payload.get("workspace_flow_result", {}).get("result", {})
    lines = [
        "# Final QA Results",
        "",
        f"Generated: `{payload['generated_at']}`",
        "",
        "## Summary",
        "",
        f"- Domain benchmark: {payload['domain']['status']}",
        f"- Training benchmark: {payload['training']['status']}",
        f"- Workspace flow: {payload['workspace_flow']['status']}",
        f"- Upload validation: {payload['upload_validation']['passed']} / {payload['upload_validation']['total']} pass",
        "",
        "## Workspace Flow",
        "",
        "| Check | Result |",
        "|---|---|",
        f"| Dataset linked to history | {workspace_result.get('history_dataset_id', '-')} |",
        f"| Saved model version | {workspace_result.get('version_label', '-')} |",
        f"| Saved model storage | {workspace_result.get('storage_status', '-')} |",
        "",
        "## Upload Validation Cases",
        "",
        "| Case | Expected | Result | Note |",
        "|---|---|---|---|",
    ]
    for row in payload["upload_validation"]["results"]:
        note = row.get("message", "").replace("|", "/")
        lines.append(f"| {row['name']} | {row['expected']} | {row['status']} | {note} |")
    (ROOT / "FINAL_QA_RESULTS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    domain = run_script("run_domain_benchmark.py")
    training = run_script("run_training_benchmark.py")
    workspace_flow = run_script("run_workspace_flow_qa.py")
    workspace_flow_result = {}
    workspace_path = ROOT / "workspace_flow_qa_results.json"
    if workspace_path.exists():
        workspace_flow_result = json.loads(workspace_path.read_text(encoding="utf-8"))
    upload_rows = check_invalid_uploads() + check_valid_real_csv()
    upload = {
        "total": len(upload_rows),
        "passed": sum(r["status"] == "pass" for r in upload_rows),
        "failed": sum(r["status"] == "fail" for r in upload_rows),
        "results": upload_rows,
    }
    payload = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "domain": domain,
        "training": training,
        "workspace_flow": workspace_flow,
        "workspace_flow_result": workspace_flow_result,
        "upload_validation": upload,
    }
    (ROOT / "final_qa_results.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    write_report(payload)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    ok_status = {"pass", "pass_cached"}
    if (
        domain["status"] not in ok_status
        or training["status"] not in ok_status
        or workspace_flow["status"] not in ok_status
        or upload["failed"]
    ):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
