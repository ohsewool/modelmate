export const AGENT_PLAN = [
  { title: '데이터 상태 확인', desc: '업로드된 데이터와 맞힐 값을 확인합니다.' },
  { title: '모델 후보 비교', desc: '여러 모델을 같은 기준으로 시험합니다.' },
  { title: '개선 여부 판단', desc: '성능이 부족하면 자동 개선을 시도합니다.' },
  { title: '예측 근거 정리', desc: '어떤 정보가 예측에 영향을 줬는지 찾습니다.' },
  { title: '발표용 결론 작성', desc: '결과 요약 화면에서 이해하기 쉽게 보여줍니다.' },
]

export default function AgentPlanBoard({ activeIndex, completed }) {
  return (
    <div className="card">
      <p style={{ fontSize: 12, fontWeight: 900, color: '#7c3aed', margin: '0 0 6px' }}>AI 계획</p>
      <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 14px' }}>에이전트가 진행할 순서</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        {AGENT_PLAN.map((item, idx) => {
          const done = completed || idx < activeIndex
          const active = !completed && idx === activeIndex
          return <PlanRow key={item.title} item={item} idx={idx} done={done} active={active} />
        })}
      </div>
    </div>
  )
}

function PlanRow({ item, idx, done, active }) {
  return (
    <div style={{
      display: 'flex', gap: 12, padding: 12, borderRadius: 12,
      border: `1px solid ${active ? 'rgba(124,58,237,0.32)' : done ? 'rgba(5,150,105,0.22)' : 'var(--border-sub)'}`,
      background: active ? 'rgba(124,58,237,0.08)' : done ? 'rgba(5,150,105,0.06)' : 'var(--surface-alt)',
    }}>
      <span style={{
        width: 24, height: 24, borderRadius: 8, flexShrink: 0, display: 'grid', placeItems: 'center',
        fontSize: 12, fontWeight: 900, color: done ? '#059669' : active ? '#7c3aed' : 'var(--text-label)',
        background: done ? 'rgba(5,150,105,0.12)' : active ? 'rgba(124,58,237,0.13)' : 'var(--surface)',
      }}>
        {done ? '✓' : idx + 1}
      </span>
      <div>
        <p style={{ fontSize: 13, fontWeight: 850, color: 'var(--text)', margin: '0 0 3px' }}>{item.title}</p>
        <p style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--text-label)', margin: 0 }}>{item.desc}</p>
      </div>
    </div>
  )
}
