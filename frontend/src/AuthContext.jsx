import { createContext, useContext, useState, useEffect } from 'react'
import api, { clearStoredAuth, ensureGuestSession } from './api'
import { clearUploadDraft } from './uploadDraftStorage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      const token = localStorage.getItem('mm_token')
      const saved = localStorage.getItem('mm_user')
      const guest = localStorage.getItem('mm_guest_session')
      if (token && saved) {
        try {
          const { data } = await api.get('/auth/me', { skipGuestSession: true })
          if (cancelled) return
          const parsed = JSON.parse(saved)
          setUser({
            ...parsed,
            id: data.sub || parsed.id,
            email: data.email || parsed.email,
            name: data.name || parsed.name,
            role: data.role || parsed.role || 'user',
            is_guest: false,
          })
        } catch {
          clearStoredAuth()
          const session = ensureGuestSession()
          if (!cancelled) setUser({ id: session.guest_session_id, name: '게스트 데모', email: '', role: 'guest', is_guest: true })
        }
      } else if (guest) {
        try {
          const parsed = JSON.parse(guest)
          if (!cancelled) setUser({ id: parsed.guest_session_id, name: '게스트 데모', email: '', role: 'guest', is_guest: true })
        } catch {
          localStorage.removeItem('mm_guest_session')
        }
      }

      if (!cancelled) setLoading(false)
    }

    restoreSession()
    return () => { cancelled = true }
  }, [])

  function login(token, userInfo) {
    localStorage.setItem('mm_token', token)
    localStorage.setItem('mm_user', JSON.stringify(userInfo))
    localStorage.removeItem('mm_guest_session')
    setUser(userInfo)
  }

  async function startGuest() {
    const saved = localStorage.getItem('mm_guest_session')
    let sessionId
    try {
      sessionId = saved ? JSON.parse(saved).guest_session_id : undefined
    } catch {
      localStorage.removeItem('mm_guest_session')
    }
    const { data } = await api.post('/session/guest', { session_id: sessionId })
    localStorage.setItem('mm_guest_session', JSON.stringify(data))
    const guestUser = { id: data.guest_session_id, name: '게스트 데모', email: '', role: 'guest', is_guest: true }
    setUser(guestUser)
    return guestUser
  }

  function logout() {
    api.post('/auth/logout').catch(() => {})
    api.post('/reset-session').catch(() => {})
    clearUploadDraft()
    localStorage.removeItem('mm_token')
    localStorage.removeItem('mm_user')
    localStorage.removeItem('mm_guest_session')
    localStorage.removeItem('mm_demo_mode')
    sessionStorage.removeItem('mm_presenter_mode')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, startGuest }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
