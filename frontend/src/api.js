import axios from 'axios'

const urlParams = new URLSearchParams(window.location.search)
if (urlParams.get('presenter') === '1') sessionStorage.setItem('mm_presenter_mode', '1')
if (urlParams.get('presenter') === '0') {
  sessionStorage.removeItem('mm_presenter_mode')
  localStorage.removeItem('mm_demo_mode')
}

const presenterMode = sessionStorage.getItem('mm_presenter_mode') === '1'
if (presenterMode && urlParams.get('demo') === '1') localStorage.setItem('mm_demo_mode', '1')
if (urlParams.get('demo') === '0') localStorage.removeItem('mm_demo_mode')
if (!presenterMode) localStorage.removeItem('mm_demo_mode')

const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')
const apiBaseUrl = configuredApiUrl
  ? (configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`)
  : '/api'

// 기본 타임아웃이 없었다 — axios의 기본값은 0, 즉 **무한**이다. 서버가 죽거나
// 연결이 끊겨도 화면은 영원히 돌고, 사용자는 무엇이 잘못됐는지 알 수 없다.
//
// 그렇다고 짧게 잡을 수도 없다. 무료 플랜이 파는 한도(5000행 × 100열)를 꽉 채운
// CSV로 `/run-cv`를 재보니 **253.5초**였다(2026-08-22 실측; 1000×20은 18.7초,
// 1000×100은 58.8초, 5000×20은 62.0초 — 시간은 대략 셀 수에 비례한다). 정당한
// 요청이 4분 넘게 걸리는데 60초에 끊으면 파는 한도가 동작하지 않는 것이 된다.
//
// 그래서 둘로 나눈다. 보통 요청은 빨리 실패하고, 분석처럼 오래 걸리는 것은
// 넉넉히 기다린다. 어느 쪽이든 **끝은 있다.**
const NORMAL_TIMEOUT_MS = 60_000
const ANALYSIS_TIMEOUT_MS = 900_000   // 15분. 위 실측의 3배 이상

const api = axios.create({ baseURL: apiBaseUrl, timeout: NORMAL_TIMEOUT_MS })

// 데이터 크기에 비례해 오래 걸리는 경로. 여기 없는 긴 요청이 생기면 60초에 끊긴다 —
// 그래서 목록을 좁게 두고, 넓히는 것이 의식적인 결정이 되게 한다.
//
// **처음 쓴 목록은 양쪽으로 틀렸다.** `/run-shap`·`/optuna`·`/predict-batch`는 이
// 프런트엔드가 부르지 않는 죽은 항목이었고(실제 경로는 `/run-optuna`), 정작 재보니
// 느린 것과 아닌 것의 경계도 짐작과 달랐다. 5000×100 데이터셋에서 잰 값:
//
//   /run-cv              253.5초   ← 유일하게 60초를 크게 넘는다
//   /analyze-columns       3.6초
//   /report/summary        1.4초
//   /report/html           0.0초
//
// `/run-cv` 말고는 측정으로 확인된 긴 경로가 없다. 나머지는 **성질상** 오래 걸릴 수
// 있어 넣는다: 빠른 분석은 같은 계산을 통째로 돌리고, Agent Mode 실행은 여러 단계를
// 잇고, Optuna는 정의상 탐색이며, 배치 예측은 파일 크기에 비례한다. 무엇이 측정이고
// 무엇이 판단인지 구분해 적는다.
const SLOW_PATHS = [
  '/run-cv',                 // 측정: 253.5초
  '/quick-analysis/start',   // 성질상: 같은 분석을 통째로 돌린다
  '/agent-runs',             // 성질상: 여러 단계를 잇는다
  '/run-optuna',             // 성질상: 하이퍼파라미터 탐색
  '/training/jobs',          // 성질상: 작업 생성·재실행
  '/predict/batch',          // 성질상: 파일 크기에 비례
]

api.interceptors.request.use((config) => {
  const path = String(config.url || '')
  if (SLOW_PATHS.some((slow) => path.startsWith(slow))) config.timeout = ANALYSIS_TIMEOUT_MS
  return config
})

const GUEST_SESSION_KEY = 'mm_guest_session'
const AUTH_TOKEN_KEY = 'mm_token'
const AUTH_USER_KEY = 'mm_user'

function createGuestSessionId() {
  const randomPart = window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
  return `guest-${randomPart}`
}

export function readGuestSession() {
  try {
    const guest = JSON.parse(localStorage.getItem(GUEST_SESSION_KEY) || 'null')
    return guest?.guest_session_id ? guest : null
  } catch {
    localStorage.removeItem(GUEST_SESSION_KEY)
    return null
  }
}

export function ensureGuestSession() {
  const existing = readGuestSession()
  if (existing) return existing
  const guest = {
    mode: 'guest_demo',
    is_guest: true,
    guest_session_id: createGuestSessionId(),
    source: 'client_api',
    created_at: new Date().toISOString(),
  }
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(guest))
  return guest
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}

function tokenLooksExpired(token) {
  try {
    const payload = JSON.parse(window.atob(token.split('.')[1] || ''))
    return payload?.exp ? payload.exp * 1000 <= Date.now() : false
  } catch {
    return false
  }
}

api.interceptors.request.use(config => {
  let token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (token && tokenLooksExpired(token)) {
    clearStoredAuth()
    token = null
  }
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (!token && !config.skipGuestSession) {
    const guest = readGuestSession()
    if (guest) {
      config.headers['X-ModelMate-Guest-Session'] = guest.guest_session_id
    }
  }
  if (presenterMode && localStorage.getItem('mm_demo_mode') === '1') {
    config.params = { ...(config.params || {}), demo: true }
  }
  return config
})

export default api
