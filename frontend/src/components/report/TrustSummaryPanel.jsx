import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react'

const badgeTone = status => ({
  good: ['#dcfce7', '#047857', '양호'],
  warning: ['#fef3c7', '#b45309', '주의'],
  limited: ['#fee2e2', '#b91c1c', '제한'],
}[status] || ['#eef2ff', '#4f46e5', '확인'])

function metricStatus(summary, models, primaryMetric) {
  const score = models?.[0]?.[primaryMetric]
  if (score === undefined || score === null) return 'warning'
  if (primaryMetric === 'rmse' || primaryMetric === 'mae') return 'good'
  if (Number(score) >= 0.7) return 'good'
  if (Number(score) >= 0.5) return 'warning'
  return 'limited'
}

export default function TrustSummaryPanel({ summary, models, primaryMetric }) {
  const business = summary?.business_summary || {}
  const risks = business.risk_notes || []
  const drops = summary?.preprocessing?.auto_drop_cols || []
  const features = summary?.feature_evidence?.items || []
  const commercial = business.commercial_readiness || {}

  const rows = [
    ['Data warnings', risks.length ? 'warning' : 'good', risks[0] || '큰 데이터 품질 경고는 없습니다.'],
    ['Leakage warnings', drops.length ? 'warning' : 'good', drops.length ? `${drops.length}개 컬럼을 제외/검토했습니다.` : '강한 누수 의심 컬럼은 보이지 않습니다.'],
    ['Metric threshold', metricStatus(summary, models, primaryMetric), primaryMetric ? `${primaryMetric} 기준으로 모델 성능을 확인했습니다.` : '주요 지표가 제한적입니다.'],
    ['Explanation availability', features.length ? 'good' : 'warning', features.length ? `${features.length}개 설명 근거가 있습니다.` : '설명 근거가 제한적입니다.'],
    ['Deployment readiness', commercial.level ? 'warning' : 'good', commercial.summary || '공유/API 흐름으로 재사용 가능 여부를 확인하세요.'],
    ['Human review status', risks.length ? 'warning' : 'good', risks.length ? '주의 항목 검토를 권장합니다.' : '즉시 차단할 검토 항목은 없습니다.'],
  ]

  return (
    <section className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(5,150,105,0.1)', color: '#059669' }}>
          <ShieldCheck size={17} />
        </span>
        <div>
          <p style={{ margin: '0 0 3px', fontSize: 12, fontWeight: 900, color: '#059669' }}>Model trust summary</p>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>결과 신뢰도 빠른 점검</h2>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
        {rows.map(([label, status, text]) => {
          const [bg, fg, tag] = badgeTone(status)
          const Icon = status === 'good' ? CheckCircle2 : AlertTriangle
          return (
            <div key={label} className="card-elevated" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 900 }}>{label}</p>
                <span className="badge" style={{ background: bg, color: fg }}><Icon size={12} /> {tag}</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>{text}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
