"""Report schema for PR-10 grounded report drafts."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ReportSection:
    title: str
    content: str
    evidence_keys: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class GroundedReport:
    report_id: str
    report_format: str
    title: str
    summary: str
    sections: list[ReportSection] = field(default_factory=list)
    markdown: str = ""
    limitations: list[str] = field(default_factory=list)
    evidence_links: list[str] = field(default_factory=list)
