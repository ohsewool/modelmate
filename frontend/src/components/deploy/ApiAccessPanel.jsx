import { KeyRound, LockKeyhole, Network, ShieldAlert } from 'lucide-react'

function maskedKey(model) {
  if (!model?.id) return 'mdl_live_••••••••'
  return `mdl_live_${model.id}_••••`
}

export default function ApiAccessPanel({ models = [] }) {
  const active = models.filter(model => model.file_exists !== false)
  const latest = active[0]
  const checks = [
    ['현재 방식', Network, '모델별 고정 URL로 예측 요청을 보냅니다.'],
    ['운영 확장', KeyRound, '실서비스에서는 사용자별 API 키와 호출량 제한을 붙일 수 있습니다.'],
    ['주의 사항', ShieldAlert, '지금 화면의 키는 운영 설계 미리보기이며 실제 인증 토큰은 아닙니다.'],
  ]

  return (
    <section className="card" style={{ display: 'grid', gap: 14, borderColor: 'rgba(124,58,237,0.18)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 900, color: '#7c3aed' }}>API 접근 관리</p>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
            공유 URL을 운영 API처럼 관리합니다
          </h2>
        </div>
        <span className={active.length ? 'badge badge-violet' : 'badge badge-amber'}>
          {active.length ? 'API 준비' : '모델 필요'}
        </span>
      </div>

      <div className="card-elevated" style={{ padding: 13, display: 'grid', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: 'var(--text)' }}>
          <LockKeyhole size={15} style={{ verticalAlign: -3, marginRight: 6 }} />
          발표용 접근 키 미리보기
        </p>
        <code style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface-alt)', border: '1px solid var(--border-sub)', fontSize: 12, wordBreak: 'break-all' }}>
          {maskedKey(latest)}
        </code>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
          {latest ? `${latest.name} 모델을 외부에서 호출할 때 필요한 운영 개념을 보여줍니다.` : '공유 모델을 만들면 모델별 접근 키 예시가 표시됩니다.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
        {checks.map(([title, Icon, body]) => (
          <div key={title} className="card-elevated" style={{ padding: 12 }}>
            <Icon size={16} color="#7c3aed" />
            <p style={{ margin: '8px 0 5px', fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>{title}</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
