import { FileText } from 'lucide-react'

const fmt = value => {
  if (value === null || value === undefined || value === '') return '확인 필요'
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(4)
  return value
}

const taskLabel = value => ({
  classification: '분류 예측',
  regression: '숫자 예측',
}[value] || value || '-')

export default function EvidenceSummaryPanel({ summary, models, primaryMetric, features }) {
  const dataset = summary?.dataset || {}
  const business = summary?.business_summary || {}
  const top = models?.[0] || {}
  const limitations = [
    ...(business.risk_notes || []),
    ...(summary?.optimization?.reason ? [summary.optimization.reason] : []),
  ].slice(0, 3)

  const items = [
    ['예측 대상', dataset.target_col || '예측값 확인 필요'],
    ['예측 유형', taskLabel(dataset.task_type)],
    ['추천 모델', summary?.model_selection?.best_model || '모델 결과를 불러올 수 없습니다'],
    ['성능 지표', primaryMetric ? `${primaryMetric}: ${fmt(top[primaryMetric])}` : '성능 지표 확인 필요'],
    ['추천 다음 행동', business.next_actions?.[0] || business.recommended_decision || '이유 보기와 새 데이터 예측으로 이어가세요.'],
  ]

  return (
    <section className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>
          <FileText size={17} />
        </span>
        <div>
          <p style={{ margin: '0 0 3px', fontSize: 12, fontWeight: 900, color: '#7c3aed' }}>근거 기반 보고서</p>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>보고서가 참고한 핵심 근거</h2>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginBottom: 12 }}>
        {items.map(([label, value]) => (
          <div key={label} className="card-elevated" style={{ padding: 12 }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 900, color: 'var(--text-label)' }}>{label}</p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 850, color: 'var(--text)', lineHeight: 1.45 }}>{value}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="evidence-split-grid">
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 900 }}>주요 변수</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(features || []).slice(0, 5).map(item => <span key={item.feature} className="badge badge-cyan">{item.feature}</span>)}
            {!features?.length && <span style={{ fontSize: 12, color: 'var(--text-2)' }}>중요 요인 정보가 없습니다. 분석을 다시 실행해 주세요.</span>}
          </div>
        </div>
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 900 }}>한계와 주의사항</p>
          <div style={{ display: 'grid', gap: 6 }}>
            {limitations.length ? limitations.map(item => <span key={item} style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.45 }}>{item}</span>) : <span style={{ fontSize: 12, color: 'var(--text-2)' }}>현재 보고서에 별도 한계 메모가 없습니다.</span>}
          </div>
        </div>
      </div>
    </section>
  )
}
