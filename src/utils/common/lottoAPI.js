// 로또 당첨번호 API 유틸리티

// DB에서 로또 데이터 가져오기 (로컬 서버 API 사용)
export const loadLottoDataFromDB = async () => {
  try {
    console.log('DB에서 로또 데이터 로드 시도...');
    
    // 로컬 서버의 API 엔드포인트 (예시)
    // 실제 DB API 엔드포인트로 변경 필요
    const response = await fetch('/api/lotto/all');
    
    if (response.ok) {
      const data = await response.json();
      console.log(`DB에서 ${data.length}개 회차 데이터 로드 성공`);
      
      // 데이터 형식 정규화
      const normalizedData = data.map(item => ({
        round: item.round || item.drwNo,
        date: item.date || item.drwNoDate,
        numbers: item.numbers || [
          item.drwtNo1, item.drwtNo2, item.drwtNo3, 
          item.drwtNo4, item.drwtNo5, item.drwtNo6
        ],
        bonusNumber: item.bonusNumber || item.bnusNo,
        firstWinAmount: item.firstWinAmount || item.firstWinamnt,
        firstWinnerCount: item.firstWinnerCount || item.firstPrzwnerCo
      }));
      
      return normalizedData;
    } else {
      console.error('DB 로드 실패:', response.status);
      return null;
    }
  } catch (error) {
    console.error('DB에서 로또 데이터 로드 실패:', error);
    return null;
  }
};

// 여러 프록시 서버 옵션
const PROXY_SERVERS = [
  'https://api.allorigins.win/get?url=',
  'https://cors-anywhere.herokuapp.com/',
  'https://thingproxy.freeboard.io/fetch/'
];

const LOTTO_API_BASE = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber';

// 여러 프록시 서버를 순차적으로 시도
const tryWithProxies = async (url) => {
  for (let i = 0; i < PROXY_SERVERS.length; i++) {
    try {
      const proxyUrl = PROXY_SERVERS[i] + encodeURIComponent(url);
      console.log(`프록시 ${i + 1} 시도:`, proxyUrl);
      
      const response = await fetch(proxyUrl);
      
      if (response.ok) {
        let data;
        if (PROXY_SERVERS[i].includes('allorigins')) {
          // allorigins는 contents 필드에 실제 데이터가 있음
          const wrapper = await response.json();
          data = JSON.parse(wrapper.contents);
        } else {
          data = await response.json();
        }
        console.log(`프록시 ${i + 1} 성공, 데이터:`, data);
        return data;
      }
    } catch (error) {
      console.error(`프록시 ${i + 1} 실패:`, error);
      continue;
    }
  }
  throw new Error('모든 프록시 서버 실패');
};

// 특정 회차 당첨번호 가져오기
export const getLottoNumberByRound = async (round) => {
  try {
    console.log(`로또 ${round}회차 API 호출 시도...`);
    const url = `${LOTTO_API_BASE}&drwNo=${round}`;
    
    const data = await tryWithProxies(url);
    console.log(`${round}회차 API 원본 응답:`, data); // 원본 데이터 로깅 추가
    
    if (data.returnValue === 'success') {
      // API에서 반환된 회차와 요청한 회차가 일치하는지 확인
      if (parseInt(data.drwNo) !== parseInt(round)) {
        console.error(`🚨 회차 불일치 오류: 요청 ${round}회차, 응답 ${data.drwNo}회차`);
        console.error(`API URL: ${url}`);
        console.error(`API 응답 데이터:`, data);
      }
      
      const result = {
        round: data.drwNo, // API가 반환한 실제 회차 사용
        date: data.drwNoDate,
        numbers: [
          data.drwtNo1,
          data.drwtNo2,
          data.drwtNo3,
          data.drwtNo4,
          data.drwtNo5,
          data.drwtNo6
        ],
        bonusNumber: data.bnusNo,
        firstWinAmount: data.firstWinamnt,
        firstWinnerCount: data.firstPrzwnerCo
      };
      console.log(`✅ ${round}회차 요청 → ${result.round}회차 응답:`, result);
      return result;
    } else {
      console.error(`${round}회차 API 응답 실패:`, data.returnValue);
      throw new Error(`로또 ${round}회차 데이터 없음: ${data.returnValue}`);
    }
  } catch (error) {
    console.error(`로또 ${round}회차 API 에러:`, error);
    return null;
  }
};

