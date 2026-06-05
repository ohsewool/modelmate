# ModelMate

CSV를 업로드하면 데이터 성격 판단, 맞힐 값 추천, 모델 비교, 결과 요약, 예측 이유 설명, 새 데이터 예측, 공유 API까지 이어주는 범용 AutoML 서비스입니다.

## 배포

- Railway: https://web-production-5d6fa.up.railway.app/
- GitHub: https://github.com/ohsewool/-
- Branch: `main`

## 핵심 흐름

1. 로그인
2. CSV 업로드와 분석 준비도 확인
3. AI 자동 분석 또는 모델 비교
4. 결과 요약과 이유 보기 확인
5. 새 데이터 예측
6. 공유 API 생성
7. 작업공간에서 데이터셋, 실험, 저장 모델 재사용

## 최근 고도화 상태

- 작업공간: 저장된 데이터셋, 실험 상세, 다시 분석, 새 예측, API 공유 흐름
- 관리자: 사용자/프로젝트/데이터셋/실험 수, 도메인 분포, 최근 업로드, 운영 위험 신호
- AI 에이전트: 데이터 판단, 모델 추천 이유, 1/2위 모델 비교 근거, 위험 메모, 다음 행동 보드
- 업로드 에이전트: CSV 판단 로그로 데이터 성격, 맞힐 값, 제외 컬럼, 다음 실행 흐름 표시
- 결과 요약: 의사결정 요약, 서비스 흐름, 모델 비교, 모델 선택 근거, 중요 정보 설명
- 공유/API: 공개 준비도, 예측 URL, 테스트 입력, API 운영 요약, 운영 상태 표시
- 데모 안정성: 일반 공개 화면에는 데모 모드를 숨기고, `?presenter=1` 발표자 세션에서만 외부 AI 토큰 없이 발표 연습 가능
- 업로드 검증: 빈 파일, 단일 열, 변화 없는 값, 잡담형 파일 차단
- QA: `scripts/run_full_qa.py`로 도메인/업로드/학습/워크스페이스/API/프론트 빌드 통합 실행

## 로컬 실행

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

프론트 빌드:

```bash
cd frontend
npm run build
```

## 테스트

```bash
python scripts/run_domain_benchmark.py
python scripts/run_training_benchmark.py
python scripts/run_full_qa.py
python scripts/run_full_qa.py --skip-slow
```

최신 QA 결과:

- `FULL_QA_RESULTS.md`
- `full_qa_results.json`
- `domain_benchmark_results.json`
- `training_benchmark_results.json`
- `workspace_flow_qa_results.json`

## 발표용 계정

기본 관리자 계정은 환경변수로 바꿀 수 있습니다.

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

환경변수가 없으면 기본값은 `admin@modelmate.local` / `admin1234`입니다.
