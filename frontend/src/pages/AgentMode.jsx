import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, ListChecks, ShieldAlert } from 'lucide-react'
import api from '../api'

const EXAMPLE_GOAL = '이 CSV로 고객 이탈 가능성을 예측하고 중요한 요인을 보고서로 정리해줘.'

function statusLabel(status) {
  if (status === 'supported') return '지원 가능'
  if (status === 'limited') return '제한적 지원'
  if (status === 'unsupported') return '지원 범위 밖'
  return '검토 필요'
}

function runTitle(run) {
  return run?.user_goal || run?.goal_text || '저장된 Agent Run'
}

function ScopePanel({ interpreted }) {
  if (!interpreted) return null
  const tone = interpreted.supported_status === 'unsupported' ? '#991b1b' : interpreted.supported_status === 'limited' ? '#92400e' : '#047857'
  return (
    <section className="card" style={{ borderColor: interpreted.supported_status === 'unsupported' ? '#fecaca' : 'var(--border)' }}>
      <p className="section-title">지원 범위 판단</p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong style={{ color: tone }}>{statusLabel(interpreted.supported_status)}</strong>
        <span style={{ color: 'var(--text-2)' }}>{interpreted.report_framing}</span>
      </div>
      {interpreted.unsupported_reason && <p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>{interpreted.unsupported_reason}</p>}
      {interpreted.warnings?.length > 0 && (
        <ul style={{ margin: '12px 0 0', paddingLeft: 20, color: 'var(--text-2)' }}>
          {interpreted.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
        </ul>
      )}
    </section>
  )
}

function PlanPreview({ plan }) {
  if (!plan?.steps?.length) return null
  return (
    <section className="card">
      <p className="section-title">실행 계획 미리보기</p>
      <div style={{ display: 'grid', gap: 10 }}>
        {plan.steps.map(step => (
          <div key={step.plan_step_id} style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: 10, alignItems: 'start', padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-alt)' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', background: step.status === 'blocked' ? '#fee2e2' : '#dbeafe', color: step.status === 'blocked' ? '#991b1b' : '#1d4ed8' }}>
              {step.status === 'blocked' ? <ShieldAlert size={15} /> : <Clock3 size={15} />}
            </div>
            <div>
              <strong>{step.order}. {step.name}</strong>
              <p style={{ margin: '4px 0', color: 'var(--text-2)', lineHeight: 1.5 }}>{step.purpose}</p>
              <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>{step.tool_name}</p>
              {step.requires_human_review && <p style={{ margin: '6px 0 0', color: '#92400e', fontSize: 12 }}>검토 필요: {step.review_reason || '사용자 확인이 필요할 수 있습니다.'}</p>}
            </div>
            <span className="status-pill">{step.status === 'blocked' ? 'blocked' : 'planned'}</span>
          </div>
        ))}
      </div>
      <div className="banner-warning" style={{ marginTop: 12 }}>
        PR-27 단계에서는 계획만 저장합니다. 실제 tool 실행, observation, decision 기록은 PR-28에서 연결됩니다.
      </div>
    </section>
  )
}

export default function AgentMode() {
  const [goalText, setGoalText] = useState(EXAMPLE_GOAL)
  const [targetPreference, setTargetPreference] = useState('')
  const [runs, setRuns] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedRun = selected?.agent_run
  const interpreted = selectedRun?.interpreted_goal
  const statusText = useMemo(() => statusLabel(interpreted?.supported_status), [interpreted])

  async function loadRuns() {
    const res = await api.get('/agent-runs')
    const items = res.data.agent_runs || []
    setRuns(items)
    if (!selected && items[0]) setSelected(items[0])
  }

  useEffect(() => {
    loadRuns().catch(() => setRuns([]))
  }, [])

  async function createRun(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/agent-runs', {
        goal_text: goalText,
        target_preference: targetPreference || null,
      })
      setSelected({ agent_run: res.data.agent_run, plan: res.data.plan })
      await loadRuns()
    } catch (err) {
      setError(err.response?.data?.detail || 'Agent Run을 만들지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 1180 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <p className="section-title">Agent Mode</p>
          <h1 style={{ margin: '4px 0 8px' }}>목표 기반 분석 계획</h1>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
            자연어 분석 목표를 입력하면 지원 범위를 판단하고, 실행 전 계획을 저장합니다. 빠른 자동 분석과 별도의 계획 중심 흐름입니다.
          </p>
        </div>
        {selectedRun && (
          <div className="card" style={{ minWidth: 220 }}>
            <p className="section-title">현재 Agent Run</p>
            <strong>{statusText}</strong>
            <p style={{ margin: '6px 0 0', color: 'var(--text-label)', fontSize: 12 }}>{selectedRun.id}</p>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18 }} className="admin-detail-grid">
        <div style={{ display: 'grid', gap: 14 }}>
          <form className="card" onSubmit={createRun}>
            <p className="section-title">분석 목표 입력</p>
            <label style={{ display: 'grid', gap: 8, fontWeight: 800 }}>
              무엇을 예측하고 싶나요?
              <textarea
                value={goalText}
                onChange={event => setGoalText(event.target.value)}
                rows={4}
                placeholder={EXAMPLE_GOAL}
                style={{ resize: 'vertical' }}
              />
            </label>
            <label style={{ display: 'grid', gap: 8, marginTop: 12, fontWeight: 800 }}>
              타깃 컬럼 힌트 선택 입력
              <input
                value={targetPreference}
                onChange={event => setTargetPreference(event.target.value)}
                placeholder="예: churn, failure_risk, demand"
              />
            </label>
            {error && <div className="banner-warning" style={{ marginTop: 12 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <button className="btn-primary" disabled={loading} type="submit">
                <ListChecks size={15} /> {loading ? '계획 생성 중' : 'Agent Run 만들기'}
              </button>
              <button className="btn-secondary" type="button" onClick={() => setGoalText('문서들로 RAG 챗봇을 만들어줘.')}>지원 범위 밖 예시</button>
            </div>
          </form>

          <ScopePanel interpreted={interpreted} />
          <PlanPreview plan={selected?.plan} />
        </div>

        <aside className="card" style={{ alignSelf: 'start' }}>
          <p className="section-title">최근 Agent Run</p>
          {runs.length === 0 ? (
            <p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>아직 저장된 목표 기반 Agent Run이 없습니다.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {runs.map(item => (
                <button
                  key={item.agent_run.id}
                  className="btn-secondary"
                  type="button"
                  onClick={() => setSelected(item)}
                  style={{ justifyContent: 'flex-start', textAlign: 'left', whiteSpace: 'normal' }}
                >
                  <CheckCircle2 size={15} />
                  <span>
                    <strong>{runTitle(item.agent_run).slice(0, 42)}</strong>
                    <br />
                    <span style={{ color: 'var(--text-label)', fontSize: 12 }}>{statusLabel(item.agent_run.supported_status)} · {item.agent_run.status}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