// 최신 회차 번호 가져오기
export const getLatestLottoRound = async () => {
  try {
    // 현재 날짜 기준으로 대략적인 최신 회차 계산
    // 로또 1회차: 2002년 12월 7일
    const firstLottoDate = new Date('2002-12-07');
    const today = new Date();
    const diffTime = Math.abs(today - firstLottoDate);
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    
    // 최신 회차 추정값에서 역방향으로 찾기
    const estimatedRound = diffWeeks + 1;
    
    for (let round = estimatedRound; round > estimatedRound - 10; round--) {
      const result = await getLottoNumberByRound(round);
      if (result) {
        return round;
      }
    }
    
    return estimatedRound - 5; // 안전한 값 반환
  } catch (error) {
    console.error('최신 회차 조회 에러:', error);
    return 1100; // 기본값
  }
};

// 최신 로또 당첨번호 업데이트 (기존 데이터에서 누락된 최신 회차만)
export const getLatestLottoNumbers = async (onProgress = null) => {
  const newNumbers = [];
  
  try {
    // 저장된 데이터에서 마지막 회차 확인
    const storedData = loadLottoDataFromStorage();
    let startRound = 1;
    
    if (storedData && storedData.data && storedData.data.length > 0) {
      // 저장된 데이터에서 가장 높은 회차 찾기
      const maxStoredRound = Math.max(...storedData.data.map(item => item.round));
      startRound = maxStoredRound + 1;
      console.log(`저장된 데이터 최고 회차: ${maxStoredRound}, ${startRound}회차부터 확인 시작`);
    } else {
      console.log('저장된 데이터 없음, 1회차부터 시작');
    }
    
    // 최신 회차까지 순차적으로 확인 (1180회차 이상까지)
    console.log(`${startRound}회차부터 최신 데이터 확인 중... (목표: 1180회차 이상)`);
    
    let currentRound = startRound;
    let consecutiveFailures = 0;
    const maxFailures = 10; // 연속 10회 실패하면 중단 (더 많이 시도)
    
    // 최신 회차 추정
    const firstLottoDate = new Date('2002-12-07');
    const today = new Date();
    const diffTime = Math.abs(today - firstLottoDate);
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    const estimatedLatest = diffWeeks + 1;
    
    while (consecutiveFailures < maxFailures && currentRound <= estimatedLatest + 10) { // 최신회차 + 여유분까지 확인
      try {
        const result = await getLottoNumberByRound(currentRound);
        
        if (result) {
          newNumbers.push(result);
          consecutiveFailures = 0; // 성공 시 실패 카운터 리셋
          console.log(`${currentRound}회차 데이터 수집 성공`);
          
          // 진행률 콜백
          if (onProgress) {
            const progress = Math.round((currentRound - startRound + 1) / (estimatedLatest - startRound + 1) * 100);
            onProgress(progress, currentRound, `${currentRound}회차 확인 중... (최신: ~${estimatedLatest}회차)`);
          }
        } else {
          consecutiveFailures++;
          console.log(`${currentRound}회차 데이터 없음 (연속 실패: ${consecutiveFailures})`);
        }
        
        currentRound++;
        
        // API 부하 방지를 위한 딜레이
        await new Promise(resolve => setTimeout(resolve, 300)); // 300ms로 증가
        
      } catch (error) {
        consecutiveFailures++;
        console.error(`${currentRound}회차 에러:`, error);
        currentRound++;
        await new Promise(resolve => setTimeout(resolve, 500)); // 에러 시 더 긴 딜레이
      }
    }
    
    console.log(`최신 데이터 수집 완료: ${newNumbers.length}개 회차 추가`);
    
    // 기존 데이터와 병합 (새로운 데이터가 있을 때만 저장)
    if (storedData && storedData.data && newNumbers.length > 0) {
      const mergedData = [...storedData.data, ...newNumbers];
      saveLottoDataToStorage(mergedData);
      console.log(`총 ${mergedData.length}개 회차 데이터로 업데이트`);
    } else if (newNumbers.length > 0) {
      saveLottoDataToStorage(newNumbers);
    }
    // 새로운 데이터가 없어도 성공적으로 확인했다면 저장된 데이터의 lastUpdated는 별도로 관리
    
    return newNumbers;
    
  } catch (error) {
    console.error('최신 로또 번호 수집 에러:', error);
    return newNumbers;
  }
};

