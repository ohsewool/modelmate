const PAGE_META = {
  '/upload': { title: '데이터 업로드', desc: 'CSV / TXT 파일을 업로드하고 EDA를 수행합니다' },
  '/agent': { title: 'AI 자동 분석', desc: 'Agentic AutoML - 버튼 하나로 전체 분석 자동 실행' },
  '/model-lab': { title: 'Model Lab', desc: '4개 모델 교차검증 및 Optuna 하이퍼파라미터 튜닝' },
  '/predict': { title: '새 데이터 예측', desc: '학습된 모델로 새 데이터를 예측합니다' },
  '/deploy': { title: 'API 배포', desc: '모델을 REST API로 배포하고 외부에서 호출합니다' },
  '/xai': { title: 'XAI 설명', desc: 'SHAP 기반 모델 예측 근거 시각화' },
  '/history': { title: '실험 기록', desc: '모든 실험 결과 및 성능 추이 확인' },
  '/report': { title: '분석 보고서', desc: '분석 결과를 HTML 보고서로 내보내기' },
}

export default PAGE_META
