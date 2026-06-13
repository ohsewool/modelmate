# Use-case Starter Packs

PR-22 adds lightweight starter packs for first-time ModelMate users. The goal is
to make it clear what a CSV predictive analysis workflow can do before a user has
their own dataset ready.

Starter packs are not a template marketplace. They are small demo entry points
that load synthetic CSV files into the same upload and analysis flow used by
normal user uploads.

## Included Packs

| id | title | sample CSV | target | type | metric |
| --- | --- | --- | --- | --- | --- |
| `customer-churn` | 고객 이탈 예측 | `frontend/public/samples/customer_churn_demo.csv` | `churn` | classification | ROC-AUC or F1 |
| `sales-demand` | 매출/수요 예측 | `frontend/public/samples/sales_demand_demo.csv` | `demand` | regression | MAE or RMSE |
| `equipment-failure` | 설비 고장 위험 예측 | `frontend/public/samples/equipment_failure_demo.csv` | `failure_risk` | classification | F1 or ROC-AUC |
| `marketing-conversion` | 마케팅 전환 예측 | `frontend/public/samples/marketing_conversion_demo.csv` | `converted` | classification | ROC-AUC or F1 |
| `student-performance` | 학생 성과 예측 | `frontend/public/samples/student_performance_demo.csv` | `passed` | classification | F1 |

Machine-readable metadata is available at:

```text
frontend/public/samples/starter_packs.json
```

Frontend UI metadata is defined in:

```text
frontend/src/data/starterPacks.js
```

## Demo Data Notice

All starter pack CSV files are synthetic demo data. They are not real customer,
sales, equipment, marketing, or student records.

User-facing notice:

```text
이 샘플 데이터는 기능 시연을 위한 합성 데이터입니다. 실제 의사결정에는 사용자의 실제 CSV로 다시 검증해야 합니다.
```

Reports and prediction API flows created from starter data should be read as
feature demonstrations, not as real business recommendations.

## User Flow

1. User opens the landing page, dashboard empty state, projects empty state, or
   upload screen.
2. User selects a starter pack.
3. The frontend loads the local static sample CSV from `/samples/...`.
4. The file is submitted to the existing `/api/upload` endpoint.
5. The existing column analysis and target setup flow continues normally.
6. The recommended target is preselected when the sample contains it.
7. The user can continue to model comparison, grounded report, and prediction
   API reuse exactly like a manually uploaded CSV.

The starter pack flow does not bypass upload validation, target selection,
AutoML training, report generation, or prediction API logic.

## UI Entry Points

- Public landing page: small starter pack section.
- Upload page: starter pack gallery with `샘플로 시작` and `CSV 받기`.
- Workspace dashboard empty state: points first-time users to samples.
- Workspace projects empty state: points first-time users to samples.

## Adding A New Starter Pack

1. Add a small synthetic CSV under `frontend/public/samples/`.
2. Add metadata to `frontend/public/samples/starter_packs.json`.
3. Add matching UI metadata to `frontend/src/data/starterPacks.js`.
4. Make sure the recommended target column exists in the CSV.
5. Run:

```bash
python scripts/run_starter_pack_smoke.py
cd frontend && npm run build
```

## Validation

`scripts/run_starter_pack_smoke.py` verifies:

- starter pack metadata loads;
- at least four starter packs exist;
- required metadata fields are present;
- each sample CSV exists;
- each recommended target column exists in its CSV;
- each sample has enough demo rows.

Known limitation: this script checks files and metadata. It does not run a full
browser interaction. Full manual QA should still verify that clicking
`샘플로 시작` opens the normal analysis flow.
