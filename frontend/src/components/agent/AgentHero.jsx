export default function AgentHero() {
  return (
    <section className="card" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(280px, 0.65fr)', gap: 20, alignItems: 'center', marginBottom: 18 }}>
      <div>
        <p style={{ fontSize: 12, fontWeight: 850, color: '#7c3aed', margin: '0 0 8px' }}>선택 기능 · AI 분석 코치</p>
        <h1 style={{ fontSize: 24, fontWeight: 950, margin: '0 0 8px', color: 'var(--text)', letterSpacing: 0 }}>
          AI가 분석 계획을 세우고 실행 판단을 남깁니다
        </h1>
        <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-2)', margin: 0 }}>
          직접 모델을 고를 수도 있지만, 이 화면에서는 AI가 모델 비교, 개선 판단, 예측 근거 정리를 한 번에 진행합니다.
        </p>
      </div>
      <div style={{ borderRadius: 14, padding: 16, background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(37,99,235,0.08))', border: '1px solid rgba(124,58,237,0.18)' }}>
        <p style={{ fontSize: 12, fontWeight: 900, color: '#7c3aed', margin: '0 0 8px' }}>에이전트 역할</p>
        <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', margin: '0 0 6px' }}>분석 코치</p>
        <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--text-2)', margin: 0 }}>
          단순 자동 실행이 아니라, 왜 이 모델을 봤고 왜 개선을 시도했는지 판단 로그를 남깁니다.
        </p>
      </div>
    </section>
  )
}
