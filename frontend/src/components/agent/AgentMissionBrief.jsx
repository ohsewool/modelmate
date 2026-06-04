export default function AgentMissionBrief({ insights, decision }) {
  if (!insights) return null
  const rows = [
    ['데이터 성격', insights.domain || '도메인 확인 필요', insights.target_reason || '컬럼 구조를 보고 데이터 의미를 판단했습니다.'],
    ['예측 목적', insights.target_label || '목적 확인 필요', `${insights.target_label || '예측 문제'}로 보고 모델 비교를 진행했습니다.`],
    ['모델 선택', decision?.model || '-', insights.model_reason || '검증 점수를 기준으로 추천 모델을 골랐습니다.'],
  ]

  return (
    <div className="card" style={{ border: '1px solid rgba(37,99,235,0.18)', background: 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(5,150,105,0.04))' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 900, color: '#2563eb', margin: '0 0 5px' }}>AI 에이전트 브리핑</p>
          <h2 style={{ fontSize: 20, color: 'var(--text)', margin: 0 }}>제가 이 데이터를 이렇게 처리했습니다</h2>
        </div>
        <span className="badge badge-green" style={{ fontSize: 10 }}>자동 판단</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10, marginBottom: 14 }}>
        {rows.map(([label, title, body]) => (
          <div key={label} style={{ borderRadius: 12, padding: 13, background: 'var(--surface)', border: '1px solid var(--border-sub)' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 900, color: 'var(--text-label)' }}>{label}</p>
            <p style={{ margin: '0 0 7px', fontSize: 15, fontWeight: 900, color: 'var(--text)' }}>{title}</p>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: 'var(--text-2)' }}>{body}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(220px, 0.55fr)', gap: 10 }}>
        <div style={{ borderRadius: 12, padding: 14, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.16)' }}>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 900, color: '#2563eb' }}>발표에서 말할 결론</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--text)' }}>{insights.presentation_conclusion}</p>
        </div>
        <div style={{ borderRadius: 12, padding: 14, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 900, color: '#b45309' }}>주의 판단</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>
            {(insights.risk_notes || ['현재 흐름에서는 큰 위험 신호가 보이지 않습니다.'])[0]}
          </p>
        </div>
      </div>
    </div>
  )
}
