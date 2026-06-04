# ModelMate

CSV를 업로드하면 데이터 성격 판단, 맞힐 값 추천, 모델 비교, 결과 요약, 예측 이유 설명까지 이어주는 AutoML 데모 서비스입니다.

## 배포

- Railway: https://web-production-5d6fa.up.railway.app/
- GitHub: https://github.com/ohsewool/-
- Branch: `main`

## 핵심 흐름

1. 로그인
2. CSV 업로드
3. AI 자동 분석 또는 모델 비교
4. 결과 요약 확인
5. 이유 보기와 새 데이터 예측
6. 작업공간에서 기록/데이터셋 다시 확인

## 최근 고도화 상태

- 작업공간: 저장된 데이터셋, 데이터셋 상세, 다시 분석 흐름, 최근 분석 요약
- 관리자: 사용자/프로젝트/데이터셋/실험 수, 도메인 분포, 최근 업로드
- AI 에이전트: 데이터 판단, 모델 추천 이유, 위험 메모, 다음 행동 추천
- 데모 안정성: 상단 헤더에서 데모 모드 토글, 외부 AI 토큰 없이 발표 연습 가능
- 업로드 검증: 빈 파일, 단일 열, 변화 없는 값, 잡담형 파일 차단
- QA: `scripts/run_final_qa.py`로 도메인/학습/업로드 검증 통합 실행

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
python scripts/run_final_qa.py
```

최신 QA 결과:

- `FINAL_QA_RESULTS.md`
- `final_qa_results.json`
- `domain_benchmark_results.json`
- `training_benchmark_results.json`

## 발표용 계정

기본 관리자 계정은 환경변수로 바꿀 수 있습니다.

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

환경변수가 없으면 기본값은 `admin@modelmate.local` / `admin1234`입니다.
