import { Button } from '../ui/button'

export default function AgentQuickUploadCard({ fileRef, dragging, setDragging, onFile, summary }) {
  return (
    <div
      className="card"
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]) }}
      style={{
        gridColumn: '1 / -1',
        borderStyle: 'dashed',
        borderColor: dragging ? '#7c3aed' : 'var(--border)',
        background: dragging ? 'rgba(124,58,237,0.07)' : 'var(--surface)',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: 16,
        alignItems: 'center',
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt,.tsv"
        style={{ display: 'none' }}
        onChange={e => onFile(e.target.files?.[0])}
      />
      <div>
        <p style={{ fontSize: 12, fontWeight: 900, color: '#7c3aed', margin: '0 0 6px' }}>CSV 바로 넣고 실행</p>
        <h2 style={{ fontSize: 18, color: 'var(--text)', margin: '0 0 6px' }}>파일을 넣으면 AI 코치가 바로 시작합니다</h2>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
          업로드, 데이터 종류 판단, 맞힐 값 설정, 모델 비교를 한 번에 진행합니다.
        </p>
        {summary && (
          <p style={{ fontSize: 12, color: 'var(--text-label)', margin: '10px 0 0' }}>
            {summary.fileName} · {summary.rows?.toLocaleString?.() || summary.rows}행 · 맞힐 값 {summary.target} · {summary.domain}
          </p>
        )}
      </div>
      <Button onClick={() => fileRef.current?.click()}>CSV 선택</Button>
    </div>
  )
}
