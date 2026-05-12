import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Upload from './pages/Upload'
import ModelLab from './pages/ModelLab'
import XAI from './pages/XAI'
import Maintenance from './pages/Maintenance'
import History from './pages/History'
import Report from './pages/Report'

const PAGE_META = {
  '/upload':      { title: '데이터 업로드',       desc: 'CSV / TXT 파일을 업로드하고 EDA를 수행합니다' },
  '/model-lab':   { title: 'Model Lab',          desc: '4개 모델 교차검증 및 Optuna 하이퍼파라미터 튜닝' },
  '/xai':         { title: 'XAI 설명',            desc: 'SHAP 기반 모델 예측 근거 시각화' },
  '/maintenance': { title: 'Maintenance Center', desc: '고장 위험 설비 순위화 및 정비 우선순위 추천' },
  '/history':     { title: '실험 기록',            desc: '모든 실험 결과 및 성능 추이 확인' },
  '/report':      { title: '분석 보고서',          desc: '분석 결과를 HTML 보고서로 내보내기' },
}

function Header() {
  const { pathname } = useLocation()
  const meta = PAGE_META[pathname] || {}
  return (
    <header style={{
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      height: 56,
      background: 'rgba(7,9,26,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(99,102,241,0.1)',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div>
          <h1 style={{ fontSize:15, fontWeight:700, color:'#f1f5f9', lineHeight:1.2, margin:0 }}>{meta.title}</h1>
        </div>
        {meta.desc && (
          <>
            <span style={{ color:'rgba(99,102,241,0.3)', fontWeight:300 }}>·</span>
            <p style={{ fontSize:12, color:'#334155', margin:0 }}>{meta.desc}</p>
          </>
        )}
      </div>
      <div style={{
        display:'flex', alignItems:'center', gap:6,
        fontSize:11, fontWeight:600, color:'#10b981',
        background:'rgba(16,185,129,0.08)',
        border:'1px solid rgba(16,185,129,0.2)',
        padding:'5px 12px', borderRadius:99,
      }}>
        <span style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', display:'inline-block', animation:'pulse 2s infinite' }} />
        시스템 정상
      </div>
    </header>
  )
}

function Layout() {
  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#07091a' }}>
      <Sidebar />
      <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
        <Header />
        <main style={{ flex:1, overflowY:'auto', background:'#07091a' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="/upload"      element={<Upload />} />
            <Route path="/model-lab"   element={<ModelLab />} />
            <Route path="/xai"         element={<XAI />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/history"     element={<History />} />
            <Route path="/report"      element={<Report />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}
