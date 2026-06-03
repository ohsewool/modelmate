
    # 인코딩 섹션
    enc_html = (f"<h2>🔤 자동 인코딩 컬럼</h2><p style='font-size:.85rem;color:#475569'>"
                + ", ".join(f"<code>{c}</code>" for c in cat_cols) + "</p>") if cat_cols else ""

    autoprint_script = "<script>window.onload=()=>{window.print();}</script>" if autoprint else ""

    return f"""<!DOCTYPE html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ModelMate 분석 리포트</title>
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:'Segoe UI','Apple SD Gothic Neo',sans-serif;max-width:900px;
        margin:0 auto;padding:40px 32px;background:#f8fafc;color:#1e293b;line-height:1.6}}
  .header{{background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#0ea5e9 100%);
            border-radius:16px;padding:28px 32px;color:white;margin-bottom:28px}}
  .header h1{{font-size:1.6rem;font-weight:800;letter-spacing:-.02em;margin-bottom:4px}}
  .header p{{font-size:.85rem;opacity:.8}}
  h2{{font-size:1rem;font-weight:700;color:#0f172a;margin:28px 0 12px;
      padding-left:12px;border-left:3px solid #6366f1}}
  .kpis{{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:4px}}
  .kpi{{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:14px 20px;
         min-width:120px;box-shadow:0 1px 4px rgba(0,0,0,.06)}}
  .kl{{font-size:.68rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#64748b}}
  .kv{{font-size:1.5rem;font-weight:700;color:#4f46e5;margin-top:2px}}
  table{{width:100%;border-collapse:collapse;margin:12px 0;border-radius:10px;
          overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,.06)}}
  th{{background:#6366f1;color:white;padding:11px 14px;text-align:left;font-size:.83rem;font-weight:600}}
  td{{padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:.84rem}}
  tr.best td{{font-weight:700;background:#f0f4ff;color:#3730a3}}
  code{{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:.8rem;color:#4f46e5}}
  .badge{{display:inline-block;background:#dcfce7;color:#059669;border-radius:6px;
           padding:2px 10px;font-size:.75rem;font-weight:700}}
  .footer{{margin-top:40px;color:#94a3b8;font-size:.75rem;text-align:center;
            border-top:1px solid #e2e8f0;padding-top:20px}}
  .no-print{{text-align:center;margin-bottom:20px}}
  .print-btn{{background:linear-gradient(135deg,#6366f1,#7c3aed);color:white;border:none;
               padding:12px 28px;border-radius:10px;font-size:.9rem;font-weight:600;
               cursor:pointer;box-shadow:0 4px 12px rgba(99,102,241,.35)}}
  .print-btn:hover{{opacity:.9}}
  @media print{{
    body{{background:white;padding:20px 24px}}
    .header{{-webkit-print-color-adjust:exact;print-color-adjust:exact;border-radius:8px}}
    .no-print{{display:none}}
    th{{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    tr.best td{{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    .kpi{{box-shadow:none;border:1px solid #cbd5e1}}
    table{{page-break-inside:avoid}}
    h2{{page-break-after:avoid}}
  }}
</style></head><body>

<div class="no-print">
  <button class="print-btn" onclick="window.print()">📄 PDF로 저장 (Ctrl+P → PDF 선택)</button>
</div>

<div class="header">
  <h1>🤖 ModelMate 분석 리포트</h1>
  <p>생성일시: {now} &nbsp;·&nbsp; 작업 유형: {'회귀 (Regression)' if is_reg else '분류 (Classification)'}
     &nbsp;·&nbsp; 타깃: {STATE.get('target_col','—')}</p>
</div>

<h2>📋 데이터 요약</h2>
<div class="kpis">
  <div class="kpi"><div class="kl">데이터 행 수</div><div class="kv">{len(X):,}</div></div>
  <div class="kpi"><div class="kl">피처 수</div><div class="kv">{len(X.columns)}</div></div>
  <div class="kpi"><div class="kl">인코딩 컬럼</div><div class="kv">{len(cat_cols)}</div></div>
  <div class="kpi"><div class="kl">최고 모델</div>
    <div class="kv" style="font-size:1rem;padding-top:4px">{name}</div></div>
  {"<div class='kpi'><div class='kl'>Optuna 튜닝</div><div class='kv'><span class='badge'>적용</span></div></div>" if opt else ""}
</div>

{f'<h2>📈 CV 최고 성능</h2><p style="font-size:.85rem;color:#64748b;margin:-6px 0 12px">같은 데이터를 3번 나눠 검증했을 때 가장 좋은 모델의 성능입니다.</p><div class="kpis">{perf_html}</div>' if perf_html else ""}

<h2>🏆 모델 비교 (3-fold CV)</h2>
<table>{thead}{tbody}</table>

{opt_html}
{fi_html}
{enc_html}

