import { BarChart3, Database, Factory, GraduationCap, Megaphone, UsersRound } from 'lucide-react'
import { STARTER_PACKS, taskTypeLabel } from '../../data/starterPacks'
import { Badge } from '../ui/badge'

const icons = {
  'customer-churn': UsersRound,
  'sales-demand': BarChart3,
  'equipment-failure': Factory,
  'marketing-conversion': Megaphone,
  'student-performance': GraduationCap,
}

const tones = ['#2563eb', '#059669', '#7c3aed', '#db2777', '#ea580c']

export default function DemoDatasetGuide({ onStart, compact = false }) {
  const packs = compact ? STARTER_PACKS.slice(0, 4) : STARTER_PACKS
  return (
    <section className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(37,99,235,0.08)', color: '#2563eb' }}>
            <Database size={18} />
          </span>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: 'var(--text)' }}>사용 사례로 시작하기</p>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-label)' }}>
              샘플 CSV로 업로드부터 보고서와 예측 API 흐름까지 빠르게 체험할 수 있습니다.
            </p>
          </div>
        </div>
        <Badge variant="secondary">{packs.length}개</Badge>
      </div>

      <div className="demo-dataset-grid" style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
        {packs.map((item, idx) => {
          const Icon = icons[item.id] || Database
          const tone = tones[idx % tones.length]
          return (
            <article key={item.id} style={{ padding: 13, borderRadius: 10, border: '1px solid var(--border-sub)', background: 'var(--surface-alt)', minWidth: 0, display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <Icon size={16} color={tone} />
                  <strong style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</strong>
                </div>
                <Badge variant="secondary">{taskTypeLabel(item.problemType)}</Badge>
              </div>
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-2)' }}>{item.shortDescription}</p>
              <div style={{ display: 'grid', gap: 4, fontSize: 12, color: 'var(--text-2)' }}>
                <span>추천 타깃: <b style={{ color: 'var(--text)' }}>{item.recommendedTarget}</b></span>
                <span>권장 지표: <b style={{ color: 'var(--text)' }}>{item.recommendedMetric}</b></span>
              </div>
              {!compact && (
                <details style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 800, color: tone }}>자세히 보기</summary>
                  <p style={{ margin: '7px 0 0' }}>{item.businessQuestion}</p>
                  <p style={{ margin: '6px 0 0' }}>{item.expectedReportFraming}</p>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-label)' }}>{item.limitations}</p>
                </details>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                <button className="btn-primary" type="button" onClick={() => onStart?.(item)}>샘플로 시작</button>
                <a className="btn-secondary" href={item.samplePath} download={item.sampleFile}>CSV 받기</a>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
