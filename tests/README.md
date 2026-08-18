# 테스트

```bash
python3 -m pytest tests/ -q
```

## 현재 범위

학습 실행 없이 검증 가능한 **안전 게이트**부터 덮었다. 이 도구들이 잘못 판단하면 학습이 성공해도 결과를 신뢰할 수 없기 때문이다.

| 대상 | 무엇을 지키는가 |
|---|---|
| `leakage_check` | 타깃 누수 컬럼이 특징 집합에 남지 않는 것 |
| `evaluation_policy` | 약한 모델이 `continue` 판정을 받지 않는 것 |
| `schema_validation` | 학습해도 소용없는 데이터가 학습 단계로 넘어가지 않는 것 |
| `target_recommendation` | 식별자·날짜처럼 예측 대상이 될 수 없는 컬럼이 타깃으로 제안되지 않는 것 |

## 이 과정에서 고친 결함

`churn_label` 같이 **타깃 이름에서 파생된 컬럼**이 medium 위험으로 분류되어 특징 집합에 그대로 남았다. 문자열 유사도만으로는 잡히지 않는 계열이다(`churn_label` vs `churn` = 0.63, 임계값 0.72 미만). 토큰 포함 규칙을 추가했고 `TestDerivedTargetNames`가 이를 고정한다.

## 아직 덮지 않은 것

- 학습 파이프라인(`automl_training`) — 실제 학습 실행과 데이터셋이 필요하다. FULL_QA에서 training이 skipped로 남은 부분이 여기다.
- API 계층(`main_parts` 조립) — 조립 방식(`exec`)상 부분 단위 테스트가 어렵고, 별도 리팩터링이 선행되어야 한다.
- 에이전트 오케스트레이션 — 현재 mock runner 기반이라 실제 동작 검증이 아니다.
