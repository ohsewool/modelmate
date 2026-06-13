import { useMemo, useState } from 'react'
import api from '../api'

const CATEGORY_OPTIONS = [
  ['bug', '버그'],
  ['confusing_ux', '화면이 헷갈림'],
  ['wrong_result', '결과가 이상함'],
  ['report_issue', '보고서 문제'],
  ['prediction_api_issue', '예측 API 문제'],
  ['dataset_issue', '데이터 문제'],
  ['performance_issue', '속도 문제'],
  ['feature_request', '기능 요청'],
  ['other', '기타'],
]

const SEVERITY_OPTIONS = [
  ['low', '낮음'],
  ['medium', '보통'],
  ['high', '높음'],
  ['blocking', '사용 불가'],
]

function routeContext(route) {
  const projectMatch = route.match(/\/projects\/([^/?]+)/)
  const runMatch = route.match(/\/runs\/([^/?]+)/)
  return {
    route,
    page_url: window.location.href,
    project_id: projectMatch?.[1] || '',
    run_id: runMatch?.[1] || '',
  }
}

export default function FeedbackDialog({ open, onClose, initial = {} }) {
  const context = useMemo(() => ({ ...routeContext(window.location.pathname), ...initial }), [initial, open])
  const [form, setForm] = useState({
    category: initial.category || 'confusing_ux',
    severity: initial.severity || 'medium',
    title: initial.title || '',
    message: initial.message || '',
    request_id: initial.request_id || '',
    error_id: initial.error_id || '',
    attach_context: true,
  })
  const [state, setState] = useState({ loading: false, message: '', error: '' })

  if (!open) return null

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setState({ loading: true, message: '', error: '' })
    try {
      const payload = {
        category: form.category,
        severity: form.severity,
        title: form.title,
        message: form.message,
        request_id: form.request_id,
        error_id: form.error_id,
        ...(form.attach_context ? context : {}),
      }
      const res = await api.post('/feedback', payload)
      setState({ loading: false, message: res.data?.message || '피드백이 접수되었습니다.', error: '' })
      setForm(prev => ({ ...prev, title: '', message: '' }))
    } catch (err) {
      setState({
        loading: false,
        message: '',
        error: err.response?.data?.error?.message || err.response?.data?.detail?.message || '피드백을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.',
      })
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'grid', placeItems: 'center', padding: 18, background: 'rgba(15,23,42,.42)' }}>
      <form className="card" onSubmit={submit} style={{ width: 'min(620px, 100%)', maxHeight: '92vh', overflow: 'auto', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p className="section-title">베타 피드백</p>
            <h2 style={{ margin: 0, fontSize: 22 }}>피드백 보내기</h2>
            <p style={{ margin: '8px 0 0', color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6 }}>
              사용 중 불편한 점, 오류, 개선 아이디어를 보내주시면 제품 개선에 반영하겠습니다.
            </p>
          </div>
          <button className="btn-secondary" type="button" onClick={onClose}>닫기</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="admin-detail-grid">
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>유형</span>
            <select className="input" value={form.category} onChange={event => update('category', event.target.value)}>
              {CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>중요도</span>
            <select className="input" value={form.severity} onChange={event => update('severity', event.target.value)}>
              {SEVERITY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 800 }}>제목</span>
          <input className="input" value={form.title} onChange={event => update('title', event.target.value)} maxLength={160} placeholder="예: 보고서 문구가 이해하기 어려웠어요" required />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 800 }}>자세한 내용</span>
          <textarea className="input" value={form.message} onChange={event => update('message', event.target.value)} rows={5} maxLength={3000} placeholder="어떤 화면에서 무엇이 불편했는지 적어 주세요." required />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="admin-detail-grid">
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>request ID</span>
            <input className="input" value={form.request_id} onChange={event => update('request_id', event.target.value)} placeholder="있으면 입력" />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>error ID</span>
            <input className="input" value={form.error_id} onChange={event => update('error_id', event.target.value)} placeholder="있으면 입력" />
          </label>
        </div>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-2)', fontSize: 13 }}>
          <input type="checkbox" checked={form.attach_context} onChange={event => update('attach_context', event.target.checked)} />
          현재 페이지 정보와 프로젝트/실행 ID를 함께 보냅니다. CSV 원문이나 전체 token은 포함하지 않습니다.
        </label>

        {state.message && <div className="banner-success"><p style={{ margin: 0 }}>{state.message}</p></div>}
        {state.error && <div className="banner-danger"><p style={{ margin: 0 }}>{state.error}</p></div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-secondary" type="button" onClick={onClose}>취소</button>
          <button className="btn-primary" type="submit" disabled={state.loading}>{state.loading ? '보내는 중' : '보내기'}</button>
        </div>
      </form>
    </div>
  )
}
