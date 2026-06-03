import { useTheme } from '../ThemeContext'

const LIGHT = {
  blue:   { top: '#2563eb', val: '#1d4ed8' },
  green:  { top: '#059669', val: '#047857' },
  red:    { top: '#dc2626', val: '#b91c1c' },
  amber:  { top: '#d97706', val: '#b45309' },
  cyan:   { top: '#0891b2', val: '#0e7490' },
  violet: { top: '#7c3aed', val: '#6d28d9' },
}

const DARK = {
  blue:   { top: '#60a5fa', val: '#93c5fd' },
  green:  { top: '#34d399', val: '#6ee7b7' },
  red:    { top: '#f87171', val: '#fca5a5' },
  amber:  { top: '#f59e0b', val: '#fbbf24' },
  cyan:   { top: '#22d3ee', val: '#67e8f9' },
  violet: { top: '#a78bfa', val: '#c4b5fd' },
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
      borderRadius: 10,
      padding: 16,
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      cursor: 'default',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-label)', margin: '0 0 8px' }}>
            {label}
          </p>
          <p style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, color: p.val, margin: 0 }}>
            {value ?? '-'}
          </p>
          {sub && <p style={{ fontSize: 11, margin: '6px 0 0', fontWeight: 600, color: p.val }}>{sub}</p>}
        </div>
        {icon && (
          <div style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0, fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface-alt)', border: '1px solid var(--border)',
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
