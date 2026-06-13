import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SAMPLE_DIR = ROOT / "frontend" / "public" / "samples"
META_PATH = SAMPLE_DIR / "starter_packs.json"


def main():
    results = []
    if not META_PATH.exists():
      raise SystemExit(f"missing metadata: {META_PATH}")

    packs = json.loads(META_PATH.read_text(encoding="utf-8"))
    results.append({"name": "starter pack metadata loads", "status": "pass", "count": len(packs)})
    if len(packs) < 4:
        results.append({"name": "at least four starter packs", "status": "fail", "count": len(packs)})
    else:
        results.append({"name": "at least four starter packs", "status": "pass", "count": len(packs)})

    required = {"id", "title", "problem_type", "sample_file", "recommended_target", "recommended_metric", "business_question"}
    for pack in packs:
        missing = sorted(required - set(pack))
        results.append({
            "name": f"{pack.get('id', 'unknown')} required metadata",
            "status": "fail" if missing else "pass",
            "missing": missing,
        })
        sample_file = SAMPLE_DIR / pack.get("sample_file", "")
        if not sample_file.exists():
            results.append({"name": f"{pack.get('id')} sample csv exists", "status": "fail", "path": str(sample_file)})
            continue
        with sample_file.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            columns = reader.fieldnames or []
        target = pack.get("recommended_target")
        results.append({
            "name": f"{pack.get('id')} target column present",
            "status": "pass" if target in columns else "fail",
            "target": target,
            "columns": columns,
        })
        results.append({
            "name": f"{pack.get('id')} has enough demo rows",
            "status": "pass" if len(rows) >= 12 else "fail",
            "rows": len(rows),
        })

    summary = {
        "total": len(results),
        "failed": sum(1 for item in results if item["status"] != "pass"),
        "passed": sum(1 for item in results if item["status"] == "pass"),
    }
    print(json.dumps({"summary": summary, "results": results}, ensure_ascii=False, indent=2))
    if summary["failed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
