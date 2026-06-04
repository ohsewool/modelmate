export default function AgentInsightCards({ insights }) {
  if (!insights) return null
  const cards = [
    {
      label: '데이터 판단',
      title: insights.domain || '도메인 확인 필요',
      body: `${insights.target_label || '예측 목적'} 문제로 보고 분석했습니다.`,
      color: '#2563eb',
    },
    {
      label: '맞힐 값 이유',
      title: insights.target_label || '목적 확인 필요',
      body: insights.target_reason || '컬럼 구조를 기준으로 예측 대상을 정했습니다.',
      color: '#059669',
    },
    {
      label: '모델 추천 이유',
      title: insights.score_comment || '모델 비교 완료',
      body: insights.model_reason || '가장 높은 검증 점수를 보인 모델을 우선 추천합니다.',
      color: '#7c3aed',
    },
    {
      label: '개선 판단',
      title: insights.tuning_status || '개선 확인',
      body: '튜닝 결과가 더 안정적인지 보고 기존 모델 유지 여부를 결정했습니다.',
      color: '#d97706',
    },
  ]

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 900, color: '#2563eb', margin: '0 0 5px' }}>AI 판단 요약</p>
          <h2 style={{ fontSize: 18, color: 'var(--text)', margin: 0 }}>에이전트가 먼저 본 핵심</h2>
        </div>
        <span className="badge badge-green" style={{ fontSize: 10 }}>발표용 정리</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
        {cards.map(card => (
          <div key={card.label} style={{ borderRadius: 12, padding: 13, border: `1px solid ${card.color}24`, background: `${card.color}0d` }}>
            <p style={{ fontSize: 11, fontWeight: 900, color: card.color, margin: '0 0 6px' }}>{card.label}</p>
            <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.35 }}>{card.title}</p>
            <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>{card.body}</p>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'var(--surface-alt)', border: '1px solid var(--border-sub)' }}>
        <p style={{ fontSize: 12, fontWeight: 900, color: 'var(--text)', margin: '0 0 6px' }}>발표용 한 문장</p>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>{insights.presentation_conclusion}</p>
      </div>
      {!!insights.next_actions?.length && (
        <div style={{ display: 'grid', gap: 7, marginTop: 10 }}>
          {insights.next_actions.map(action => (
            <div key={action} style={{ fontSize: 12, color: '#1d4ed8', padding: '8px 10px', borderRadius: 10, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.18)' }}>
              다음 행동 · {action}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gap: 7, marginTop: 10 }}>
        {(insights.risk_notes || []).map(note => (
          <div key={note} style={{ fontSize: 12, color: 'var(--text-2)', padding: '8px 10px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
            주의 · {note}
          </div>
        ))}
      </div>
    </div>
  )
}
