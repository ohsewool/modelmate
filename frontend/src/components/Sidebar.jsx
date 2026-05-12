import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../api'

const NAV = [
  { to: '/upload',      icon: UploadIcon,  label: '데이터 업로드', step: 1 },
  { to: '/model-lab',   icon: FlaskIcon,   label: 'Model Lab',     step: 2 },
  { to: '/xai',         icon: EyeIcon,     label: 'XAI 설명',      step: 3 },
  { to: '/maintenance', icon: WrenchIcon,  label: 'Maintenance',   step: 4 },
  { to: '/history',     icon: ChartIcon,   label: '실험 기록',      step: 5 },
  { to: '/report',      icon: DocIcon,     label: '보고서',         step: 6 },
]

export default function Sidebar() {
  const [state, setState] = useState({})

  useEffect(() => {
    const fetch = () => api.get('/state').then(r => setState(r.data)).catch(() => {})
    fetch()
    const id = setInterval(fetch, 3000)
    return () => clearInterval(id)
  }, [])

  const step = state.has_model ? 3 : state.has_data ? 2 : 1

  return (
    <aside style={{
      width: 236,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(9,12,30,0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(99,102,241,0.1)',
    }}>
      {/* Logo */}
      <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid rgba(99,102,241,0.08)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            width: 36, height: 36,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 0 20px rgba(99,102,241,0.4), 0 4px 8px rgba(0,0,0,0.3)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:'#f1f5f9', lineHeight:1.2 }}>FailureAI</div>
            <div style={{ fontSize:11, color:'#334155', marginTop:2 }}>설비 고장 예측 시스템</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'12px 10px', overflowY:'auto' }}>
        <p style={{ padding:'0 10px', marginBottom:8, fontSize:10, fontWeight:600, color:'#1e293b', textTransform:'uppercase', letterSpacing:'0.12em' }}>
          워크플로우
        </p>
        {NAV.map(({ to, icon: Icon, label, step: s }) => {
          const done   = s < step
          const locked = s > step + 1
          return (
            <NavLink key={to} to={to}
              style={{ textDecoration: 'none', pointerEvents: locked ? 'none' : 'auto', opacity: locked ? 0.35 : 1 }}
            >
              {({ isActive }) => (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px',
                  borderRadius: 10,
                  marginBottom: 2,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: locked ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  color: isActive ? '#f1f5f9' : done ? '#64748b' : '#475569',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.15) 100%)'
                    : 'transparent',
                  boxShadow: isActive ? '0 0 0 1px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
                }}>
                  <span style={{ width:16, height:16, flexShrink:0, color: isActive ? '#818cf8' : done ? '#10b981' : '#334155' }}>
                    {done && !isActive ? <CheckIcon /> : <Icon />}
                  </span>
                  <span style={{ flex:1 }}>{label}</span>
                  {done && !isActive && (
                    <span style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 6px rgba(16,185,129,0.5)', flexShrink:0 }} />
                  )}
                  {isActive && (
                    <span style={{ width:4, height:4, borderRadius:'50%', background:'#818cf8', boxShadow:'0 0 8px rgba(129,140,248,0.8)', flexShrink:0 }} />
                  )}
                </div>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Status */}
      <div style={{ margin:'0 10px 10px', borderRadius:12, border:'1px solid rgba(99,102,241,0.1)', overflow:'hidden', background:'rgba(13,20,39,0.7)' }}>
        <div style={{ padding:'10px 14px', borderBottom:'1px solid rgba(99,102,241,0.07)' }}>
          <p style={{ fontSize:10, fontWeight:600, color:'#1e293b', textTransform:'uppercase', letterSpacing:'0.1em', margin:0 }}>시스템 상태</p>
        </div>
        <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
          <StatusRow label="데이터셋"  active={state.has_data}
            value={state.data_shape ? `${state.data_shape[0].toLocaleString()} 행` : '미업로드'} />
          <StatusRow label="학습 모델" active={state.has_model}
            value={state.best_model ? state.best_model.split(' ')[0] : '없음'} />
          {state.cv_results && (
            <StatusRow label="ROC-AUC" active={true}
              value={state.cv_results[0]?.roc_auc ?? '—'} accent />
          )}
        </div>
      </div>
    </aside>
  )
}

function StatusRow({ label, active, value, accent }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
        <span style={{
          width:6, height:6, borderRadius:'50%', flexShrink:0,
          background: active ? '#10b981' : '#1e293b',
          boxShadow: active ? '0 0 6px rgba(16,185,129,0.5)' : 'none',
        }} />
        <span style={{ fontSize:11, color:'#334155', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
      </div>
      <span style={{
        fontSize:11, fontWeight:600, flexShrink:0,
        color: accent ? '#818cf8' : active ? '#64748b' : '#1e293b',
      }}>{value}</span>
    </div>
  )
}

function UploadIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'100%',height:'100%'}}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
}
function FlaskIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'100%',height:'100%'}}>
    <path d="M9 3h6m-6 0v6l-6 12a1 1 0 00.9 1.4h12.2a1 1 0 00.9-1.4L15 9V3"/>
  </svg>
}
function EyeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'100%',height:'100%'}}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
}
function WrenchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'100%',height:'100%'}}>
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
  </svg>
}
function ChartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'100%',height:'100%'}}>
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
}
function DocIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'100%',height:'100%'}}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
}
function CheckIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:'100%',height:'100%'}}>
    <polyline points="20,6 9,17 4,12"/>
  </svg>
}
