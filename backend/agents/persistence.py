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
    "analysis_steps",
    "tool_calls",
    "observations",
    "decisions",
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
    conn.commit()


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
) -> str:
    ensure_agent_trace_schema(conn)
    run_id = str(uuid.uuid4())
    now = _now_iso()
    conn.execute(
        """
        INSERT INTO analysis_runs
            (id, user_id, project_id, dataset_id, user_goal, status, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?)
        """,
        (run_id, user_id, project_id, dataset_id, user_goal, status, now, now),
    )
    conn.commit()
    return run_id


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
        "run": dict(run),
        "steps": [_decode_step(row) for row in steps],
    }


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
        "finished_at": now if status in ("succeeded", "failed") else None,
    }
    conn.execute(
        """
        INSERT INTO tool_calls
            (id, analysis_run_id, analysis_step_id, tool_name, arguments_json, status, created_at, finished_at)
        VALUES (?,?,?,?,?,?,?,?)
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
        ),
    )
    conn.commit()
    return row


def create_observation(
    conn: sqlite3.Connection,
    analysis_run_id: str,
    summary: str,
    *,
    tool_call_id: str | None = None,
    evidence: dict[str, Any] | None = None,
) -> dict[str, Any]:
    ensure_agent_trace_schema(conn)
    row = {
        "id": str(uuid.uuid4()),
        "analysis_run_id": analysis_run_id,
        "tool_call_id": tool_call_id,
        "summary": summary,
        "evidence": evidence or {},
        "created_at": _now_iso(),
    }
    conn.execute(
        """
        INSERT INTO observations
            (id, analysis_run_id, tool_call_id, summary, evidence_json, created_at)
        VALUES (?,?,?,?,?,?)
        """,
        (
            row["id"],
            row["analysis_run_id"],
            row["tool_call_id"],
            row["summary"],
            _json(row["evidence"]),
            row["created_at"],
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
) -> dict[str, Any]:
    ensure_agent_trace_schema(conn)
    row = {
        "id": str(uuid.uuid4()),
        "analysis_run_id": analysis_run_id,
        "observation_id": observation_id,
        "action": action,
        "reason": reason,
        "next_step_id": next_step_id,
        "created_at": _now_iso(),
    }
    conn.execute(
        """
        INSERT INTO decisions
            (id, analysis_run_id, observation_id, action, reason, next_step_id, created_at)
        VALUES (?,?,?,?,?,?,?)
        """,
        (
            row["id"],
            row["analysis_run_id"],
            row["observation_id"],
            row["action"],
            row["reason"],
            row["next_step_id"],
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
    return {
        **trace,
        "tool_calls": [_decode_json_row(row, "arguments_json", "arguments") for row in tool_calls],
        "observations": [_decode_json_row(row, "evidence_json", "evidence") for row in observations],
        "decisions": [dict(row) for row in decisions],
        "timeline": _merge_timeline(trace["steps"], tool_calls, observations, decisions),
    }


def _decode_json_row(row: sqlite3.Row, json_key: str, output_key: str) -> dict[str, Any]:
    data = dict(row)
    data[output_key] = json.loads(data.pop(json_key) or "{}")
    return data


def _merge_timeline(
    steps: list[dict[str, Any]],
    tool_calls: list[sqlite3.Row],
    observations: list[sqlite3.Row],
    decisions: list[sqlite3.Row],
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for step in steps:
        items.append({"type": "plan", "created_at": step["created_at"], "data": step})
    for row in tool_calls:
        items.append({"type": "tool_call", "created_at": row["created_at"], "data": _decode_json_row(row, "arguments_json", "arguments")})
    for row in observations:
        items.append({"type": "observation", "created_at": row["created_at"], "data": _decode_json_row(row, "evidence_json", "evidence")})
    for row in decisions:
        items.append({"type": "decision", "created_at": row["created_at"], "data": dict(row)})
    return sorted(items, key=lambda item: item["created_at"])
