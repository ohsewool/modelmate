import { useTheme } from '../ThemeContext'

const LIGHT = {
  blue:   { top:'#6366f1', bg:'#eff6ff', border:'#c7d2fe', val:'#3730a3', sub:'#6366f1' },
  green:  { top:'#059669', bg:'#f0fdf4', border:'#bbf7d0', val:'#166534', sub:'#059669' },
  red:    { top:'#e11d48', bg:'#fff1f2', border:'#fecdd3', val:'#9f1239', sub:'#e11d48' },
  amber:  { top:'#d97706', bg:'#fffbeb', border:'#fde68a', val:'#92400e', sub:'#d97706' },
  cyan:   { top:'#0891b2', bg:'#ecfeff', border:'#a5f3fc', val:'#164e63', sub:'#0891b2' },
  violet: { top:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe', val:'#5b21b6', sub:'#7c3aed' },
}
const DARK = {
  blue:   { top:'#6366f1', bg:'rgba(99,102,241,0.12)',  border:'rgba(99,102,241,0.3)',  val:'#818cf8', sub:'#818cf8' },
  green:  { top:'#059669', bg:'rgba(16,185,129,0.1)',   border:'rgba(16,185,129,0.3)',  val:'#34d399', sub:'#34d399' },
  red:    { top:'#e11d48', bg:'rgba(244,63,94,0.1)',    border:'rgba(244,63,94,0.3)',   val:'#fb7185', sub:'#fb7185' },
  amber:  { top:'#d97706', bg:'rgba(245,158,11,0.1)',   border:'rgba(245,158,11,0.3)',  val:'#fbbf24', sub:'#fbbf24' },
  cyan:   { top:'#0891b2', bg:'rgba(34,211,238,0.1)',   border:'rgba(34,211,238,0.3)',  val:'#22d3ee', sub:'#22d3ee' },
  violet: { top:'#7c3aed', bg:'rgba(139,92,246,0.1)',   border:'rgba(139,92,246,0.3)',  val:'#a78bfa', sub:'#a78bfa' },
}

export default function KPICard({ label, value, sub, color = 'blue', icon }) {
  const { dark } = useTheme()
  const palette = dark ? DARK : LIGHT
  const p = palette[color] || palette.blue
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
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
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-label)', margin:'0 0 8px' }}>{label}</p>
          <p style={{ fontSize:24, fontWeight:700, fontVariantNumeric:'tabular-nums', lineHeight:1, color:p.val, margin:0 }}>{value ?? '—'}</p>
          {sub && <p style={{ fontSize:11, marginTop:6, fontWeight:500, color:p.sub, margin:'6px 0 0' }}>{sub}</p>}
        </div>
        {icon && (
          <div style={{
            width:40, height:40, borderRadius:12, flexShrink:0, fontSize:20,
            display:'flex', alignItems:'center', justifyContent:'center',
            background: p.bg, border:`1px solid ${p.border}`,
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
