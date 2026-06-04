import { Upload } from 'lucide-react'
import { Button } from '../ui/button'

export default function DatasetDetail({ item, onUpload }) {
  const quality = parseQuality(item.quality)
  const reasons = quality.reasons || []
  const score = quality.score == null ? '-' : `${Math.round(quality.score * 100)}점`

  return (
    <div style={{ padding: 14, borderRadius: 14, border: '1px solid #bfdbfe', background: '#f8fbff' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
        <Detail label="판단 도메인" value={item.domain || '확인 필요'} />
        <Detail label="맞힐 값" value={item.target_col || '-'} />
        <Detail label="데이터 규모" value={`${item.rows?.toLocaleString?.() || item.rows}행 / ${item.columns}열`} />
        <Detail label="업로드 품질" value={score} />
      </div>
      {!!reasons.length && (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: '0 0 7px', fontSize: 13, fontWeight: 900 }}>AI가 본 데이터 특징</p>
          <div style={{ display: 'grid', gap: 6 }}>
            {reasons.slice(0, 3).map(reason => (
              <p key={reason} style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>- {reason}</p>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 12 }}>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-label)' }}>
          원본 CSV는 저장하지 않습니다. 다시 학습하려면 같은 파일을 다시 업로드하세요.
        </p>
        <Button variant="secondary" size="sm" onClick={onUpload}><Upload size={14} /> 다시 분석</Button>
      </div>
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div style={{ padding: 10, borderRadius: 12, border: '1px solid var(--border-sub)', background: 'white' }}>
      <p style={{ margin: '0 0 5px', fontSize: 11, color: 'var(--text-label)' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: 'var(--text)' }}>{value}</p>
    </div>
  )
}

function parseQuality(raw) {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw || {}
  } catch {
    return {}
  }
}
