import { Database, HeartPulse, Moon, TrainFront } from 'lucide-react'
import { Badge } from '../ui/badge'

const demos = [
  {
    role: '메인',
    file: 'pima.csv',
    label: '의료/건강',
    note: '당뇨 여부 예측',
    icon: HeartPulse,
    tone: '#2563eb',
  },
  {
    role: '보조',
    file: 'ch2025.csv',
    label: '수면/건강',
    note: '건강 상태 분류',
    icon: Moon,
    tone: '#7c3aed',
  },
  {
    role: '확장',
    file: 'seoul_bike.csv',
    label: '공공 데이터',
    note: '가입자 수 예측',
    icon: TrainFront,
    tone: '#059669',
  },
]

export default function DemoDatasetGuide() {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(37,99,235,0.08)', color: '#2563eb' }}>
            <Database size={17} />
          </span>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: 'var(--text)' }}>샘플 파일</p>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-label)' }}>11월 리허설 기준</p>
          </div>
        </div>
        <Badge variant="secondary">3개 고정</Badge>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {demos.map(item => {
          const Icon = item.icon
          return (
            <div key={item.file} style={{ padding: 11, borderRadius: 10, border: '1px solid var(--border-sub)', background: 'var(--surface-alt)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <Icon size={15} color={item.tone} />
                <span style={{ fontSize: 11, fontWeight: 850, color: item.tone }}>{item.role}</span>
              </div>
              <p style={{ margin: '0 0 5px', fontSize: 13, fontWeight: 900, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-2)', lineHeight: 1.45 }}>{item.label} · {item.note}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
