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
    if (token && saved) {
      setUser(JSON.parse(saved))
    }
    setLoading(false)
  }, [])

  function login(token, userInfo) {
    localStorage.setItem('mm_token', token)
    localStorage.setItem('mm_user', JSON.stringify(userInfo))
    setUser(userInfo)
  }

  function logout() {
    api.post('/reset-session').catch(() => {})
    clearUploadDraft()
    localStorage.removeItem('mm_token')
    localStorage.removeItem('mm_user')
    localStorage.removeItem('mm_demo_mode')
    sessionStorage.removeItem('mm_presenter_mode')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
