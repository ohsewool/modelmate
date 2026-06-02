import { useNavigate } from 'react-router-dom'
import { useTheme } from '../ThemeContext'

const steps = [
  ['1', 'CSV 파일 넣기', '엑셀에서 저장한 CSV 파일을 그대로 올립니다.'],
  ['2', 'AI가 자동 정리', '예측할 항목, 빼야 할 항목, 데이터 상태를 먼저 알려줍니다.'],
  ['3', '모델 자동 비교', '여러 예측 모델을 돌려 보고 가장 잘 맞는 모델을 고릅니다.'],
  ['4', '결과와 이유 확인', '점수뿐 아니라 왜 그런 예측을 했는지도 쉬운 말로 보여줍니다.'],
]

const examples = ['고객 이탈 예측', '매출 예측', '불량품 감지', '합격 여부 예측', '수요 예측', '장비 고장 예측']

export default function Home() {
  const nav = useNavigate()
  const { dark, toggle } = useTheme()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'inherit', overflowX: 'hidden' }}>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 20,
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', borderBottom: '1px solid var(--border)',
        background: 'color-mix(in srgb, var(--surface) 92%, transparent)', backdropFilter: 'blur(14px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <LogoIcon />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 14, color: 'var(--text)' }}>ModelMate</div>
            <div style={{ fontSize: 10, color: 'var(--text-label)', marginTop: -1 }}>CSV로 만드는 예측 AI</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={toggle} title={dark ? '밝은 화면' : '어두운 화면'} style={{
            background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 8,
            width: 32, height: 32, cursor: 'pointer', color: 'var(--text-2)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
          <button onClick={() => nav('/upload')} className="btn-primary" style={{ height: 32 }}>
            시작하기
          </button>
        </div>
      </nav>

      <section style={{
        minHeight: 'calc(100vh - 56px)', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 440px)',
        gap: 40, alignItems: 'center', padding: '64px 32px 56px', maxWidth: 1120, margin: '0 auto',
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.18)', marginBottom: 24 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#2563eb' }}>데이터 분석을 모르는 사람도 쓰는 AutoML</span>
          </div>
          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 72px)', lineHeight: 1.05, letterSpacing: '-0.03em',
            color: 'var(--text)', fontWeight: 950, margin: '0 0 22px',
          }}>
            CSV만 넣으면<br />
            <span style={{ color: '#2563eb' }}>예측 AI가 완성됩니다</span>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.75, color: 'var(--text-2)', margin: '0 0 30px', maxWidth: 620 }}>
            ModelMate는 데이터 분석 경험이 없어도 파일 업로드부터 모델 학습, 결과 설명,
            새 데이터 예측, API 공유까지 한 흐름으로 진행하는 예측 모델 제작 도구입니다.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
            <button onClick={() => nav('/upload')} className="btn-primary" style={{ padding: '13px 24px', fontSize: 15 }}>
              CSV 파일 넣어보기
            </button>
            <button onClick={() => document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' })} className="btn-secondary" style={{ padding: '13px 20px', fontSize: 14 }}>
              진행 흐름 보기
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {examples.map(item => (
              <span key={item} style={{ padding: '7px 12px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 12, fontWeight: 700 }}>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div style={{
          border: '1px solid var(--border)', borderRadius: 18, background: 'var(--surface)',
          boxShadow: '0 24px 70px rgba(15,23,42,0.12)', overflow: 'hidden',
        }}>
          <div style={{ padding: 18, borderBottom: '1px solid var(--border-sub)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-label)', margin: '0 0 4px' }}>분석 결과 예시</p>
              <h2 style={{ fontSize: 18, color: 'var(--text)', margin: 0 }}>고객 이탈 예측 모델</h2>
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 999, padding: '5px 9px' }}>완료</span>
          </div>
          <div style={{ padding: 18, display: 'grid', gap: 12 }}>
            <Metric label="가장 잘 맞는 모델" value="LightGBM" note="자동 선택" />
            <Metric label="예측 정확도" value="94.2%" note="테스트 데이터 기준" />
            <Metric label="가장 중요한 이유" value="최근 이용 횟수" note="예측에 가장 큰 영향" />
            <div style={{ marginTop: 6, padding: 14, borderRadius: 12, background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.16)' }}>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-2)', margin: 0 }}>
                이 고객은 최근 이용 횟수가 줄고 문의 횟수가 늘어 이탈 가능성이 높게 예측되었습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" style={{ padding: '68px 32px', background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 34 }}>
            <p style={{ fontSize: 12, fontWeight: 900, color: '#2563eb', margin: '0 0 8px' }}>How it works</p>
            <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
              발표를 듣는 사람이 바로 이해하는 4단계
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
            {steps.map(([n, title, desc]) => (
              <div key={n} style={{ padding: 20, borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, marginBottom: 14 }}>
                  {n}
                </div>
                <h3 style={{ fontSize: 16, color: 'var(--text)', margin: '0 0 8px' }}>{title}</h3>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-2)', margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '64px 32px 84px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', color: 'var(--text)', margin: '0 0 14px', letterSpacing: '-0.02em' }}>
          복잡한 AI 용어보다 먼저, 결과를 보여줍니다
        </h2>
        <p style={{ maxWidth: 660, margin: '0 auto 28px', fontSize: 16, lineHeight: 1.75, color: 'var(--text-2)' }}>
          점수, 그래프, 예측 이유를 쉬운 문장으로 정리해 발표나 보고서에서도 바로 설명할 수 있게 만들었습니다.
        </p>
        <button onClick={() => nav('/upload')} className="btn-primary" style={{ padding: '14px 28px', fontSize: 15 }}>
          지금 분석 시작
        </button>
      </section>
    </div>
  )
}

function Metric({ label, value, note }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 14, borderRadius: 12, background: 'var(--surface-alt)', border: '1px solid var(--border-sub)' }}>
      <div>
        <p style={{ fontSize: 12, color: 'var(--text-label)', margin: '0 0 4px', fontWeight: 700 }}>{label}</p>
        <p style={{ fontSize: 18, color: 'var(--text)', margin: 0, fontWeight: 900 }}>{value}</p>
      </div>
      <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 800 }}>{note}</span>
    </div>
  )
}

function LogoIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
}
function SunIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /></svg>
}
function MoonIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" /></svg>
}
