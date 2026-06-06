import { GitBranch, Layers3 } from 'lucide-react'

const fmt = value => {
  if (value === null || value === undefined || value === '') return '-'
  return typeof value === 'number' ? value.toFixed(4) : value
}

function groupVersions(models) {
  return models.reduce((acc, model) => {
    const key = `${model.target_col || 'target'}:${model.best_model_name || 'model'}`
    if (!acc[key]) acc[key] = []
    acc[key].push(model)
    return acc
  }, {})
}

function statusClass(status) {
  if (status === '사용 가능') return 'badge badge-green'
  if (status === '점수 확인 필요') return 'badge badge-amber'
  return 'badge badge-red'
}

export default function ModelVersionPanel({ models = [] }) {
  const groups = Object.entries(groupVersions(models))
  const latest = models[0]
  return (
    <section className="card" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
        <div>
          <p className="section-title" style={{ marginBottom: 4 }}>저장 모델 버전 관리</p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            같은 타겟과 모델 계열로 저장된 모델을 버전처럼 묶어 보여줍니다.
          </p>
        </div>
        <span className="badge badge-blue">{groups.length}개 계열</span>
      </div>

      {latest ? (
        <div className="card-elevated" style={{ padding: 14, display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Layers3 size={16} color="#2563eb" />
            <strong style={{ color: 'var(--text)' }}>최근 모델: {latest.name}</strong>
            <span className="badge badge-violet">{latest.version_label || 'v1'}</span>
            <span className={statusClass(latest.lifecycle_status)}>{latest.lifecycle_status || latest.storage_status}</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>
            {latest.target_col || '-'} 예측 / {latest.best_model_name || '-'} / 점수 {fmt(latest.primary_score)} / 입력 정보 {latest.feature_count ?? latest.features?.length ?? 0}개
          </p>
        </div>
      ) : (
        <div className="banner-warning">
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>아직 저장된 모델이 없습니다.</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {groups.slice(0, 4).map(([key, rows]) => {
          const [target, modelName] = key.split(':')
          return (
            <div key={key} className="card-elevated" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 850, color: 'var(--text)' }}>
                  <GitBranch size={14} style={{ verticalAlign: -2 }} /> {target} / {modelName}
                </span>
                <span className="badge badge-cyan">{rows.length}개 버전</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {rows.map(row => (
                  <span key={row.id} className={statusClass(row.lifecycle_status)}>
                    {row.version_label || 'v1'} · {fmt(row.primary_score)}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
