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

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : '/api'
})

const GUEST_SESSION_KEY = 'mm_guest_session'

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

api.interceptors.request.use(config => {
  const token = localStorage.getItem('mm_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (!token) {
    const guest = ensureGuestSession()
    config.headers['X-ModelMate-Guest-Session'] = guest.guest_session_id
  }
  if (presenterMode && localStorage.getItem('mm_demo_mode') === '1') {
    config.params = { ...(config.params || {}), demo: true }
  }
  return config
})

export default api
