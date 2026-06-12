import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run_step(name, args, timeout=300, cwd=ROOT):
    if len(args) > 1 and args[1].endswith(".py") and not Path(args[1]).exists():
        return {"name": name, "status": "skipped", "reason": "script not found", "args": args}
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    try:
        proc = subprocess.run(
            args,
            cwd=cwd,
            env=env,
            text=True,
            encoding="utf-8",
            errors="replace",
            capture_output=True,
            timeout=timeout,
        )
        return {
            "name": name,
            "status": "pass" if proc.returncode == 0 else "fail",
            "returncode": proc.returncode,
            "stdout_tail": (proc.stdout or "")[-1600:],
            "stderr_tail": (proc.stderr or "")[-1600:],
        }
    except subprocess.TimeoutExpired as exc:
        return {
            "name": name,
            "status": "timeout",
            "returncode": None,
            "stdout_tail": (exc.stdout or "")[-1600:] if isinstance(exc.stdout, str) else "",
            "stderr_tail": f"Timed out after {timeout} seconds.",
        }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", help="Optional base URL for product smoke test.")
    parser.add_argument("--skip-training", action="store_true", help="Skip slow training benchmark and smoke training endpoint.")
    args = parser.parse_args()

    steps = [
        ("backend_compile", [sys.executable, "-m", "compileall", "backend"], 120),
        ("upload_validation_qa", [sys.executable, str(ROOT / "scripts" / "run_upload_validation_qa.py")], 180),
        ("full_qa_skip_slow", [sys.executable, str(ROOT / "scripts" / "run_full_qa.py"), "--skip-slow"], 360),
    ]
    if args.skip_training:
        results = [run_step(name, cmd, timeout) for name, cmd, timeout in steps]
        results.append({"name": "training_benchmark", "status": "skipped", "reason": "--skip-training"})
    else:
        steps.append(("training_benchmark", [sys.executable, str(ROOT / "scripts" / "run_training_benchmark.py")], 480))
        results = [run_step(name, cmd, timeout) for name, cmd, timeout in steps]

    if args.base_url:
        auth_cmd = [sys.executable, str(ROOT / "scripts" / "run_auth_smoke.py"), "--base-url", args.base_url]
        results.append(run_step("auth_smoke", auth_cmd, 180))
        ownership_cmd = [sys.executable, str(ROOT / "scripts" / "run_ownership_smoke.py"), "--base-url", args.base_url]
        results.append(run_step("ownership_smoke", ownership_cmd, 180))
        project_history_cmd = [sys.executable, str(ROOT / "scripts" / "run_project_history_smoke.py"), "--base-url", args.base_url]
        results.append(run_step("project_history_smoke", project_history_cmd, 180))
        background_jobs_cmd = [sys.executable, str(ROOT / "scripts" / "run_background_jobs_smoke.py"), "--base-url", args.base_url]
        results.append(run_step("background_jobs_smoke", background_jobs_cmd, 180))
        failure_recovery_cmd = [sys.executable, str(ROOT / "scripts" / "run_failure_recovery_smoke.py"), "--base-url", args.base_url]
        results.append(run_step("failure_recovery_smoke", failure_recovery_cmd, 180))
        smoke_cmd = [sys.executable, str(ROOT / "scripts" / "run_product_smoke.py"), "--base-url", args.base_url]
        if args.skip_training:
            smoke_cmd.append("--skip-training")
        results.append(run_step("product_smoke", smoke_cmd, 240))
    else:
        results.append({"name": "auth_smoke", "status": "skipped", "reason": "--base-url not provided"})
        results.append({"name": "ownership_smoke", "status": "skipped", "reason": "--base-url not provided"})
        results.append({"name": "project_history_smoke", "status": "skipped", "reason": "--base-url not provided"})
        results.append({"name": "background_jobs_smoke", "status": "skipped", "reason": "--base-url not provided"})
        results.append({"name": "failure_recovery_smoke", "status": "skipped", "reason": "--base-url not provided"})
        results.append({"name": "product_smoke", "status": "skipped", "reason": "--base-url not provided"})

    allowed = {"pass", "skipped"}
    payload = {
        "summary": {
            "total": len(results),
            "passed": sum(1 for row in results if row["status"] == "pass"),
            "skipped": sum(1 for row in results if row["status"] == "skipped"),
            "failed": sum(1 for row in results if row["status"] not in allowed),
        },
        "results": results,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if payload["summary"]["failed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    main()
