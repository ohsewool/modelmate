import { useEffect, useState } from 'react'
import api from '../api'
import { useAuth } from '../AuthContext'

const PLAN_OPTIONS = [
  ['unsure', '아직 모르겠음'],
  ['free', 'Free'],
  ['pro_pilot', 'Pro Pilot'],
  ['team_pilot', 'Team Pilot'],
]

function currentRoute() {
  return `${window.location.pathname}${window.location.search || ''}`
}

export default function PilotInquiryDialog({ open, onClose, initial = {} }) {
  const { user } = useAuth()
  const [usage, setUsage] = useState(initial.usage || null)
  const [form, setForm] = useState({
    name: initial.name || user?.name || '',
    email: initial.email || user?.email || '',
    organization: initial.organization || '',
    role: initial.role || '',
    desired_plan: initial.desired_plan || 'unsure',
    use_case: initial.use_case || '',
    expected_dataset_size: initial.expected_dataset_size || '',
    message: initial.message || '',
  })
  const [state, setState] = useState({ loading: false, message: '', error: '' })

  useEffect(() => {
    if (!open) return
    setForm(prev => ({
      ...prev,
      name: prev.name || initial.name || user?.name || '',
      email: prev.email || initial.email || user?.email || '',
      desired_plan: initial.desired_plan || prev.desired_plan || 'unsure',
      use_case: initial.use_case || prev.use_case || '',
      expected_dataset_size: initial.expected_dataset_size || prev.expected_dataset_size || '',
    }))
  }, [open, initial.desired_plan])

  useEffect(() => {
    if (!open) return
    api.get('/me/usage')
      .then(res => setUsage(res.data))
      .catch(() => setUsage(initial.usage || null))
  }, [open])

  if (!open) return null

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setState({ loading: true, message: '', error: '' })
    try {
      const payload = {
        ...form,
        current_plan: usage?.plan || initial.current_plan || '',
        usage_snapshot: usage ? {
          mode: usage.mode,
          plan: usage.plan,
          plan_status: usage.plan_status,
          limits: usage.limits,
          usage: usage.usage,
          warnings: usage.warnings,
          capabilities: usage.capabilities,
          source_route: initial.source_route || currentRoute(),
        } : { source_route: initial.source_route || currentRoute() },
        source_route: initial.source_route || currentRoute(),
      }
      const res = await api.post('/pilot-inquiries', payload)
      setState({
        loading: false,
        message: res.data?.message || '문의가 접수되었습니다. 파일럿 기간에는 플랜 변경과 한도 조정을 수동으로 확인합니다.',
        error: '',
      })
      setForm(prev => ({ ...prev, use_case: '', message: '' }))
    } catch (err) {
      setState({
        loading: false,
        message: '',
        error: err.response?.data?.detail?.message || err.response?.data?.message || '문의를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.',
      })
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'grid', placeItems: 'center', padding: 18, background: 'rgba(15,23,42,.42)' }}>
      <form className="card" onSubmit={submit} style={{ width: 'min(680px, 100%)', maxHeight: '92vh', overflow: 'auto', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <p className="section-title">파일럿 사용 문의</p>
            <h2 style={{ margin: 0, fontSize: 22 }}>파일럿 사용과 한도 조정 문의</h2>
            <p style={{ margin: '8px 0 0', color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6 }}>
              현재 실제 결제는 연결되어 있지 않습니다. 파일럿 기간에는 플랜 변경과 사용량 한도 조정을 수동으로 확인합니다.
            </p>
          </div>
          <button className="btn-secondary" type="button" onClick={onClose}>닫기</button>
        </div>

        <div className="banner-warning">
          <p style={{ margin: 0, fontSize: 13 }}>
            민감정보, 결제정보, API 인증 정보, CSV 원문은 입력하지 마세요. 사용 목적과 필요한 한도만 간단히 적어 주세요.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="admin-detail-grid">
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>이름</span>
            <input className="input" value={form.name} onChange={event => update('name', event.target.value)} maxLength={120} required />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>이메일</span>
            <input className="input" type="email" value={form.email} onChange={event => update('email', event.target.value)} maxLength={240} required />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>소속</span>
            <input className="input" value={form.organization} onChange={event => update('organization', event.target.value)} maxLength={160} placeholder="선택 입력" />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>역할</span>
            <input className="input" value={form.role} onChange={event => update('role', event.target.value)} maxLength={120} placeholder="예: 운영, 마케팅, 분석" />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="admin-detail-grid">
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>관심 플랜</span>
            <select className="input" value={form.desired_plan} onChange={event => update('desired_plan', event.target.value)}>
              {PLAN_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>예상 데이터 규모</span>
            <input className="input" value={form.expected_dataset_size} onChange={event => update('expected_dataset_size', event.target.value)} maxLength={160} placeholder="예: 월 5개 CSV, 1만 행 이하" />
          </label>
        </div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 800 }}>사용 목적</span>
          <textarea className="input" value={form.use_case} onChange={event => update('use_case', event.target.value)} rows={3} maxLength={500} placeholder="어떤 CSV로 무엇을 예측하고 싶은지 적어 주세요." required />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 800 }}>문의 내용</span>
          <textarea className="input" value={form.message} onChange={event => update('message', event.target.value)} rows={4} maxLength={2000} placeholder="필요한 사용량, 보고서/API 활용 계획, 파일럿 일정 등을 적어 주세요." required />
        </label>

        {usage?.plan && (
          <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>
              현재 플랜: {usage.plan_label || (usage.plan === 'admin' ? '관리자' : '무료')} / 이 화면의 사용량 요약만 함께 전달됩니다.
          </p>
        )}
        {state.message && <div className="banner-success"><p style={{ margin: 0 }}>{state.message}</p></div>}
        {state.error && <div className="banner-danger"><p style={{ margin: 0 }}>{state.error}</p></div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-secondary" type="button" onClick={onClose}>취소</button>
          <button className="btn-primary" type="submit" disabled={state.loading}>{state.loading ? '보내는 중' : '문의 보내기'}</button>
        </div>
      </form>
    </div>
  )
}
