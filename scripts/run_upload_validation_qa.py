import importlib
import json
import sys
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
m = importlib.import_module("backend.main")


CASES = [
    {
        "name": "valid_public_transport",
        "filename": "bike_members.csv",
        "df": pd.DataFrame({
            "가입년월": ["2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"],
            "연령대": ["20대", "30대", "40대", "20대", "30대", "50대"],
            "성별": ["남", "여", "남", "여", "남", "여"],
            "회원구분": ["정회원", "정회원", "준회원", "정회원", "준회원", "정회원"],
            "가입건수": [120, 150, 90, 180, 110, 130],
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
            "title": ["회의록", "설명", "메모", "요약", "본문"],
            "body": [
                "이 파일은 예측할 표 데이터가 아니라 긴 문장 설명으로 구성되어 있습니다." * 2,
                "데이터셋처럼 보이지만 실제로는 문서에 가까운 내용입니다." * 2,
                "모델이 학습할 숫자나 분류 타겟이 명확하지 않습니다." * 2,
                "업로드 검증에서 친절하게 거절해야 하는 케이스입니다." * 2,
                "발표 중 실수로 잡담 파일을 넣었을 때 방어해야 합니다." * 2,
            ],
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
