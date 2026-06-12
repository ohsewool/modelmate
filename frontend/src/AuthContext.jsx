import { createContext, useContext, useState, useEffect } from 'react'
import api from './api'
import { clearUploadDraft } from './uploadDraftStorage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('mm_token')
    const saved = localStorage.getItem('mm_user')
    const guest = localStorage.getItem('mm_guest_session')
    if (token && saved) {
      setUser(JSON.parse(saved))
    } else if (guest) {
      try {
        const parsed = JSON.parse(guest)
        setUser({ id: parsed.guest_session_id, name: 'Guest demo', email: '', role: 'guest', is_guest: true })
      } catch {
        localStorage.removeItem('mm_guest_session')
      }
    }
    setLoading(false)
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
    const guestUser = { id: data.guest_session_id, name: 'Guest demo', email: '', role: 'guest', is_guest: true }
    setUser(guestUser)
    return guestUser
  }

  function logout() {
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
