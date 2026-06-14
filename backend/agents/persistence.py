"""SQLite schema helper for future Agentic AutoML traces.

PR-02 prepares the schema, but does not call this from app startup yet. PR-03
or a migration PR can call ensure_agent_trace_schema(get_db()) when the project
is ready to persist mock planner runs.
"""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime
from typing import Any

from backend.schemas.agent import AgentPlan


AGENT_TRACE_TABLES = (
    "analysis_runs",
    "agent_plans",
    "analysis_steps",
    "tool_calls",
    "observations",
    "decisions",
    "validations",
    "artifacts",
)


def ensure_agent_trace_schema(conn: sqlite3.Connection) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS analysis_runs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            project_id TEXT,
            dataset_id TEXT,
            user_goal TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft',
            created_at TEXT NOT NULL,
            updated_at TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS analysis_steps (
            id TEXT PRIMARY KEY,
            analysis_run_id TEXT NOT NULL,
            step_index INTEGER NOT NULL,
            step_kind TEXT NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            payload_json TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs(id)
        )
    """)
    for column_name, column_ddl in {
        "interpreted_goal_json": "TEXT",
        "task_type": "TEXT",
        "task_family": "TEXT",
        "supported_status": "TEXT",
        "unsupported_reason": "TEXT",
        "plan_id": "TEXT",
    }.items():
        _add_column_once(conn, "analysis_runs", column_name, column_ddl)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS agent_plans (
            id TEXT PRIMARY KEY,
            analysis_run_id TEXT NOT NULL,
            project_id TEXT,
            status TEXT NOT NULL DEFAULT 'planned',
            steps_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT,
            FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tool_calls (
            id TEXT PRIMARY KEY,
            analysis_run_id TEXT NOT NULL,
            analysis_step_id TEXT,
            tool_name TEXT NOT NULL,
            arguments_json TEXT,
            status TEXT NOT NULL DEFAULT 'planned',
            created_at TEXT NOT NULL,
            finished_at TEXT,
            FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs(id),
            FOREIGN KEY (analysis_step_id) REFERENCES analysis_steps(id)
        )
    """)
    for column_name, column_ddl in {
        "plan_id": "TEXT",
        "plan_step_id": "TEXT",
        "project_id": "TEXT",
        "dataset_id": "TEXT",
        "input_summary": "TEXT",
        "output_summary": "TEXT",
        "error_message": "TEXT",
    }.items():
        _add_column_once(conn, "tool_calls", column_name, column_ddl)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS observations (
            id TEXT PRIMARY KEY,
            analysis_run_id TEXT NOT NULL,
            tool_call_id TEXT,
            summary TEXT NOT NULL,
            evidence_json TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs(id),
            FOREIGN KEY (tool_call_id) REFERENCES tool_calls(id)
        )
    """)
    for column_name, column_ddl in {
        "plan_step_id": "TEXT",
        "observation_type": "TEXT",
        "payload_json": "TEXT",
    }.items():
        _add_column_once(conn, "observations", column_name, column_ddl)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS decisions (
            id TEXT PRIMARY KEY,
            analysis_run_id TEXT NOT NULL,
            observation_id TEXT,
            action TEXT NOT NULL,
            reason TEXT NOT NULL,
            next_step_id TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs(id),
            FOREIGN KEY (observation_id) REFERENCES observations(id)
        )
    """)
    for column_name, column_ddl in {
        "based_on_observation_ids_json": "TEXT",
        "decision_type": "TEXT",
        "summary": "TEXT",
        "selected_value_json": "TEXT",
    }.items():
        _add_column_once(conn, "decisions", column_name, column_ddl)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS validations (
            id TEXT PRIMARY KEY,
            analysis_run_id TEXT NOT NULL,
            plan_step_id TEXT,
            severity TEXT NOT NULL,
            validation_type TEXT NOT NULL,
            message TEXT NOT NULL,
            passed INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS artifacts (
            id TEXT PRIMARY KEY,
            analysis_run_id TEXT NOT NULL,
            project_id TEXT,
            run_id TEXT,
            artifact_type TEXT NOT NULL,
            title TEXT NOT NULL,
            route TEXT,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs(id)
        )
    """)
    conn.commit()


def _table_columns(conn: sqlite3.Connection, table_name: str) -> set[str]:
    return {row[1] for row in conn.execute(f"PRAGMA table_info({table_name})").fetchall()}


def _add_column_once(conn: sqlite3.Connection, table_name: str, column_name: str, column_ddl: str) -> None:
    if column_name not in _table_columns(conn, table_name):
        conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_ddl}")


def _now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def _json(data: dict[str, Any]) -> str:
    return json.dumps(data, ensure_ascii=False, sort_keys=True)


def create_analysis_run(
    conn: sqlite3.Connection,
    user_goal: str,
    *,
    user_id: str | None = None,
    project_id: str | None = None,
    dataset_id: str | None = None,
    status: str = "draft",
    interpreted_goal: dict[str, Any] | None = None,
    task_type: str | None = None,
    task_family: str | None = None,
    supported_status: str | None = None,
    unsupported_reason: str | None = None,
    plan_id: str | None = None,
) -> str:
    ensure_agent_trace_schema(conn)
    run_id = str(uuid.uuid4())
    now = _now_iso()
    conn.execute(
        """
        INSERT INTO analysis_runs
            (id, user_id, project_id, dataset_id, user_goal, status, created_at, updated_at,
             interpreted_goal_json, task_type, task_family, supported_status, unsupported_reason, plan_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            run_id,
            user_id,
            project_id,
            dataset_id,
            user_goal,
            status,
            now,
            now,
            _json(interpreted_goal or {}),
            task_type,
            task_family,
            supported_status,
            unsupported_reason,
            plan_id,
        ),
    )
    conn.commit()
    return run_id


