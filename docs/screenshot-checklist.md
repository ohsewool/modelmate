# Screenshot Checklist

포트폴리오/GitHub/발표 자료에 사용할 화면 캡처 기준입니다. secret, token 전체
값, 실제 개인정보, 민감한 CSV 내용은 노출하지 않습니다.

| 화면 | Route | 보여줄 내용 | 중요한 이유 | 준비 |
| --- | --- | --- | --- | --- |
| 랜딩 페이지 | `/` | headline, CTA, 작동 방식 | 제품 포지셔닝 | 없음 |
| Starter pack gallery | `/` 또는 dashboard empty state | 합성 샘플 데이터 선택 | 첫 사용자 진입 | sample data notice 표시 |
| New analysis/upload | `/new` 또는 upload flow | CSV 업로드, 데이터 구조 요약 | 핵심 시작 흐름 | 합성 CSV 사용 |
| Target recommendation | upload flow | 추천 타깃, 제외 컬럼 | guided analysis 차별점 | 추천 타깃이 보이는 샘플 |
| Dashboard | `/dashboard` | 프로젝트/작업/사용량 요약 | SaaS workspace 느낌 | 로그인 상태 |
| Projects | `/projects` | 저장된 프로젝트 목록 | 재사용 가능성 | 1개 이상 프로젝트 |
| Project overview | `/projects/{id}` | report/API/dataset 상태 | project 중심 구조 | 프로젝트 생성 |
| Runs tab | `/projects/{id}?tab=runs` | 실행 기록 | history/rerun | 분석 완료 프로젝트 |
| Run timeline | `/projects/{id}/runs/{run_id}` | 상태/timeline/recovery | trace 설명 | run id 준비 |
| Report | `/projects/{id}?tab=report` | metric, warning, XAI, limitations | trust/evidence | 보고서 생성 |
| Prediction API tab | `/projects/{id}?tab=api` | readiness, endpoint 예시 | API 재사용 | token 전체 값 가림 |
| Token warning | API tab | “한 번만 표시” 안내 | 보안성 | 새 token 생성 직후 캡처 주의 |
| Jobs | `/jobs` | succeeded/failed/running 상태 | 운영 준비성 | 작업 이력 |
| Settings/Usage | `/settings` | 사용량 한도, request ID/error ID 안내 | SaaS 운영 요소 | 로그인 상태 |
| Feedback form | workspace shell/settings | 피드백 입력 | beta feedback loop | 민감정보 입력 금지 |
| Pilot inquiry/Pricing | `/pricing` | Free/Pro/Team, 결제 미연결 안내 | 파일럿 준비 | 실제 결제 아님 표시 |
| Failure recovery | jobs/run detail | friendly error, next action | 실패 복구 | 잘못된 CSV 또는 failed job |

## 캡처 금지

- API token 전체 값
- 실제 고객/학생/의료/결제/주민번호 데이터
- raw CSV 내용 전체
- 서버 secret, 환경변수, session token
- traceback 또는 내부 파일 경로가 포함된 오류 화면

## 권장 캡처 순서

1. 랜딩
2. Starter pack
3. Upload/target recommendation
4. Dashboard/projects
5. Project detail/run timeline
6. Report
7. Prediction API
8. Jobs/settings
9. Feedback/pilot inquiry
