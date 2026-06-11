import { Link, useNavigate } from 'react-router-dom'
import { BarChart3, CheckCircle2, Moon, Play, ShieldCheck, Sparkles, Sun, Upload } from 'lucide-react'
import { useTheme } from '../ThemeContext'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import ValidationProof from '../components/ValidationProof'

const steps = [
  ['CSV 업로드', '분석할 CSV를 올리고 데이터 구조와 사용 가능성을 먼저 확인합니다.'],
  ['데이터 점검', '결측값, 컬럼 수, 예측 가능성, 위험 신호를 빠르게 정리합니다.'],
  ['타깃 추천', '무엇을 예측하면 좋은지 후보와 이유를 제안합니다.'],
  ['모델 비교', '여러 모델을 같은 기준으로 비교하고 적합한 모델을 선택합니다.'],
  ['설명/보고서', '성능, 주요 변수, 한계와 다음 행동을 근거 기반으로 정리합니다.'],
  ['예측 API', '학습 결과를 새 데이터 예측과 API 형태로 재사용할 수 있게 합니다.'],
]

const examples = ['이탈 예측', '수요 예측', '불량 감지', '가입 건수 예측']

export default function Home() {
  const nav = useNavigate()
  const { dark, toggle } = useTheme()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', overflowX: 'hidden' }}>
      <nav style={{
        height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', borderBottom: '1px solid var(--border)', background: 'var(--surface)',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <button onClick={() => nav('/')} style={{
          display: 'flex', alignItems: 'center', gap: 10, border: 0, background: 'transparent',
          padding: 0, cursor: 'pointer', color: 'var(--text)',
        }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: '#2563eb', color: '#fff' }}>
            <LogoIcon />
          </span>
          <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0 }}>ModelMate</span>
        </button>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link to="/pricing" style={{ fontSize: 13, fontWeight: 750, color: 'var(--text-2)', textDecoration: 'none' }}>Pricing</Link>
          <a href="https://github.com/ohsewool/-/blob/main/docs/privacy.md" style={{ fontSize: 13, fontWeight: 750, color: 'var(--text-2)', textDecoration: 'none' }}>Privacy</a>
          <button onClick={toggle} title={dark ? '밝은 화면' : '어두운 화면'} className="theme-toggle">
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <Button variant="secondary" onClick={() => nav('/login')}>로그인</Button>
          <Button onClick={() => nav('/login')}>시작하기</Button>
        </div>
      </nav>

      <main>
        <section style={{ minHeight: 'calc(100vh - 58px)', display: 'grid', alignItems: 'center', padding: '48px 28px 34px' }}>
          <div style={{ width: 'min(1100px, 100%)', margin: '0 auto' }}>
            <div className="home-hero-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.92fr) minmax(360px, 1fr)', gap: 28, alignItems: 'center' }}>
              <div>
                <Badge variant="secondary" style={{ marginBottom: 18 }}>Guided CSV predictive analysis</Badge>
                <h1 style={{ margin: 0, fontSize: 'clamp(48px, 8vw, 92px)', lineHeight: 0.96, fontWeight: 950, letterSpacing: 0 }}>
                  ModelMate
                </h1>
                <p style={{ margin: '18px 0 0', fontSize: 22, lineHeight: 1.35, fontWeight: 800 }}>
                  CSV 데이터를 설명 가능한 예측, 근거 기반 보고서, 재사용 가능한 예측 API로 바꿔줍니다.
                </p>
                <p style={{ margin: '12px 0 26px', fontSize: 15, lineHeight: 1.7, color: 'var(--text-2)', maxWidth: 540 }}>
                  ModelMate는 업로드한 CSV를 점검하고, 예측 타깃을 추천하고, 모델을 비교한 뒤
                  결과의 신뢰도와 한계를 함께 보여주는 가이드형 AI 분석 서비스입니다.
                </p>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 22 }}>
                  <Button size="lg" onClick={() => nav('/login')}><Upload size={17} /> 시작하기</Button>
                  <Button size="lg" variant="secondary" onClick={() => nav('/pricing')}>가격 보기</Button>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {examples.map(item => (
                    <span key={item} style={{
                      padding: '7px 11px', borderRadius: 999, border: '1px solid var(--border)',
                      background: 'var(--surface)', color: 'var(--text-2)', fontSize: 12, fontWeight: 750,
                    }}>{item}</span>
                  ))}
                </div>
              </div>

              <ProductPreview />
            </div>
          </div>
        </section>

        <section style={{ padding: '0 28px 42px' }}>
          <div className="home-step-grid" style={{
            width: 'min(1100px, 100%)', margin: '0 auto', display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12,
          }}>
            {steps.map(([title, desc], idx) => (
              <div key={title} className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center',
                    background: idx === 0 ? '#eff6ff' : idx === 1 ? '#f0fdf4' : '#f5f3ff',
                    color: idx === 0 ? '#2563eb' : idx === 1 ? '#059669' : '#7c3aed',
                    fontSize: 13, fontWeight: 900,
                  }}>{idx + 1}</span>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 850 }}>{title}</h2>
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text-2)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>
        <ValidationProof />
      </main>
    </div>
  )
}

function ProductPreview() {
  const features = [['성능', '0.942', '#2563eb'], ['데이터', '1,240행', '#059669'], ['타깃', '이탈', '#7c3aed']]
  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 10, boxShadow: '0 18px 48px rgba(15,23,42,0.12)', overflow: 'hidden' }}>
      <div style={{ height: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', borderBottom: '1px solid var(--border-sub)', background: 'var(--surface-alt)' }}>
        <span style={{ fontSize: 12, color: 'var(--text-label)', fontWeight: 750 }}>modelmate.ai/report</span>
        <Badge variant="success">MVP</Badge>
      </div>
      <div style={{ padding: 18, display: 'grid', gap: 14 }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 12, color: '#2563eb', fontWeight: 850 }}>분석 결과</p>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>예측 모델 준비 완료</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          {features.map(([label, value, tone]) => <MiniMetric key={label} label={label} value={value} tone={tone} />)}
        </div>
        <div className="card-elevated" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <BarChart3 size={16} color="#2563eb" />
            <strong style={{ fontSize: 14 }}>근거 기반 설명</strong>
          </div>
          {['최근 이용 점수', '문의 횟수', '가입 기간'].map((label, idx) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 700 }}>{label}</span>
              <span style={{ height: 8, borderRadius: 99, background: 'var(--border-sub)', overflow: 'hidden' }}>
                <span style={{ display: 'block', width: `${88 - idx * 24}%`, height: '100%', borderRadius: 99, background: '#2563eb' }} />
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <ActionPill icon={<Sparkles size={15} />} text="타깃 추천" />
          <ActionPill icon={<ShieldCheck size={15} />} text="데이터 점검" />
          <ActionPill icon={<CheckCircle2 size={15} />} text="보고서 생성" />
          <ActionPill icon={<Play size={15} />} text="예측 API" />
        </div>
      </div>
    </div>
  )
}

function MiniMetric({ label, value, tone }) {
  return <div className="card-elevated" style={{ padding: 12 }}><p style={{ margin: '0 0 7px', fontSize: 11, color: 'var(--text-label)', fontWeight: 750 }}>{label}</p><p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: tone }}>{value}</p></div>
}

function ActionPill({ icon, text }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-2)', fontSize: 12, fontWeight: 800 }}>{icon}{text}</div>
}

function LogoIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
}
