import { Megaphone, Presentation, ShieldCheck } from 'lucide-react'

export default function AgentStoryPanel({ insights }) {
  const story = insights?.agent_story
  if (!story) return null

  return (
    <section className="card" style={{ display: 'grid', gap: 14, borderColor: 'rgba(5,150,105,0.22)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
        <div>
          <p className="section-title" style={{ marginBottom: 6, color: '#059669' }}>발표용 결론</p>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 950, color: 'var(--text)', lineHeight: 1.35 }}>
            {story.one_liner}
          </h2>
        </div>
        <span className="badge badge-green">{story.decision}</span>
      </div>

      <div className="agent-story-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
        <div className="card-elevated" style={{ padding: 13 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>
            <ShieldCheck size={15} color="#059669" style={{ verticalAlign: -3, marginRight: 6 }} />
            왜 의미가 있나
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>{story.why_matters}</p>
          <span className="badge badge-cyan" style={{ marginTop: 10 }}>{story.commercial_level}</span>
        </div>

        <div className="card-elevated" style={{ padding: 13 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>
            <Presentation size={15} color="#2563eb" style={{ verticalAlign: -3, marginRight: 6 }} />
            시연 때 말할 순서
          </p>
          <div style={{ display: 'grid', gap: 7 }}>
            {(story.demo_script || []).map(line => (
              <p key={line} style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                <Megaphone size={13} color="#2563eb" style={{ verticalAlign: -2, marginRight: 5 }} />
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
