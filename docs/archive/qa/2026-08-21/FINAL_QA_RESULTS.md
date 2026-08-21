# Final QA Results

Generated: `2026-08-19T22:48:28`

## Summary

- Domain benchmark: pass
- Training benchmark: pass
- Workspace flow: pass
- Upload validation: 5 / 5 pass

## Workspace Flow

| Check | Result |
|---|---|
| Dataset linked to history | ca8e246d |
| Saved model version | v1 |
| Saved model storage | 사용 가능 |

## Upload Validation Cases

| Case | Expected | Result | Note |
|---|---|---|---|
| empty_table | reject | pass | 데이터가 비어 있습니다. 행과 열이 있는 CSV 파일을 올려주세요. |
| one_column | reject | pass | 데이터셋으로 보기 어렵습니다: 열이 2개 미만, 값이 있는 열이 2개 미만, 변화가 있는 열이 2개 미만. 행/열이 있는 CSV 데이터셋을 올려주세요. |
| constant_values | reject | pass | 데이터셋으로 보기 어렵습니다: 변화가 있는 열이 2개 미만. 행/열이 있는 CSV 데이터셋을 올려주세요. |
| chat_text | reject | pass | 데이터셋으로 보기 어렵습니다: 변화가 있는 열이 2개 미만. 행/열이 있는 CSV 데이터셋을 올려주세요. |
| multi_note_text | reject | pass | 데이터셋으로 보기 어렵습니다: 긴 설명 열이 대부분. 행/열이 있는 CSV 데이터셋을 올려주세요. |
