import { useEffect, useState } from 'react'
import { useAuth } from '../../AuthContext'
import api from '../../api'
import { LoadingState, WorkspacePageHeader } from '../../components/workspace-shell/WorkspaceStates'

function UsageRow({ label, current, limit }) {
  const pct = limit ? Math.min(100, Math.round((Number(current || 0) / Number(limit)) * 100)) : 0
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
        <strong>{label}</strong><span style={{ color: 'var(--text-2)' }}>{current || 0} / {limit}</span>
      </div>
      <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

export default function WorkspaceSettings() {
  const { user } = useAuth()
  const [usage, setUsage] = useState(null)
  const [session, setSession] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/me/usage').catch(() => ({ data: null })),
      api.get('/session').catch(() => ({ data: null })),
    ]).then(([usageRes, sessionRes]) => { setUsage(usageRes.data); setSession(sessionRes.data) })
  }, [])

  if (!usage) return <div style={{ padding: 24 }}><LoadingState label="설정 정보를 불러오는 중입니다." /></div>

  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 980 }}>
      <WorkspacePageHeader title="설정" description="계정, 플랜, 사용량, 제품 정책 문서를 확인합니다. 이 MVP에는 실제 결제가 연결되어 있지 않습니다." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="admin-detail-grid">
        <section className="card">
          <p className="section-title">계정</p>
          <p><strong>{user?.name || '게스트 데모'}</strong></p>
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>{user?.email || '임시 데모 세션'}</p>
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>세션: {session?.mode || '-'}</p>
        </section>
        <section className="card">
          <p className="section-title">현재 플랜</p>
          <h2 style={{ margin: 0, fontSize: 24 }}>{usage.plan}</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6 }}>{usage.upgrade?.message || '베타 MVP 기간에는 플랜 변경을 수동으로 처리합니다.'}</p>
        </section>
      </div>
      <section className="card" style={{ marginTop: 18, display: 'grid', gap: 14 }}>
        <p className="section-title">사용량</p>
        <UsageRow label="프로젝트" current={usage.usage?.projects} limit={usage.limits?.max_projects} />
        <UsageRow label="데이터셋" current={usage.usage?.datasets} limit={usage.limits?.max_datasets} />
        <UsageRow label="오늘 실행한 작업" current={usage.usage?.jobs_today} limit={usage.limits?.max_jobs_per_day} />
        <UsageRow label="예측 API 호출" current={usage.usage?.prediction_api_calls_today} limit={usage.limits?.max_prediction_api_calls_per_day} />
      </section>
      <section className="card" style={{ marginTop: 18 }}>
        <p className="section-title">문서와 정책</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="https://github.com/ohsewool/-/blob/main/docs/privacy.md" target="_blank" rel="noreferrer">개인정보 안내</a>
          <a href="https://github.com/ohsewool/-/blob/main/docs/security-notes.md" target="_blank" rel="noreferrer">보안 안내</a>
          <a href="https://github.com/ohsewool/-/blob/main/docs/usage-limits.md" target="_blank" rel="noreferrer">사용량 제한</a>
          <a href="https://github.com/ohsewool/-/blob/main/docs/prediction-api.md" target="_blank" rel="noreferrer">예측 API</a>
        </div>
      </section>
    </div>
  )
}
