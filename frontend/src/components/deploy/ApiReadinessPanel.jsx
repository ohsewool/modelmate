import { CheckCircle2, Code2, LockKeyhole, Route, Server } from 'lucide-react'

function tone(done) {
  return done
    ? { badge: 'badge badge-green', bg: 'rgba(5,150,105,0.07)', color: '#059669', label: '준비됨' }
    : { badge: 'badge badge-amber', bg: 'rgba(245,158,11,0.09)', color: '#d97706', label: '대기' }
}

export default function ApiReadinessPanel({ hasModel, models }) {
  const activeModels = models?.filter(model => model.file_exists !== false) || []
  const hasShared = activeModels.length > 0
  const checks = [
    ['학습 모델', hasModel, '모델 비교가 끝나야 공유 URL을 만들 수 있습니다.'],
    ['공유 URL', hasShared, '공유 모델을 만들면 고정 예측 API가 발급됩니다.'],
    ['예측 테스트', hasShared, '샘플 입력으로 결과가 나오는지 즉시 확인할 수 있습니다.'],
    ['운영 관리', hasShared, '버전, 저장 상태, 삭제 흐름으로 모델을 관리합니다.'],
  ]
  const scenarios = [
    ['웹 화면 연결', Route, '다른 화면에서 같은 모델로 예측을 요청합니다.'],
    ['외부 서비스 호출', Code2, 'REST API 주소를 복사해 외부 시스템에 붙일 수 있습니다.'],
    ['재사용 안정화', Server, '저장된 모델을 재사용해 같은 결과 흐름을 반복할 수 있습니다.'],
    ['권한 관리 확장', LockKeyhole, '추후 팀/관리자 권한별 공유 범위로 확장할 수 있습니다.'],
  ]

  return (
    <section className="card" style={{ display: 'grid', gap: 14 }}>
      <div>
        <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 900, color: '#2563eb' }}>API 공개 준비도</p>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
          모델을 서비스처럼 다시 쓰는 단계
        </h2>
        <p style={{ margin: '7px 0 0', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
          학습 결과를 한 번 보고 끝내지 않고, 고정 URL과 테스트 입력으로 재사용 가능한 예측 기능으로 바꿉니다.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 9 }}>
        {checks.map(([title, done, body]) => {
          const t = tone(done)
          return (
            <div key={title} style={{ padding: 11, borderRadius: 10, background: t.bg, border: `1px solid ${t.color}22` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 7 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: 'var(--text)' }}>{title}</p>
                <span className={t.badge}>{t.label}</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{body}</p>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
        {scenarios.map(([title, Icon, body]) => (
          <div key={title} className="card-elevated" style={{ padding: 12 }}>
            <CheckCircle2 size={15} color="#059669" />
            <p style={{ margin: '8px 0 5px', fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>
              <Icon size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: -2 }} />
              {title}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
