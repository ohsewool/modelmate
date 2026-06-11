"""Agent contract schemas for the future Agentic AutoML flow.

PR-01 keeps these contracts detached from FastAPI routes and database tables.
"""

from .contracts import (
    AgentDecision,
    AgentObservation,
    AgentPlan,
    AgentPlanStep,
    AgentRunDraft,
    AgentToolCall,
)
from .trace import (
    AnalysisRunSchema,
    AnalysisStepSchema,
    DecisionSchema,
    ObservationSchema,
    ToolCallSchema,
)
from .tool import ToolExecutionRequest, ToolExecutionResponse
from .observation import ObservationPayload
from .decision import DecisionPayload
from .deployment import DeploymentDecision, DeploymentRecordPlaceholder
from .evidence import EvidenceBundle
from .report import GroundedReport, ReportSection

__all__ = [
    "AgentDecision",
    "AgentObservation",
    "AgentPlan",
    "AgentPlanStep",
    "AgentRunDraft",
    "AgentToolCall",
    "AnalysisRunSchema",
    "AnalysisStepSchema",
    "DecisionSchema",
    "ObservationSchema",
    "ToolCallSchema",
    "ToolExecutionRequest",
    "ToolExecutionResponse",
    "ObservationPayload",
    "DecisionPayload",
    "DeploymentDecision",
    "DeploymentRecordPlaceholder",
    "EvidenceBundle",
    "GroundedReport",
    "ReportSection",
]
