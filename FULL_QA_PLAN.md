# ModelMate Full QA Plan

## 목적

11월 졸업프로젝트 발표 전까지 ModelMate가 고정 샘플 데모가 아니라 범용 CSV AutoML SaaS처럼 동작하는지 반복 검증한다.

## 기본 원칙

- 기본 시연은 즉석 CSV 업로드다.
- Pima, CH2025, 제조/품질, 공공자전거, 공공시설 데이터는 백업 QA 세트로만 쓴다.
- 외부 AI 토큰을 쓰지 않는 검증을 우선한다.
- 긴 검증은 중간에 끊겨도 이어받을 수 있게 결과 파일을 남긴다.

## QA 단계

1. 도메인 판단
   - 건강, 제조, CRM, 매출, 교육, 금융, 부동산, 마케팅, HR, 환경, 물류, 보안, 미확인 표 데이터를 확인한다.
2. 업로드 검증
   - 빈 파일, 한 컬럼 파일, 상수값 파일, 긴 문장 파일, 긴 설명 열 위주 파일, 중복 컬럼, 컬럼명 없음, 날짜만 있는 파일을 확인한다.
3. 백업 CSV 검증
   - `tmp_datasets`와 `tmp_public_downloads`의 CSV를 읽고 업로드 가능한지 확인한다.
4. 학습 검증
   - sklearn 샘플과 백업 CSV로 모델 비교가 끝까지 되는지 확인한다.
5. 작업공간 검증
   - 데이터셋 저장, 실험 기록, 저장 모델, 버전, 저장 상태를 확인한다.
6. 공유 API 검증
   - 저장 모델 생성 후 예측 URL이 응답하는지 확인한다.
7. 프론트 검증
   - Vite 빌드가 통과하는지 확인한다.
8. 배포 검증
   - Railway가 최신 번들을 서빙하는지 확인한다.

## 결과 파일

- `full_qa_results.json`
- `FULL_QA_RESULTS.md`
- 기존 세부 결과:
  - `domain_benchmark_results.json`
  - `training_benchmark_results.json`
  - `workspace_flow_qa_results.json`

## 완료 기준

- 필수 단계가 모두 pass 또는 pass_cached다.
- 업로드 실패 케이스는 500이 아니라 친절한 거절로 처리된다.
- 정상 CSV는 업로드 가능으로 판단된다.
- 학습, 작업공간, 공유 API 중 하나라도 실패하면 수정 후 재실행한다.
