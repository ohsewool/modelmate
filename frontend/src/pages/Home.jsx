import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { BarChart3, CheckCircle2, Moon, Play, ShieldCheck, Sun, Upload } from 'lucide-react'
import { useTheme } from '../ThemeContext'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import ValidationProof from '../components/ValidationProof'
import { STARTER_PACKS } from '../data/starterPacks'
import PilotInquiryDialog from '../components/PilotInquiryDialog'

const steps = [
  ['CSV 업로드', '파일 구조와 데이터 품질을 먼저 확인하고 분석 가능한 상태인지 판단합니다.'],
  ['데이터 구조 분석', '결측값, 고유값, 식별자성 컬럼, 학습을 방해할 수 있는 신호를 정리합니다.'],
  ['타깃 변수 추천', '무엇을 예측하면 좋은지 후보와 이유를 함께 보여줍니다.'],
  ['모델 비교', '여러 모델을 같은 기준으로 비교하고 안정적인 후보를 선택합니다.'],
  ['근거 기반 보고서', '성능, 주요 변수, 위험 요인, 다음 행동을 보고서로 정리합니다.'],
  ['예측 API 재사용', '학습 결과를 새 데이터 예측과 재사용 가능한 API 흐름으로 이어갑니다.'],
]

const examples = ['고객 이탈', '수요 예측', '설비 고장', '마케팅 전환']

export default function Home() {
  const nav = useNavigate()
  const { dark, toggle } = useTheme()
  const [pilotOpen, setPilotOpen] = useState(false)

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

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/pricing" style={{ fontSize: 13, fontWeight: 750, color: 'var(--text-2)', textDecoration: 'none' }}>요금 안내</Link>
          <a href="https://github.com/ohsewool/-/blob/main/docs/privacy.md" style={{ fontSize: 13, fontWeight: 750, color: 'var(--text-2)', textDecoration: 'none' }}>개인정보 안내</a>
          <button onClick={toggle} title={dark ? '밝은 화면' : '어두운 화면'} className="theme-toggle">
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <Button variant="secondary" onClick={() => nav('/login')}>로그인</Button>
          <Button onClick={() => nav('/login')}>CSV 분석 시작</Button>
        </div>
      </nav>

      <main>
        <section style={{ minHeight: 'calc(100vh - 58px)', display: 'grid', alignItems: 'center', padding: '48px 28px 34px' }}>
          <div style={{ width: 'min(1100px, 100%)', margin: '0 auto' }}>
            <div className="home-hero-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.92fr) minmax(360px, 1fr)', gap: 28, alignItems: 'center' }}>
              <div>
                <Badge variant="secondary" style={{ marginBottom: 18 }}>가이드형 CSV 예측 분석</Badge>
                <h1 style={{ margin: 0, fontSize: 'clamp(42px, 7vw, 68px)', lineHeight: 1.02, fontWeight: 950, letterSpacing: 0 }}>
                  CSV 데이터를 설명 가능한 예측 보고서와 재사용 가능한 API로 바꾸세요
                </h1>
                <p style={{ margin: '18px 0 0', fontSize: 20, lineHeight: 1.42, fontWeight: 800 }}>
                  ModelMate는 CSV를 업로드하면 데이터 구조를 분석하고, 예측 타깃을 추천하며, 모델 비교·근거 기반 보고서·예측 API까지 하나의 흐름으로 제공합니다.
                </p>
                <p style={{ margin: '12px 0 26px', fontSize: 15, lineHeight: 1.7, color: 'var(--text-2)', maxWidth: 600 }}>
                  비전문가도 이해할 수 있도록 데이터 점검, 모델 성능, 예측 이유, 주의사항을 차분하게 정리합니다. 현재는 베타 SaaS MVP 단계입니다.
                </p>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 22 }}>
                  <Button size="lg" onClick={() => nav('/login')}><Upload size={17} /> CSV 분석 시작</Button>
                  <Button size="lg" variant="secondary" onClick={() => nav('/login')}>샘플로 체험하기</Button>
                  <Button size="lg" variant="secondary" onClick={() => setPilotOpen(true)}>파일럿 문의하기</Button>
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
          <div style={{ width: 'min(1100px, 100%)', margin: '0 auto 18px' }}>
            <p className="section-title">작동 방식</p>
          </div>
          <div className="home-step-grid" style={{
            width: 'min(1100px, 100%)', margin: '0 auto', display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12,
          }}>
            {steps.map(([title, desc], idx) => (
              <div key={title} className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center',
                    background: idx < 2 ? '#eff6ff' : idx < 4 ? '#f0fdf4' : '#f8fafc',
                    color: idx < 2 ? '#2563eb' : idx < 4 ? '#059669' : '#475569',
                    fontSize: 13, fontWeight: 900,
                  }}>{idx + 1}</span>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 850 }}>{title}</h2>
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text-2)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding: '0 28px 46px' }}>
          <div style={{ width: 'min(1100px, 100%)', margin: '0 auto', display: 'grid', gap: 14 }}>
            <div>
              <p className="section-title">샘플 사용 사례</p>
              <h2 style={{ margin: '4px 0 8px', fontSize: 26, fontWeight: 900 }}>처음이라면 샘플 CSV로 흐름을 확인하세요</h2>
              <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.65 }}>
                고객 이탈, 수요 예측, 설비 고장 위험처럼 자주 쓰이는 예측 문제를 합성 샘플 데이터로 바로 체험할 수 있습니다.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }} className="home-step-grid">
              {STARTER_PACKS.slice(0, 4).map(pack => (
                <div key={pack.id} className="card" style={{ padding: 16 }}>
                  <Badge variant="secondary">{pack.category}</Badge>
                  <h3 style={{ margin: '12px 0 8px', fontSize: 16 }}>{pack.title}</h3>
                  <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13, lineHeight: 1.55 }}>{pack.shortDescription}</p>
                </div>
              ))}
            </div>
            <div>
              <Button variant="secondary" onClick={() => nav('/login')}>샘플로 체험하기</Button>
            </div>
          </div>
        </section>
        <section style={{ padding: '0 28px 48px' }}>
          <div className="card" style={{ width: 'min(1100px, 100%)', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, alignItems: 'center' }}>
            <div>
              <p className="section-title">베타 사용 안내</p>
              <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 900 }}>파일럿 사용을 준비하고 있습니다</h2>
              <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.65 }}>
                실제 결제는 아직 연결되어 있지 않습니다. CSV 예측 분석, 근거 기반 보고서, 예측 API 재사용이 필요한 팀은 파일럿 문의로 사용 목적과 필요한 한도를 남길 수 있습니다.
              </p>
            </div>
            <Button onClick={() => setPilotOpen(true)}>파일럿 문의하기</Button>
          </div>
        </section>
        <ValidationProof />
      </main>
      <PilotInquiryDialog open={pilotOpen} onClose={() => setPilotOpen(false)} initial={{ source_route: '/' }} />
    </div>
  )
}

function ProductPreview() {
  const features = [['성능 지표', '0.942', '#2563eb'], ['데이터 행', '1,240', '#059669'], ['추천 타깃', '이탈 여부', '#7c3aed']]
  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 8, boxShadow: '0 10px 30px rgba(15,23,42,0.08)', overflow: 'hidden' }}>
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
          <ActionPill icon={<BarChart3 size={15} />} text="모델 비교" />
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
