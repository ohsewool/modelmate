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

const api = axios.create({ baseURL: apiBaseUrl })

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
