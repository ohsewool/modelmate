export function buildAdvice(error, info) {
  if (!error) return []
  const rows = Number(info.rows || 0)
  const cols = Number(info.columns || 0)
  const varying = Number(info.varying_columns || 0)
  if (rows === 0 || cols === 0) return ['엑셀에서 CSV로 다시 저장한 뒤 첫 행에 컬럼명이 있는지 확인하세요.']
  if (cols < 2) return ['예측할 값과 참고할 정보가 최소 2개 열 이상 필요합니다.']
  if (rows < 10) return ['간단 분석은 가능하지만 모델 비교에는 행이 더 많은 CSV가 안정적입니다.']
  if (varying < 2) return ['모든 행이 거의 같은 값이면 학습할 패턴이 부족하므로 다른 열을 포함하세요.']
  return ['구분자, 인코딩, 숫자/문자 컬럼이 표 형태로 정리되어 있는지 확인하세요.']
}

export function buildDiagnosis(failed, info, reasons) {
  if (!failed) return { title: '', body: '' }
  if (reasons.includes('문장형 텍스트가 대부분') || reasons.includes('표 데이터보다 문서/대화 내용에 가까움') || reasons.includes('긴 설명 열이 대부분')) {
    return {
      title: '대화나 문서에 가까운 파일입니다',
      body: 'ModelMate는 행마다 하나의 사례가 있고 열마다 정보가 나뉜 표 데이터를 학습합니다.',
    }
  }
  if (Number(info.columns || 0) < 2) {
    return {
      title: '예측할 값과 참고 정보가 부족합니다',
      body: '최소한 맞힐 값 1개 열과 참고할 정보 1개 열이 필요합니다.',
    }
  }
  if (Number(info.varying_columns || 0) < 2) {
    return {
      title: '학습할 패턴이 부족합니다',
      body: '모든 값이 거의 같으면 모델이 차이를 배울 수 없습니다.',
    }
  }
  if (reasons.includes('날짜 컬럼만 있음')) {
    return {
      title: '날짜만 있어 예측할 값이 없습니다',
      body: '날짜는 좋은 참고 정보가 될 수 있지만, 맞힐 값이나 측정값이 함께 있어야 합니다.',
    }
  }
  return {
    title: '이 파일은 바로 분석하기 어렵습니다',
    body: 'CSV처럼 열렸지만 AutoML 학습용 표 데이터 조건을 충분히 만족하지 못했습니다.',
  }
}

export function translateReason(reason) {
  return ({
    '행이 너무 적음': '행 수가 너무 적습니다',
    '열이 2개 미만': '열이 2개보다 적습니다',
    '컬럼명이 대부분 비어 있음': '첫 행의 컬럼명이 부족합니다',
    '중복 컬럼명 있음': '같은 컬럼명이 여러 번 나옵니다',
    '값이 있는 열이 2개 미만': '값이 들어 있는 열이 부족합니다',
    '변화가 있는 열이 2개 미만': '값이 변하는 열이 부족합니다',
    '문장형 텍스트가 대부분': '긴 문장 위주라 표 데이터로 보기 어렵습니다',
    '표 데이터보다 문서/대화 내용에 가까움': '문서나 대화 내용에 가까운 파일입니다',
    '긴 설명 열이 대부분': '설명/메모처럼 긴 텍스트 열이 대부분입니다',
    '날짜 컬럼만 있음': '날짜 정보만 있고 예측할 값이 없습니다',
  })[reason] || reason
}
