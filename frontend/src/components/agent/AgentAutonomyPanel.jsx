import { Bot, CheckCircle2, ClipboardCheck, UserCheck } from 'lucide-react'

function levelTone(level = '') {
  if (level.includes('바로') || level.includes('가능')) return 'badge badge-green'
  if (level.includes('보완') || level.includes('검토')) return 'badge badge-blue'
  return 'badge badge-amber'
}

export default function AgentAutonomyPanel({ insights }) {
  if (!insights) return null
  const readiness = insights.commercial_readiness || {}
  const auto = [
    `데이터 분야: ${insights.domain || '확인 필요'}`,
    `예측 목적: ${insights.target_label || '확인 필요'}`,
    `모델 선택 근거: ${insights.model_evidence?.gap_label || '검증 점수 기준'}`,
  ]
  const human = [
    ...(readiness.blockers || []),
    ...(insights.risk_notes || []),
  ].slice(0, 3)
  const next = (insights.next_actions || []).slice(0, 2)

  return (
    <section className="card" style={{ display: 'grid', gap: 14, borderColor: 'rgba(124,58,237,0.18)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 900, color: '#7c3aed' }}>에이전트 자율 판단</p>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
            자동 결정과 사람 확인 지점을 나눴습니다
          </h2>
        </div>
        <span className={levelTone(readiness.level || insights.agent_priority?.level)}>
          {readiness.level || insights.agent_priority?.level || '판단 완료'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
        <Block icon={Bot} title="자동으로 판단한 것" items={auto} tone="#7c3aed" />
        <Block icon={UserCheck} title="사람이 확인할 것" items={human.length ? human : ['현재 단계에서 큰 보완점은 보이지 않습니다.']} tone="#d97706" />
        <Block icon={ClipboardCheck} title="바로 이어갈 행동" items={next.length ? next : ['결과 요약을 열어 발표용 결론을 확인하세요.']} tone="#059669" />
      </div>
    </section>
  )
}

function Block({ icon: Icon, title, items, tone }) {
  return (
    <div className="card-elevated" style={{ padding: 13 }}>
      <p style={{ margin: '0 0 9px', fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>
        <Icon size={15} color={tone} style={{ verticalAlign: -3, marginRight: 6 }} />
        {title}
      </p>
      <div style={{ display: 'grid', gap: 7 }}>
        {items.map(item => (
          <p key={item} style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
            <CheckCircle2 size={13} color={tone} style={{ verticalAlign: -2, marginRight: 5 }} />
            {item}
          </p>
        ))}
      </div>
    </div>
  )
}
