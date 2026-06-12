import { useEffect, useState } from 'react'
import api from '../api'

function usageLine(label, current, limit) {
  if (current === undefined || limit === undefined) return `${label}: -`
  return `${label}: ${current} / ${limit}`
}

export default function UsagePlanCard() {
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    let mounted = true
    api.get('/me/usage')
      .then(res => { if (mounted) setSummary(res.data) })
      .catch(() => { if (mounted) setSummary(null) })
    return () => { mounted = false }
  }, [])

  if (!summary || summary.mode === 'guest_demo') {
    return (
      <div style={{ margin: '0 10px 8px', borderRadius: 12, border: '1px solid var(--border)', padding: 12, background: 'var(--surface-alt)' }}>
        <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 800, color: 'var(--text-label)', textTransform: 'uppercase' }}>사용량</p>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-2)', lineHeight: 1.45 }}>로그인하면 플랜과 프로젝트 사용량을 확인할 수 있습니다.</p>
      </div>
    )
  }

  const usage = summary.usage || {}
  const limits = summary.limits || {}
  const warning = (summary.warnings || [])[0]
  return (
    <div style={{ margin: '0 10px 8px', borderRadius: 12, border: '1px solid var(--border)', padding: 12, background: 'var(--surface-alt)', display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'var(--text-label)', textTransform: 'uppercase' }}>현재 플랜</p>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#2563eb' }}>{summary.plan}</span>
      </div>
      <div style={{ display: 'grid', gap: 4, fontSize: 11, color: 'var(--text-2)' }}>
        <span>{usageLine('프로젝트', usage.projects, limits.max_projects)}</span>
        <span>{usageLine('데이터셋', usage.datasets, limits.max_datasets)}</span>
        <span>{usageLine('오늘 분석', usage.jobs_today, limits.max_jobs_per_day)}</span>
        <span>{usageLine('예측 API', usage.prediction_api_calls_today, limits.max_prediction_api_calls_per_day)}</span>
      </div>
      {warning && (
        <p style={{ margin: 0, fontSize: 11, color: '#b45309', lineHeight: 1.4 }}>
          한도에 가까워졌습니다. 베타 기간에는 플랜 변경을 수동으로 문의하세요.
        </p>
      )}
    </div>
  )
}
