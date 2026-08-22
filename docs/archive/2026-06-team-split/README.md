# 2026-06 팀 분할 단계의 문서

## 왜 여기 있나

이 아홉 개는 저장소 **루트에** 있었다. 갓 클론한 사람이 처음 보는 것이 마크다운
16개였고, 그중 아홉이 `codex/split-for-team` 브랜치와 "frontend teammates",
"Part 1 backend owner"를 가리키는 6월 문서였다. 그 팀 분할은 존재하지 않는다 —
[TEAM_SPLIT.md](../../../TEAM_SPLIT.md)가 이미 기록으로 선언하고 있는 그 단계다.

이 저장소의 규칙은 이미 정해져 있었다: **선언된 낡음은 기록이고, 선언되지 않은
낡음은 결함이다.** 루트의 네 문서는 `<!-- historical: -->`로 선언돼 있었고 이
아홉은 아니었다. 같은 저장소에서 같은 판단을 절반만 적용한 상태였다.

지우지 않는다. 그때 무엇을 알고 무엇을 정했는지가 여기 있고, 지우면 그 기록이
사라진다. 읽는 사람의 첫 화면에서 비켜놓을 뿐이다.

이 저장소에는 [2026-08-21 QA 스냅숏](../qa/2026-08-21/README.md)이 이미 있다.
같은 관례를 따른다.

## 어떻게 읽나

**현재 상태의 증거로 제시해서는 안 된다.** 그 뒤로 달라진 것 중 이 문서들을
무효로 만드는 것들:

- `backend/main_parts/*.py`가 `*.part`가 됐다
- 적혀 있는 Railway URL은 무료 플랜 만료로 내려갔다. 경위는 [SECURITY.md](../../../SECURITY.md)와
  `docs/deployment-checklist.md`에 있다
- 저장소 이름 `ohsewool/-`가 `ohsewool/modelmate`가 됐다
- 인증·사용량 한도·요청 격리·감사 기록이 통째로 다시 쓰였다
  (`docs/security-notes.md`, `docs/usage-limits.md`)

지금의 안내는 [README](../../../README.md)와 [SECURITY](../../../SECURITY.md)에 있다.

## 파일

| 파일 | 무엇이었나 |
|---|---|
| `API_CONTRACT.md` | 프런트엔드 담당자가 안전하게 쓸 수 있는 백엔드 응답 필드 |
| `AUTOMATION_CONTEXT.md` | 자동화 에이전트에게 넘긴 맥락 메모 |
| `DEMO_STORY.md` | 시연 시나리오 초안 |
| `FULL_QA_PLAN.md` | 전체 QA 계획 |
| `NOVEMBER_ROADMAP.md` | 그 시점의 로드맵 |
| `OPTUNA_STABILITY_NOTES.md` | Optuna 안정성 관찰 기록 |
| `PRESENTATION_READY_RUNBOOK.md` | 발표 준비 런북 |
| `PRODUCT_POSITIONING.md` | 제품 포지셔닝 초안 |
| `PUBLIC_DATASET_TEST_RESULTS.md` | 공개 데이터셋 AutoML 견고성 1차 결과 |
