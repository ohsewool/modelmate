def _read_json_file(path, fallback):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return fallback


@app.get("/api/validation-summary")
async def validation_summary():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    training = _read_json_file(
        os.path.join(root, "training_benchmark_results.json"),
        {"summary": {"total_cases": 0, "passed_cases": 0, "failed_cases": 0}, "results": []},
    )
    domain = _read_json_file(
        os.path.join(root, "domain_benchmark_results.json"),
        {"summary": {"checked_cases": 0, "passed_cases": 0, "failed_cases": 0}, "results": []},
    )
    public_cases = [
        r for r in training.get("results", [])
        if str(r.get("name", "")).startswith("seoul_subway")
    ]
    domains = sorted({
        r.get("domain") for r in training.get("results", [])
        if r.get("domain") and r.get("domain") != "도메인 확인 필요"
    })
    return {
        "training": training.get("summary", {}),
        "domain": domain.get("summary", {}),
        "public_institution_cases": len(public_cases),
        "domains": domains,
        "updated": "2026-06-04",
    }
