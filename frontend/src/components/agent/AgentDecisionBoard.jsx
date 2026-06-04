import { formatScore } from './AgentUtils'

export default function AgentDecisionBoard({ decision }) {
  return (
    <div className="card">
      <p style={{ fontSize: 12, fontWeight: 900, color: '#2563eb', margin: '0 0 6px' }}>AI 결정</p>
      <h2 style={{ fontSize: 20, color: 'var(--text)', margin: '0 0 14px' }}>{decision.title}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
        <MiniScore label="추천 모델" value={decision.model} text />
        <MiniScore label="대표 점수" value={decision.score} />
        <MiniScore label="개선 판단" value={decision.tuning} text />
      </div>
      <div style={{ padding: 14, borderRadius: 12, border: '1px solid rgba(37,99,235,0.16)', background: 'rgba(37,99,235,0.06)' }}>
        <p style={{ fontSize: 13, fontWeight: 850, color: 'var(--text)', margin: '0 0 6px' }}>다음 행동</p>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>{decision.next}</p>
      </div>
    </div>
  )
}

export function MiniScore({ label, value, strong, text }) {
  return (
    <div style={{
      minWidth: 0, padding: '10px 12px', borderRadius: 10,
      border: '1px solid var(--border)',
      background: strong ? 'rgba(16,185,129,0.08)' : 'var(--surface-alt)',
    }}>
      <p style={{ fontSize: 11, color: 'var(--text-label)', margin: '0 0 4px' }}>{label}</p>
      <p style={{
        fontSize: text ? 13 : 18, fontWeight: 900,
        color: strong ? '#059669' : 'var(--text)', margin: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {text ? value : formatScore(value)}
      </p>
    </div>
  )
}
