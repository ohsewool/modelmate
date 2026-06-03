const PAGE_META = {
  '/upload': {
    title: '1. 데이터 넣기',
    desc: 'CSV 파일을 올리면 AI가 데이터 구조와 예측할 항목을 먼저 확인합니다.',
  },
  '/agent': {
    title: '2. 자동 분석',
    desc: '데이터 확인, 모델 학습, 성능 비교를 한 번에 진행합니다.',
  },
  '/model-lab': {
    title: '3. 모델 고르기',
    desc: '여러 AI 모델을 비교하고 이 데이터에 가장 잘 맞는 모델을 선택합니다.',
  },
  '/report': {
    title: '4. 결과 요약',
    desc: '데이터, 모델, 성능을 발표용으로 한 화면에 정리합니다.',
  },
  '/xai': {
    title: '5. 이유 보기',
    desc: 'AI가 왜 그런 예측을 했는지 중요한 근거를 보여줍니다.',
  },
  '/predict': {
    title: '확장 기능. 새 데이터 예측',
    desc: '학습된 모델에 새 값을 넣어 예측 결과를 확인합니다.',
  },
  '/deploy': {
    title: '확장 기능. API 공유',
    desc: '완성된 모델을 다른 서비스에서도 사용할 수 있게 API로 준비합니다.',
  },
  '/history': {
    title: '작업 기록',
    desc: '지금까지 진행한 분석과 모델 결과를 확인합니다.',
  },
}

export default PAGE_META
