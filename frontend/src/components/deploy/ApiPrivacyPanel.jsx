import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

function latestUrl(model) {
  if (!model?.id) return '/api/v2/{model_id}/predict'
  return `/api/v2/${model.id}/predict`
}

function previewKey(model) {
  if (!model?.id) return 'mdl_preview_••••••••'
  return `mdl_preview_${model.id}_••••`
}

export default function ApiPrivacyPanel({ models = [] }) {
  const active = models.filter(model => model.file_exists !== false)
  const latest = active[0]
  const [isPublic, setIsPublic] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const keyLabel = showKey ? previewKey(latest) : 'mdl_preview_••••••••'

  return (
    <section className="card" style={{ display: 'grid', gap: 14, borderColor: 'rgba(14,165,233,0.18)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
        <div>
          <p className="section-title" style={{ marginBottom: 4 }}>공유 범위와 API 키</p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            발표용으로 공개/비공개 흐름을 보여줍니다. 아래 키는 실제 production secret이 아닌 미리보기 값입니다.
          </p>
        </div>
        <span className={latest ? 'badge badge-cyan' : 'badge badge-amber'}>{latest ? '공유 준비' : '모델 필요'}</span>
      </div>

      <div className="api-privacy-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
        <div className="card-elevated" style={{ padding: 13, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <strong style={{ color: 'var(--text)' }}>{isPublic ? '공개 링크' : '비공개 운영'}</strong>
            <button className="btn-secondary" onClick={() => setIsPublic(v => !v)}>
              {isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
              {isPublic ? '공개' : '비공개'}
            </button>
          </div>
          <code style={{ padding: 10, borderRadius: 10, background: 'var(--surface-alt)', border: '1px solid var(--border-sub)', fontSize: 12, wordBreak: 'break-all' }}>
            {latestUrl(latest)}
          </code>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
            {isPublic ? '링크를 아는 사람이 예측 요청을 보낼 수 있는 상태로 보여줍니다.' : '로그인한 작업공간에서만 쓰는 운영 상태로 보여줍니다.'}
          </p>
        </div>

        <div className="card-elevated" style={{ padding: 13, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <strong style={{ color: 'var(--text)' }}><KeyRound size={14} style={{ verticalAlign: -2 }} /> API 키 미리보기</strong>
            <button className="btn-secondary" onClick={() => setShowKey(v => !v)}>
              {showKey ? '숨기기' : '보기'}
            </button>
          </div>
          <code style={{ padding: 10, borderRadius: 10, background: 'var(--surface-alt)', border: '1px solid var(--border-sub)', fontSize: 12, wordBreak: 'break-all' }}>
            {keyLabel}
          </code>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
            <ShieldCheck size={14} style={{ verticalAlign: -2 }} /> 실제 배포에서는 서버 검증, 만료, 사용량 제한을 붙여야 합니다.
          </p>
        </div>
      </div>
    </section>
  )
}
