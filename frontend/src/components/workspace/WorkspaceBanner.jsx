import { FolderKanban, ShieldCheck } from 'lucide-react'
import { Badge } from '../ui/badge'

export default function WorkspaceBanner({ profile, summary, action }) {
  const workspace = profile?.workspace || {
    name: profile?.is_admin ? '관리자 작업공간' : '기본 작업공간',
    scope: profile?.is_admin ? '전체 사용자 관리' : '내 분석 자산',
  }
  const items = summary || [
    ['실험 기록', profile?.history_count ?? 0],
    ['최고 성능', profile?.best_score ?? '-'],
    ['최근 실행', profile?.last_experiment_at || '기록 없음'],
  ]

  return (
    <section className="card" style={{ border: '1px solid rgba(37,99,235,0.16)', background: 'linear-gradient(135deg, rgba(37,99,235,0.07), rgba(5,150,105,0.04))' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 18, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}>
            <FolderKanban size={25} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 5 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>{workspace.name}</h2>
              <Badge variant="default">{workspace.scope}</Badge>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>
              데이터셋, 실험 기록, 공유 모델을 한 작업공간에서 이어서 관리합니다.
            </p>
          </div>
        </div>
        {action || <ShieldCheck size={22} color="#059669" />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 14 }}>
        {items.map(([label, value]) => (
          <div key={label} style={{ borderRadius: 10, padding: 11, border: '1px solid var(--border-sub)', background: 'var(--surface)' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 850, color: 'var(--text-label)' }}>{label}</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: 'var(--text)' }}>{value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
