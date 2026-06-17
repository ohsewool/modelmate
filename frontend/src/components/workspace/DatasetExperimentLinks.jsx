import { BarChart3 } from 'lucide-react'
import { Badge } from '../ui/badge'

const fmt = value => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(4)
  return value
}

function primaryMetric(item) {
  const first = item.results?.[0] || {}
  const label = item.tuned_metric || (item.task_type === 'regression' ? 'R2' : 'ROC-AUC')
  const value = item.tuned_score ?? first.roc_auc ?? first.r2 ?? first.accuracy
  return { label, value }
}

export default function DatasetExperimentLinks({ experiments, onSelect }) {
  return (
    <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: '1px solid var(--border-sub)', background: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>연결된 실험</p>
        <Badge variant={experiments.length ? 'success' : 'secondary'}>{experiments.length}개</Badge>
      </div>
      {!experiments.length ? (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>
          아직 이 데이터셋으로 저장된 모델 비교 기록이 없습니다. 다시 분석을 누르면 이후 실험이 자동으로 연결됩니다.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 7 }}>
          {experiments.slice(0, 4).map((item, idx) => {
            const metric = primaryMetric(item)
            return (
              <button
                type="button"
                key={`${item.timestamp}-${idx}`}
                onClick={() => onSelect?.(item)}
                style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 9, alignItems: 'center', padding: 9, borderRadius: 10, border: '1px solid var(--border-sub)', background: 'var(--surface-alt)', textAlign: 'left', cursor: 'pointer' }}
              >
                <BarChart3 size={15} color="#2563eb" />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 850, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.best_model || '모델 비교'} · {metric.label} {fmt(metric.value)}
                  </span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--text-label)' }}>{item.timestamp || '-'}</span>
                </span>
                <Badge variant={item.agent_run ? 'default' : 'secondary'}>{item.agent_run ? '자동' : 'CV'}</Badge>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