def create_goal_first_agent_run(
    conn: sqlite3.Connection,
    goal_text: str,
    interpreted_goal: dict[str, Any],
    plan: dict[str, Any],
    *,
    user_id: str | None = None,
    project_id: str | None = None,
    dataset_id: str | None = None,
) -> dict[str, Any]:
    ensure_agent_trace_schema(conn)
    status = "unsupported" if interpreted_goal.get("supported_status") == "unsupported" else "planned"
    if interpreted_goal.get("review_flags"):
        status = "waiting_for_review" if status != "unsupported" else status
    plan_id = plan["plan_id"]
    run_id = create_analysis_run(
        conn,
        goal_text,
        user_id=user_id,
        project_id=project_id,
        dataset_id=dataset_id,
        status=status,
        interpreted_goal=interpreted_goal,
        task_type=interpreted_goal.get("task_type"),
        task_family=interpreted_goal.get("task_family"),
        supported_status=interpreted_goal.get("supported_status"),
        unsupported_reason=interpreted_goal.get("unsupported_reason"),
        plan_id=plan_id,
    )
    now = _now_iso()
    conn.execute(
        """
        INSERT INTO agent_plans
            (id, analysis_run_id, project_id, status, steps_json, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?)
        """,
        (plan_id, run_id, project_id, plan["status"], _json({"steps": plan["steps"]}), now, now),
    )
    for step in plan["steps"]:
        conn.execute(
            """
            INSERT INTO analysis_steps
                (id, analysis_run_id, step_index, step_kind, title, status, payload_json, created_at)
            VALUES (?,?,?,?,?,?,?,?)
            """,
            (
                step["plan_step_id"],
                run_id,
                step["order"],
                "goal_plan",
                step["name"],
                step["status"],
                _json(step),
                now,
            ),
        )
    conn.commit()
    stored = get_goal_first_agent_run(conn, run_id)
    if not stored:
        raise RuntimeError("Failed to create goal-first agent run")
    return stored


