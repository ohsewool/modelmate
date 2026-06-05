import { Activity, Clock3, DatabaseZap, ShieldCheck } from 'lucide-react'

function metric(label, value, desc, tone = '#2563eb') {
  return { label, value, desc, tone }
}

function buildMetrics(models = []) {
  const active = models.filter(model => model.file_exists !== false)
  const versions = new Set(active.map(model => model.version_label || 'v1'))
  const needsCheck = active.filter(model => !model.storage_status || model.storage_status !== '사용 가능')
  return [
    metric('활성 API', `${active.length}개`, '현재 호출 가능한 공유 모델입니다.', '#2563eb'),
    metric('버전', `${versions.size || 0}개`, '모델을 바꿔도 버전 단위로 설명할 수 있습니다.', '#7c3aed'),
    metric('저장 상태', needsCheck.length ? '점검 필요' : '정상', '모델 파일이 남아 있어야 URL 예측이 가능합니다.', needsCheck.length ? '#d97706' : '#059669'),
  ]
}

export default function ApiOpsPanel({ models }) {
  const active = models?.filter(model => model.file_exists !== false) || []
  const metrics = buildMetrics(models || [])
  const latest = active[0]
  const checklist = [
    ['테스트 입력 확인', active.length > 0, '공유 전 샘플 입력으로 결과를 한 번 눌러봅니다.'],
    ['모델 ID 보관', active.length > 0, '외부 서비스 연결 시 모델 ID가 API 주소가 됩니다.'],
    ['불필요 모델 정리', (models || []).length <= 3, '발표/운영 중 헷갈리지 않게 오래된 공유 모델을 줄입니다.'],
  ]

  return (
    <section className="card" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 900, color: '#059669' }}>API 운영 요약</p>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
            공유 모델을 서비스처럼 관리합니다
          </h2>
        </div>
        <span className={active.length ? 'badge badge-green' : 'badge badge-amber'}>
          {active.length ? '운영 가능' : '공유 전'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {metrics.map(item => (
          <div key={item.label} className="card-elevated" style={{ padding: 13 }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-label)', fontWeight: 800 }}>{item.label}</p>
            <p style={{ margin: '0 0 6px', fontSize: 22, color: item.tone, fontWeight: 950 }}>{item.value}</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.45 }}>{item.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 0.75fr)', gap: 10 }}>
        <div className="card-elevated" style={{ padding: 13 }}>
          <p style={{ margin: '0 0 9px', fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>
            <Activity size={15} style={{ verticalAlign: -3, marginRight: 6 }} /> 최신 공유 모델
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
            {latest
              ? `${latest.name} / ${latest.best_model_name} / 맞힐 값 ${latest.target_col}`
              : '아직 공유된 모델이 없습니다. 모델 비교 후 공유 모델을 만들면 여기에 표시됩니다.'}
          </p>
        </div>
        <div className="card-elevated" style={{ padding: 13, display: 'grid', gap: 8 }}>
          {checklist.map(([title, done, body], idx) => {
            const Icon = [ShieldCheck, DatabaseZap, Clock3][idx]
            return (
              <div key={title} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Icon size={15} color={done ? '#059669' : '#d97706'} style={{ marginTop: 2, flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.45 }}>
                  <strong style={{ color: 'var(--text)' }}>{title}</strong><br />{body}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
