import importlib
import json
import sys
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
m = importlib.import_module("backend.main")


def repeat(values, n=12):
    return (values * ((n // len(values)) + 1))[:n]


CASES = [
    {
        "name": "valid_public_transport",
        "filename": "bike_members.csv",
        "df": pd.DataFrame({
            "month": repeat(["2025-07", "2025-08", "2025-09"]),
            "age_group": repeat(["20s", "30s", "40s", "50s"]),
            "gender": repeat(["M", "F"]),
            "member_type": repeat(["regular", "trial", "regular"]),
            "join_count": [120, 150, 90, 180, 110, 130, 160, 145, 99, 121, 144, 172],
        }),
        "valid": True,
    },
    {
        "name": "valid_health",
        "filename": "pima_like_health.csv",
        "df": pd.DataFrame({
            "age": [29, 41, 55, 33, 62, 48, 37, 58, 44, 51, 39, 46],
            "glucose": [95, 160, 188, 120, 170, 135, 102, 180, 140, 155, 112, 130],
            "bmi": [22.1, 31.0, 35.2, 26.5, 32.7, 28.4, 24.0, 34.1, 29.2, 30.5, 25.1, 27.9],
            "diabetes": repeat([0, 1, 1, 0], 12),
        }),
        "valid": True,
    },
    {
        "name": "valid_finance",
        "filename": "credit_risk.csv",
        "df": pd.DataFrame({
            "income": [4500, 2200, 7100, 3200, 5400, 3900, 6800, 2800, 6100, 4700, 3500, 7300],
            "debt": [900, 1800, 600, 1600, 1200, 2100, 700, 2400, 900, 1100, 1700, 650],
            "credit_score": [710, 590, 760, 620, 690, 580, 750, 560, 720, 700, 610, 780],
            "loan_default": repeat([0, 1, 0, 1], 12),
        }),
        "valid": True,
    },
    {
        "name": "valid_hr_customer",
        "filename": "customer_churn_hr.csv",
        "df": pd.DataFrame({
            "tenure": [12, 2, 30, 4, 18, 7, 42, 9, 24, 3, 16, 28],
            "monthly_charge": [70, 95, 45, 102, 66, 88, 40, 91, 55, 99, 72, 50],
            "support_tickets": [1, 5, 0, 4, 2, 3, 0, 6, 1, 5, 2, 0],
            "churn": repeat(["No", "Yes", "No", "Yes"], 12),
        }),
        "valid": True,
    },
    {
        "name": "valid_facility_safety",
        "filename": "facility_safety.csv",
        "df": pd.DataFrame({
            "facility_age": [2, 9, 5, 13, 4, 7, 15, 3, 8, 11, 6, 10],
            "inspection_score": [92, 61, 80, 55, 88, 70, 49, 90, 73, 60, 83, 68],
            "accident_count": [0, 2, 0, 3, 0, 1, 4, 0, 1, 2, 0, 1],
            "risk_level": repeat(["low", "high", "low", "high"], 12),
        }),
        "valid": True,
    },
    {
        "name": "valid_manufacturing",
        "filename": "manufacturing_quality.csv",
        "df": pd.DataFrame({
            "temperature": [55, 78, 62, 81, 57, 73, 60, 86, 64, 79, 58, 75],
            "vibration": [0.1, 0.9, 0.3, 1.0, 0.2, 0.8, 0.25, 1.1, 0.4, 0.95, 0.2, 0.7],
            "pressure": [101, 110, 104, 113, 102, 108, 103, 115, 105, 111, 102, 109],
            "defect": repeat(["normal", "fault", "normal", "fault"], 12),
        }),
        "valid": True,
    },
    {
        "name": "tiny_rows",
        "filename": "tiny.csv",
        "df": pd.DataFrame({"x": [1, 2, 3], "y": [0, 1, 0]}),
        "valid": False,
    },
    {
        "name": "single_column",
        "filename": "single.csv",
        "df": pd.DataFrame({"memo": ["a", "b", "c", "d", "e"]}),
        "valid": False,
    },
    {
        "name": "constant_columns",
        "filename": "constant.csv",
        "df": pd.DataFrame({"a": [1, 1, 1, 1, 1], "b": ["x", "x", "x", "x", "x"]}),
        "valid": False,
    },
    {
        "name": "text_document",
        "filename": "notes.txt",
        "df": pd.DataFrame({
            "title": ["meeting", "summary", "memo", "note", "body"],
            "body": [
                "This is a long free-form note, not a predictive tabular dataset. " * 2,
                "The content is closer to a document than rows and columns for modeling. " * 2,
                "There is no clear target column or feature structure for training. " * 2,
                "Upload validation should reject this kind of accidental file. " * 2,
                "The presenter may upload the wrong text file during rehearsal. " * 2,
            ],
        }),
        "valid": False,
    },
    {
        "name": "non_predictive_ids",
        "filename": "id_directory.csv",
        "df": pd.DataFrame({
            "user_id": [f"U{i:03d}" for i in range(12)],
            "serial_code": [f"SX-{i:03d}" for i in range(12)],
            "name": [f"user-{i}" for i in range(12)],
            "address": [f"road-{i}" for i in range(12)],
        }),
        "valid": False,
    },
    {
        "name": "date_only",
        "filename": "dates.csv",
        "df": pd.DataFrame({
            "start_date": pd.date_range("2025-01-01", periods=8),
            "end_date": pd.date_range("2025-02-01", periods=8),
        }),
        "valid": False,
    },
    {
        "name": "wrong_extension",
        "filename": "report.pdf",
        "df": pd.DataFrame({"x": [1, 2, 3, 4, 5], "y": [0, 1, 0, 1, 0]}),
        "valid": False,
    },
]


def run_case(case):
    ok, message, info = m.validate_dataset_file(case["df"], case["filename"])
    target = m.infer_default_target(case["df"]) if ok else None
    domain = m.infer_target_category(case["df"], target) if ok and target in case["df"].columns else {}
    return {
        "name": case["name"],
        "filename": case["filename"],
        "expected_valid": case["valid"],
        "actual_valid": ok,
        "passed": ok == case["valid"],
        "message": message,
        "score": info.get("score"),
        "readiness_label": info.get("readiness_label"),
        "reasons": info.get("reasons", []),
        "target": str(target) if target is not None else None,
        "domain": domain.get("dataset_domain"),
        "purpose": domain.get("target_category"),
    }


def main():
    results = [run_case(case) for case in CASES]
    failed = [row for row in results if not row["passed"]]
    payload = {
        "summary": {
            "checked_cases": len(results),
            "passed_cases": len(results) - len(failed),
            "failed_cases": len(failed),
        },
        "results": results,
    }
    (ROOT / "upload_validation_qa_results.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
