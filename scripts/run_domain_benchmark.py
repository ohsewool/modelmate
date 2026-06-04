import importlib
import json
import sys
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
m = importlib.import_module("backend.main")


FIXTURES = [
    ("heart_health", {
        "age": [52, 61, 44], "cholesterol": [212, 280, 190],
        "blood_pressure": [130, 145, 120], "disease": [1, 1, 0],
    }, "disease", "의료/건강 진단", "질병/진단 여부"),
    ("manufacturing_quality", {
        "machine_id": ["M1", "M2", "M3"], "temperature": [62, 79, 55],
        "vibration": [0.2, 0.9, 0.1], "defect": ["normal", "fault", "normal"],
    }, "defect", "제조/설비 품질", "고장 여부"),
    ("customer_churn", {
        "customer_id": ["C1", "C2", "C3"], "tenure": [12, 2, 30],
        "monthlycharges": [70, 95, 45], "churn": ["No", "Yes", "No"],
    }, "churn", "고객 이탈/CRM", "이탈 여부"),
    ("sales_amount", {
        "order_date": ["2025-01", "2025-02", "2025-03"], "quantity": [3, 5, 2],
        "price": [10000, 12000, 9000], "sales": [30000, 60000, 18000],
    }, "sales", "금액/매출", "금액 예측"),
    ("unknown_table", {
        "alpha": [1, 2, 3], "beta": [4, 5, 6], "gamma": [0, 1, 0],
    }, "gamma", "도메인 확인 필요", "두 값 분류"),
]


def check_fixture(name, data, target, expected_domain, expected_purpose):
    df = pd.DataFrame(data)
    info = m.infer_target_category(df, target)
    return {
        "name": name,
        "target": target,
        "domain": info["dataset_domain"],
        "purpose": info["target_category"],
        "domain_pass": info["dataset_domain"] == expected_domain,
        "purpose_pass": info["target_category"] == expected_purpose,
    }


def check_real_csv(path):
    raw, _ = m.decode_upload_bytes(path.read_bytes())
    df, _ = m.read_table_text(raw, path.name)
    target = m.infer_default_target(df)
    info = m.infer_target_category(df, target)
    return {
        "name": path.name,
        "target": str(target),
        "shape": list(df.shape),
        "domain": info["dataset_domain"],
        "purpose": info["target_category"],
    }


def main():
    rows = [check_fixture(*case) for case in FIXTURES]
    for path in sorted((ROOT / "tmp_datasets").glob("*.csv")):
        rows.append(check_real_csv(path))
    out = ROOT / "domain_benchmark_results.json"
    out.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(rows, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
