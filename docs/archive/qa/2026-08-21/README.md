# QA 스냅숏 — 2026-08-21

## 왜 여기 있나

이 파일들은 저장소 루트에서 **git에 추적되고 있었다.** QA 스크립트와 실행 중인 앱이
쓰는 런타임 산출물인데, 매 실행마다 내용이 바뀌면서 그때그때의 로컬 상태가 커밋에
따라 들어갔다.

`experiment_history.json`이 그 모양을 가장 분명히 보여준다. 2.3KB에서 34.4KB로
자랐고, **27건 중 8건이 문서 최신성 감사를 돌리며 생긴 것**이다 — 로컬 서버에 대고
스모크와 Agent Mode를 돌린 부수효과지 실제 분석 작업이 아니다. 그 8건이 다른 19건과
같은 무게로 저장소에 남아 있었다.

같은 회차에 `.coverage`가 다섯 저장소 전부에 추적되고 있던 것을 찾았는데, 이것은 그
바로 옆에 있던 것이다. **매 실행마다 바뀌는 파일은 읽을 수 있는 diff로 나타나지 않고,
그래서 아무도 반대하지 않는다.**

## 무엇을 바꿨나

- 루트의 런타임 산출물을 `.gitignore`에 넣었다. `modelmate.db`·`uploaded_datasets/`와
  같은 범주다 — **하나는 무시하고 하나는 추적하던 것이 일관성 없는 상태였다.**
- 추적을 끊기 전 상태를 여기 보존했다. 지우면 그동안의 기록이 사라지고, 그대로 두면
  다음 실행이 다시 더럽힌다.

이 저장소에는 [2026-06-14 스냅숏](../2026-06-14/README.md)이 이미 있다. **패턴은
있었고 한 번 쓰이고 이어지지 않았다.**

## 어떻게 읽나

**현재 저장소·런타임·보안·배포 상태의 증거로 제시해서는 안 된다.** 그때 그 기계에서
그 시점에 나온 값이다.

`provenance.json`에 커밋 해시, 생성 방법, 그리고 `experiment_history.json`의 날짜별
항목 수가 있다 — 어느 것이 감사 실행분인지 세어 볼 수 있게.

지금의 QA는 손으로 돌린 결과가 아니라 CI가 매 push마다 돌린다:

- `tests` 워크플로 — 스위트, README 테스트 수 대조, 문서 경로 검사
- `product` 워크플로 — 앱 부팅, 제품 스모크, 실패복구 스모크, **Agent Mode 스모크**,
  QA 뒷정리 확인

## 파일

| 파일 | 생성 |
|---|---|
| `FULL_QA_RESULTS.md`, `full_qa_results.json` | `scripts/run_full_qa.py` |
| `FINAL_QA_RESULTS.md`, `final_qa_results.json` | `scripts/run_final_qa.py` |
| `domain_benchmark_results.json` | `scripts/run_domain_benchmark.py` |
| `training_benchmark_results.json` | `scripts/run_training_benchmark.py` |
| `upload_validation_qa_results.json` | `scripts/run_upload_validation_qa.py` |
| `workspace_flow_qa_results.json` | `scripts/run_workspace_flow_qa.py` |
| `experiment_history.json` | 실행 중인 앱 (`run_cv`) — **런타임 상태** |
