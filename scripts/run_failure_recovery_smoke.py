import argparse
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


DEFAULT_TIMEOUT = 60
ROOT = Path(__file__).resolve().parents[1]


def join(base_url, path):
    return urllib.parse.urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))


def parse_json(text):
    try:
        return json.loads(text)
    except Exception:
        return None


def multipart_file(field_name, filename, content, content_type="text/csv"):
    boundary = f"----modelmate-failure-recovery-{int(time.time() * 1000)}"
    head = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode("utf-8")
    tail = f"\r\n--{boundary}--\r\n".encode("utf-8")
    return head + content + tail, {"Content-Type": f"multipart/form-data; boundary={boundary}"}


def request(method, url, *, payload=None, token=None, data=None, headers=None, timeout=DEFAULT_TIMEOUT):
    body = json.dumps(payload).encode("utf-8") if payload is not None else data
    headers = dict(headers or ({"Content-Type": "application/json"} if payload is not None else {}))
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            text = res.read().decode("utf-8", errors="replace")
            return {"status": res.status, "ok": True, "text": text, "json": parse_json(text)}
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8", errors="replace")
        return {"status": exc.code, "ok": False, "text": text, "json": parse_json(text)}
    except Exception as exc:
        return {"status": None, "ok": False, "text": str(exc), "json": None}


def add(results, name, passed, detail="", status=None):
    results.append({"name": name, "status": "pass" if passed else "fail", "detail": detail, "http_status": status})


def register_user(base_url, suffix):
    stamp = int(time.time() * 1000)
    email = f"failure-recovery-{suffix}-{stamp}@example.com"
    password = "ModelMate-failure-recovery-12345"
    res = request(
        "POST",
        join(base_url, "/api/auth/register"),
        payload={"email": email, "password": password, "name": f"Failure Recovery {suffix}"},
    )
    return email, (res["json"] or {}).get("token"), res


def wait_for_status(base_url, job_id, token, statuses):
    latest = None
    for _ in range(12):
        latest = request("GET", join(base_url, f"/api/training/jobs/{job_id}"), token=token)
        data = latest["json"] or {}
        if data.get("status") in statuses:
            return latest
        time.sleep(1.5)
    return latest


