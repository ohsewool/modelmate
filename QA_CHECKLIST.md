# QA Checklist

## 발표 전 필수 확인

- [ ] 토큰을 쓰지 않고 연습할 때는 상단 상태 배지를 눌러 `데모 모드`로 바꾼다.
- [ ] 데모 모드가 켜지면 상단 상태 배지가 `데모 모드`로 보인다.
- [ ] 실제 Gemini 호출을 다시 쓰려면 상단 상태 배지를 다시 눌러 `정상 작동`으로 바꾼다.
- [ ] Railway 배포 URL이 최신 번들을 보고 있는지 확인한다.
- [ ] `/upload` 화면에서 CSV 업로드가 된다.
- [ ] 업로드 후 예측할 값과 제외할 정보가 표시된다.
- [ ] `/model-lab`에서 모델 비교가 실행된다.
- [ ] `/report`에서 선택된 모델과 결과 요약이 보인다.
- [ ] `/xai`에서 핵심 근거와 중요 정보 순위가 보인다.
- [ ] `/history`에서 최근 분석 요약, 저장된 데이터셋, 관리자 운영 현황이 보인다.
- [ ] 4번, 5번 화면에 큰 영어 문장이 튀어나오지 않는다.
- [ ] 6번, 7번은 핵심 흐름이 아니라 선택 확장 기능으로 보인다.
- [ ] 새로고침 후에도 페이지가 깨지지 않는다.
- [ ] 브라우저 캐시가 남아 있으면 `Ctrl + F5`로 새로고침한다.
- [ ] 최종 확인으로 `python scripts/run_final_qa.py`가 통과한다.

## 데모 모드

토큰을 소모하지 않는 테스트 방법:

- 앱 상단의 `정상 작동` 배지를 클릭해 `데모 모드`로 바꾼다.
- URL 방식도 가능하다: `https://web-production-5d6fa.up.railway.app/upload?demo=1`
- 발표자용 데모 파일 안내 카드는 일반 `/upload`에는 보이지 않고, `/upload?demo=1` 또는 `/upload?presenter=1`에서만 보인다.

데모 모드에서는 컬럼 분석과 자동 분석 설명에서 외부 Gemini API를 호출하지 않는다. 모델 학습, 모델 비교, 결과 요약 화면은 계속 테스트할 수 있다.

데모 모드 끄기:

- 앱 상단의 `데모 모드` 배지를 다시 클릭한다.
- URL 방식도 가능하다: `https://web-production-5d6fa.up.railway.app/upload?demo=0`

## 최종 QA

최신 자동 검증 결과:

- 도메인 벤치마크: 13 / 13 통과
- 학습 벤치마크: 14 / 14 통과
- 작업공간 흐름: 데이터셋 저장 -> 실험 기록 -> 모델 저장 -> 버전/저장상태 통과
- 업로드 검증: 8 / 8 통과

결과 파일:

- `FINAL_QA_RESULTS.md`
- `final_qa_results.json`
- `workspace_flow_qa_results.json`

## 즉석 데모와 백업 데이터셋

- 기본은 즉석 CSV 업로드 시연이다.
- 백업: `tmp_datasets/pima.csv`
- 백업: `tmp_datasets/ch2025.csv`
- 백업: `tmp_datasets/seoul_bike.csv`
- 선택 백업: `tmp_datasets/playground.csv`

상세 흐름은 `DEMO_DATASET_PLAYBOOK.md`를 따른다.

## 발표 중 주의

- ROC-AUC, Optuna, Feature importance 같은 용어를 먼저 설명하지 않는다.
- 먼저 "CSV만 넣으면 모델 비교와 결과 설명까지 된다"고 말한다.
- 6번 새 데이터 예측과 7번 API 공유는 시간이 남을 때만 보여준다.
- 작업공간과 실험 비교는 "상용 서비스처럼 기록이 남는다"는 보조 근거로 보여준다.
