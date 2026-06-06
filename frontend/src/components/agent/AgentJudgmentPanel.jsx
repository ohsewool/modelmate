import { Brain, CheckCircle2, Database, GitCompare, Target } from 'lucide-react'

const sections = [
  ['dataset_basis', Database, '데이터 판단 근거'],
  ['target_basis', Target, '맞힐 값 판단'],
  ['model_basis', GitCompare, '모델 선택 근거'],
]

export default function AgentJudgmentPanel({ insights }) {
  const judgment = insights?.agent_judgment
  if (!judgment) return null
  return (
    <section className="card" style={{ display: 'grid', gap: 14, borderColor: 'rgba(37,99,235,0.20)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 900, color: '#2563eb' }}>에이전트 판단 근거</p>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>{judgment.headline}</h2>
        </div>
        <span className={judgment.confidence === '높음' ? 'badge badge-green' : 'badge badge-blue'}>{judgment.confidence}</span>
      </div>

      <div className="agent-judgment-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        {sections.map(([key, Icon, title]) => (
          <div key={key} className="card-elevated" style={{ padding: 13 }}>
            <p style={{ margin: '0 0 9px', fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>
              <Icon size={15} color="#2563eb" style={{ verticalAlign: -3, marginRight: 6 }} />
              {title}
            </p>
            <List items={judgment[key]} />
          </div>
        ))}
      </div>

      <div className="agent-judgment-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <SmallBlock title="주의할 점" items={judgment.risk_basis} tone="#d97706" />
        <SmallBlock title="다음 행동" items={judgment.next_basis} tone="#059669" />
      </div>
    </section>
  )
}

function SmallBlock({ title, items = [], tone }) {
  return (
    <div className="card-elevated" style={{ padding: 13 }}>
      <p style={{ margin: '0 0 9px', fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>
        <Brain size={15} color={tone} style={{ verticalAlign: -3, marginRight: 6 }} />
        {title}
      </p>
      <List items={items.length ? items : ['현재 단계에서 추가 항목이 없습니다.']} tone={tone} />
    </div>
  )
}

function List({ items = [], tone = '#2563eb' }) {
  return (
    <div style={{ display: 'grid', gap: 7 }}>
      {items.map(item => (
        <p key={item} style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
          <CheckCircle2 size={13} color={tone} style={{ verticalAlign: -2, marginRight: 5 }} />
          {item}
        </p>
      ))}
    </div>
  )
}
