# Final QA Results

Generated: `2026-06-05T01:36:35`

## Summary

- Domain benchmark: pass
- Training benchmark: pass_cached
- Workspace flow: pass
- Upload validation: 8 / 8 pass

## Workspace Flow

| Check | Result |
|---|---|
| Dataset linked to history | 1bb0340b |
| Saved model version | v1 |
| Saved model storage | 사용 가능 |

## Upload Validation Cases

| Case | Expected | Result | Note |
|---|---|---|---|
| empty_table | reject | pass | 데이터가 비어 있습니다. 행과 열이 있는 CSV 파일을 올려주세요. |
| one_column | reject | pass | 데이터셋으로 보기 어렵습니다: 열이 2개 미만, 값이 있는 열이 2개 미만, 변화가 있는 열이 2개 미만. 행/열이 있는 CSV 데이터셋을 올려주세요. |
| constant_values | reject | pass | 데이터셋으로 보기 어렵습니다: 변화가 있는 열이 2개 미만. 행/열이 있는 CSV 데이터셋을 올려주세요. |
| chat_text | reject | pass | 데이터셋으로 보기 어렵습니다: 변화가 있는 열이 2개 미만. 행/열이 있는 CSV 데이터셋을 올려주세요. |
| ch2025.csv | accept | pass | 업로드 가능한 데이터셋입니다. |
| pima.csv | accept | pass | 업로드 가능한 데이터셋입니다. |
| playground.csv | accept | pass | 업로드 가능한 데이터셋입니다. |
| seoul_bike.csv | accept | pass | 업로드 가능한 데이터셋입니다. |
