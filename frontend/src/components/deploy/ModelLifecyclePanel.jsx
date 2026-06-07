import { Archive, GitBranch, RotateCcw, ShieldCheck } from 'lucide-react'

function groupByTarget(models) {
  return models.reduce((acc, model) => {
    const key = model.target_col || 'target'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function nextAction(models, active) {
  if (!active.length) return '모델 비교 후 공유 모델을 먼저 생성하세요.'
  if (models.some(model => model.file_exists === false)) return '파일이 없는 모델은 삭제하거나 다시 생성하세요.'
  if (active.length > 3) return '운영 중 헷갈리지 않도록 오래된 모델을 정리하세요.'
  return '최신 모델을 테스트하고 API 주소를 공유 흐름에 연결하세요.'
}

export default function ModelLifecyclePanel({ models = [] }) {
  const active = models.filter(model => model.file_exists !== false)
  const targetGroups = groupByTarget(active)
  const targetCount = Object.keys(targetGroups).length
  const latest = active[0]
  const missing = models.length - active.length
  const cards = [
    ['저장 모델', `${models.length}개`, '생성된 공유 모델 전체', Archive],
    ['활성 모델', `${active.length}개`, '현재 예측 URL 호출 가능', ShieldCheck],
    ['관리 대상', `${targetCount}종`, '맞힐 값 기준 모델 묶음', GitBranch],
    ['점검 필요', `${missing}개`, '모델 파일이 없으면 삭제 권장', RotateCcw],
  ]

  return (
    <section className="card" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 900, color: '#7c3aed' }}>모델 자산 관리</p>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
            저장한 모델을 버전처럼 관리합니다
          </h2>
        </div>
        <span className={active.length ? 'badge badge-green' : 'badge badge-amber'}>
          {active.length ? '재사용 가능' : '모델 없음'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
        {cards.map(([label, value, desc, Icon]) => (
          <div key={label} className="card-elevated" style={{ padding: 13 }}>
            <Icon size={16} color="#7c3aed" />
            <p style={{ margin: '8px 0 5px', fontSize: 12, fontWeight: 850, color: 'var(--text-label)' }}>{label}</p>
            <p style={{ margin: '0 0 5px', fontSize: 22, fontWeight: 950, color: 'var(--text)' }}>{value}</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.45 }}>{desc}</p>
          </div>
        ))}
      </div>

      <div className="banner-success" style={{ alignItems: 'flex-start' }}>
        <ShieldCheck size={16} />
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
          {latest
            ? `최근 모델은 ${latest.name} (${latest.version_label || 'v1'})입니다. ${nextAction(models, active)}`
            : nextAction(models, active)}
        </p>
      </div>
    </section>
  )
}
