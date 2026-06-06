import { Boxes, CheckCircle2, GitBranch, RefreshCw } from 'lucide-react'

function targetGroups(models) {
  return models.reduce((acc, model) => {
    const target = model.target_col || '목표값 미정'
    acc[target] = acc[target] || []
    acc[target].push(model)
    return acc
  }, {})
}

function nextMessage(models, active) {
  if (!models.length) return '모델 비교를 끝낸 뒤 첫 공유 모델을 만들어야 합니다.'
  if (!active.length) return '저장 파일이 남아 있는 모델이 없습니다. 최신 실험으로 다시 공유 모델을 만드세요.'
  if (models.some(model => model.file_exists === false)) return '파일이 없는 오래된 모델은 정리하고 최신 모델만 남기는 편이 좋습니다.'
  return '최신 모델을 예측 테스트한 뒤 공유 URL이나 API 예시로 연결하면 됩니다.'
}

export default function ModelAssetPanel({ models = [] }) {
  const active = models.filter(model => model.file_exists !== false)
  const groups = targetGroups(active)
  const latest = active[0]
  const missing = models.length - active.length
  const cards = [
    { icon: Boxes, label: '모델 자산', value: `${models.length}개`, desc: '저장된 공유 모델 전체' },
    { icon: CheckCircle2, label: '예측 가능', value: `${active.length}개`, desc: '파일이 남아 있어 호출 가능' },
    { icon: GitBranch, label: '관리 타겟', value: `${Object.keys(groups).length}개`, desc: '맞힐 값 기준 모델 묶음' },
    { icon: RefreshCw, label: '정리 필요', value: `${missing}개`, desc: '파일 누락 또는 오래된 모델' },
  ]

  return (
    <section className="card" style={{ display: 'grid', gap: 14, borderColor: 'rgba(37,99,235,0.18)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 900, color: '#2563eb' }}>모델 자산 현황</p>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
            저장 모델을 재사용 가능한 자산으로 관리합니다
          </h2>
        </div>
        <span className={active.length ? 'badge badge-green' : 'badge badge-amber'}>
          {active.length ? '운영 가능' : '모델 필요'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {cards.map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="card-elevated" style={{ padding: 13 }}>
              <Icon size={16} color="#2563eb" />
              <p style={{ margin: '8px 0 4px', fontSize: 12, fontWeight: 850, color: 'var(--text-label)' }}>{card.label}</p>
              <p style={{ margin: '0 0 5px', fontSize: 22, fontWeight: 950, color: 'var(--text)' }}>{card.value}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.45 }}>{card.desc}</p>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }} className="model-asset-grid">
        <div className="banner-success" style={{ alignItems: 'flex-start' }}>
          <CheckCircle2 size={16} />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            {latest
              ? `최신 모델은 ${latest.name} (${latest.version_label || 'v1'})이며 ${latest.target_col || '목표값'} 예측에 사용됩니다.`
              : '아직 저장된 모델이 없습니다.'}
          </p>
        </div>
        <div className="banner-warning" style={{ alignItems: 'flex-start' }}>
          <RefreshCw size={16} />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{nextMessage(models, active)}</p>
        </div>
      </div>
    </section>
  )
}
