import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function Agent() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const nav = useNavigate()

  async function runAgent() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const { data } = await api.post('/run-agent')
      setResult(data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  const steps = result?.steps || []

  return (
    <div className="animate-fade-in" style={{ padding: 32, maxWidth: 980 }}>
      <section style={{
        borderRadius: 10, padding: '22px 24px', marginBottom: 18,
        background: 'var(--surface)',
        color: 'var(--text)', border: '1px solid var(--border)',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: '#7c3aed', margin: '0 0 8px' }}>선택 기능 · AI 한 번에 실행</p>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 6px', letterSpacing: 0 }}>
          AI가 모델 비교부터 이유 분석까지 대신 실행
        </h1>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-2)', margin: 0 }}>
          직접 2~4단계를 눌러 진행할 수도 있고, 여기서 한 번에 맡길 수도 있습니다.
        </p>
      </section>

      {!result && (
        <div className="card" style={{ textAlign: 'center', padding: '56px 36px', marginBottom: 16 }}>
          <div style={{ width: 76, height: 76, borderRadius: 22, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>
            <AgentIcon />
          </div>
          <h2 style={{ fontSize: 22, color: 'var(--text)', margin: '0 0 10px' }}>시간이 없을 때 쓰는 자동 실행 모드</h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 26px' }}>
            AI 에이전트는 모델을 비교하고, 개선이 필요한지 판단하고, 어떤 정보가 예측에 중요했는지 요약합니다.
            발표 흐름을 빠르게 만들고 싶을 때 사용하는 선택 기능입니다.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={runAgent} className="btn-primary" disabled={loading} style={{ padding: '13px 24px' }}>
              {loading && <span className="spinner" />}
              AI에게 한 번에 맡기기
            </button>
            <button onClick={() => nav('/model-lab')} className="btn-secondary" disabled={loading} style={{ padding: '13px 20px' }}>
              직접 모델 고르기
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="card" style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
          {['모델 성능 비교', '성능 개선 판단', '예측 이유 분석', '결과 설명 작성'].map((item, idx) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, background: 'var(--surface-alt)' }}>
              <span className="spinner" />
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{idx + 1}. {item}</p>
                <p style={{ fontSize: 12, color: 'var(--text-label)', margin: '2px 0 0' }}>진행 중입니다.</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: 'rgba(220,38,38,0.22)', background: 'rgba(220,38,38,0.05)', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, color: '#dc2626', margin: '0 0 8px' }}>AI 자동 실행을 시작하지 못했습니다</h2>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 14px' }}>{error}</p>
          <button onClick={() => nav('/upload')} className="btn-secondary">데이터 확인하기</button>
        </div>
      )}

      {result && (
        <>
          <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
            {steps.map((step, idx) => (
              <StepCard key={`${step.step}-${idx}`} step={step} idx={idx} />
            ))}
          </div>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>AI 자동 실행이 끝났습니다</h2>
              <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>
                이제 결과 요약에서 비전공자도 이해할 수 있는 형태로 정리된 내용을 확인하세요.
              </p>
            </div>
            <button onClick={() => nav('/report')} className="btn-primary">결과 요약 보기</button>
          </div>
        </>
      )}
    </div>
  )
}

function StepCard({ step, idx }) {
  const rows = step.data?.results || []
  const optuna = step.data?.after_score !== undefined || step.data?.after_roc !== undefined
  const xai = step.data?.global

  return (
    <div className="card animate-slide-up">
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: 'rgba(124,58,237,0.1)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
          {idx + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-label)' }}>STEP {step.step ?? idx + 1}</span>
            <h3 style={{ fontSize: 15, color: 'var(--text)', margin: 0 }}>{step.name || 'AI 실행 단계'}</h3>
            <span className="badge badge-green" style={{ fontSize: 10 }}>완료</span>
          </div>
          {step.comment && (
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, margin: '0 0 12px' }}>{step.comment}</p>
          )}

          {rows.length > 0 && (
            <div style={{ display: 'grid', gap: 6 }}>
              {rows.slice(0, 4).map(row => (
                <div key={row.model} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--surface-alt)', border: '1px solid var(--border-sub)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 800, flex: 1 }}>{String(row.model).split(' ')[0]}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-label)' }}>점수</span>
                  <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 900 }}>{formatScore(row.roc_auc ?? row.r2 ?? row.accuracy ?? row.f1)}</span>
                </div>
              ))}
            </div>
          )}

          {optuna && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <MiniScore label="개선 전" value={step.data.before_score ?? step.data.before_roc} />
              <MiniScore label="개선 후" value={step.data.after_score ?? step.data.after_roc} strong />
            </div>
          )}

          {xai && (
            <div style={{ display: 'grid', gap: 7 }}>
              {step.data.global.slice(0, 5).map(item => (
                <div key={item.feature} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', width: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.feature}</span>
                  <div className="progress-bar" style={{ flex: 1 }}>
                    <div className="progress-fill" style={{ width: `${Math.min(100, Number(item.shap_value || 0) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MiniScore({ label, value, strong }) {
  return (
    <div style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', background: strong ? 'rgba(16,185,129,0.08)' : 'var(--surface-alt)' }}>
      <p style={{ fontSize: 11, color: 'var(--text-label)', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 900, color: strong ? '#059669' : 'var(--text)', margin: 0 }}>{formatScore(value)}</p>
    </div>
  )
}

function formatScore(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(4) : '-'
}

function AgentIcon() {
  return <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M8 8H4a2 2 0 00-2 2v2a2 2 0 002 2h1" /><path d="M16 8h4a2 2 0 012 2v2a2 2 0 01-2 2h-1" /><path d="M9 20h6" /><path d="M12 14v6" /></svg>
}
