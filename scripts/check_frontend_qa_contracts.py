"""Static safety checks for routing, dataset reset, and user-facing copy."""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "frontend" / "src"


def require(text: str, fragment: str, label: str) -> None:
    assert fragment in text, f"Missing frontend contract: {label}"


def main() -> int:
    app = (SRC / "App.jsx").read_text(encoding="utf-8")
    home = (SRC / "pages" / "Home.jsx").read_text(encoding="utf-8")
    login = (SRC / "pages" / "Login.jsx").read_text(encoding="utf-8")
    upload = (SRC / "pages" / "Upload.jsx").read_text(encoding="utf-8")
    agent_run_detail = (SRC / "pages" / "AgentRunDetail.jsx").read_text(encoding="utf-8")
    prediction_apis = (SRC / "pages" / "workspace" / "WorkspacePredictionApis.jsx").read_text(encoding="utf-8")

    require(app, "function RequireAuth", "protected route guard")
    require(app, "encodeURIComponent(redirect)", "original route redirect")
    for route in ("/dashboard", "/upload", "/agent-mode", "/reports", "/prediction-apis", "/settings"):
        require(app, f'path="{route}"', f"protected route {route}")

    require(home, "encodeURIComponent(target)", "landing CTA login redirect")
    require(home, "goToAnalysis('/upload')", "upload CTA")
    require(home, "goToAnalysis('/upload?sample=1')", "sample CTA")
    require(login, "safeRedirect", "safe post-login redirect")
    require(login, "!redirect.startsWith('//')", "open redirect prevention")

    require(upload, "resetDatasetDependentState()", "dataset switch reset call")
    for setter in (
        "setUploadInfo(null)",
        "setAiAnalysis(null)",
        "setTarget('')",
        "setEdaInfo(null)",
        "setModelResult(null)",
    ):
        require(upload, setter, f"dataset-dependent state reset: {setter}")

    require(agent_run_detail, "function isVerifiedDatasetColumn", "verified trace feature columns")
    require(
        agent_run_detail,
        "explicit.filter(name => isVerifiedDatasetColumn(trace, name))",
        "trace features filtered by current dataset columns",
    )
    assert "availabilityStatus(row)" not in prediction_apis, "Undefined API readiness helper must not be rendered"
    require(prediction_apis, ".filter(hasPredictionApiContext)", "empty projects excluded from Prediction APIs")

    source_files = list(SRC.rglob("*.jsx")) + list(SRC.rglob("*.js"))
    undefined_routes: list[str] = []
    raw_ui_terms: list[str] = []
    banned_ui_terms = ("automl_training", "job_pending", "target_select", "model not ready")
    jsx_text = re.compile(r">\s*([^<{][^<]{0,160})\s*<")
    for path in source_files:
        content = path.read_text(encoding="utf-8")
        if re.search(r"/(?:agent-mode|reports|prediction-apis)/undefined", content):
            undefined_routes.append(str(path.relative_to(ROOT)))
        for visible in jsx_text.findall(content):
            lowered = visible.lower()
            if any(term in lowered for term in banned_ui_terms):
                raw_ui_terms.append(f"{path.relative_to(ROOT)}: {visible.strip()}")

    assert not undefined_routes, f"Unsafe undefined routes: {undefined_routes}"
    assert not raw_ui_terms, "Raw internal terms exposed in JSX text:\n" + "\n".join(raw_ui_terms)
    print("Frontend QA contracts: PASS")
    print("- protected routes and safe login redirect")
    print("- landing CTA redirect contract")
    print("- dataset-dependent state reset")
    print("- no literal undefined detail routes or banned raw UI enums")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
