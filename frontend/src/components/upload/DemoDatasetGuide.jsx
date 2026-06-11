import { Database, Factory, TrainFront, UsersRound } from 'lucide-react'
import { Badge } from '../ui/badge'

const RAW_BASE = 'https://raw.githubusercontent.com/ohsewool/-/main/sample_data'

const demos = [
  {
    name: 'Customer Churn Demo',
    file: 'customer_churn_demo.csv',
    useCase: '고객 이탈 가능성 예측',
    target: 'churn',
    task: 'classification',
    output: '이탈 위험 고객과 주요 근거를 확인',
    goal: 'I want to predict which customers may churn.',
    icon: UsersRound,
    tone: '#2563eb',
  },
  {
    name: 'Manufacturing Quality Demo',
    file: 'manufacturing_quality_demo.csv',
    useCase: '제조 불량 여부 예측',
    target: 'defect',
    task: 'classification',
    output: '불량 위험과 설비 신호를 확인',
    goal: 'I want to predict manufacturing defects from machine signals.',
    icon: Factory,
    tone: '#7c3aed',
  },
  {
    name: 'Public Bike Signup Demo',
    file: 'public_bike_signup_demo.csv',
    useCase: '공공자전거 가입 건수 예측',
    target: 'signup_count',
    task: 'regression',
    output: '월별 가입 수요와 영향 요인을 확인',
    goal: 'I want to estimate public bike signups from historical CSV data.',
    icon: TrainFront,
    tone: '#059669',
  },
]

export default function DemoDatasetGuide() {
  return (
    <section className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(37,99,235,0.08)', color: '#2563eb' }}>
            <Database size={18} />
          </span>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: 'var(--text)' }}>샘플 데이터로 먼저 체험</p>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-label)' }}>CSV가 없어도 전체 흐름을 빠르게 확인할 수 있습니다.</p>
          </div>
        </div>
        <Badge variant="secondary">3 samples</Badge>
      </div>

      <div className="demo-dataset-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        {demos.map(item => {
          const Icon = item.icon
          return (
            <article key={item.file} style={{ padding: 13, borderRadius: 10, border: '1px solid var(--border-sub)', background: 'var(--surface-alt)', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon size={16} color={item.tone} />
                <strong style={{ fontSize: 12, color: item.tone }}>{item.name}</strong>
              </div>
              <p style={{ margin: '0 0 7px', fontSize: 13, fontWeight: 850, color: 'var(--text)' }}>{item.useCase}</p>
              <p style={{ margin: '0 0 8px', fontSize: 12, lineHeight: 1.45, color: 'var(--text-2)' }}>
                Target <b>{item.target}</b> · {item.task}<br />
                {item.output}
              </p>
              <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--text-label)', lineHeight: 1.45 }}>
                Goal: {item.goal}
              </p>
              <a href={`${RAW_BASE}/${item.file}`} download style={{ fontSize: 12, fontWeight: 850, color: '#2563eb', textDecoration: 'none' }}>
                CSV 다운로드
              </a>
            </article>
          )
        })}
      </div>
    </section>
  )
}
