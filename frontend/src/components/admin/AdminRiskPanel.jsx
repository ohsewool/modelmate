import { AlertTriangle, CheckCircle2, Database, Target } from 'lucide-react'

function riskItems(summary) {
  const datasets = summary?.recent_datasets || []
  const uncertain = datasets.filter(item => !item.domain || item.domain.includes('확인 필요')).length
  const missingTarget = datasets.filter(item => !item.target_col).length
  const small = datasets.filter(item => Number(item.rows || 0) > 0 && Number(item.rows || 0) < 30).length
  const noExperiments = Math.max(0, Number(summary?.dataset_count || 0) - Number(summary?.experiment_count || 0))
  return [
    {
      title: '도메인 확인 필요',
      value: uncertain,
      ok: uncertain === 0,
      body: uncertain ? '최근 업로드 중 업무 분야가 불확실한 데이터가 있습니다.' : '최근 업로드의 도메인 판단이 안정적입니다.',
      icon: Database,
    },
    {
      title: '맞힐 값 미확인',
      value: missingTarget,
      ok: missingTarget === 0,
      body: missingTarget ? '일부 데이터셋은 예측 대상 컬럼 확인이 필요합니다.' : '최근 데이터셋의 맞힐 값이 기록되어 있습니다.',
      icon: Target,
    },
    {
      title: '작은 데이터셋',
      value: small,
      ok: small === 0,
      body: small ? '행 수가 적은 데이터는 성능 해석에 주의가 필요합니다.' : '최근 데이터셋 행 수는 기본 검증에 충분합니다.',
      icon: AlertTriangle,
    },
    {
      title: '실험 미연결',
      value: noExperiments,
      ok: noExperiments === 0,
      body: noExperiments ? '업로드 후 모델 비교까지 이어지지 않은 데이터가 있을 수 있습니다.' : '데이터셋과 실험 흐름이 잘 이어지고 있습니다.',
      icon: CheckCircle2,
    },
  ]
}

export default function AdminRiskPanel({ summary }) {
  const items = riskItems(summary)
  const warningCount = items.filter(item => !item.ok).length
  return (
    <div className="card-elevated" style={{ padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <p style={{ margin: '0 0 5px', fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>운영 점검</p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>관리자가 발표 중 확인할 수 있는 데이터 품질 신호입니다.</p>
        </div>
        <span className={warningCount ? 'badge badge-amber' : 'badge badge-green'}>
          {warningCount ? `${warningCount}개 확인` : '정상'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 9 }}>
        {items.map(item => {
          const Icon = item.icon
          return (
            <div key={item.title} style={{ padding: 10, borderRadius: 10, border: `1px solid ${item.ok ? 'rgba(5,150,105,0.18)' : 'rgba(245,158,11,0.24)'}`, background: item.ok ? 'rgba(5,150,105,0.06)' : 'rgba(245,158,11,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 7 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 900, color: 'var(--text)' }}>
                  <Icon size={14} color={item.ok ? '#059669' : '#d97706'} /> {item.title}
                </span>
                <b style={{ color: item.ok ? '#059669' : '#d97706' }}>{item.value}</b>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.45 }}>{item.body}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
