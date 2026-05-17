import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider, useAuth } from './AuthContext'
import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import Upload from './pages/Upload'
import ModelLab from './pages/ModelLab'
import XAI from './pages/XAI'
import History from './pages/History'
import Report from './pages/Report'
import Agent from './pages/Agent'
import Login from './pages/Login'

const GOOGLE_CLIENT_ID = '373474705259-7b18amrkom84aqqt59n87lglhrgq1trj.apps.googleusercontent.com'

const PAGE_META = {
  '/upload':      { title: '데이터 업로드',       desc: 'CSV / TXT 파일을 업로드하고 EDA를 수행합니다' },
  '/agent':       { title: 'AI 자동 분석',        desc: 'Agentic AutoML — 버튼 하나로 전체 분석 자동 실행' },
  '/model-lab':   { title: 'Model Lab',          desc: '4개 모델 교차검증 및 Optuna 하이퍼파라미터 튜닝' },
  '/xai':         { title: 'XAI 설명',            desc: 'SHAP 기반 모델 예측 근거 시각화' },
  '/history':     { title: '실험 기록',            desc: '모든 실험 결과 및 성능 추이 확인' },
  '/report':      { title: '분석 보고서',          desc: '분석 결과를 HTML 보고서로 내보내기' },
}

function Header({ onMenuClick }) {
  const { pathname } = useLocation()
  const meta = PAGE_META[pathname] || {}
  if (!meta.title) return null
  return (
    <header style={{
      flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 16px 0 12px', height:56,
      background:'var(--surface)', borderBottom:'1px solid var(--border)',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {/* 햄버거 버튼 (모바일) */}
        <button onClick={onMenuClick} className="hamburger-btn" style={{
          background:'none', border:'none', cursor:'pointer', color:'var(--text)',
          padding:6, borderRadius:8, display:'none', alignItems:'center', justifyContent:'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <h1 style={{ fontSize:15, fontWeight:700, color:'var(--text)', lineHeight:1.2, margin:0 }}>{meta.title}</h1>
        {meta.desc && (
          <p style={{ fontSize:12, color:'var(--text-label)', margin:0, display:'none' }} className="header-desc">
            {meta.desc}
          </p>
        )}
      </div>
      <div style={{
        display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:600,
        color:'#059669', background:'#f0fdf4', border:'1px solid #bbf7d0',
        padding:'5px 10px', borderRadius:99,
      }}>
        <span style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', display:'inline-block', animation:'pulse 2s infinite' }} />
        <span className="status-text">시스템 정상</span>
      </div>
    </header>
  )
}

function Layout({ children }) {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (isHome) return <>{children}</>

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', minWidth:0 }}>
        <Header onMenuClick={() => setSidebarOpen(v => !v)} />
        <main style={{ flex:1, overflowY:'auto', background:'var(--bg)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={
              <Layout>
                <Routes>
                  <Route path="/upload"    element={<Upload />} />
                  <Route path="/agent"     element={<Agent />} />
                  <Route path="/model-lab" element={<ModelLab />} />
                  <Route path="/xai"       element={<XAI />} />
                  <Route path="/history"   element={<History />} />
                  <Route path="/report"    element={<Report />} />
                  <Route path="*"          element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}
