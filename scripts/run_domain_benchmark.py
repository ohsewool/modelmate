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
    ("education_performance", {
        "student_id": ["S1", "S2", "S3"], "attendance": [92, 70, 81],
        "exam_score": [88, 61, 77], "pass": ["Y", "N", "Y"],
    }, "pass", "교육/학습 성과", "합격/수료 여부"),
    ("finance_credit", {
        "income": [4500, 2200, 7100], "debt": [900, 1800, 600],
        "credit_score": [710, 590, 760], "loan_default": [0, 1, 0],
    }, "loan_default", "금융/신용 리스크", "대출/연체 위험 판단"),
    ("real_estate_price", {
        "area": [84, 59, 112], "rooms": [3, 2, 4],
        "floor": [12, 5, 21], "rent_price": [180, 120, 260],
    }, "rent_price", "부동산/가격 예측", "부동산 가격 예측"),
    ("marketing_conversion", {
        "campaign": ["A", "B", "A"], "click": [1, 0, 1],
        "impression": [1200, 800, 1600], "purchase": [1, 0, 1],
    }, "purchase", "마케팅/구매 전환", "구매/전환 여부"),
    ("hr_attrition", {
        "employee_id": ["E1", "E2", "E3"], "salary": [5200, 3900, 6100],
        "department": ["sales", "ops", "tech"], "attrition": ["No", "Yes", "No"],
    }, "attrition", "인사/HR", "퇴사/이직 여부"),
    ("weather_environment", {
        "humidity": [60, 75, 45], "wind": [2.1, 4.2, 1.8],
        "pm10": [35, 82, 22], "rainfall": [0.0, 12.5, 0.2],
    }, "rainfall", "날씨/환경", "환경 지표 예측"),
    ("logistics_delay", {
        "warehouse": ["W1", "W2", "W1"], "distance": [12, 88, 33],
        "shipment_weight": [4, 10, 7], "delivery_delay": [0, 1, 0],
    }, "delivery_delay", "물류/배송", "배송 지연 여부"),
    ("security_fraud", {
        "login_count": [2, 22, 3], "transaction_amount": [80, 9000, 120],
        "device_risk": [0.1, 0.9, 0.2], "fraud": [0, 1, 0],
    }, "fraud", "보안/이상 탐지", "사기/이상 여부"),
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
    checked = [r for r in rows if "domain_pass" in r]
    failed = [r for r in checked if not (r["domain_pass"] and r["purpose_pass"])]
    summary = {
        "checked_cases": len(checked),
        "passed_cases": len(checked) - len(failed),
        "failed_cases": len(failed),
    }
    out = ROOT / "domain_benchmark_results.json"
    payload = {"summary": summary, "results": rows}
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
