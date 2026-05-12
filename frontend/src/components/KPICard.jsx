const PALETTE = {
  blue:   { top:'#6366f1', bg:'#eff6ff', border:'#c7d2fe', val:'#3730a3', sub:'#6366f1', icon:'#eff6ff', iconBorder:'#c7d2fe' },
  green:  { top:'#059669', bg:'#f0fdf4', border:'#bbf7d0', val:'#166534', sub:'#059669', icon:'#f0fdf4', iconBorder:'#bbf7d0' },
  red:    { top:'#e11d48', bg:'#fff1f2', border:'#fecdd3', val:'#9f1239', sub:'#e11d48', icon:'#fff1f2', iconBorder:'#fecdd3' },
  amber:  { top:'#d97706', bg:'#fffbeb', border:'#fde68a', val:'#92400e', sub:'#d97706', icon:'#fffbeb', iconBorder:'#fde68a' },
  cyan:   { top:'#0891b2', bg:'#ecfeff', border:'#a5f3fc', val:'#164e63', sub:'#0891b2', icon:'#ecfeff', iconBorder:'#a5f3fc' },
  violet: { top:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe', val:'#5b21b6', sub:'#7c3aed', icon:'#f5f3ff', iconBorder:'#ddd6fe' },
}

export default function KPICard({ label, value, sub, color = 'blue', icon }) {
  const p = PALETTE[color] || PALETTE.blue
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderTop: `3px solid ${p.top}`,
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'all 0.2s',
      cursor: 'default',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 20px rgba(0,0,0,0.08)' }}
    onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)' }}
    >
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
        <div style={{ minWidth:0 }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#94a3b8', margin:'0 0 8px' }}>{label}</p>
          <p style={{ fontSize:24, fontWeight:700, fontVariantNumeric:'tabular-nums', lineHeight:1, color:p.val, margin:0 }}>{value ?? '—'}</p>
          {sub && <p style={{ fontSize:11, marginTop:6, fontWeight:500, color:p.sub, margin:'6px 0 0' }}>{sub}</p>}
        </div>
        {icon && (
          <div style={{
            width:40, height:40, borderRadius:12, flexShrink:0, fontSize:20,
            display:'flex', alignItems:'center', justifyContent:'center',
            background: p.bg, border:`1px solid ${p.iconBorder}`,
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
