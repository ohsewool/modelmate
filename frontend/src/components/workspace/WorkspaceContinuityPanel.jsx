import { ArrowRight, Database, FileText, GitBranch, Wand2 } from 'lucide-react'
import { Button } from '../ui/button'

function findLinkedExperiment(dataset, history) {
  return history.find(item => {
    if (item.dataset_ref?.id && dataset.id) return item.dataset_ref.id === dataset.id
    const sameTarget = String(item.target || '') === String(dataset.target_col || '')
    const sameRows = Number(item.data_shape?.[0]) === Number(dataset.rows)
    return sameTarget && sameRows
  })
}

export default function WorkspaceContinuityPanel({ datasets = [], history = [], onOpenExperiment, onUpload }) {
  const latestDataset = datasets[0]
  const latestExperiment = history[0]
  const linkedExperiment = latestDataset ? findLinkedExperiment(latestDataset, history) : latestExperiment
  const hasModel = Boolean(linkedExperiment?.best_model)
  const steps = [
    { icon: Database, label: '데이터셋', value: latestDataset?.filename || '아직 없음' },
    { icon: GitBranch, label: '실험', value: linkedExperiment ? `${linkedExperiment.target || '타겟'} 분석` : '연결 대기' },
    { icon: Wand2, label: '모델', value: linkedExperiment?.best_model || '선택 전' },
    { icon: FileText, label: '결과', value: hasModel ? '재사용 가능' : '분석 필요' },
  ]

  return (
    <section className="card" style={{ borderColor: 'rgba(5,150,105,0.20)', background: 'linear-gradient(135deg, #f8fffb, #f8fbff)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 900, color: '#059669' }}>작업 연속성</p>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
            이전 분석을 다시 이어갈 수 있는지 확인합니다
          </h2>
          <p style={{ margin: '7px 0 0', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            상용 서비스처럼 보이려면 업로드한 CSV, 실험 결과, 선택 모델, 보고서가 끊기지 않고 이어져야 합니다.
          </p>
        </div>
        <Button variant={hasModel ? 'default' : 'secondary'} onClick={() => hasModel ? onOpenExperiment?.(linkedExperiment) : onUpload?.()}>
          {hasModel ? '최근 실험 열기' : 'CSV로 시작'}
          <ArrowRight size={15} />
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {steps.map(step => {
          const Icon = step.icon
          return (
            <div key={step.label} style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border-sub)', background: 'rgba(255,255,255,0.82)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'rgba(5,150,105,0.10)', color: '#059669' }}>
                  <Icon size={15} />
                </span>
                <b style={{ fontSize: 12, color: 'var(--text-label)' }}>{step.label}</b>
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 850, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {step.value}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
