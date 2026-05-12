const PALETTE = {
  blue:   { top: '#6366f1', glow: 'rgba(99,102,241,0.2)',   icon: 'rgba(99,102,241,0.15)',  iconText: '#818cf8', val: '#a5b4fc', sub: '#6366f1' },
  green:  { top: '#10b981', glow: 'rgba(16,185,129,0.2)',   icon: 'rgba(16,185,129,0.15)',  iconText: '#34d399', val: '#6ee7b7', sub: '#10b981' },
  red:    { top: '#f43f5e', glow: 'rgba(244,63,94,0.2)',    icon: 'rgba(244,63,94,0.15)',   iconText: '#fb7185', val: '#fda4af', sub: '#f43f5e' },
  amber:  { top: '#f59e0b', glow: 'rgba(245,158,11,0.2)',   icon: 'rgba(245,158,11,0.15)',  iconText: '#fbbf24', val: '#fcd34d', sub: '#f59e0b' },
  cyan:   { top: '#22d3ee', glow: 'rgba(34,211,238,0.2)',   icon: 'rgba(34,211,238,0.15)',  iconText: '#67e8f9', val: '#a5f3fc', sub: '#22d3ee' },
  violet: { top: '#8b5cf6', glow: 'rgba(139,92,246,0.2)',   icon: 'rgba(139,92,246,0.15)',  iconText: '#a78bfa', val: '#c4b5fd', sub: '#8b5cf6' },
}

export default function KPICard({ label, value, sub, color = 'blue', icon }) {
  const p = PALETTE[color] || PALETTE.blue
  return (
    <div
      style={{
        background: 'rgba(13,20,39,0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderTop: `2px solid ${p.top}`,
        borderRadius: 16,
        padding: 20,
        transition: 'all 0.2s',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), 0 0 24px ${p.glow}`
        e.currentTarget.style.borderColor = `rgba(255,255,255,0.1)`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = ''
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
      }}
    >
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
        <div style={{ minWidth:0 }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#334155', marginBottom:8, margin:'0 0 8px' }}>{label}</p>
          <p style={{ fontSize:24, fontWeight:700, fontVariantNumeric:'tabular-nums', lineHeight:1, color:p.val, margin:0 }}>{value ?? '—'}</p>
          {sub && <p style={{ fontSize:11, marginTop:8, fontWeight:500, color:p.sub, margin:'8px 0 0' }}>{sub}</p>}
        </div>
        {icon && (
          <div style={{
            width:40, height:40, borderRadius:12,
            display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0, fontSize:20,
            background: p.icon,
            color: p.iconText,
            border: `1px solid ${p.glow}`,
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
