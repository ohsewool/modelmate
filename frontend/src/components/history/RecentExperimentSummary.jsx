import { ArrowRight, Sparkles } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'

const fmt = value => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(4)
  return value
}

export default function RecentExperimentSummary({ item, metric, onOpen, onModelLab }) {
  const task = item.task_type === 'regression' ? '숫자 예측' : '분류 예측'
  const conclusion = item.presentation_conclusion || makeConclusion(item, metric)

  return (
    <Card style={{ borderColor: 'rgba(37,99,235,0.20)', background: 'linear-gradient(135deg, #f8fbff, #f6fefb)' }}>
      <CardContent className="pt-5">
        <div className="recent-summary-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 18, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
              <Badge variant="default"><Sparkles size={13} /> 최근 분석 요약</Badge>
              <Badge variant="secondary">{item.dataset_domain || '도메인 확인 필요'}</Badge>
              <Badge variant={item.optuna_applied ? 'success' : 'secondary'}>
                {item.optuna_applied ? '성능 개선 적용' : '기본 모델 안정'}
              </Badge>
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>
              {item.best_model || '선택 모델'}로 {item.target || '목표값'}을 예측했습니다
            </h2>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--text-2)' }}>{conclusion}</p>
          </div>
          <div className="recent-summary-side" style={{ display: 'grid', gap: 10, minWidth: 190 }}>
            <MiniStat label="예측 유형" value={task} />
            <MiniStat label="대표 성능" value={`${metric.label} ${fmt(metric.value)}`} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" onClick={onOpen}>세부 보기</Button>
              <Button size="sm" variant="secondary" onClick={onModelLab}>비교하기 <ArrowRight size={14} /></Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MiniStat({ label, value }) {
  return (
    <div style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border-sub)', background: 'rgba(255,255,255,0.82)' }}>
      <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-label)', fontWeight: 800 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--text)', fontWeight: 900 }}>{value}</p>
    </div>
  )
}

function makeConclusion(item, metric) {
  const model = item.best_model || '선택된 모델'
  const target = item.target || '목표값'
  const score = metric?.value == null ? '성능 점수' : `${metric.label} ${fmt(metric.value)}`
  return `${model}이 ${target} 예측에서 가장 좋은 결과를 냈습니다. 대표 성능은 ${score}이며, 필요하면 세부 보기에서 모델별 비교와 분석 결론을 확인할 수 있습니다.`
}
