import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import ExperimentActionPanel from './ExperimentActionPanel'

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

function runStatusLabel(status) {
  return ({
    created: '생성됨',
    queued: '대기',
    running: '진행 중',
    succeeded: '완료',
    failed: '실패',
    cancelled: '취소',
    needs_review: '검토 필요',
  }[status || 'succeeded'] || status || '완료')
}

export default function ExperimentDetail({ item, owner, onClose, onNavigate }) {
  const metric = primaryMetric(item)
  const rows = [
    ['데이터 분야', item.dataset_domain || '기록 없음'],
    ['예측 목적', item.target_category || item.target || '-'],
    ['작업 상태', runStatusLabel(item.status)],
    ['선택 모델', item.best_model || '-'],
    ['주요 성능', `${metric.label} ${fmt(metric.value)}`],
  ]

  return (
    <Card>
      <CardHeader>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <CardTitle>실험 세부사항</CardTitle>
            <CardDescription>{item.timestamp || '-'} / {owner}</CardDescription>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>닫기</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
          {rows.map(([label, value]) => <DetailBox key={label} label={label} value={value} />)}
        </div>
        {item.presentation_conclusion && (
          <div style={{ borderRadius: 12, border: '1px solid rgba(37,99,235,0.18)', background: 'rgba(37,99,235,0.06)', padding: 14, marginBottom: 14 }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 900, color: '#2563eb' }}>AI 에이전트 결론</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.65 }}>{item.presentation_conclusion}</p>
          </div>
        )}
        <ExperimentActionPanel item={item} onNavigate={onNavigate} />
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
          <table className="data-table">
            <thead><tr><th>모델</th><th>상태</th><th>Accuracy/R2</th><th>F1/RMSE</th><th>ROC-AUC/MAE</th></tr></thead>
            <tbody>
              {(item.results || []).slice(0, 8).map(row => (
                <tr key={row.model}>
                  <td style={{ fontWeight: 750, color: 'var(--text)' }}>{row.model}</td>
                  <td><Badge variant={row.model === item.best_model ? 'success' : 'secondary'}>{row.status === 'failed' ? '실패' : row.model === item.best_model ? '선택됨' : '완료'}</Badge></td>
                  <td>{fmt(row.accuracy ?? row.r2)}</td>
                  <td>{fmt(row.f1 ?? row.rmse)}</td>
                  <td>{fmt(row.roc_auc ?? row.mae)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function DetailBox({ label, value }) {
  return (
    <div className="card-elevated" style={{ padding: 12 }}>
      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 750, color: 'var(--text-label)' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 850, color: 'var(--text)' }}>{value}</p>
    </div>
  )
}
