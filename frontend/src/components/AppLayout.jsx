import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import AppHeader from './AppHeader'

export default function AppLayout({ children }) {
  const { pathname } = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (pathname === '/') return <>{children}</>

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <AppHeader onMenuClick={() => setSidebarOpen(v => !v)} />
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
