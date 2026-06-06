import { Code2, Eye, EyeOff, FileJson, KeyRound } from 'lucide-react'

function latestUrl(model) {
  if (!model?.id) return '/api/v2/{model_id}/predict'
  return `/api/v2/${model.id}/predict`
}

export default function ApiUsageExamplePanel({ models = [] }) {
  const active = models.filter(model => model.file_exists !== false)
  const latest = active[0]
  const sampleFeature = Object.fromEntries((latest?.features || []).slice(0, 3).map(f => [f.name, f.example]))
  const exampleBody = latest ? JSON.stringify({ features: sampleFeature }, null, 2) : '{ "features": { } }'
  const examples = [
    {
      icon: Eye,
      title: '공개 공유',
      body: '발표나 보고서에서 결과를 보여주는 용도입니다. 누구나 URL을 알면 볼 수 있다는 전제로 설명합니다.',
      state: active.length ? '사용 가능' : '모델 필요',
    },
    {
      icon: EyeOff,
      title: '비공개 운영',
      body: '실제 서비스에서는 로그인, 권한, API 키 검증이 필요합니다. 현재 화면은 운영 설계 미리보기입니다.',
      state: '확장 예정',
    },
    {
      icon: KeyRound,
      title: 'API 키 UX',
      body: '키 형태를 보여주되 실제 production secret은 아닙니다. 구현 전까지는 미리보기로 명확히 구분합니다.',
      state: '미리보기',
    },
  ]

  return (
    <section className="card" style={{ display: 'grid', gap: 14, borderColor: 'rgba(14,165,233,0.20)' }}>
      <div>
        <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 900, color: '#0284c7' }}>공유/API 사용 흐름</p>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
          결과를 화면 밖에서도 쓸 수 있게 연결합니다
        </h2>
        <p style={{ margin: '7px 0 0', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
          저장 모델은 보고서에서 끝나지 않고 URL, 예측 테스트, API 예시로 이어져야 상용 서비스처럼 보입니다.
        </p>
      </div>

      <div className="api-usage-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        {examples.map(item => {
          const Icon = item.icon
          return (
            <div key={item.title} className="card-elevated" style={{ padding: 13 }}>
              <Icon size={16} color="#0284c7" />
              <p style={{ margin: '8px 0 5px', fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>{item.title}</p>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{item.body}</p>
              <span className={item.state === '사용 가능' ? 'badge badge-green' : 'badge badge-blue'}>{item.state}</span>
            </div>
          )
        })}
      </div>

      <div className="card-elevated" style={{ padding: 13, display: 'grid', gap: 10 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>
          <Code2 size={15} style={{ verticalAlign: -3, marginRight: 6 }} />
          예측 API 예시
        </p>
        <code style={{ padding: '9px 11px', borderRadius: 10, border: '1px solid var(--border-sub)', background: 'var(--surface-alt)', fontSize: 12, wordBreak: 'break-all' }}>
          POST {latestUrl(latest)}
        </code>
        <pre style={{ margin: 0, padding: 13, borderRadius: 10, background: '#0f172a', color: '#e2e8f0', fontSize: 12, overflowX: 'auto' }}>
          <FileJson size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
          {exampleBody}
        </pre>
      </div>
    </section>
  )
}
