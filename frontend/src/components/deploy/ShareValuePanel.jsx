import { ClipboardCheck, RotateCcw, ShieldCheck } from 'lucide-react'

export default function ShareValuePanel({ models, hasModel }) {
  const activeCount = models?.filter(model => model.file_exists !== false).length || 0
  const items = [
    {
      icon: ClipboardCheck,
      title: '예측 URL 발급',
      body: '모델마다 고정 REST URL이 생겨 다른 화면이나 외부 서비스에서 같은 모델을 호출할 수 있습니다.',
      value: `${models.length}개`,
    },
    {
      icon: RotateCcw,
      title: '재사용 테스트',
      body: '저장된 입력 예시로 바로 예측을 실행해 공유 전에 결과를 확인할 수 있습니다.',
      value: activeCount ? '가능' : '대기',
    },
    {
      icon: ShieldCheck,
      title: '운영 상태',
      body: '모델 파일 존재 여부와 버전 라벨을 함께 보여 발표 중 신뢰도를 높입니다.',
      value: hasModel ? '준비됨' : '학습 필요',
    },
  ]

  return (
    <section className="card" style={{ borderColor: 'rgba(5,150,105,0.18)' }}>
      <div style={{ marginBottom: 14 }}>
        <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 900, color: '#059669' }}>상용 공유 흐름</p>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
          저장한 모델을 다시 쓰고 외부로 연결합니다
        </h2>
        <p style={{ margin: '7px 0 0', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
          단순 결과 확인에서 끝나지 않고, 모델을 URL로 저장해 반복 예측과 공유 흐름까지 이어갑니다.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
        {items.map(item => <ShareValueItem key={item.title} {...item} />)}
      </div>
    </section>
  )
}

function ShareValueItem({ icon: Icon, title, body, value }) {
  return (
    <div style={{ padding: 13, borderRadius: 10, border: '1px solid var(--border-sub)', background: 'var(--surface-alt)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <span style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(5,150,105,0.09)', color: '#059669' }}>
          <Icon size={17} />
        </span>
        <b style={{ fontSize: 13, color: '#047857' }}>{value}</b>
      </div>
      <p style={{ margin: '0 0 5px', fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>{title}</p>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{body}</p>
    </div>
  )
}
