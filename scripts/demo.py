#!/usr/bin/env python3
"""Run the whole safety chain on one CSV and print what it decides.

The hosted instance is gone, and the other repositories in this set are
libraries where the test suite is the demonstration. This one is a product, so
someone looking at it wants to see it work. Without a server, that means showing
the chain end to end on a file: profile → target → leakage → training →
validation → report.

The point is not the accuracy. It is that the chain refuses to be confident when
the evidence does not support it, and that its refusals change the outcome rather
than decorating it. Run it twice and the difference is the product:

    python3 scripts/demo.py                    # clean data
    python3 scripts/demo.py --leaky            # the same data plus three leaks

The leaky run scores a perfect 1.0 until the leakage check is applied, then
drops to what the data actually supports. A user who saw only the first number
would deploy a model that reads the answer off the input.
"""

from __future__ import annotations

import argparse
import sys
import warnings
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
warnings.filterwarnings("ignore")

CLEAN = ROOT / "sample_data" / "generated" / "customer_churn.csv"
LEAKY = ROOT / "sample_data" / "generated" / "customer_churn_leaky.csv"


def rule(title: str) -> None:
    print(f"\n{'─' * 66}\n{title}\n{'─' * 66}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path)
    parser.add_argument("--leaky", action="store_true", help="use the dataset with planted leaks")
    parser.add_argument("--target", default="churn")
    parser.add_argument("--ignore-leakage", action="store_true",
                        help="train anyway, to show what the check is preventing")
    args = parser.parse_args()

    path = args.csv or (LEAKY if args.leaky else CLEAN)
    if not path.exists():
        print(f"{path} 없음 — 먼저 `python3 scripts/make_demo_data.py`를 실행하세요.")
        return 1

    from backend.tools.data_profile import data_profile_tool
    from backend.tools.leakage_check import leakage_check_tool
    from backend.tools.report_writer import report_writer_tool
    from backend.tools.validation import validation_tool

    print(f"데이터: {path.relative_to(ROOT)}    타깃: {args.target}")

    rule("1. 데이터 프로파일")
    profile = data_profile_tool({"file_path": str(path)})
    print(f"  {profile.get('row_count')}행 × {len(profile.get('columns', []))}열")

    rule("2. 누출 검사 — 이름이 아니라 컬럼이 무엇을 하는지 잰다")
    leakage = leakage_check_tool({"file_path": str(path), "target_column": args.target})
    excluded = leakage["excluded_feature_candidates"]
    for item in sorted(leakage["suspicious_columns"], key=lambda c: -c["risk_score"]):
        print(f"  {item['severity']:<6} {item['risk_score']:<5} {item['column_name']:<22}"
              f" → {item['suggested_action']}")
        print(f"         {item['reason'][:88]}")
    print(f"\n  위험도 {leakage['leakage_risk']} · 제외 권고 {excluded or '없음'}")

    rule("3. 학습")
    from backend.tools.automl_training import automl_training_tool

    drop = ["customer_id"] if args.ignore_leakage else ["customer_id"] + excluded
    if args.ignore_leakage and excluded:
        print("  --ignore-leakage: 권고를 무시하고 누출 컬럼을 그대로 학습에 넣는다\n")
    trained = automl_training_tool({
        "file_path": str(path), "target_column": args.target, "excluded_columns": drop,
    })
    if not trained.get("success"):
        print(f"  실패: {trained.get('error_message')}")
        return 1
    best = trained["best_model"]
    print(f"  최고 모델 {best['name']}   {best['metric']['label']} {best['metric']['value']}")
    print(f"  사용된 특징 {trained['used_features']}")
    if best["metric"]["value"] >= 0.99:
        print("\n  ⚠ 완벽에 가까운 점수는 대개 실력이 아니라 누출이다.")

    rule("4. 증거 검증 — 무엇을 확신해도 되는지")
    evidence = {
        "selected_target": args.target,
        "task_type": trained["task_type"],
        "model_summary": {"best_model": best["name"]},
        "metric_summary": {"evaluated_metric": best["metric"]["label"],
                           "best_metric_value": best["metric"]["value"]},
        "explanation_summary": f"상위 특징: {', '.join(trained['used_features'][:3])}",
        "threshold_status": "pass",
        "training_success": True,
        # The structured findings, not their prose. Flattening these to strings
        # is what let a high-severity column past the validation gate here.
        "suspicious_columns": leakage["suspicious_columns"],
        "leakage_risk": leakage["leakage_risk"],
        "leakage_warnings": [c["reason"] for c in leakage["suspicious_columns"]
                             if c["severity"] == "high"],
        "data_quality_warnings": [],
        "limitations": [f"학습 데이터는 {path.name} 한 파일뿐입니다."],
        "source_tool_calls": ["data_profile_tool", "schema_validation_tool", "leakage_check_tool"],
    }
    validation = validation_tool({"evidence_bundle": evidence})
    print(f"  판정 {validation['validation_status']} · 권고 서술 톤 {validation['recommended_tone']}")
    if validation["missing_evidence"]:
        print(f"  빠진 증거: {validation['missing_evidence']}")
    if validation.get("blocking_issues"):
        print(f"  차단 사유: {validation['blocking_issues']}")
    print(f"  다음 행동: {validation['recommended_next_action']}")

    rule("5. 보고서 — 검증 결과가 서술 톤을 정한다")
    report = report_writer_tool({"evidence_bundle": evidence, "validation_result": validation})
    print(f"  {report['title']}")
    print(f"  요약: {report['summary'][:150]}")
    print("\n  섹션: " + ", ".join(section["title"] for section in report["sections"]))
    print("\n  한계 고지 (LLM이 요약해도 밀려나지 않는다):")
    for limitation in report["limitations"]:
        print(f"    · {limitation}")

    rule("이 데모가 보여주는 것")
    if excluded and not args.ignore_leakage:
        print("  누출 컬럼이 학습에서 빠졌고, 점수는 데이터가 실제로 지지하는 값으로 내려갔다.")
        print("  같은 파일을 --ignore-leakage 로 다시 돌리면 그 차이가 보인다.")
    elif excluded:
        print("  권고를 무시했다. 점수는 올라갔고, 그 점수는 타깃을 베낀 컬럼에서 나온다.")
    else:
        print("  제외할 컬럼이 없었다. --leaky 로 돌리면 검사가 무엇을 잡는지 보인다.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
