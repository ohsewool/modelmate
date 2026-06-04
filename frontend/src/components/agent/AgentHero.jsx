export default function AgentHero() {
  return (
    <section className="card" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(280px, 0.65fr)', gap: 20, alignItems: 'center', marginBottom: 18 }}>
      <div>
        <p style={{ fontSize: 12, fontWeight: 850, color: '#7c3aed', margin: '0 0 8px' }}>AI 분석 에이전트</p>
        <h1 style={{ fontSize: 24, fontWeight: 950, margin: '0 0 8px', color: 'var(--text)', letterSpacing: 0 }}>
          CSV를 맡기면 AI가 판단하고 실행합니다
        </h1>
        <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-2)', margin: 0 }}>
          데이터 성격, 맞힐 값, 모델 후보, 개선 필요성, 발표용 결론까지 한 번에 정리합니다.
        </p>
      </div>
      <div style={{ borderRadius: 14, padding: 16, background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(37,99,235,0.08))', border: '1px solid rgba(124,58,237,0.18)' }}>
        <p style={{ fontSize: 12, fontWeight: 900, color: '#7c3aed', margin: '0 0 8px' }}>에이전트 역할</p>
        <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', margin: '0 0 6px' }}>판단 + 실행 + 설명</p>
        <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--text-2)', margin: 0 }}>
          결과만 보여주지 않고 왜 그렇게 봤는지 판단 로그를 남깁니다.
        </p>
      </div>
    </section>
  )
}