def list_goal_first_agent_runs(
    conn: sqlite3.Connection,
    *,
    user_id: str | None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    ensure_agent_trace_schema(conn)
    rows = conn.execute(
        """
        SELECT * FROM analysis_runs
        WHERE user_id=? AND plan_id IS NOT NULL
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (user_id, limit),
    ).fetchall()
    return [_decode_agent_run(conn, row) for row in rows]


def get_goal_first_agent_run(conn: sqlite3.Connection, analysis_run_id: str) -> dict[str, Any] | None:
    ensure_agent_trace_schema(conn)
    row = conn.execute(
        "SELECT * FROM analysis_runs WHERE id=?",
        (analysis_run_id,),
    ).fetchone()
    if not row:
        return None
    return _decode_agent_run(conn, row)


def update_analysis_run_status(conn: sqlite3.Connection, analysis_run_id: str, status: str) -> None:
    ensure_agent_trace_schema(conn)
    conn.execute(
        "UPDATE analysis_runs SET status=?, updated_at=? WHERE id=?",
        (status, _now_iso(), analysis_run_id),
    )
    conn.commit()


def update_plan_step_status(
    conn: sqlite3.Connection,
    analysis_run_id: str,
    plan_step_id: str,
    status: str,
) -> None:
    ensure_agent_trace_schema(conn)
    conn.execute(
        "UPDATE analysis_steps SET status=? WHERE analysis_run_id=? AND id=?",
        (status, analysis_run_id, plan_step_id),
    )
    plan_row = conn.execute(
        "SELECT * FROM agent_plans WHERE analysis_run_id=?",
        (analysis_run_id,),
    ).fetchone()
    if plan_row:
        steps = json.loads(plan_row["steps_json"] or "{}").get("steps", [])
        for step in steps:
            if step.get("plan_step_id") == plan_step_id:
                step["status"] = status
        conn.execute(
            "UPDATE agent_plans SET steps_json=?, updated_at=? WHERE id=?",
            (_json({"steps": steps}), _now_iso(), plan_row["id"]),
        )
    conn.commit()


def create_analysis_steps_from_plan(
    conn: sqlite3.Connection,
    analysis_run_id: str,
    plan: AgentPlan,
) -> list[dict[str, Any]]:
    ensure_agent_trace_schema(conn)
    rows: list[dict[str, Any]] = []
    now = _now_iso()
    for index, step in enumerate(plan.steps, start=1):
        step_row = {
            "id": str(uuid.uuid4()),
            "analysis_run_id": analysis_run_id,
            "step_index": index,
            "step_kind": "plan",
            "title": step.title,
            "status": "pending",
            "payload": {
                "step_id": step.step_id,
                "tool_name": step.tool_name,
                "reason": step.reason,
            },
            "created_at": now,
        }
        conn.execute(
            """
            INSERT INTO analysis_steps
                (id, analysis_run_id, step_index, step_kind, title, status, payload_json, created_at)
            VALUES (?,?,?,?,?,?,?,?)
            """,
            (
                step_row["id"],
                step_row["analysis_run_id"],
                step_row["step_index"],
                step_row["step_kind"],
                step_row["title"],
                step_row["status"],
                _json(step_row["payload"]),
                step_row["created_at"],
            ),
        )
        rows.append(step_row)
    conn.commit()
    return rows


def get_analysis_run_trace(conn: sqlite3.Connection, analysis_run_id: str) -> dict[str, Any] | None:
    ensure_agent_trace_schema(conn)
    run = conn.execute(
        "SELECT * FROM analysis_runs WHERE id=?",
        (analysis_run_id,),
    ).fetchone()
    if not run:
        return None
    steps = conn.execute(
        "SELECT * FROM analysis_steps WHERE analysis_run_id=? ORDER BY step_index ASC",
        (analysis_run_id,),
    ).fetchall()
    return {
        "run": _decode_run(run),
        "steps": [_decode_step(row) for row in steps],
    }


def _decode_run(row: sqlite3.Row) -> dict[str, Any]:
    data = dict(row)
    data["interpreted_goal"] = json.loads(data.pop("interpreted_goal_json", None) or "{}")
    return data


def _decode_agent_run(conn: sqlite3.Connection, row: sqlite3.Row) -> dict[str, Any]:
    run = _decode_run(row)
    plan = None
    if run.get("plan_id"):
        plan_row = conn.execute("SELECT * FROM agent_plans WHERE id=?", (run["plan_id"],)).fetchone()
        if plan_row:
            plan_data = dict(plan_row)
            plan_data["steps"] = json.loads(plan_data.pop("steps_json") or "{}").get("steps", [])
            plan = plan_data
    return {"agent_run": run, "plan": plan}


def _decode_step(row: sqlite3.Row) -> dict[str, Any]:
    return {**dict(row), "payload": json.loads(row["payload_json"] or "{}")}


def create_tool_call(
    conn: sqlite3.Connection,
    analysis_run_id: str,
    tool_name: str,
    *,
    analysis_step_id: str | None = None,
    arguments: dict[str, Any] | None = None,
    status: str = "succeeded",
    plan_id: str | None = None,
    plan_step_id: str | None = None,
    project_id: str | None = None,
    dataset_id: str | None = None,
    input_summary: str | None = None,
    output_summary: str | None = None,
    error_message: str | None = None,
) -> dict[str, Any]:
    ensure_agent_trace_schema(conn)
    now = _now_iso()
    row = {
        "id": str(uuid.uuid4()),
        "analysis_run_id": analysis_run_id,
        "analysis_step_id": analysis_step_id,
        "tool_name": tool_name,
        "arguments": arguments or {},
        "status": status,
        "created_at": now,
        "finished_at": now if status in ("succeeded", "failed", "completed", "skipped", "blocked") else None,
        "plan_id": plan_id,
        "plan_step_id": plan_step_id,
        "project_id": project_id,
        "dataset_id": dataset_id,
        "input_summary": input_summary,
        "output_summary": output_summary,
        "error_message": error_message,
    }
    conn.execute(
        """
        INSERT INTO tool_calls
            (id, analysis_run_id, analysis_step_id, tool_name, arguments_json, status, created_at, finished_at,
             plan_id, plan_step_id, project_id, dataset_id, input_summary, output_summary, error_message)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            row["id"],
            row["analysis_run_id"],
            row["analysis_step_id"],
            row["tool_name"],
            _json(row["arguments"]),
            row["status"],
            row["created_at"],
            row["finished_at"],
            row["plan_id"],
            row["plan_step_id"],
            row["project_id"],
            row["dataset_id"],
            row["input_summary"],
            row["output_summary"],
            row["error_message"],
        ),
    )
    conn.commit()
    return row


