# Full QA Results

Generated: `2026-06-05T07:37:52`

## Summary

- domain: pass
- upload_matrix: pass
- workspace_flow: pass
- frontend_build: pass
- training: pass

## Workspace And API

| Check | Result |
|---|---|
| Dataset linked to history | 29444846 |
| Saved model version | v1 |
| Model storage | 사용 가능 |
| Prediction API | ok |

## Upload Matrix

| Case | Expected | Result | Note |
|---|---|---|---|
| empty | reject | pass | 데이터가 비어 있습니다. 행과 열이 있는 CSV 파일을 올려주세요. |
| one_column | reject | pass | 데이터셋으로 보기 어렵습니다: 열이 2개 미만, 값이 있는 열이 2개 미만, 변화가 있는 열이 2개 미만. 행/열이 있는 CSV 데이터셋을 올려주세요. |
| constant | reject | pass | 데이터셋으로 보기 어렵습니다: 변화가 있는 열이 2개 미만. 행/열이 있는 CSV 데이터셋을 올려주세요. |
| long_text | reject | pass | 데이터셋으로 보기 어렵습니다: 변화가 있는 열이 2개 미만. 행/열이 있는 CSV 데이터셋을 올려주세요. |
| duplicate_columns | reject | pass | 데이터셋으로 보기 어렵습니다: 중복 컬럼명 있음. 행/열이 있는 CSV 데이터셋을 올려주세요. |
| unnamed_columns | reject | pass | 데이터셋으로 보기 어렵습니다: 컬럼명이 대부분 비어 있음. 행/열이 있는 CSV 데이터셋을 올려주세요. |
| dates_only | reject | pass | 데이터셋으로 보기 어렵습니다: 날짜 컬럼만 있음. 행/열이 있는 CSV 데이터셋을 올려주세요. |
| tmp_datasets/ch2025.csv | accept | pass | 업로드 가능한 데이터셋입니다. |
| tmp_datasets/pima.csv | accept | pass | 업로드 가능한 데이터셋입니다. |
| tmp_datasets/playground.csv | accept | pass | 업로드 가능한 데이터셋입니다. |
| tmp_datasets/seoul_bike.csv | accept | pass | 업로드 가능한 데이터셋입니다. |
| tmp_public_downloads/seoul_subway_151.csv | accept | pass | 업로드 가능한 데이터셋입니다. |
| tmp_public_downloads/seoul_subway_152.csv | accept | pass | 업로드 가능한 데이터셋입니다. |
| tmp_public_downloads/seoul_subway_153.csv | accept | pass | 업로드 가능한 데이터셋입니다. |
