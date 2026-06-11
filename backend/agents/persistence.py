"""SQLite schema helper for future Agentic AutoML traces.

PR-02 prepares the schema, but does not call this from app startup yet. PR-03
or a migration PR can call ensure_agent_trace_schema(get_db()) when the project
is ready to persist mock planner runs.
"""

from __future__ import annotations

import sqlite3


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
