import AgentPlanBoard from './AgentPlanBoard'

export default function AgentLoadingPanel({ stage }) {
  const activeIndex = stage === 'upload' ? 0 : stage === 'analyze' || stage === 'target' ? 0 : 1
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16, alignItems: 'start' }}>
      <AgentPlanBoard activeIndex={activeIndex} />
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 900, color: '#7c3aed', margin: 0 }}>실행 중</p>
        {progressItems(stage).map(item => (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10,
            background: item.active ? 'rgba(124,58,237,0.08)' : 'var(--surface-alt)',
            border: item.active ? '1px solid rgba(124,58,237,0.2)' : '1px solid transparent',
          }}>
            <span className="spinner" />
            <span style={{ fontSize: 12, color: item.active ? '#7c3aed' : 'var(--text-2)', fontWeight: 750 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function progressItems(stage) {
  const labels = [
    ['upload', 'CSV 파일을 업로드합니다'],
    ['analyze', '데이터 종류와 맞힐 값을 판단합니다'],
    ['target', '분석에 사용할 설정을 확정합니다'],
    ['agent', '모델 비교와 이유 분석을 실행합니다'],
  ]
  if (!stage) {
    return ['모델 후보를 비교합니다', '개선 필요성을 판단합니다', '예측 근거를 찾습니다', '결론을 정리합니다']
      .map((label, idx) => ({ label, active: idx === 0 }))
  }
  return labels.map(([key, label]) => ({ label, active: key === stage }))
}
