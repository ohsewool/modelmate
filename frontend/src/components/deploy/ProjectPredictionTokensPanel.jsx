import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Clipboard, KeyRound, RefreshCw, ShieldOff } from 'lucide-react'
import api from '../../api'
import { statusLabel } from '../workspace-shell/WorkspaceStates'
import { apiReasonLabel } from '../../utils/userCopy'

const fmt = value => value || '-'

function CopyButton({ value, label = '복사' }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }
  return (
    <button className="btn-secondary" onClick={copy} type="button">
      <Clipboard size={14} /> {copied ? '복사됨' : label}
    </button>
  )
}

export default function ProjectPredictionTokensPanel({ models = [] }) {
  const projectId = useMemo(() => {
    const model = models.find(item => item.dataset_ref?.project_id)
    return model?.dataset_ref?.project_id || ''
  }, [models])
  const [loading, setLoading] = useState(false)
  const [tokens, setTokens] = useState([])
  const [availability, setAvailability] = useState(null)
  const [usage, setUsage] = useState(null)
  const [plainToken, setPlainToken] = useState('')
  const [message, setMessage] = useState('')
  const endpoint = projectId ? `${window.location.origin}/api/predict/${projectId}` : ''

  async function loadTokens() {
    if (!projectId) return
    setLoading(true)
    setMessage('')
    try {
      const res = await api.get(`/projects/${projectId}/prediction-tokens`)
      setTokens(res.data.tokens || [])
      setAvailability(res.data.availability || null)
      api.get('/me/usage').then(usageRes => setUsage(usageRes.data)).catch(() => setUsage(null))
    } catch (err) {
      setMessage(err.response?.data?.detail?.user_friendly_message || 'API 인증 정보를 불러오지 못했습니다. 로그인과 프로젝트 권한을 확인해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTokens() }, [projectId])

  async function createToken() {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await api.post(`/projects/${projectId}/prediction-tokens`, { label: '기본 API 인증 정보' })
      setPlainToken(res.data.plaintext_token)
      setMessage(res.data.show_once_warning)
      await loadTokens()
    } catch (err) {
      setMessage(err.response?.data?.detail?.user_friendly_message || '아직 API 인증 정보를 만들 수 없습니다. 학습된 공유 모델과 데이터셋 상태를 확인하세요.')
    } finally {
      setLoading(false)
    }
  }

  async function revokeToken(tokenId) {
    if (!window.confirm('이 API 인증 정보를 비활성화할까요? 기존 호출은 더 이상 사용할 수 없습니다.')) return
    await api.post(`/projects/${projectId}/prediction-tokens/${tokenId}/revoke`)
    setPlainToken('')
    await loadTokens()
  }

  async function regenerateToken(tokenId) {
    if (!window.confirm('새 API 인증 정보를 만들고 기존 인증 정보를 폐기할까요?')) return
    const res = await api.post(`/projects/${projectId}/prediction-tokens/${tokenId}/regenerate`)
    setPlainToken(res.data.plaintext_token)
    setMessage(res.data.show_once_warning)
    await loadTokens()
  }

  const curlExample = `curl -X POST "${endpoint}" \\
  -H "Authorization: Bearer <MODEL_MATE_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"rows":[{"feature_a":1,"feature_b":"value"}]}'`
  const pythonExample = `import requests

response = requests.post(
    "${endpoint}",
    headers={"Authorization": "Bearer <MODEL_MATE_TOKEN>"},
    json={"rows": [{"feature_a": 1, "feature_b": "value"}]},
)
print(response.json())`
  const activeTokens = tokens.filter(token => token.status === 'active').length
  const tokenLimit = usage?.limits?.max_prediction_tokens_per_project
  const tokenLimitReached = tokenLimit !== undefined && tokenLimit !== null && activeTokens >= tokenLimit

  if (!projectId) {
    return (
      <section className="card" style={{ display: 'grid', gap: 12 }}>
        <p className="section-title">예측 API 인증 정보</p>
        <div className="banner-warning">
          <AlertCircle size={16} />
          <p style={{ margin: 0, fontSize: 13 }}>프로젝트에 연결된 공유 모델이 있어야 프로젝트 단위 API 인증 정보를 만들 수 있습니다.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="card" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <p className="section-title">예측 API 인증 정보</p>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6 }}>
            이 프로젝트의 학습된 모델을 API로 재사용할 수 있습니다. API 인증 정보는 한 번만 전체 값이 표시됩니다.
          </p>
        </div>
        <span className={availability?.available ? 'badge badge-green' : 'badge badge-amber'}>
          {availability?.available ? 'API 연결 가능' : '검토 후 API 연결 가능'}
        </span>
      </div>

      <div className="banner-success" style={{ alignItems: 'flex-start' }}>
        {availability?.available ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>
            모델: {availability?.model_ready ? '결과 준비' : '결과 확인 필요'} · 데이터셋: {availability?.dataset_active ? '사용 가능' : '사용 불가'} · 상태: {apiReasonLabel(availability?.reason)}
            {tokenLimit !== undefined ? ` · 인증 정보 ${activeTokens}/${tokenLimit}` : ''}
          </p>
      </div>

      {plainToken && (
        <div className="banner-warning" style={{ display: 'grid', gap: 10 }}>
          <strong>새 API 인증 정보는 지금 한 번만 표시됩니다.</strong>
          <code style={{ padding: 10, borderRadius: 8, background: 'white', border: '1px solid var(--border)', wordBreak: 'break-all' }}>{plainToken}</code>
          <CopyButton value={plainToken} label="인증 정보 복사" />
        </div>
      )}

      {message && <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>{message}</p>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" type="button" disabled={loading || !availability?.available || tokenLimitReached} onClick={createToken}>
          <KeyRound size={15} /> API 인증 정보 만들기
        </button>
        <CopyButton value={endpoint} label="API 주소 복사" />
      </div>
      {tokenLimitReached && (
        <p style={{ margin: 0, fontSize: 13, color: '#b45309' }}>
          현재 플랜에서 이 프로젝트에 만들 수 있는 API 인증 정보 수를 모두 사용했습니다. 기존 인증 정보를 재발급하거나 비활성화하세요.
        </p>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {tokens.length ? tokens.map(token => (
          <div key={token.token_id} className="card-compact" style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <strong>{token.token_prefix}</strong>
              <span className={token.status === 'active' ? 'badge badge-green' : 'badge badge-amber'}>{statusLabel(token.status)}</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>
              생성 {fmt(token.created_at)} · 마지막 사용 {fmt(token.last_used_at)} · 호출 {token.usage_count || 0}회
            </p>
            {token.disabled_reason && <p style={{ margin: 0, fontSize: 12, color: '#b45309' }}>비활성 사유: {token.disabled_reason}</p>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn-secondary" type="button" disabled={token.status !== 'active'} onClick={() => regenerateToken(token.token_id)}>
                <RefreshCw size={14} /> 인증 정보 재발급
              </button>
              <button className="btn-secondary" type="button" disabled={token.status !== 'active'} onClick={() => revokeToken(token.token_id)}>
                <ShieldOff size={14} /> 인증 정보 비활성화
              </button>
            </div>
          </div>
        )) : (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>아직 생성된 프로젝트 API 인증 정보가 없습니다.</p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }} className="deploy-token-examples">
        <div>
          <p style={{ margin: '0 0 6px', fontWeight: 800 }}>cURL</p>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>{curlExample}</pre>
        </div>
        <div>
          <p style={{ margin: '0 0 6px', fontWeight: 800 }}>Python</p>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>{pythonExample}</pre>
        </div>
      </div>
    </section>
  )
}
