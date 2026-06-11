"""Future Agentic AutoML supervisor package.

PR-01 exposes only inert planning helpers. Nothing here is mounted into the
current FastAPI app yet, so existing ModelMate behavior is unchanged.
"""

from .supervisor import SupervisorPlanner

__all__ = ["SupervisorPlanner"]
