import { BarChart3, Database, Rocket, Share2 } from 'lucide-react'
import { Button } from '../ui/button'

export default function WorkspaceValuePanel({ user, profile, datasets, history, onStart, onLogin }) {
  const datasetCount = datasets?.length ?? profile?.dataset_count ?? 0
  const historyCount = history?.length ?? profile?.history_count ?? 0
  const hasAssets = datasetCount > 0 || historyCount > 0
  const title = user
    ? '작업공간에 분석 자산이 쌓이고 있습니다'
    : '로그인하면 분석이 내 자산으로 남습니다'
  const body = user
    ? '업로드한 CSV, 모델 비교 결과, 저장 모델을 이어서 다시 확인하고 공유할 수 있습니다.'
    : '비로그인 상태에서도 테스트는 가능하지만, 계정에 저장하면 데이터와 실험 기록이 섞이지 않습니다.'

  const items = [
    {
      icon: Database,
      label: '데이터셋',
      value: `${datasetCount}개`,
      desc: '올린 CSV의 분야, 타겟, 품질 진단이 남습니다.',
    },
    {
      icon: BarChart3,
      label: '실험 기록',
      value: `${historyCount}개`,
      desc: '모델 비교 결과와 성능을 다시 열어볼 수 있습니다.',
    },
    {
      icon: Rocket,
      label: '저장 모델',
      value: profile?.saved_model_count ?? profile?.model_count ?? '준비됨',
      desc: '좋은 모델을 버전처럼 관리하는 흐름으로 확장됩니다.',
    },
    {
      icon: Share2,
      label: '공유/API',
      value: '연결 가능',
      desc: '보고서, 예측, API 공유 화면까지 이어집니다.',
    },
  ]

  return (
    <section className="card" style={{ borderColor: 'rgba(79,70,229,0.18)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 900, color: '#4f46e5' }}>작업공간 가치</p>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>{title}</h2>
          <p style={{ margin: '7px 0 0', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{body}</p>
        </div>
        <Button onClick={user ? onStart : onLogin} variant={hasAssets ? 'secondary' : 'default'} style={{ flexShrink: 0 }}>
          {user ? '새 CSV 시작' : '로그인'}
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        {items.map(item => <ValueItem key={item.label} {...item} />)}
      </div>
    </section>
  )
}

function ValueItem({ icon: Icon, label, value, desc }) {
  return (
    <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border-sub)', background: 'var(--surface-alt)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'rgba(79,70,229,0.09)', color: '#4f46e5' }}>
          <Icon size={16} />
        </span>
        <b style={{ fontSize: 13, color: 'var(--text)' }}>{value}</b>
      </div>
      <p style={{ margin: '0 0 5px', fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{desc}</p>
    </div>
  )
}
