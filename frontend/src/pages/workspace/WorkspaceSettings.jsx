import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../AuthContext'
import api from '../../api'
import { CopyButton, LoadingState, StatusBadge, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'
import FeedbackDialog from '../../components/FeedbackDialog'
import PilotInquiryDialog from '../../components/PilotInquiryDialog'

function usageState(current, limit) {
  if (!limit) return { pct: 0, label: '제한 없음', status: 'active' }
  const pct = Math.min(100, Math.round((Number(current || 0) / Number(limit)) * 100))
  if (pct >= 100) return { pct, label: '한도에 도달했습니다.', status: 'blocked' }
  if (pct >= 80) return { pct, label: '한도에 가까워지고 있습니다.', status: 'warning' }
  return { pct, label: '사용 가능', status: 'active' }
}

function UsageRow({ label, current, limit }) {
  const state = usageState(current, limit)
  return (
    <div style={{ display: 'grid', gap: 7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', fontSize: 13 }}>
        <strong>{label}</strong>
        <span style={{ color: 'var(--text-2)' }}>{current || 0} / {limit ?? '무제한'}</span>
      </div>
      <div className="progress-bar"><div className="progress-fill" style={{ width: `${state.pct}%`, background: state.status === 'blocked' ? '#dc2626' : state.status === 'warning' ? '#d97706' : '#059669' }} /></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ color: 'var(--text-label)', fontSize: 12 }}>{state.label}</span>
        <StatusBadge status={state.status} />
      </div>
    </div>
  )
}

function MonitoringPanel() {
  const [state, setState] = useState({ loading: true, items: [], message: '' })

  useEffect(() => {
    api.get('/admin/monitoring/errors?limit=5')
      .then(res => setState({ loading: false, items: res.data?.items || [], message: '' }))
      .catch(err => {
        const status = err.response?.status
        const message = status === 403 || status === 401
          ? '관리자 권한이 있는 계정에서만 최근 오류 기록을 볼 수 있습니다.'
          : '오류 기록을 불러오지 못했습니다. request ID 또는 error ID를 복사해 공유해 주세요.'
        setState({ loading: false, items: [], message })
      })
  }, [])

  if (state.loading) return <LoadingState label="모니터링 상태를 불러오는 중입니다." />

  return (
    <section className="card" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <p className="section-title">오류와 로그</p>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13 }}>문제가 발생하면 request ID와 error ID로 원인을 빠르게 추적합니다.</p>
        </div>
        <a href="https://github.com/ohsewool/-/blob/main/docs/monitoring-and-error-reporting.md" target="_blank" rel="noreferrer">문서 보기</a>
      </div>
      {state.message && <div className="banner-warning"><p style={{ margin: 0 }}>{state.message}</p></div>}
      {!state.message && !state.items.length && <p style={{ margin: 0, color: 'var(--text-2)' }}>아직 기록된 오류가 없습니다.</p>}
      {!!state.items.length && (
        <div style={{ display: 'grid', gap: 8 }}>
          {state.items.map(item => (
            <div key={item.error_id} className="card-compact" style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <strong>{item.event_type}</strong>
                <StatusBadge status={item.severity === 'error' ? 'failed' : 'warning'} />
              </div>
              <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13 }}>{item.message || '저장된 메시지가 없습니다.'}</p>
              <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>
                {item.method || '-'} {item.route || '-'} / {item.status_code || '-'} / request ID: {item.request_id || '-'} / 오류 ID: {item.error_id}
              </p>
              <CopyButton value={`error_id=${item.error_id} request_id=${item.request_id || '-'}`} label="오류 정보 복사" />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function FeedbackReviewPanel({ onOpenFeedback }) {
  const [state, setState] = useState({ loading: true, items: [], message: '' })

  useEffect(() => {
    api.get('/admin/feedback?limit=5')
      .then(res => setState({ loading: false, items: res.data?.items || [], message: '' }))
      .catch(err => {
        const status = err.response?.status
        const message = status === 403 || status === 401
          ? '관리자 권한이 있는 계정에서만 피드백 목록을 볼 수 있습니다.'
          : '피드백 목록을 불러오지 못했습니다.'
        setState({ loading: false, items: [], message })
      })
  }, [])

  if (state.loading) return <LoadingState label="피드백 상태를 불러오는 중입니다." />

  return (
    <section className="card" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <p className="section-title">베타 피드백</p>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13 }}>ModelMate는 현재 베타 MVP 단계입니다. 사용 중 불편한 점을 보내 주세요.</p>
        </div>
        <button className="btn-primary" type="button" onClick={onOpenFeedback}>피드백 보내기</button>
      </div>
      {state.message && <div className="banner-warning"><p style={{ margin: 0 }}>{state.message}</p></div>}
      {!state.message && !state.items.length && <p style={{ margin: 0, color: 'var(--text-2)' }}>아직 접수된 피드백이 없습니다.</p>}
      {!!state.items.length && (
        <div style={{ display: 'grid', gap: 8 }}>
          {state.items.map(item => (
            <div key={item.feedback_id} className="card-compact" style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <strong>{item.title}</strong>
                <StatusBadge status={item.status === 'new' ? 'created' : item.status === 'resolved' ? 'succeeded' : 'needs_review'} />
              </div>
              <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13 }}>{item.category} / {item.severity} / {item.created_at}</p>
              <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>feedback ID: {item.feedback_id} / request ID: {item.request_id || '-'}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function PilotInquiryReviewPanel({ onOpenPilot }) {
  const [state, setState] = useState({ loading: true, items: [], message: '' })

  function load() {
    setState(prev => ({ ...prev, loading: true }))
    api.get('/admin/pilot-inquiries?limit=5')
      .then(res => setState({ loading: false, items: res.data?.items || [], message: '' }))
      .catch(err => {
        const status = err.response?.status
        const message = status === 403 || status === 401
          ? '관리자 권한이 있는 계정에서만 파일럿 문의 목록을 볼 수 있습니다.'
          : '파일럿 문의 목록을 불러오지 못했습니다.'
        setState({ loading: false, items: [], message })
      })
  }

  useEffect(() => { load() }, [])

  async function mark(inquiryId, status) {
    await api.post(`/admin/pilot-inquiries/${inquiryId}/status`, { status })
    load()
  }

  if (state.loading) return <LoadingState label="파일럿 문의 상태를 불러오는 중입니다." />

  return (
    <section className="card" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <p className="section-title">파일럿 문의</p>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13 }}>플랜 변경과 한도 조정은 결제 없이 수동으로 확인합니다.</p>
        </div>
        <button className="btn-primary" type="button" onClick={onOpenPilot}>파일럿 문의하기</button>
      </div>
      {state.message && <div className="banner-warning"><p style={{ margin: 0 }}>{state.message}</p></div>}
      {!state.message && !state.items.length && <p style={{ margin: 0, color: 'var(--text-2)' }}>아직 접수된 파일럿 문의가 없습니다.</p>}
      {!!state.items.length && (
        <div style={{ display: 'grid', gap: 8 }}>
          {state.items.map(item => (
            <div key={item.inquiry_id} className="card-compact" style={{ display: 'grid', gap: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <strong>{item.name} / {item.desired_plan}</strong>
                <StatusBadge status={item.status === 'new' ? 'created' : item.status === 'closed' ? 'succeeded' : 'running'} />
              </div>
              <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13 }}>{item.email} / {item.organization || '소속 없음'} / {item.created_at}</p>
              <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13 }}>{item.use_case}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn-secondary" type="button" onClick={() => mark(item.inquiry_id, 'contacted')}>연락함</button>
                <button className="btn-secondary" type="button" onClick={() => mark(item.inquiry_id, 'closed')}>닫기</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default function WorkspaceSettings() {
  const { user } = useAuth()
  const [usage, setUsage] = useState(null)
  const [session, setSession] = useState(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [pilotOpen, setPilotOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/me/usage').catch(() => ({ data: null })),
      api.get('/session').catch(() => ({ data: null })),
    ]).then(([usageRes, sessionRes]) => { setUsage(usageRes.data); setSession(sessionRes.data) })
  }, [])

  const rows = useMemo(() => [
    ['프로젝트', usage?.usage?.projects, usage?.limits?.max_projects],
    ['데이터셋', usage?.usage?.datasets, usage?.limits?.max_datasets],
    ['오늘 실행한 작업', usage?.usage?.jobs_today, usage?.limits?.max_jobs_per_day],
    ['예측 API 호출', usage?.usage?.prediction_api_calls_today, usage?.limits?.max_prediction_api_calls_per_day],
    ['API 인증 정보', usage?.usage?.prediction_tokens, usage?.limits?.max_prediction_tokens],
  ], [usage])
  const isAdmin = usage?.is_admin || usage?.role === 'admin' || usage?.plan === 'admin'

  if (!usage) return <div style={{ padding: 24 }}><LoadingState label="설정 정보를 불러오는 중입니다." /></div>

  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 1100 }}>
      <WorkspacePageHeader
        title="설정"
        description="계정, 플랜, 사용량을 확인합니다."
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="admin-detail-grid">
        <section className="card">
          <p className="section-title">계정</p>
          <p><strong>{user?.name || '게스트 데모'}</strong></p>
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>{user?.email || '임시 데모 세션'}</p>
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>세션: {session?.mode || '-'}</p>
        </section>
        <section className="card">
          <p className="section-title">현재 플랜</p>
          <h2 style={{ margin: 0, fontSize: 24 }}>{isAdmin ? '관리자' : usage.plan}</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6 }}>
            {usage.upgrade?.message || '베타 기간에는 플랜 변경을 수동으로 처리합니다.'}
          </p>
          <p style={{ color: 'var(--text-label)', fontSize: 12 }}>현재는 결제 없이 안내용으로만 표시합니다.</p>
          <button className="btn-secondary" type="button" onClick={() => setPilotOpen(true)} style={{ marginTop: 12 }}>
            한도 조정 문의
          </button>
        </section>
      </div>
      <section className="card" style={{ marginTop: 18, display: 'grid', gap: 16 }}>
        <p className="section-title">사용량</p>
        {isAdmin ? (
          <div className="banner-success" style={{ display: 'grid', gap: 6 }}>
            <strong>제한 없음</strong>
            <p style={{ margin: 0 }}>관리자 모드에서는 프로젝트, 데이터셋, 작업, 예측 API 사용량 한도가 적용되지 않습니다.</p>
          </div>
        ) : rows.map(([label, current, limit]) => <UsageRow key={label} label={label} current={current} limit={limit} />)}
      </section>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 18, marginTop: 18 }} className="admin-detail-grid">
        <MonitoringPanel />
        <section className="card" style={{ display: 'grid', gap: 12 }}>
          <p className="section-title">지원 정보</p>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
            문제가 있으면 request ID 또는 error ID를 함께 보내 주세요.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="https://github.com/ohsewool/-/blob/main/docs/privacy.md" target="_blank" rel="noreferrer">개인정보 안내</a>
            <a href="https://github.com/ohsewool/-/blob/main/docs/security-notes.md" target="_blank" rel="noreferrer">보안 안내</a>
            <a href="https://github.com/ohsewool/-/blob/main/docs/usage-limits.md" target="_blank" rel="noreferrer">사용량 제한</a>
            <a href="https://github.com/ohsewool/-/blob/main/docs/prediction-api.md" target="_blank" rel="noreferrer">예측 API</a>
          </div>
        </section>
      </div>
      <div style={{ marginTop: 18 }}>
        <FeedbackReviewPanel onOpenFeedback={() => setFeedbackOpen(true)} />
      </div>
      <div style={{ marginTop: 18 }}>
        <PilotInquiryReviewPanel onOpenPilot={() => setPilotOpen(true)} />
      </div>
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <PilotInquiryDialog
        open={pilotOpen}
        onClose={() => setPilotOpen(false)}
        initial={{ usage, current_plan: usage?.plan, source_route: '/workspace/settings' }}
      />
    </div>
  )
}
