import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { BarChart3, CheckCircle2, FileText, KeyRound, Moon, ShieldCheck, Sun, Upload } from 'lucide-react'
import { useTheme } from '../ThemeContext'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { STARTER_PACKS } from '../data/starterPacks'
import PilotInquiryDialog from '../components/PilotInquiryDialog'
import { useAuth } from '../AuthContext'

const workflowSteps = [
  ['CSV 업로드', '데이터 구조와 결측값을 확인하고 분석 가능한 상태인지 먼저 점검합니다.'],
  ['모델 비교와 근거 분석', '타깃을 추천하고 여러 모델을 비교한 뒤 예측 이유와 주의사항을 정리합니다.'],
  ['보고서와 예측 API 재사용', '분석 결과를 보고서로 남기고 학습된 모델을 예측 API로 다시 사용할 수 있습니다.'],
]

const featureChips = ['데이터 구조 분석', '타깃 추천', '모델 비교', '근거 기반 보고서', '예측 API']

const trustItems = ['데이터 품질 경고', '필수 가능성 확인', '모델 성능 기준', '예측 이유 설명']

export default function Home() {
  const nav = useNavigate()
  const { user } = useAuth()
  const { dark, toggle } = useTheme()
  const [pilotOpen, setPilotOpen] = useState(false)
  const isSignedIn = Boolean(user && !user.is_guest)
  const goToAnalysis = target => {
    if (isSignedIn) {
      nav(target)
      return
    }
    nav(`/login?redirect=${encodeURIComponent(target)}`)
  }

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
          <span style={{ width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center', background: '#2563eb', color: '#fff' }}>
            <LogoIcon />
          </span>
          <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0 }}>ModelMate</span>
        </button>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link to="/pricing" style={navLinkStyle}>요금 안내</Link>
          <a href="https://github.com/ohsewool/-/blob/main/docs/privacy.md" style={navLinkStyle}>개인정보 안내</a>
          <button onClick={toggle} title={dark ? '밝은 화면' : '어두운 화면'} className="theme-toggle">
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <Button variant="secondary" onClick={() => nav('/login')}>로그인</Button>
          <Button onClick={() => goToAnalysis('/upload')}>CSV 분석 시작</Button>
        </div>
      </nav>

      <main>
        <section style={{ minHeight: 'calc(100vh - 58px)', display: 'grid', alignItems: 'center', padding: '44px 28px 32px' }}>
          <div style={{ width: 'min(1100px, 100%)', margin: '0 auto' }}>
            <div className="home-hero-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.94fr) minmax(360px, 1fr)', gap: 28, alignItems: 'center' }}>
              <div>
                <Badge variant="secondary" style={{ marginBottom: 16 }}>가이드형 CSV 예측 분석</Badge>
                <h1 style={{ margin: 0, fontSize: 'clamp(38px, 6vw, 58px)', lineHeight: 1.06, fontWeight: 950, letterSpacing: 0 }}>
                  ModelMate
                </h1>
                <p style={{ margin: '18px 0 0', fontSize: 19, lineHeight: 1.48, fontWeight: 750, maxWidth: 660 }}>
                  CSV 기반 예측 분석<br />목표 기반 분석 실행<br />보고서 · 예측 API 생성
                </p>
                <p style={{ margin: '12px 0 24px', fontSize: 15, lineHeight: 1.65, color: 'var(--text-2)', maxWidth: 600 }}>
                  CSV를 올리고, 예측할 값을 정한 뒤, 보고서와 API로 재사용하세요.
                </p>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                  <Button size="lg" onClick={() => goToAnalysis('/upload')}><Upload size={17} /> CSV 올리기</Button>
                  <Button size="lg" variant="secondary" onClick={() => goToAnalysis('/upload?sample=1')}>샘플로 체험하기</Button>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {featureChips.map(item => (
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

        <Section title="작동 방식">
          <div className="home-step-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
            {workflowSteps.map(([title, desc], idx) => (
              <div key={title} className="card" style={{ padding: 18, minHeight: 136 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center',
                    background: idx === 0 ? '#eff6ff' : idx === 1 ? '#f0fdf4' : '#f8fafc',
                    color: idx === 0 ? '#2563eb' : idx === 1 ? '#059669' : '#475569',
                    fontSize: 13, fontWeight: 900,
                  }}>{idx + 1}</span>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 850 }}>{title}</h2>
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text-2)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="샘플로 먼저 체험하세요">
          <div style={{ display: 'grid', gap: 14 }}>
            <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.65 }}>
              아래 데이터는 시연을 위한 합성 데이터입니다. 실제 의사결정에는 실제 CSV로 다시 분석해야 합니다.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }} className="home-step-grid">
              {STARTER_PACKS.slice(0, 4).map(pack => (
                <div key={pack.id} className="card" style={{ padding: 16, minHeight: 150 }}>
                  <Badge variant="secondary">{pack.category}</Badge>
                  <h3 style={{ margin: '12px 0 8px', fontSize: 16 }}>{pack.title}</h3>
                  <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13, lineHeight: 1.55 }}>{pack.shortDescription}</p>
                </div>
              ))}
            </div>
            <div><Button variant="secondary" onClick={() => goToAnalysis('/upload?sample=1')}>샘플로 체험하기</Button></div>
          </div>
        </Section>

        <Section title="신뢰할 수 있는 분석">
          <div className="card admin-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900 }}>결과보다 먼저 근거를 보여줍니다</h2>
              <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.7 }}>
                데이터 품질 경고, 필수 가능성, 모델 성능 기준, 예측 이유를 함께 보여주어 결과를 믿어도 되는지 판단할 수 있게 돕습니다.
              </p>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {trustItems.map(item => <ActionPill key={item} icon={<ShieldCheck size={15} />} text={item} />)}
            </div>
          </div>
        </Section>

        <Section title="보고서와 API 재사용">
          <div className="card admin-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900 }}>분석 결과를 저장하고 다시 사용할 수 있습니다</h2>
              <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.7 }}>
                프로젝트, 실행 기록, 보고서, 예측 API 인증 정보를 한곳에서 관리합니다. 전체 인증 값은 생성 직후 한 번만 표시합니다.
              </p>
            </div>
            <Button variant="secondary" onClick={() => goToAnalysis('/dashboard')}>프로젝트 보기</Button>
          </div>
        </Section>

        <section style={{ padding: '0 28px 48px' }}>
          <div className="card" style={{ width: 'min(1100px, 100%)', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, alignItems: 'center' }}>
            <div>
              <p className="section-title">파일럿 사용 안내</p>
              <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 900 }}>파일럿 사용을 준비하고 있습니다</h2>
              <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.65 }}>
                현재 실제 결제는 연결되어 있지 않습니다. 파일럿 기간에는 플랜 변경과 한도 조정을 수동으로 처리합니다. 결제 정보와 민감한 데이터는 입력하지 마세요.
              </p>
            </div>
            <Button onClick={() => setPilotOpen(true)}>파일럿 문의하기</Button>
          </div>
        </section>

        <section style={{ padding: '0 28px 56px' }}>
          <div style={{ width: 'min(1100px, 100%)', margin: '0 auto', color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6 }}>
            샘플 데이터와 주요 분석 흐름으로 MVP 수준의 동작을 검증했습니다. 운영 등급의 정확성이나 자동 배포를 보장하지 않습니다.
          </div>
        </section>
      </main>
      <PilotInquiryDialog open={pilotOpen} onClose={() => setPilotOpen(false)} initial={{ source_route: '/' }} />
    </div>
  )
}

