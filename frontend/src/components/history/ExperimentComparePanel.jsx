import { GitCompare, X } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

const fmt = value => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(4)
  return value
}

function metric(item) {
  const first = item.results?.[0] || {}
  const label = item.tuned_metric || (item.task_type === 'regression' ? 'R2' : 'ROC-AUC')
  const value = item.tuned_score ?? first.roc_auc ?? first.r2 ?? first.accuracy
  return { label, value: Number(value), raw: value }
}

function scoreText(item) {
  const m = metric(item)
  return `${m.label} ${fmt(m.raw)}`
}

export default function ExperimentComparePanel({ items, onRemove, onClear, onOpen }) {
  const scored = items.map(item => ({ item, metric: metric(item) }))
  const best = scored
    .filter(row => !Number.isNaN(row.metric.value))
    .sort((a, b) => b.metric.value - a.metric.value)[0]

  return (
    <Card style={{ borderColor: 'rgba(37,99,235,0.24)' }}>
      <CardHeader>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GitCompare size={18} color="#2563eb" /> 실험 비교
            </CardTitle>
            <CardDescription>
              선택한 실험 {items.length}개를 모델, 점수, 개선 여부 기준으로 나란히 봅니다.
            </CardDescription>
          </div>
          <Button variant="secondary" size="sm" onClick={onClear}>비우기</Button>
        </div>
      </CardHeader>
      <CardContent>
        {best && (
          <div className="banner-success" style={{ marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
              현재 선택한 실험 중 <b>{best.item.best_model || '선택 모델'}</b>이 {scoreText(best.item)}로 가장 앞섭니다.
            </p>
          </div>
        )}
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>시간</th>
                <th>분야</th>
                <th>맞힐 값</th>
                <th>모델</th>
                <th>성능</th>
                <th>자동 개선</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={`${item.timestamp}-${item.best_model}-${item.target}`}>
                  <td style={{ whiteSpace: 'nowrap' }}>{item.timestamp || '-'}</td>
                  <td>{item.dataset_domain || '-'}</td>
                  <td>{item.target || '-'}</td>
                  <td style={{ fontWeight: 800, color: 'var(--text)' }}>{item.best_model || '-'}</td>
                  <td style={{ fontWeight: 800, color: '#2563eb' }}>{scoreText(item)}</td>
                  <td><Badge variant={item.optuna_applied ? 'success' : 'secondary'}>{item.optuna_applied ? '적용됨' : '기본'}</Badge></td>
                  <td style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <Button variant="secondary" size="sm" onClick={() => onOpen?.(item)}>상세</Button>
                    <Button variant="ghost" size="icon" onClick={() => onRemove?.(item)} aria-label="비교에서 제거">
                      <X size={15} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
