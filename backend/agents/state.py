"""Agent trace persistence boundary for PR-02.

This module defines where future agent execution state is stored. It is not
imported by the current FastAPI app, so existing ModelMate behavior is
unchanged until a later PR explicitly wires it in.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class AgentTraceRecord:
    table: str
    payload: dict[str, Any]
    created_at: str


def utc_now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def make_trace_record(table: str, payload: dict[str, Any]) -> AgentTraceRecord:
    return AgentTraceRecord(table=table, payload=payload, created_at=utc_now_iso())