const navLinkStyle = { fontSize: 13, fontWeight: 750, color: 'var(--text-2)', textDecoration: 'none' }

function Section({ title, children }) {
  return (
    <section style={{ padding: '0 28px 42px' }}>
      <div style={{ width: 'min(1100px, 100%)', margin: '0 auto' }}>
        <p className="section-title">{title}</p>
        {children}
      </div>
    </section>
  )
}

function ProductPreview() {
  const metrics = [['성능 지표', '0.942', '#2563eb'], ['데이터 행', '1,240', '#059669'], ['추천 타깃', '이탈 여부', '#7c3aed']]
  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 8, boxShadow: '0 10px 30px rgba(15,23,42,0.08)', overflow: 'hidden' }}>
      <div style={{ height: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', borderBottom: '1px solid var(--border-sub)', background: 'var(--surface-alt)' }}>
        <span style={{ fontSize: 12, color: 'var(--text-label)', fontWeight: 750 }}>modelmate.ai/report</span>
        <Badge variant="success">준비 완료</Badge>
      </div>
      <div style={{ padding: 18, display: 'grid', gap: 14 }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 12, color: '#2563eb', fontWeight: 850 }}>분석 결과</p>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>예측 모델 준비 완료</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          {metrics.map(([label, value, tone]) => <MiniMetric key={label} label={label} value={value} tone={tone} />)}
        </div>
        <div className="card-elevated" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <BarChart3 size={16} color="#2563eb" />
            <strong style={{ fontSize: 14 }}>예측 이유 설명</strong>
          </div>
          {['최근 이용 점수', '문의 건수', '가입 기간'].map((label, idx) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 700 }}>{label}</span>
              <span style={{ height: 8, borderRadius: 99, background: 'var(--border-sub)', overflow: 'hidden' }}>
                <span style={{ display: 'block', width: `${88 - idx * 24}%`, height: '100%', borderRadius: 99, background: '#2563eb' }} />
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <ActionPill icon={<ShieldCheck size={15} />} text="데이터 점검" />
          <ActionPill icon={<CheckCircle2 size={15} />} text="타깃 추천" />
          <ActionPill icon={<FileText size={15} />} text="보고서" />
          <ActionPill icon={<KeyRound size={15} />} text="예측 API" />
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