// 전체 로또 당첨번호 가져오기 (1회차부터 모든 데이터)
export const getAllLottoNumbers = async (onProgress = null) => {
  const allNumbers = [];
  
  try {
    console.log('1회차부터 전체 데이터 수집 시작...');
    
    const batchSize = 10;
    let currentRound = 1;
    let consecutiveFailures = 0;
    const maxFailures = 10;
    
    while (consecutiveFailures < maxFailures) {
      const batchEnd = currentRound + batchSize - 1;
      const promises = [];
      
      // 배치 단위로 병렬 요청
      for (let round = currentRound; round <= batchEnd; round++) {
        promises.push(getLottoNumberByRound(round));
      }
      
      const results = await Promise.all(promises);
      let successCount = 0;
      
      // 성공한 결과만 추가
      results.forEach((result, index) => {
        if (result) {
          allNumbers.push(result);
          successCount++;
        }
      });
      
      if (successCount === 0) {
        consecutiveFailures++;
      } else {
        consecutiveFailures = 0;
      }
      
      // 진행률 콜백 호출
      if (onProgress) {
        onProgress(allNumbers.length, batchEnd, '수집 중...');
      }
      
      console.log(`${batchEnd}회차까지 확인 완료 (수집된 데이터: ${allNumbers.length}개)`);
      
      currentRound = batchEnd + 1;
      
      // API 부하 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`총 ${allNumbers.length}개 회차 데이터 수집 완료`);
    return allNumbers;
    
  } catch (error) {
    console.error('전체 로또 번호 수집 에러:', error);
    return allNumbers;
  }
};

// localStorage에 로또 데이터 저장
export const saveLottoDataToStorage = (lottoData) => {
  try {
    const dataToSave = {
      lastUpdated: new Date().toISOString(),
      totalRounds: lottoData.length,
      data: lottoData
    };
    
    localStorage.setItem('lotto_winning_numbers', JSON.stringify(dataToSave));
    console.log(`로또 데이터 저장 완료: ${lottoData.length}회차`);
    return true;
  } catch (error) {
    console.error('로또 데이터 저장 에러:', error);
    return false;
  }
};

// localStorage에서 로또 데이터 불러오기
export const loadLottoDataFromStorage = () => {
  try {
    console.log('💾 localStorage에서 로또 데이터 로드 시도...');
    const stored = localStorage.getItem('lotto_winning_numbers');
    
    if (stored) {
      console.log(`📦 저장된 데이터 크기: ${stored.length} 문자`);
      const parsed = JSON.parse(stored);
      console.log(`📊 파싱된 데이터:`, {
        totalRounds: parsed.totalRounds,
        format: parsed.format,
        dataLength: parsed.data?.length,
        lastUpdated: parsed.lastUpdated
      });
      
      if (!parsed.data || !Array.isArray(parsed.data)) {
        console.error('❌ 데이터 배열이 없거나 유효하지 않음:', parsed.data);
        return null;
      }
      
      console.log(`✅ 저장된 로또 데이터 로드 성공: ${parsed.totalRounds}회차`);
      console.log(`🔍 회차 범위: ${Math.min(...parsed.data.map(item => item.round))} ~ ${Math.max(...parsed.data.map(item => item.round))}`);
      
      // 새로운 8컬럼 형태인지 확인하고, 기존 형태라면 변환
      if (parsed.format === 'new_8_column') {
        console.log('✅ 이미 새로운 8컬럼 형태');
        return parsed;
      } else {
        console.log('🔄 기존 형태 → 새로운 8컬럼 형태로 변환 중...');
        
        // 기존 형태: 새로운 형태로 변환해서 반환
        if (parsed.data && Array.isArray(parsed.data)) {
          const convertedData = parsed.data.map(item => {
            // 기존 형태에서 새로운 8컬럼 형태로 변환
            if (item.numbers && Array.isArray(item.numbers)) {
              return {
                round: item.round,
                num1: item.numbers[0],
                num2: item.numbers[1],
                num3: item.numbers[2],
                num4: item.numbers[3],
                num5: item.numbers[4],
                num6: item.numbers[5],
                bonus: item.bonusNumber,
                date: item.date,
                firstWinAmount: item.firstWinAmount,
                firstWinnerCount: item.firstWinnerCount
              };
            }
            return item;
          });
          
          // 변환된 형태로 다시 저장
          const convertedStorage = {
            ...parsed,
            format: 'new_8_column',
            data: convertedData
          };
          localStorage.setItem('lotto_winning_numbers', JSON.stringify(convertedStorage));
          console.log('✅ 기존 데이터를 새로운 8컬럼 형태로 변환하여 저장 완료');
          return convertedStorage;
        }
      }
      
      return parsed;
    } else {
      console.log('❌ localStorage에 저장된 데이터 없음');
      return null;
    }
  } catch (error) {
    console.error('❌ 로또 데이터 로드 에러:', error);
    return null;
  }
};

// localStorage에서 로또 데이터 완전 삭제
export const clearLottoDataFromStorage = () => {
  try {
    localStorage.removeItem('lotto_winning_numbers');
    console.log('로또 데이터 완전 삭제 완료');
    return true;
  } catch (error) {
    console.error('로또 데이터 삭제 에러:', error);
    return false;
  }
};

// 1회차부터 최신회차까지 모든 데이터를 가져와서 새로 저장
export const downloadAllLottoData = async (onProgress = null) => {
  const allNumbers = [];
  
  try {
    console.log('1회차부터 전체 데이터 다운로드 시작...');
    
    // 최신 회차 추정
    const firstLottoDate = new Date('2002-12-07'); // 1회차 날짜
    const today = new Date();
    const diffTime = Math.abs(today - firstLottoDate);
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    const estimatedLatestRound = diffWeeks + 1;
    
    console.log(`예상 최신 회차: ${estimatedLatestRound}`);
    
    // 1회차부터 최신회차까지 순차적으로 수집
    let currentRound = 1;
    let consecutiveFailures = 0;
    const maxFailures = 15; // 연속 15회 실패시 중단
    const targetRound = estimatedLatestRound + 10; // 목표 회차 (최신 + 여유분)
    
    console.log(`🎯 목표: 1회차부터 ${targetRound}회차(최신+여유분)까지 전체 다운로드`);
    
    while (currentRound <= targetRound && consecutiveFailures < maxFailures) {
      try {
        if (onProgress) {
          const progress = Math.round((currentRound / estimatedLatestRound) * 100);
          onProgress(progress, currentRound, `${currentRound}회차 다운로드 중... (${progress}%) 최신:~${estimatedLatestRound}`);
        }
        
        const result = await getLottoNumberByRound(currentRound);
        
        if (result) {
          allNumbers.push(result);
          consecutiveFailures = 0;
          console.log(`${currentRound}회차 데이터 수집 성공`);
        } else {
          consecutiveFailures++;
          console.log(`${currentRound}회차 데이터 없음 (연속 실패: ${consecutiveFailures})`);
        }
        
        currentRound++;
        
        // API 부하 방지를 위한 딜레이 (300ms로 단축)
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        consecutiveFailures++;
        console.error(`${currentRound}회차 에러:`, error);
        currentRound++;
        
        // 에러가 많이 발생하면 더 긴 딜레이
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`전체 데이터 수집 완료: ${allNumbers.length}개 회차`);
    
    // 새로운 구조로 저장 (8컬럼: 회차 + 번호 7개)
    if (allNumbers.length > 0) {
      const newFormatData = allNumbers.map(item => ({
        round: item.round,
        num1: item.numbers[0],
        num2: item.numbers[1], 
        num3: item.numbers[2],
        num4: item.numbers[3],
        num5: item.numbers[4],
        num6: item.numbers[5],
        bonus: item.bonusNumber
      }));
      
      const dataToSave = {
        lastUpdated: new Date().toISOString(),
        totalRounds: newFormatData.length,
        format: 'new_8_column',
        data: newFormatData
      };
      
      localStorage.setItem('lotto_winning_numbers', JSON.stringify(dataToSave));
      console.log(`새로운 8컬럼 형태로 ${newFormatData.length}회차 데이터 저장 완료`);
    }
    
    return allNumbers;
    
  } catch (error) {
    console.error('전체 로또 번호 다운로드 에러:', error);
    return allNumbers;
  }
};