def run(base_url):
    results = []
    email_a, token_a, reg_a = register_user(base_url, "a")
    add(results, "user A register/login", reg_a["status"] == 200 and bool(token_a), email_a, reg_a["status"])
    email_b, token_b, reg_b = register_user(base_url, "b")
    add(results, "user B register/login", reg_b["status"] == 200 and bool(token_b), email_b, reg_b["status"])

    create = request(
        "POST",
        join(base_url, "/api/projects"),
        payload={"name": "Failure Recovery Smoke", "description": "Smoke project for failed job rerun."},
        token=token_a,
    )
    project_id = (create["json"] or {}).get("id")
    add(results, "user A can create project", create["status"] == 200 and bool(project_id), "POST /api/projects", create["status"])

    # A dataset is uploaded because a rerun needs one, and a job created without
    # it is not the flow a user ever produces. Skipping the upload is how this
    # script came to assert `can_rerun` on a job the API would refuse: the
    # shortcut made the scenario impossible rather than merely quick.
    sample = (ROOT / "sample_data" / "customer_churn_demo.csv").read_bytes()
    upload_body, upload_headers = multipart_file("file", "customer_churn_demo.csv", sample)
    upload = request("POST", join(base_url, "/api/upload"), data=upload_body,
                     headers=upload_headers, token=token_a, timeout=120)
    datasets = request("GET", join(base_url, "/api/datasets"), token=token_a)
    rows = datasets["json"] if isinstance(datasets["json"], list) else []
    dataset_id = (rows[0].get("dataset_id") or rows[0].get("id")) if rows else None
    add(results, "a dataset exists for the job to reference",
        upload["status"] == 200 and bool(dataset_id), "POST /api/upload", upload["status"])

    job = request(
        "POST",
        join(base_url, "/api/training/jobs"),
        payload={"project_id": project_id, "dataset_id": dataset_id,
                 "run_config": {"smoke_force_failure": True}},
        token=token_a,
    )
    job_id = (job["json"] or {}).get("job_id")
    add(results, "failure test job can be created", job["status"] == 200 and bool(job_id), "POST /api/training/jobs", job["status"])

    failed = wait_for_status(base_url, job_id, token_a, {"failed"})
    failed_json = failed["json"] or {}
    add(results, "job fails with classified error", failed["status"] == 200 and failed_json.get("status") == "failed" and bool(failed_json.get("error_type")), str(failed_json.get("error_type")), failed["status"])
    add(results, "failed job has recovery guidance", bool(failed_json.get("error_message") and failed_json.get("recommended_next_action")), "error_message + recommended_next_action", failed["status"])
    add(results, "failed job can_rerun is true", failed_json.get("can_rerun") is True, "can_rerun", failed["status"])

    rerun = request("POST", join(base_url, f"/api/training/jobs/{job_id}/rerun"), token=token_a)
    rerun_json = rerun["json"] or {}
    rerun_job_id = rerun_json.get("job_id")
    add(results, "user A can rerun own failed job", rerun["status"] == 200 and bool(rerun_job_id), "POST /api/training/jobs/{job_id}/rerun", rerun["status"])
    add(results, "rerun links back to source", rerun_json.get("rerun_of") == job_id or rerun_json.get("duplicate_guard") is True, "rerun_of or duplicate_guard", rerun["status"])

    duplicate = request("POST", join(base_url, f"/api/training/jobs/{job_id}/rerun"), token=token_a)
    duplicate_json = duplicate["json"] or {}
    add(
        results,
        "duplicate rerun is guarded or returns a readable job",
        duplicate["status"] == 200 and bool(duplicate_json.get("job_id")),
        f"duplicate_guard={duplicate_json.get('duplicate_guard')}",
        duplicate["status"],
    )

    rerun_b = request("POST", join(base_url, f"/api/training/jobs/{job_id}/rerun"), token=token_b)
    add(results, "user B cannot rerun user A job", rerun_b["status"] in (403, 404), "POST rerun as B", rerun_b["status"])

    rerun_unauth = request("POST", join(base_url, f"/api/training/jobs/{job_id}/rerun"))
    add(results, "unauthenticated rerun is blocked", rerun_unauth["status"] in (401, 403, 404), "POST rerun unauth", rerun_unauth["status"])

    # The failure this script found: `can_rerun` was a status check while the
    # endpoint also required a dataset reference, so the API advertised a rerun
    # it then refused with 409. One function answers it now, and this pins that
    # a job which cannot be rerun says so *and* says why, rather than the reason
    # appearing only after someone presses the button.
    #
    # These three checked a job this script had not created. `POST
    # /api/training/jobs` does not always create one: if the project already has
    # a job in `created`/`queued`/`running`, it returns *that* job with
    # `duplicate_guard: True`. The reruns above leave exactly such a job behind
    # for as long as they take to finish - 0.12s on one machine, longer on a
    # loaded runner - and this script read whichever job came back as though it
    # were the dataset-less one it asked for.
    #
    # That job has a dataset, so once it settled the three checks saw
    # `can_rerun: true`, `rerun_blocked_reason: None` and a rerun that returns
    # 200, and reported the can_rerun/409 defect as back. It was not back. The
    # answer changed with how fast the runner was, which is worse than a wrong
    # answer: a gate that is red on the same commit that was green trains people
    # to press the button again instead of reading it.
    #
    # Two changes. A fresh project cannot have an active job, so the guard has
    # nothing to return - that removes the race. And the guard is now *checked*
    # rather than assumed, because "I got back the object I asked for" was the
    # unstated premise the whole block rested on. The response said
    # `duplicate_guard: True` the entire time; nothing looked.
    solo = request("POST", join(base_url, "/api/projects"),
                   payload={"name": "Failure Recovery Smoke (dataset-less)",
                            "description": "A project of its own, so no rerun can be in flight here."},
                   token=token_a)
    solo_id = (solo["json"] or {}).get("id")
    dataset_less = request("POST", join(base_url, "/api/training/jobs"),
                           payload={"project_id": solo_id,
                                    "run_config": {"smoke_force_failure": True}},
                           token=token_a)
    dataset_less_json = dataset_less["json"] or {}
    dataset_less_id = dataset_less_json.get("job_id")
    add(results, "the dataset-less job is the one this script asked for",
        dataset_less_json.get("duplicate_guard") is not True,
        f"duplicate_guard={dataset_less_json.get('duplicate_guard')}", dataset_less["status"])
    if dataset_less_id:
        state = wait_for_status(base_url, dataset_less_id, token_a, {"failed"})
        state_json = state["json"] or {}
        # The premise of all three below. Without it they are assertions about
        # whatever job the API happened to hand back.
        add(results, "and it really has no dataset attached",
            not state_json.get("dataset_id"),
            f"dataset_id={state_json.get('dataset_id')}", state["status"])
        add(results, "a job with no dataset reports can_rerun false",
            state_json.get("can_rerun") is False, "can_rerun", state["status"])
        add(results, "and says why before anyone presses the button",
            state_json.get("rerun_blocked_reason") == "job_dataset_reference_missing",
            f"rerun_blocked_reason={state_json.get('rerun_blocked_reason')}", state["status"])
        refused = request("POST", join(base_url, f"/api/training/jobs/{dataset_less_id}/rerun"),
                          token=token_a)
        add(results, "and the endpoint refuses it for the same stated reason",
            refused["status"] == 409
            and ((refused["json"] or {}).get("detail") or {}).get("error_type")
            == "job_dataset_reference_missing",
            "POST rerun on a dataset-less job", refused["status"])

    project_detail = request("GET", join(base_url, f"/api/projects/{project_id}"), token=token_a)
    detail_json = project_detail["json"] or {}
    add(results, "project history exposes last failure fields", project_detail["status"] == 200 and bool(detail_json.get("last_error_type")), "last_error_type", project_detail["status"])
    add(results, "project history exposes rerun fields", project_detail["status"] == 200 and "rerun_count" in detail_json and "can_rerun" in detail_json, "rerun_count/can_rerun", project_detail["status"])

    guest_session = request("GET", join(base_url, "/api/session"))
    add(results, "guest demo session remains accessible", guest_session["status"] == 200 and "guest_demo" in guest_session["text"], "GET /api/session", guest_session["status"])

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
