import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import PilotInquiryDialog from '../components/PilotInquiryDialog'

const plans = [
  {
    name: 'Free',
    price: '$0/month',
    note: '데모',
    planValue: 'free',
    items: ['작은 CSV 데모', '제한된 프로젝트 수', '기본 보고서 미리보기', '제한된 예측 API 호출', '데모 제한 안내'],
  },
  {
    name: 'Pro Pilot',
    price: '$19-29/month',
    note: '파일럿 예정',
    planValue: 'pro_pilot',
    items: ['더 큰 CSV 한도', '보고서 내보내기', '더 많은 프로젝트', '더 많은 예측 API 호출', '프로젝트 재실행', '고급 근거 요약'],
    highlight: true,
  },
  {
    name: 'Team Pilot',
    price: '$79-149/month',
    note: '파일럿 예정',
    planValue: 'team_pilot',
    items: ['공유 워크스페이스 개념', '검토/승인 흐름 개념', '더 높은 사용량 한도', '브랜드 보고서', '팀 프로젝트 관리 개념'],
  },
]

export default function Pricing() {
  const nav = useNavigate()
  const [pilotOpen, setPilotOpen] = useState(false)
  const [desiredPlan, setDesiredPlan] = useState('unsure')

  function openPilot(planValue) {
    setDesiredPlan(planValue || 'unsure')
    setPilotOpen(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={() => nav('/')} className="btn-secondary" style={{ padding: '7px 11px' }}>
          <ArrowLeft size={15} /> ModelMate
        </button>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/" style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 750, textDecoration: 'none' }}>홈</Link>
          <Button onClick={() => nav('/login')}>CSV 분석 시작</Button>
        </div>
      </nav>

      <main style={{ width: 'min(1080px, 100%)', margin: '0 auto', padding: '58px 28px' }}>
        <Badge variant="secondary">상용 SaaS MVP 방향</Badge>
        <h1 style={{ margin: '18px 0 12px', fontSize: 'clamp(38px, 6vw, 68px)', lineHeight: 1, fontWeight: 950, letterSpacing: 0 }}>
          요금 안내
        </h1>
        <p style={{ margin: 0, maxWidth: 720, color: 'var(--text-2)', fontSize: 16, lineHeight: 1.7 }}>
          아래 요금은 실제 결제 상품이 아니라 베타 MVP 검증을 위한 파일럿 계획안입니다. 플랜 변경과 한도 조정은 문의를 받은 뒤 수동으로 확인합니다.
        </p>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginTop: 32 }} className="pricing-grid">
          {plans.map(plan => (
            <article key={plan.name} className="card" style={{ padding: 22, borderColor: plan.highlight ? '#93c5fd' : 'var(--border)', boxShadow: plan.highlight ? '0 18px 42px rgba(37,99,235,0.12)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{plan.name}</h2>
                <Badge variant={plan.highlight ? 'default' : 'secondary'}>{plan.note}</Badge>
              </div>
              <p style={{ margin: '16px 0 4px', fontSize: 28, fontWeight: 950 }}>{plan.price}</p>
              <p style={{ margin: '0 0 18px', color: 'var(--text-label)', fontSize: 12, fontWeight: 750 }}>파일럿 검증용 예시 요금입니다. 실제 결제는 아직 구현되어 있지 않습니다.</p>
              <div style={{ display: 'grid', gap: 10 }}>
                {plan.items.map(item => (
                  <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--text-2)', fontSize: 13, lineHeight: 1.5 }}>
                    <CheckCircle2 size={15} color="#059669" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <button className={plan.highlight ? 'btn-primary' : 'btn-secondary'} type="button" onClick={() => openPilot(plan.planValue)} style={{ marginTop: 18, width: '100%' }}>
                파일럿 문의하기
              </button>
            </article>
          ))}
        </section>

        <section className="card" style={{ marginTop: 18, padding: 20 }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 900 }}>현재 제한</h2>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.7 }}>
            실제 결제, 자동 구독, 청구서, 계정별 자동 업그레이드는 아직 구현하지 않았습니다. 민감정보가 포함된 CSV보다 데모 또는 테스트 데이터를 사용하는 것을 권장합니다.
          </p>
        </section>
      </main>
      <PilotInquiryDialog
        open={pilotOpen}
        onClose={() => setPilotOpen(false)}
        initial={{ desired_plan: desiredPlan, source_route: '/pricing' }}
      />
    </div>
  )
}
