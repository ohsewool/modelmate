import { MiniScore } from './AgentDecisionBoard'
import { formatScore } from './AgentUtils'

export default function AgentStepCard({ step, idx }) {
  const rows = step.data?.results || []
  const optuna = step.data?.after_score !== undefined || step.data?.after_roc !== undefined
  const xai = step.data?.global
  const skipped = step.decision === 'optuna_skip'

  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--border-sub)', background: 'var(--surface-alt)', padding: 14 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: skipped ? 'rgba(245,158,11,0.12)' : 'rgba(124,58,237,0.1)',
          color: skipped ? '#b45309' : '#7c3aed', display: 'grid', placeItems: 'center', fontWeight: 900,
        }}>
          {idx + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Header step={step} idx={idx} skipped={skipped} />
          {step.comment && <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65, margin: '0 0 12px' }}>{step.comment}</p>}
          {step.data?.domain && <MeaningBlock data={step.data} />}
          {rows.length > 0 && <ModelRows rows={rows} />}
          {optuna && <OptunaScores data={step.data} />}
          {xai && <XaiRows rows={xai} />}
        </div>
      </div>
    </div>
  )
}

function Header({ step, idx, skipped }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-label)' }}>분석 단계 {step.step ?? idx + 1}</span>
      <h3 style={{ fontSize: 14, color: 'var(--text)', margin: 0 }}>{step.name || '자동 분석 단계'}</h3>
      <span className={skipped ? 'badge badge-amber' : 'badge badge-green'} style={{ fontSize: 10 }}>{skipped ? '건너뜀' : '완료'}</span>
    </div>
  )
}

function MeaningBlock({ data }) {
  return (
    <div style={{ display: 'grid', gap: 7, marginBottom: 10 }}>
      <MiniLine label="데이터 종류" value={data.domain} />
      <MiniLine label="맞힐 값" value={data.target_label} />
      <MiniLine label="판단 이유" value={data.target_reason} />
    </div>
  )
}

function MiniLine({ label, value }) {
  return <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}><strong style={{ color: 'var(--text)' }}>{label}</strong> · {value}</p>
}

function ModelRows({ rows }) {
  return <div style={{ display: 'grid', gap: 6 }}>{rows.slice(0, 4).map((row, rowIdx) => (
    <div key={row.model} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--surface)', border: rowIdx === 0 ? '1px solid rgba(5,150,105,0.24)' : '1px solid var(--border-sub)' }}>
      <span style={{ fontSize: 12, color: rowIdx === 0 ? '#059669' : 'var(--text)', fontWeight: 850, flex: 1 }}>{rowIdx === 0 ? '추천 · ' : ''}{String(row.model).split(' ')[0]}</span>
      <span style={{ fontSize: 11, color: 'var(--text-label)' }}>점수</span>
      <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 900 }}>{formatScore(row.roc_auc ?? row.r2 ?? row.accuracy ?? row.f1)}</span>
    </div>
  ))}</div>
}

function OptunaScores({ data }) {
  return <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
    <MiniScore label="개선 전" value={data.before_score ?? data.before_roc} />
    <MiniScore label="개선 후" value={data.after_score ?? data.after_roc} strong={data.applied} />
  </div>
}

function XaiRows({ rows }) {
  return <div style={{ display: 'grid', gap: 7 }}>{rows.slice(0, 5).map(item => (
    <div key={item.feature} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: 'var(--text-2)', width: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.feature}</span>
      <div className="progress-bar" style={{ flex: 1 }}>
        <div className="progress-fill" style={{ width: `${Math.min(100, Number(item.shap_value || 0) * 100)}%` }} />
      </div>
    </div>
  ))}</div>
}
