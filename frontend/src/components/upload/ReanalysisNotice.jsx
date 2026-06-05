import { RotateCcw, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

export default function ReanalysisNotice({ item, onClear }) {
  const target = item.target_col || item.target || '-'
  const rows = item.rows?.toLocaleString?.() || item.rows || '-'
  const columns = item.columns || '-'
  return (
    <div style={{ display: 'grid', gap: 10, padding: 16, borderRadius: 12, border: '1px solid #bfdbfe', background: '#f8fbff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 900, color: '#2563eb' }}>
            이전 작업 다시 분석
          </p>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
            {item.filename || '이전 데이터셋'}
          </h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClear} title="안내 닫기"><X size={16} /></Button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Badge variant="default">{item.domain || '도메인 확인 필요'}</Badge>
        <Badge variant="secondary">맞힐 값 {target}</Badge>
        <Badge variant="secondary">{rows}행 / {columns}열</Badge>
        {item.best_model && <Badge variant="success">이전 모델 {item.best_model}</Badge>}
      </div>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>
        보안과 저장 공간을 위해 원본 CSV는 보관하지 않습니다. 같은 파일을 다시 올리면 이전 판단을 참고해서 이어서 분석할 수 있습니다.
      </p>
      <p style={{ display: 'flex', gap: 8, alignItems: 'center', margin: 0, fontSize: 12, color: 'var(--text-label)' }}>
        <RotateCcw size={14} /> 아래 업로드 영역에 같은 CSV를 넣어주세요.
      </p>
    </div>
  )
}
