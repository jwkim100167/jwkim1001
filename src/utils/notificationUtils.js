// 배치 모니터링 알림 유틸리티

// 환율 범위 결정
export const getExchangeRateRange = (rate) => {
  if (!rate) return null;
  if (rate >= 1500) return '극공포';
  if (rate >= 1450) return '공포';
  if (rate >= 1300) return '경계';
  return '안정';
};

// 공포와 탐욕 지수 범위 결정
export const getFearGreedRange = (index) => {
  if (index === null || index === undefined) return null;
  if (index >= 75) return '안정';
  if (index >= 50) return '경계';
  if (index >= 25) return '공포';
  return '극공포';
};

// VIX 지수 범위 결정
export const getVixRange = (index) => {
  if (index === null || index === undefined) return null;
  if (index >= 40) return '극공포';
  if (index >= 30) return '공포';
  if (index >= 20) return '경계';
  return '안정';
};

// 오늘이 9시인지 확인
export const isNineAM = () => {
  const now = new Date();
  return now.getHours() === 9 && now.getMinutes() === 0;
};

// 오늘 날짜 문자열 생성 (YYYY-MM-DD)
export const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// localStorage에서 9시 기준 값 가져오기
export const get9AMValue = (key) => {
  try {
    const stored = localStorage.getItem(`morning_9am_${key}`);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('localStorage 읽기 오류:', error);
    return null;
  }
};

// localStorage에 9시 기준 값 저장 (매일 아침 9시에만)
export const save9AMValue = (key, value, range) => {
  try {
    const data = {
      value,
      range,
      date: getTodayString(),
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(`morning_9am_${key}`, JSON.stringify(data));
    console.log(`9시 기준 값 저장: ${key} = ${value} (${range})`);
  } catch (error) {
    console.error('localStorage 저장 오류:', error);
  }
};

// 범위 변경 확인 (9시 기준값과 비교)
export const checkRangeChangeFrom9AM = (key, currentValue, getRangeFunction, componentName) => {
  const currentRange = getRangeFunction(currentValue);
  const morning9AM = get9AMValue(key);
  
  console.log(`[${componentName}] 디버깅:`, {
    currentValue,
    currentRange,
    morning9AM,
    hasStored9AM: !!morning9AM
  });
  
  const result = {
    componentName,
    currentValue,
    currentRange,
    hasChanged: false,
    previousValue: null,
    previousRange: null
  };
  
  if (morning9AM) {
    result.previousValue = morning9AM.value;
    result.previousRange = morning9AM.range;
    result.hasChanged = morning9AM.range !== currentRange;
    
    console.log(`[${componentName}] 범위 비교:`, {
      previousRange: morning9AM.range,
      currentRange,
      hasChanged: result.hasChanged
    });
  } else {
    console.log(`[${componentName}] 9시 기준값이 없음 - 첫 실행 또는 데이터 없음`);
  }
  
  // 9시이면 현재 값을 기준값으로 저장
  if (isNineAM()) {
    save9AMValue(key, currentValue, currentRange);
  }
  
  return result;
};

// 모든 컴포넌트의 변경사항 확인
export const checkAllRangeChanges = (values) => {
  const changes = [];
  
  if (values.exchangeRate !== null) {
    changes.push(checkRangeChangeFrom9AM('exchange_rate', values.exchangeRate, getExchangeRateRange, '환율 (USD/KRW)'));
  }
  
  if (values.fearGreedIndex !== null) {
    changes.push(checkRangeChangeFrom9AM('fear_greed_index', values.fearGreedIndex, getFearGreedRange, '공포와 탐욕 지수'));
  }
  
  if (values.vixIndex !== null) {
    changes.push(checkRangeChangeFrom9AM('vix_index', values.vixIndex, getVixRange, 'VIX 지수'));
  }
  
  return changes;
};