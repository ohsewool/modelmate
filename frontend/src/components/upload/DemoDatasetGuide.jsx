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

// DESIGN.md 수리 전 이 파일에는 카드마다 다른 톤 다섯(#2563eb #059669 #7c3aed
// #db2777 #ea580c)이 있었고, "샘플로 시작"이 카드마다 파란 단색이라 한 화면에
// 1등이 다섯이었다. 카드의 일은 고르는 것이지 소리치는 것이 아니다 — 색은
// 토큰(var(--ring)) 하나, 버튼은 전부 강등. 이 화면의 1등(파일 선택/다음 행동)은
// 이 컴포넌트 밖에 있다.
export default function DemoDatasetGuide({ onStart, compact = false }) {
  const packs = compact ? STARTER_PACKS.slice(0, 4) : STARTER_PACKS
  return (
    <section className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--surface-alt)', color: 'var(--ring)' }}>
          <Database size={16} />
        </span>
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>사용 사례로 시작하기</p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-label)' }}>
            샘플 CSV로 업로드부터 보고서와 예측 API 흐름까지 빠르게 체험할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="demo-dataset-grid" style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 }}>
        {packs.map(item => {
          const Icon = icons[item.id] || Database
          return (
            <article key={item.id} style={{ padding: 16, borderRadius: 8, border: '1px solid var(--border-sub)', background: 'var(--surface-alt)', minWidth: 0, display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <Icon size={16} color="var(--text-3)" />
                  <strong style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</strong>
                </div>
                <Badge variant="secondary">{taskTypeLabel(item.problemType)}</Badge>
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)' }}>{item.shortDescription}</p>
              <div style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text-2)' }}>
                <span>추천 타깃: <b style={{ color: 'var(--text)' }}>{item.recommendedTarget}</b></span>
                <span>권장 지표: <b style={{ color: 'var(--text)' }}>{item.recommendedMetric}</b></span>
              </div>
              {!compact && (
                <details style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--ring)' }}>자세히 보기</summary>
                  <p style={{ margin: '7px 0 0' }}>{item.businessQuestion}</p>
                  <p style={{ margin: '6px 0 0' }}>{item.expectedReportFraming}</p>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-label)' }}>{item.limitations}</p>
                </details>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
                <button className="btn-secondary" type="button" onClick={() => onStart?.(item)}>샘플로 시작</button>
                <a href={item.samplePath} download={item.sampleFile} style={{ fontSize: 13 }}>CSV 받기</a>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
