# ModelMate Codex Handoff

## 현재 기준

- 배포 URL: https://web-production-5d6fa.up.railway.app/
- GitHub: https://github.com/ohsewool/-
- Branch: `main`
- 최신 확인 커밋: `94416d5 style: harden compact layout wrapping`
- 최신 배포 번들 확인: JS `assets/index-BjQVRycr.js`, CSS `assets/index-BsHtXpl6.css`
- 11월 방향성: 고정 샘플 데모가 아니라, 사용자가 임의 CSV를 올리면 데이터 분야, 예측 목적, 맞힐 값, 제외 컬럼, 모델 선택, 위험 요소, 다음 행동, 저장/재사용, 공유/API까지 이어지는 범용 AutoML SaaS처럼 보이게 만든다.

## 발표용 핵심 흐름

1. 사용자가 임의 CSV를 업로드한다.
2. ModelMate가 파일 구조, 데이터 분야, 예측 목적, 맞힐 값 후보, 제외할 컬럼, 분석 가능성을 판단한다.
3. 여러 모델을 비교하고 데이터셋에 맞는 모델을 추천한다.
4. AI 에이전트가 타겟 선택 이유, 모델 선택 이유, 위험 요소, 다음 행동, 발표용 결론을 정리한다.
5. 결과 요약과 이유 보기에서 비전공자도 이해할 수 있게 핵심만 보여주고, 보조 정보는 패널로 분리한다.
6. 실험 기록에서 과거 결과를 다시 열고, 같은 설정으로 재분석하거나 보고서를 복원한다.
7. 저장 모델, 새 데이터 예측, 공유/API 흐름으로 실제 서비스처럼 이어진다.
8. 관리자 화면에서 사용자, 실험, 저장 모델, 운영 상태를 확인한다.

## 최근 완료된 고도화

- Railway 배포 안정성 확인 및 최신 번들 반영 확인.
- 작업공간 연속성 패널 추가: 데이터셋, 실험, 보고서, 저장 모델이 한 흐름으로 보이게 정리.
- 실험 기록에서 저장된 보고서를 다시 열 수 있게 개선.
- 저장 모델 자산 요약 추가: 호출 가능 모델, 관리 대상, 정리 필요 모델, 최신 모델 표시.
- 공유/API 사용 흐름 추가: 공개 링크, 비공개 운영, API 키 UX 미리보기, 요청 예시 표시.
- AI 에이전트 판단 근거 강화: 데이터 판단, 타겟 판단, 모델 판단, 위험 요소, 다음 행동을 별도 패널로 표시.
- 업로드 검증 QA 추가: 정상 CSV, 공공 데이터, 제조/품질 데이터, tiny CSV, TXT 문서형 파일, 잘못된 파일을 no-token으로 검증.
- TXT 문서형 내용은 CSV 분석 대상으로 오해하지 않도록 친절한 거부 사유 추가.
- compact/mobile 레이아웃 보강: 카드, 버튼, 배지, 코드 블록의 줄바꿈과 좁은 화면 깨짐을 줄임.

## 현재 상태 판단

- 중간 발표 가능성: 약 85~90%.
- 11월 최종 졸프 목표 기준: 약 55~60%.
- 실제 상용 MVP 느낌 기준: 약 40~45%.
- 핵심 데모는 가능하다. 다만 실제 상용 서비스로 보이려면 계정별 영구 저장, 권한, 실제 API 인증, 모델 버전 관리, 장기 QA가 더 필요하다.

## 검증된 항목

- `scripts/run_domain_benchmark.py`: 도메인 분류 벤치마크 통과.
- `scripts/run_upload_validation_qa.py`: 업로드 검증 QA 6/6 통과.
- `scripts/run_workspace_flow_qa.py`: 작업공간 흐름 QA 통과.
- Frontend Vite build 통과.
- Backend import check 통과.
- Railway URL 200 응답 및 최신 번들 반영 확인.

## 주요 파일

- `backend/main_parts/004_data_quality.py`: 업로드 품질 판단, TXT 문서형 거부.
- `backend/main_parts/039_agent_insights.py`: AI 에이전트 판단 근거 생성.
- `frontend/src/components/agent/AgentJudgmentPanel.jsx`: 에이전트 판단 근거 UI.
- `frontend/src/components/workspace/WorkspaceContinuityPanel.jsx`: 작업공간 연속성 UI.
- `frontend/src/components/deploy/ModelAssetPanel.jsx`: 저장 모델 자산 요약 UI.
- `frontend/src/components/deploy/ApiUsageExamplePanel.jsx`: 공유/API 사용 흐름 UI.
- `frontend/src/pages/Report.jsx`: 저장 보고서 복원 처리.
- `frontend/src/pages/History.jsx`: 작업공간/실험 기록 중심 화면.
- `scripts/run_upload_validation_qa.py`: 업로드 검증 자동 QA.
- `upload_validation_qa_results.json`: 최신 업로드 QA 결과.
- `NOVEMBER_ROADMAP.md`: 11월까지의 우선순위 로드맵.

## 다음 우선순위

1. 계정/작업공간 영구성 강화: 사용자별 저장 데이터셋, 실험, 보고서, 저장 모델 연결을 더 실제 서비스처럼 만든다.
2. 실험 재사용 완성: 저장된 타겟, 제외 컬럼, 선택 모델, 점수, 보고서를 완전히 복원하고 같은 설정으로 재분석한다.
3. 모델 관리 강화: 이름/버전 형태의 저장 모델, 최고 모델 재사용, 새 데이터 예측을 더 명확히 연결한다.
4. 공유/API 흐름 강화: 공개/비공개 상태, API 키 미리보기와 실제 구현 범위를 구분한다.
5. QA 확대: Pima, 제조 품질, 공공자전거, 공공시설, finance, HR/customer, invalid, malformed CSV를 반복 검증한다.
6. UI polish: 긴 설명을 줄이고, 보조 정보는 사이드 패널로 이동하며, 모바일 화면을 계속 다듬는다.

## 이어받을 때 첫 명령

```powershell
cd C:\Users\82105\Documents\Codex\2026-06-02\https-web-production-5d6fa-up-railway\work\github-repo
git status --short
git log --oneline -8
```

그 다음 최신 배포 확인:

```powershell
$html = Invoke-WebRequest -UseBasicParsing https://web-production-5d6fa.up.railway.app/
$html.StatusCode
$html.Content | Select-String "assets/index-"
```
