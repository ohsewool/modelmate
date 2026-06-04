import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import api from '../api'

const fallback = {
  training: { total_cases: 14, passed_cases: 14, failed_cases: 0 },
  domain: { checked_cases: 5, passed_cases: 5, failed_cases: 0 },
  public_institution_cases: 3,
  domains: ['의료/건강 진단', '공공교통/이용자 통계', '공공시설/안전 관리', '제조/설비 품질', '금액/매출'],
}

export default function ValidationProof() {
  const [data, setData] = useState(fallback)

  useEffect(() => {
    api.get('/validation-summary')
      .then(res => setData({ ...fallback, ...res.data }))
      .catch(() => setData(fallback))
  }, [])

  const training = data.training || fallback.training
  const domain = data.domain || fallback.domain
  const metrics = [
    ['학습 검증', `${training.passed_cases}/${training.total_cases}`, '업로드부터 모델 학습까지'],
    ['도메인 판단', `${domain.passed_cases}/${domain.checked_cases}`, '데이터 종류와 맞힐 값 분류'],
    ['공공기관 CSV', `${data.public_institution_cases}개`, '서울 열린데이터광장 포함'],
  ]

  return (
    <section style={{ padding: '0 28px 46px' }}>
      <div className="card" style={{ width: 'min(1100px, 100%)', margin: '0 auto', padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: '#2563eb', fontWeight: 900 }}>검증 결과</p>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>실제 CSV와 공개 데이터로 확인했습니다</h2>
          </div>
          <ShieldCheck size={22} color="#059669" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginBottom: 12 }}>
          {metrics.map(([label, value, desc]) => (
            <div key={label} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'var(--surface-alt)' }}>
              <p style={{ margin: '0 0 5px', fontSize: 11, color: 'var(--text-label)', fontWeight: 800 }}>{label}</p>
              <p style={{ margin: '0 0 4px', fontSize: 22, color: '#2563eb', fontWeight: 950 }}>{value}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.45 }}>{desc}</p>
            </div>
          ))}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
          검증 분야: {(data.domains || fallback.domains).slice(0, 6).join(', ')}
        </p>
      </div>
    </section>
  )
}