def update_tool_call(
    conn: sqlite3.Connection,
    tool_call_id: str,
    *,
    status: str,
    output_summary: str | None = None,
    error_message: str | None = None,
) -> dict[str, Any]:
    ensure_agent_trace_schema(conn)
    finished_at = _now_iso() if status in ("completed", "failed", "skipped", "blocked", "succeeded") else None
    conn.execute(
        """
        UPDATE tool_calls
        SET status=?, finished_at=?, output_summary=?, error_message=?
        WHERE id=?
        """,
        (status, finished_at, output_summary, error_message, tool_call_id),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM tool_calls WHERE id=?", (tool_call_id,)).fetchone()
    return _decode_json_row(row, "arguments_json", "arguments") if row else {}


def create_observation(
    conn: sqlite3.Connection,
    analysis_run_id: str,
    summary: str,
    *,
    tool_call_id: str | None = None,
    evidence: dict[str, Any] | None = None,
    plan_step_id: str | None = None,
    observation_type: str = "tool_output",
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    ensure_agent_trace_schema(conn)
    row = {
        "id": str(uuid.uuid4()),
        "analysis_run_id": analysis_run_id,
        "tool_call_id": tool_call_id,
        "summary": summary,
        "evidence": evidence or {},
        "plan_step_id": plan_step_id,
        "observation_type": observation_type,
        "payload": payload or evidence or {},
        "created_at": _now_iso(),
    }
    conn.execute(
        """
        INSERT INTO observations
            (id, analysis_run_id, tool_call_id, summary, evidence_json, created_at,
             plan_step_id, observation_type, payload_json)
        VALUES (?,?,?,?,?,?,?,?,?)
        """,
        (
            row["id"],
            row["analysis_run_id"],
            row["tool_call_id"],
            row["summary"],
            _json(row["evidence"]),
            row["created_at"],
            row["plan_step_id"],
            row["observation_type"],
            _json(row["payload"]),
        ),
    )
    conn.commit()
    return row


def create_decision(
    conn: sqlite3.Connection,
    analysis_run_id: str,
    action: str,
    reason: str,
    *,
    observation_id: str | None = None,
    next_step_id: str | None = None,
    based_on_observation_ids: list[str] | None = None,
    decision_type: str = "next_action",
    summary: str | None = None,
    selected_value: dict[str, Any] | None = None,
) -> dict[str, Any]:
    ensure_agent_trace_schema(conn)
    row = {
        "id": str(uuid.uuid4()),
        "analysis_run_id": analysis_run_id,
        "observation_id": observation_id,
        "action": action,
        "reason": reason,
        "next_step_id": next_step_id,
        "based_on_observation_ids": based_on_observation_ids or ([observation_id] if observation_id else []),
        "decision_type": decision_type,
        "summary": summary or action,
        "selected_value": selected_value or {},
        "created_at": _now_iso(),
    }
    conn.execute(
        """
        INSERT INTO decisions
            (id, analysis_run_id, observation_id, action, reason, next_step_id, created_at,
             based_on_observation_ids_json, decision_type, summary, selected_value_json)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            row["id"],
            row["analysis_run_id"],
            row["observation_id"],
            row["action"],
            row["reason"],
            row["next_step_id"],
            row["created_at"],
            _json({"ids": row["based_on_observation_ids"]}),
            row["decision_type"],
            row["summary"],
            _json(row["selected_value"]),
        ),
    )
    conn.commit()
    return row


def create_validation_result(
    conn: sqlite3.Connection,
    analysis_run_id: str,
    *,
    plan_step_id: str | None,
    severity: str,
    validation_type: str,
    message: str,
    passed: bool,
) -> dict[str, Any]:
    ensure_agent_trace_schema(conn)
    row = {
        "id": str(uuid.uuid4()),
        "analysis_run_id": analysis_run_id,
        "plan_step_id": plan_step_id,
        "severity": severity,
        "validation_type": validation_type,
        "message": message,
        "passed": bool(passed),
        "created_at": _now_iso(),
    }
    conn.execute(
        """
        INSERT INTO validations
            (id, analysis_run_id, plan_step_id, severity, validation_type, message, passed, created_at)
        VALUES (?,?,?,?,?,?,?,?)
        """,
        (
            row["id"],
            row["analysis_run_id"],
            row["plan_step_id"],
            row["severity"],
            row["validation_type"],
            row["message"],
            1 if row["passed"] else 0,
            row["created_at"],
        ),
    )
    conn.commit()
    return row


def create_artifact(
    conn: sqlite3.Connection,
    analysis_run_id: str,
    *,
    artifact_type: str,
    title: str,
    status: str,
    project_id: str | None = None,
    run_id: str | None = None,
    route: str | None = None,
) -> dict[str, Any]:
    ensure_agent_trace_schema(conn)
    row = {
        "id": str(uuid.uuid4()),
        "analysis_run_id": analysis_run_id,
        "project_id": project_id,
        "run_id": run_id,
        "artifact_type": artifact_type,
        "title": title,
        "route": route,
        "status": status,
        "created_at": _now_iso(),
    }
    conn.execute(
        """
        INSERT INTO artifacts
            (id, analysis_run_id, project_id, run_id, artifact_type, title, route, status, created_at)
        VALUES (?,?,?,?,?,?,?,?,?)
        """,
        (
            row["id"],
            row["analysis_run_id"],
            row["project_id"],
            row["run_id"],
            row["artifact_type"],
            row["title"],
            row["route"],
            row["status"],
            row["created_at"],
        ),
    )
    conn.commit()
    return row


def get_analysis_timeline(conn: sqlite3.Connection, analysis_run_id: str) -> dict[str, Any] | None:
    trace = get_analysis_run_trace(conn, analysis_run_id)
    if not trace:
        return None
    tool_calls = conn.execute(
        "SELECT * FROM tool_calls WHERE analysis_run_id=? ORDER BY created_at ASC",
        (analysis_run_id,),
    ).fetchall()
    observations = conn.execute(
        "SELECT * FROM observations WHERE analysis_run_id=? ORDER BY created_at ASC",
        (analysis_run_id,),
    ).fetchall()
    decisions = conn.execute(
        "SELECT * FROM decisions WHERE analysis_run_id=? ORDER BY created_at ASC",
        (analysis_run_id,),
    ).fetchall()
    validations = conn.execute(
        "SELECT * FROM validations WHERE analysis_run_id=? ORDER BY created_at ASC",
        (analysis_run_id,),
    ).fetchall()
    artifacts = conn.execute(
        "SELECT * FROM artifacts WHERE analysis_run_id=? ORDER BY created_at ASC",
        (analysis_run_id,),
    ).fetchall()
    return {
        **trace,
        "tool_calls": [_decode_json_row(row, "arguments_json", "arguments") for row in tool_calls],
        "observations": [_decode_json_row(row, "evidence_json", "evidence") for row in observations],
        "decisions": [_decode_decision(row) for row in decisions],
        "validations": [_decode_validation(row) for row in validations],
        "artifacts": [dict(row) for row in artifacts],
        "timeline": _merge_timeline(trace["steps"], tool_calls, observations, decisions, validations, artifacts),
    }


def _decode_json_row(row: sqlite3.Row, json_key: str, output_key: str) -> dict[str, Any]:
    data = dict(row)
    data[output_key] = json.loads(data.pop(json_key) or "{}")
    if "payload_json" in data:
        data["payload"] = json.loads(data.pop("payload_json") or "{}")
    return data


def _decode_decision(row: sqlite3.Row) -> dict[str, Any]:
    data = dict(row)
    data["based_on_observation_ids"] = json.loads(data.pop("based_on_observation_ids_json", None) or "{}").get("ids", [])
    data["selected_value"] = json.loads(data.pop("selected_value_json", None) or "{}")
    return data


def _decode_validation(row: sqlite3.Row) -> dict[str, Any]:
    data = dict(row)
    data["passed"] = bool(data.get("passed"))
    return data


def _merge_timeline(
    steps: list[dict[str, Any]],
    tool_calls: list[sqlite3.Row],
    observations: list[sqlite3.Row],
    decisions: list[sqlite3.Row],
    validations: list[sqlite3.Row],
    artifacts: list[sqlite3.Row],
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for step in steps:
        items.append({"type": "plan", "created_at": step["created_at"], "data": step})
    for row in tool_calls:
        items.append({"type": "tool_call", "created_at": row["created_at"], "data": _decode_json_row(row, "arguments_json", "arguments")})
    for row in observations:
        items.append({"type": "observation", "created_at": row["created_at"], "data": _decode_json_row(row, "evidence_json", "evidence")})
    for row in decisions:
        items.append({"type": "decision", "created_at": row["created_at"], "data": _decode_decision(row)})
    for row in validations:
        items.append({"type": "validation", "created_at": row["created_at"], "data": _decode_validation(row)})
    for row in artifacts:
        items.append({"type": "artifact", "created_at": row["created_at"], "data": dict(row)})
    return sorted(items, key=lambda item: item["created_at"])
