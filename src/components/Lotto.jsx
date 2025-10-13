import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getAllLottoNumbers, getLatestLottoNumbers, saveLottoDataToStorage, loadLottoDataFromStorage, getLottoNumberByRound, clearLottoDataFromStorage, downloadAllLottoData } from '../utils/lottoAPI';
import { 
  initDatabase, 
  saveLottoResults, 
  getLottoResults, 
  getLottoResultByRound,
  saveGeneratedGame,
  getGeneratedGames,
  getDatabaseStats,
  isDatabaseInitialized
} from '../services/database';
import './Lotto.css';

const Lotto = () => {
  // console.log('Lotto 컴포넌트 렌더링됨'); // 무한 렌더링 디버깅용 제거
  
  const [activeTab, setActiveTab] = useState('generator');
  const [generatedNumbers, setGeneratedNumbers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lottoData, setLottoData] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [checkRound, setCheckRound] = useState('');
  const [winningNumbers, setWinningNumbers] = useState(null);
  const [excludeNumbers, setExcludeNumbers] = useState([]);
  const [excludeNumbersWithType, setExcludeNumbersWithType] = useState([]); // {number, types: []} 형태
  const [autoExcludeEnabled, setAutoExcludeEnabled] = useState(false);
  const [mustIncludeNumbers, setMustIncludeNumbers] = useState([]);
  const [mustIncludeCount, setMustIncludeCount] = useState(5);
  const [numberGameCounts, setNumberGameCounts] = useState({}); // 각 번호별 게임 수
  const [showAllResults, setShowAllResults] = useState(false);
  const [allLottoResults, setAllLottoResults] = useState([]);
  const [preventExactDuplicates, setPreventExactDuplicates] = useState(true); // 완전 겹침 제외 (기본값 true)
  const [preventPartialDuplicates, setPreventPartialDuplicates] = useState(false); // 부분(5개) 겹침 제외
  const [databaseInitialized, setDatabaseInitialized] = useState(false); // 데이터베이스 초기화 상태
  const [databaseStats, setDatabaseStats] = useState(null); // 데이터베이스 통계
  const [excludeLastDigitTens, setExcludeLastDigitTens] = useState(false); // 저번주 1의 자리 수 10번대 제외
  const [excludeLastDigitRanges, setExcludeLastDigitRanges] = useState(false); // 저번주 1의 자리 수 대역 전체 제외
  const [excludeTensDigitRanges, setExcludeTensDigitRanges] = useState(false); // 저번주 10의 자리 수 대역 전체 제외
  const [preventConsecutiveFour, setPreventConsecutiveFour] = useState(false); // 연속된 번호 4개 제외

  // 함수 참조를 위한 ref
  const downloadLatestLottoDataRef = useRef(null);

  // 저번주 당첨번호 가져오기
  const getLastWeekWinningNumbers = () => {
    console.log('🎰 getLastWeekWinningNumbers 호출됨');
    console.log('💾 lottoData 상태:', lottoData ? `${lottoData.data?.length}개 회차` : '없음');
    
    if (!lottoData || !lottoData.data || lottoData.data.length === 0) {
      console.log('❌ 로또 데이터가 없어서 빈 배열 반환');
      return [];
    }
    
    // 가장 최근 회차의 당첨번호
    const latestRound = Math.max(...lottoData.data.map(item => item.round));
    const latestData = lottoData.data.find(item => item.round === latestRound);
    console.log(`🔍 최신 회차: ${latestRound}, 데이터:`, latestData);
    
    if (latestData) {
      let numbers = [];
      // 기존 형태 지원
      if (latestData.numbers) {
        numbers = [...latestData.numbers, latestData.bonusNumber].filter(num => num && num >= 1 && num <= 45);
        console.log('📊 기존 형태 당첨번호:', numbers);
      }
      // 새로운 8컬럼 형태 지원
      else if (latestData.num1) {
        const rawNumbers = [
          latestData.num1, latestData.num2, latestData.num3,
          latestData.num4, latestData.num5, latestData.num6,
          latestData.bonus
        ];
        numbers = rawNumbers.filter(num => num && num >= 1 && num <= 45);
        console.log('📊 새로운 형태 당첨번호:', numbers);
      }
      return numbers;
    }
    
    console.log('❌ 최신 데이터를 찾을 수 없어서 빈 배열 반환');
    return [];
  };

  // 여러 회차의 1의 자리 수에서 가장 많이 나온 숫자 찾기 (동점 시 이전 회차 확인, 동률인 것들만 비교)
  const analyzeLastDigits = () => {
    if (!lottoData || !lottoData.data || lottoData.data.length === 0) {
      console.log('❌ 로또 데이터가 없어서 분석 불가');
      return null;
    }

    // 최신 순으로 정렬된 회차 데이터
    const sortedData = [...lottoData.data].sort((a, b) => b.round - a.round);
    console.log('📋 총 회차 수:', sortedData.length);

    let currentTiedDigits = null; // 현재 동률인 숫자들
    let checkedRounds = [];
    let finalDigitCount = {};

    // 회차별로 확인하면서 동점이 없을 때까지 검사
    for (let roundIndex = 0; roundIndex < Math.min(5, sortedData.length); roundIndex++) {
      const roundData = sortedData[roundIndex];
      let numbers = [];

      // 데이터 형태에 따른 번호 추출
      if (roundData.numbers) {
        numbers = [...roundData.numbers, roundData.bonusNumber].filter(num => num && num >= 1 && num <= 45);
      } else if (roundData.num1) {
        numbers = [
          roundData.num1, roundData.num2, roundData.num3,
          roundData.num4, roundData.num5, roundData.num6,
          roundData.bonus
        ].filter(num => num && num >= 1 && num <= 45);
      }

      if (numbers.length === 0) continue;

      const roundDigits = numbers.map(num => num % 10);
      checkedRounds.push(roundData.round);

      // 이번 회차의 1의 자리 수별 카운트
      const roundDigitCount = {};
      roundDigits.forEach(digit => {
        roundDigitCount[digit] = (roundDigitCount[digit] || 0) + 1;
      });

      // 전체 카운트에 누적
      Object.entries(roundDigitCount).forEach(([digit, count]) => {
        finalDigitCount[digit] = (finalDigitCount[digit] || 0) + count;
      });

      console.log(`🔍 ${roundData.round}회차 1의 자리 분석:`, {
        roundDigits,
        roundDigitCount,
        totalCount: finalDigitCount
      });

      if (roundIndex === 0) {
        // 첫 번째 회차: 가장 많이 나온 숫자들 찾기
        const maxCount = Math.max(...Object.values(finalDigitCount));
        currentTiedDigits = Object.entries(finalDigitCount)
          .filter(([digit, count]) => count === maxCount)
          .map(([digit, count]) => parseInt(digit));

        console.log(`📊 ${roundData.round}회차 후 최고빈도:`, {
          maxCount,
          tiedDigits: currentTiedDigits
        });

        // 동점이 없으면 바로 결과 반환
        if (currentTiedDigits.length === 1) {
          return {
            checkedRounds,
            allDigits: roundDigits,
            digitCount: finalDigitCount,
            mostFrequentDigit: currentTiedDigits[0],
            maxCount,
            isFromMultipleRounds: false
          };
        }

        console.log(`⚠️ 1의 자리 ${currentTiedDigits.join(', ')} 동점! 다음 회차 확인 필요`);
      } else {
        // 두 번째 회차부터: 동률인 것들만 비교
        const tiedDigitCounts = {};
        currentTiedDigits.forEach(digit => {
          tiedDigitCounts[digit] = finalDigitCount[digit] || 0;
        });

        const maxCountAmongTied = Math.max(...Object.values(tiedDigitCounts));
        const newTiedDigits = currentTiedDigits.filter(digit =>
          finalDigitCount[digit] === maxCountAmongTied
        );

        console.log(`📊 ${roundData.round}회차 후 동률 해결:`, {
          previousTied: currentTiedDigits,
          currentCounts: tiedDigitCounts,
          maxCountAmongTied,
          newTiedDigits
        });

        currentTiedDigits = newTiedDigits;

        // 동점이 해결되면 결과 반환
        if (currentTiedDigits.length === 1) {
          return {
            checkedRounds,
            allDigits: Object.keys(finalDigitCount).reduce((acc, digit) => {
              for (let i = 0; i < finalDigitCount[digit]; i++) {
                acc.push(parseInt(digit));
              }
              return acc;
            }, []),
            digitCount: finalDigitCount,
            mostFrequentDigit: currentTiedDigits[0],
            maxCount: maxCountAmongTied,
            isFromMultipleRounds: true
          };
        }

        console.log(`⚠️ 1의 자리 ${currentTiedDigits.join(', ')} 여전히 동점! 다음 회차 확인 필요`);
      }
    }

    // 모든 확인 후에도 동점이면 첫 번째 숫자 선택
    const finalWinner = currentTiedDigits[0];
    console.log('🎯 1의 자리 최종 결과 (동점으로 첫 번째 선택):', {
      finalWinner,
      tiedDigits: currentTiedDigits,
      maxCount: finalDigitCount[finalWinner]
    });

    return {
      checkedRounds,
      allDigits: Object.keys(finalDigitCount).reduce((acc, digit) => {
        for (let i = 0; i < finalDigitCount[digit]; i++) {
          acc.push(parseInt(digit));
        }
        return acc;
      }, []),
      digitCount: finalDigitCount,
      mostFrequentDigit: finalWinner,
      maxCount: finalDigitCount[finalWinner],
      isFromMultipleRounds: true,
      hasMultipleTies: true
    };
  };

  // 가장 많이 나온 1의 자리 수의 10, 20, 30, 40번대 번호들 생성
  const getExcludeNumbersByLastDigit = () => {
    const analysis = analyzeLastDigits();
    if (!analysis || analysis.mostFrequentDigit === null) return [];

    const digit = analysis.mostFrequentDigit;
    const excludeNumbers = [];

    // 10, 20, 30, 40번대에서 해당 1의 자리 수를 가진 번호들
    for (let tens = 10; tens <= 40; tens += 10) {
      const number = tens + digit;
      if (number >= 1 && number <= 45) {
        excludeNumbers.push(number);
      }
    }

    console.log(`🚫 1의 자리 ${digit} 기반 제외 번호:`, excludeNumbers);
    return excludeNumbers;
  };

  // 가장 많이 나온 1의 자리 수가 포함된 모든 번호 제외
  const getExcludeRangesByLastDigit = () => {
    const analysis = analyzeLastDigits();
    if (!analysis || analysis.mostFrequentDigit === null) return [];

    const digit = analysis.mostFrequentDigit;
    const excludeNumbers = [];

    // 해당 1의 자리 수를 가진 모든 번호 찾기
    for (let num = 1; num <= 45; num++) {
      if (num % 10 === digit) {
        excludeNumbers.push(num);
      }
    }

    console.log(`🚫 1의 자리 ${digit} 기반 제외:`, excludeNumbers);
    return excludeNumbers.sort((a, b) => a - b);
  };

  // 여러 회차의 10의 자리 수에서 가장 많이 나온 숫자 찾기 (동점 시 이전 회차 확인, 동률인 10의 자리만 비교)
  const analyzeTensDigits = () => {
    if (!lottoData || !lottoData.data || lottoData.data.length === 0) {
      console.log('❌ 로또 데이터가 없어서 10의 자리 분석 불가');
      return null;
    }

    // 최신 순으로 정렬된 회차 데이터
    const sortedData = [...lottoData.data].sort((a, b) => b.round - a.round);
    console.log('📋 10의 자리 분석 - 총 회차 수:', sortedData.length);

    let currentTiedTensDigits = null; // 현재 동률인 10의 자리 숫자들
    let checkedRounds = [];
    let finalTensDigitCount = {};

    // 회차별로 확인하면서 동점이 없을 때까지 검사
    for (let roundIndex = 0; roundIndex < Math.min(5, sortedData.length); roundIndex++) {
      const roundData = sortedData[roundIndex];
      let numbers = [];

      // 데이터 형태에 따른 번호 추출
      if (roundData.numbers) {
        numbers = [...roundData.numbers, roundData.bonusNumber].filter(num => num && num >= 1 && num <= 45);
      } else if (roundData.num1) {
        numbers = [
          roundData.num1, roundData.num2, roundData.num3,
          roundData.num4, roundData.num5, roundData.num6,
          roundData.bonus
        ].filter(num => num && num >= 1 && num <= 45);
      }

      if (numbers.length === 0) continue;

      checkedRounds.push(roundData.round);

      if (roundIndex === 0) {
        // 첫 번째 회차: 모든 10의 자리 수 카운트
        const roundTensDigits = numbers.map(num => Math.floor(num / 10));
        const roundTensDigitCount = {};

        roundTensDigits.forEach(digit => {
          roundTensDigitCount[digit] = (roundTensDigitCount[digit] || 0) + 1;
        });

        finalTensDigitCount = { ...roundTensDigitCount };

        // 가장 많이 나온 10의 자리 숫자들 찾기
        const maxCount = Math.max(...Object.values(finalTensDigitCount));
        currentTiedTensDigits = Object.entries(finalTensDigitCount)
          .filter(([digit, count]) => count === maxCount)
          .map(([digit, count]) => parseInt(digit));

        console.log(`🔍 ${roundData.round}회차 10의 자리 분석:`, {
          numbers,
          roundTensDigits,
          roundTensDigitCount,
          maxCount,
          tiedTensDigits: currentTiedTensDigits
        });

        // 동점이 없으면 바로 결과 반환
        if (currentTiedTensDigits.length === 1) {
          return {
            checkedRounds,
            allTensDigits: roundTensDigits,
            tensDigitCount: finalTensDigitCount,
            mostFrequentTensDigit: currentTiedTensDigits[0],
            maxCount,
            isFromMultipleRounds: false
          };
        }

        console.log(`⚠️ 10의 자리 ${currentTiedTensDigits.join(', ')} 동점! 다음 회차에서 이 숫자들만 비교`);
      } else {
        // 두 번째 회차부터: 동률인 10의 자리 숫자들만 카운트
        const tiedTensNumbers = numbers.filter(num => currentTiedTensDigits.includes(Math.floor(num / 10)));
        const tiedTensDigits = tiedTensNumbers.map(num => Math.floor(num / 10));

        console.log(`🔍 ${roundData.round}회차 동률 10의 자리만 확인:`, {
          allNumbers: numbers,
          tiedTensNumbers,
          tiedTensDigits,
          checkingDigits: currentTiedTensDigits
        });

        // 동률인 10의 자리 숫자들만 카운트 증가
        tiedTensDigits.forEach(digit => {
          finalTensDigitCount[digit] = (finalTensDigitCount[digit] || 0) + 1;
        });

        // 동률인 것들 중에서 가장 많이 나온 것들 찾기
        const tiedDigitCounts = {};
        currentTiedTensDigits.forEach(digit => {
          tiedDigitCounts[digit] = finalTensDigitCount[digit] || 0;
        });

        const maxCountAmongTied = Math.max(...Object.values(tiedDigitCounts));
        const newTiedTensDigits = currentTiedTensDigits.filter(digit =>
          finalTensDigitCount[digit] === maxCountAmongTied
        );

        console.log(`📊 ${roundData.round}회차 후 10의 자리 동률 해결:`, {
          previousTied: currentTiedTensDigits,
          currentCounts: tiedDigitCounts,
          maxCountAmongTied,
          newTiedTensDigits,
          totalCount: finalTensDigitCount
        });

        currentTiedTensDigits = newTiedTensDigits;

        // 동점이 해결되면 결과 반환
        if (currentTiedTensDigits.length === 1) {
          return {
            checkedRounds,
            allTensDigits: Object.keys(finalTensDigitCount).reduce((acc, digit) => {
              for (let i = 0; i < finalTensDigitCount[digit]; i++) {
                acc.push(parseInt(digit));
              }
              return acc;
            }, []),
            tensDigitCount: finalTensDigitCount,
            mostFrequentTensDigit: currentTiedTensDigits[0],
            maxCount: maxCountAmongTied,
            isFromMultipleRounds: true
          };
        }

        console.log(`⚠️ 10의 자리 ${currentTiedTensDigits.join(', ')} 여전히 동점! 다음 회차 확인 필요`);
      }
    }

    // 모든 확인 후에도 동점이면 첫 번째 숫자 선택
    const finalWinner = currentTiedTensDigits[0];
    console.log('🎯 10의 자리 최종 결과 (동점으로 첫 번째 선택):', {
      finalWinner,
      tiedTensDigits: currentTiedTensDigits,
      maxCount: finalTensDigitCount[finalWinner]
    });

    return {
      checkedRounds,
      allTensDigits: Object.keys(finalTensDigitCount).reduce((acc, digit) => {
        for (let i = 0; i < finalTensDigitCount[digit]; i++) {
          acc.push(parseInt(digit));
        }
        return acc;
      }, []),
      tensDigitCount: finalTensDigitCount,
      mostFrequentTensDigit: finalWinner,
      maxCount: finalTensDigitCount[finalWinner],
      isFromMultipleRounds: true,
      hasMultipleTies: true
    };
  };

  // 가장 많이 나온 10의 자리 수 대역 전체 제외
  const getExcludeRangesByTensDigit = () => {
    const analysis = analyzeTensDigits();
    if (!analysis || analysis.mostFrequentTensDigit === null) return [];

    const tensDigit = analysis.mostFrequentTensDigit;
    const excludeNumbers = [];

    // 10의 자리 수에 따른 대역 결정
    if (tensDigit === 0) {
      // 10의 자리가 0이면 1~10 제외
      for (let num = 1; num <= 10; num++) {
        excludeNumbers.push(num);
      }
    } else if (tensDigit === 1) {
      // 10의 자리가 1이면 11~20 제외
      for (let num = 11; num <= 20; num++) {
        excludeNumbers.push(num);
      }
    } else if (tensDigit === 2) {
      // 10의 자리가 2면 21~30 제외
      for (let num = 21; num <= 30; num++) {
        excludeNumbers.push(num);
      }
    } else if (tensDigit === 3) {
      // 10의 자리가 3이면 31~40 제외
      for (let num = 31; num <= 40; num++) {
        excludeNumbers.push(num);
      }
    } else if (tensDigit === 4) {
      // 10의 자리가 4면 41~45 제외
      for (let num = 41; num <= 45; num++) {
        excludeNumbers.push(num);
      }
    }

    console.log(`🚫 10의 자리 ${tensDigit} 기반 대역 제외:`, excludeNumbers);
    return excludeNumbers.sort((a, b) => a - b);
  };

  // 연속된 번호 4개가 있는지 체크하는 함수
  const hasConsecutiveFour = (numbers) => {
    if (numbers.length < 4) return false;

    const sortedNumbers = [...numbers].sort((a, b) => a - b);

    for (let i = 0; i <= sortedNumbers.length - 4; i++) {
      let consecutiveCount = 1;

      for (let j = i + 1; j < sortedNumbers.length; j++) {
        if (sortedNumbers[j] === sortedNumbers[j - 1] + 1) {
          consecutiveCount++;
          if (consecutiveCount >= 4) {
            console.log(`🚨 연속된 4개 번호 발견: ${sortedNumbers.slice(j - 3, j + 1).join(', ')}`);
            return true;
          }
        } else {
          break;
        }
      }
    }

    return false;
  };

  // 최신 로또 데이터 다운로드 (업데이트) - useCallback으로 메모이제이션
  const downloadLatestLottoData = useCallback(async () => {
    setIsLoading(true);
    setDownloadProgress(0);
    
    try {
      const newData = await getLatestLottoNumbers((progress, current, status) => {
        setDownloadProgress(progress);
      });
      
      // 데이터베이스가 초기화되었다면 DB에서 데이터 로드, 아니면 localStorage 사용
      let updatedData;
      if (databaseInitialized && isDatabaseInitialized()) {
        updatedData = await getLottoResults();
      } else {
        updatedData = loadLottoDataFromStorage();
      }
      
      // 성공적으로 데이터를 확인했으면 lastUpdated 시간 갱신
      if (updatedData) {
        const updatedDataWithNewTimestamp = {
          ...updatedData,
          lastUpdated: new Date().toISOString()
        };
        
        // 데이터베이스가 초기화되었다면 DB에 저장, 아니면 localStorage 사용
        if (databaseInitialized && isDatabaseInitialized()) {
          await saveLottoResults(updatedDataWithNewTimestamp);
        } else {
          saveLottoDataToStorage(updatedDataWithNewTimestamp.data);
        }
        
        setLottoData(updatedDataWithNewTimestamp);
      }
      
      if (newData && newData.length > 0) {
        alert(`${newData.length}개 새로운 회차 데이터 추가 완료!`);
      } else {
        alert('새로운 데이터가 없습니다. 이미 최신 상태입니다.');
      }
    } catch (error) {
      // 에러 발생 시 lastUpdated는 갱신하지 않음
      alert('최신 데이터 확인 중 오류가 발생했습니다.');
      console.error('최신 데이터 다운로드 에러:', error);
      
      // 기존 데이터만 다시 로드 (lastUpdated 시간은 유지)
      let existingData;
      if (databaseInitialized && isDatabaseInitialized()) {
        existingData = await getLottoResults();
      } else {
        existingData = loadLottoDataFromStorage();
      }
      
      if (existingData) {
        setLottoData(existingData);
      }
    } finally {
      setIsLoading(false);
      setDownloadProgress(0);
    }
  }, [databaseInitialized]); // databaseInitialized 의존성 추가

  // 저장된 데이터에서 회차 조회 함수
  const searchLottoByRound = useCallback(async (round) => {
    if (!round) {
      console.log(`🔍 조회 조건 미충족: round=${round}`);
      return null;
    }

    try {
      console.log(`🔍 ${round}회차 조회 시작`);
      
      let foundData = null;
      
      // 데이터베이스가 초기화되어 있으면 DB에서 직접 조회
      if (databaseInitialized && isDatabaseInitialized()) {
        foundData = await getLottoResultByRound(parseInt(round));
        console.log(`🗄️ 데이터베이스에서 ${round}회차 조회:`, foundData);
      } else if (lottoData && lottoData.data) {
        // localStorage 데이터에서 조회
        foundData = lottoData.data.find(item => item.round === parseInt(round));
        console.log(`💾 localStorage에서 ${round}회차 조회:`, foundData);
      }
      
      if (foundData) {
        console.log(`✅ 저장된 데이터에서 발견:`, foundData);
        
        // 새로운 8컬럼 형태와 기존 형태 모두 지원
        let result;
        if (foundData.numbers) {
          // 기존 형태 또는 DB에서 가져온 형태
          result = {
            round: foundData.round,
            date: foundData.date,
            numbers: foundData.numbers,
            bonusNumber: foundData.bonusNumber,
            firstWinAmount: foundData.firstWinAmount,
            firstWinnerCount: foundData.firstWinnerCount
          };
        } else {
          // 새로운 8컬럼 형태
          result = {
            round: foundData.round,
            date: foundData.date || `${foundData.round}회차`,
            numbers: [foundData.num1, foundData.num2, foundData.num3, foundData.num4, foundData.num5, foundData.num6],
            bonusNumber: foundData.bonus,
            firstWinAmount: foundData.firstWinAmount,
            firstWinnerCount: foundData.firstWinnerCount
          };
        }
        
        console.log(`✅ ${round}회차 조회 결과:`, result);
        return result;
      } else {
        // 저장된 데이터에 없으면 API에서 조회
        console.log(`❌ ${round}회차가 저장된 데이터에 없음, API에서 조회 시도...`);
        return await getLottoNumberByRound(parseInt(round));
      }
    } catch (error) {
      console.error(`❌ ${round}회차 조회 에러:`, error);
      return null;
    }
  }, [lottoData, databaseInitialized]);

  // 누락된 특정 회차들만 다운로드
  const downloadMissingRounds = useCallback(async (missingRounds, onProgress = null) => {
    if (!missingRounds || missingRounds.length === 0) {
      console.log('누락된 회차가 없습니다.');
      return [];
    }

    const newNumbers = [];
    
    try {
      console.log(`🎯 누락된 ${missingRounds.length}개 회차 다운로드 시작:`, missingRounds.slice(0, 10).join(', '), missingRounds.length > 10 ? '...' : '');
      
      let completed = 0;
      
      for (const round of missingRounds) {
        try {
          if (onProgress) {
            const progress = Math.round((completed / missingRounds.length) * 100);
            onProgress(progress, round, `${round}회차 다운로드 중... (${completed + 1}/${missingRounds.length})`);
          }
          
          const result = await getLottoNumberByRound(round);
          
          if (result) {
            newNumbers.push(result);
            console.log(`✅ ${round}회차 다운로드 성공`);
          } else {
            console.log(`❌ ${round}회차 데이터 없음`);
          }
          
          completed++;
          
          // API 부하 방지를 위한 딜레이
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (error) {
          console.error(`❌ ${round}회차 다운로드 에러:`, error);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log(`📊 누락 회차 다운로드 완료: ${newNumbers.length}/${missingRounds.length}개 성공`);
      
      // 기존 데이터와 병합하여 저장
      if (newNumbers.length > 0) {
        const existingData = loadLottoDataFromStorage();
        let allData = [];
        
        if (existingData && existingData.data) {
          allData = [...existingData.data];
        }
        
        // 새로운 데이터를 8컬럼 형태로 변환하여 추가
        const newFormatData = newNumbers.map(item => ({
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
        }));
        
        // 기존 데이터와 합치고 중복 제거
        const combinedData = [...allData, ...newFormatData];
        const uniqueData = combinedData.filter((item, index, array) => 
          array.findIndex(t => t.round === item.round) === index
        );
        
        // 회차순으로 정렬
        uniqueData.sort((a, b) => a.round - b.round);
        
        const dataToSave = {
          lastUpdated: new Date().toISOString(),
          totalRounds: uniqueData.length,
          format: 'new_8_column',
          data: uniqueData
        };
        
        localStorage.setItem('lotto_winning_numbers', JSON.stringify(dataToSave));
        setLottoData(dataToSave);
        
        console.log(`💾 총 ${uniqueData.length}개 회차 데이터 저장 완료 (기존 데이터 + 새로운 ${newNumbers.length}개 회차)`);
      }
      
      return newNumbers;
      
    } catch (error) {
      console.error('누락 회차 다운로드 에러:', error);
      return newNumbers;
    }
  }, []);

  // 기존 데이터 완전 삭제 후 1회부터 전체 다운로드
  const downloadCompleteData = useCallback(async () => {
    const confirmMessage = `
기존 로또 데이터를 모두 삭제하고 1회차부터 최신회차까지 전체 데이터를 새로 다운로드합니다.

⚠️ 주의사항:
- 기존 저장된 모든 데이터가 삭제됩니다
- 다운로드 시간이 오래 걸릴 수 있습니다 (약 10-30분)
- 새로운 8컬럼 형태(회차+번호7개)로 저장됩니다

계속하시겠습니까?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);
    setDownloadProgress(0);
    
    try {
      // 1. 기존 데이터 완전 삭제
      const clearResult = clearLottoDataFromStorage();
      if (!clearResult) {
        alert('기존 데이터 삭제에 실패했습니다.');
        return;
      }
      setLottoData(null);
      
      // 2. 1회차부터 전체 데이터 다운로드
      console.log('1회차부터 전체 데이터 다운로드 시작...');
      const newData = await downloadAllLottoData((progress, current, status) => {
        setDownloadProgress(progress);
      });
      
      // 3. 업데이트된 데이터 로드
      let updatedData;
      if (databaseInitialized && isDatabaseInitialized()) {
        updatedData = await getLottoResults();
      } else {
        updatedData = loadLottoDataFromStorage();
      }
      
      if (updatedData) {
        setLottoData(updatedData);
        alert(`✅ 전체 데이터 다운로드 완료!\n\n📊 총 ${updatedData.totalRounds || updatedData.data?.length}개 회차 데이터가 ${databaseInitialized ? 'SQLite 데이터베이스' : '새로운 8컬럼 형태'}로 저장되었습니다.\n🔢 컬럼 구조: 회차 + 당첨번호 6개 + 보너스번호 1개`);
      } else {
        alert('⚠️ 데이터는 다운로드되었지만 로드에 실패했습니다. 페이지를 새로고침해주세요.');
      }
      
    } catch (error) {
      console.error('전체 데이터 다운로드 에러:', error);
      alert('❌ 전체 데이터 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      setDownloadProgress(0);
    }
  }, [databaseInitialized]);

  // downloadLatestLottoData 함수를 ref에 할당
  useEffect(() => {
    downloadLatestLottoDataRef.current = downloadLatestLottoData;
  }, [downloadLatestLottoData]);

  // 데이터베이스 초기화
  useEffect(() => {
    const initializeDatabase = async () => {
      console.log('🔄 SQLite 데이터베이스 초기화 시작...');
      setIsLoading(true);
      
      try {
        const dbInitialized = await initDatabase();
        if (dbInitialized) {
          setDatabaseInitialized(true);
          console.log('✅ 데이터베이스 초기화 완료');
          
          // 기존 localStorage 데이터 마이그레이션
          const localData = loadLottoDataFromStorage();
          if (localData && localData.data && localData.data.length > 0) {
            console.log('📤 localStorage에서 데이터베이스로 마이그레이션...');
            const migrated = await saveLottoResults(localData);
            if (migrated) {
              console.log('✅ 마이그레이션 완료:', localData.data.length, '개 회차');
            }
          }
          
          // 데이터베이스에서 데이터 로드
          const dbData = await getLottoResults();
          if (dbData) {
            setLottoData(dbData);
            console.log('📊 데이터베이스에서 로드:', dbData.data.length, '개 회차');
          }
          
          const stats = await getDatabaseStats();
          setDatabaseStats(stats);
        } else {
          console.error('❌ 데이터베이스 초기화 실패 - localStorage 사용');
          setDatabaseInitialized(false);
        }
      } catch (error) {
        console.error('❌ 데이터베이스 초기화 오류:', error);
        setDatabaseInitialized(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeDatabase();
  }, []);


  // 컴포넌트 마운트 시 저장된 로또 데이터 로드 및 일회성 자동 업데이트
  useEffect(() => {
    // 데이터베이스가 초기화된 경우 데이터베이스 초기화에서 처리됨
    if (databaseInitialized) {
      console.log('🗄️ 데이터베이스가 초기화되어 있어 로직 스킵');
      return;
    }

    // 1. 먼저 정적 JSON 파일에서 로드 시도
    const loadStaticData = async () => {
      try {
        console.log('📂 정적 JSON 파일에서 데이터 로드 시도...');
        // GitHub Pages base path 고려
        const basePath = import.meta.env.MODE === 'production' ? '/jwkim1001' : '';
        const response = await fetch(`${basePath}/lotto-data.json`);
        if (response.ok) {
          const jsonData = await response.json();
          console.log(`✅ 정적 JSON 파일 로드 성공: ${jsonData.totalRounds}회차`);
          setLottoData(jsonData);
          // localStorage에도 저장
          saveLottoDataToStorage(jsonData.data);
          return true;
        }
      } catch (error) {
        console.log('⚠️ 정적 JSON 파일 로드 실패:', error.message);
      }
      return false;
    };

    // 2. 정적 파일 로드 실패 시 localStorage 확인
    const loadFromStorage = () => {
      const stored = loadLottoDataFromStorage();
      console.log('💾 localStorage에서 데이터 로드:', stored);
      if (stored) {
        console.log(`📊 로드된 데이터: ${stored.totalRounds}회차, 데이터 배열 길이: ${stored.data?.length}`);
        console.log('🔍 데이터 샘플 (처음 3개):', stored.data?.slice(0, 3));
        setLottoData(stored);
        return true;
      } else {
        console.log('❌ 저장된 데이터 없음');
        return false;
      }
    };

    // 데이터 로드 순서: 정적 JSON -> localStorage -> 필요시 다운로드
    (async () => {
      const loadedFromStatic = await loadStaticData();
      if (!loadedFromStatic) {
        const loadedFromStorage = loadFromStorage();
        // 정적 파일도 없고 localStorage도 없을 때만 다운로드
        if (!loadedFromStorage) {
          console.log('⚠️ 정적 데이터와 저장된 데이터 모두 없음. 다운로드 시작...');
          runCompleteDownloadWithRetry();
        } else {
          console.log('✅ localStorage에서 데이터 로드 완료. 다운로드 건너뜀.');
        }
      } else {
        console.log('✅ 정적 JSON 파일에서 데이터 로드 완료. 다운로드 건너뜀.');
      }
    })();

    // 1회차부터 최신회차까지 완전 다운로드 실행 (반복 시도)
    const runCompleteDownloadWithRetry = async () => {
      // 최신 회차 추정 계산
      const firstLottoDate = new Date('2002-12-07');
      const today = new Date();
      const diffTime = Math.abs(today - firstLottoDate);
      const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
      const targetRound = diffWeeks + 1;
      
      let attempts = 0;
      const maxAttempts = 5;
      
      console.log(`🔥 1회차 ~ ${targetRound}회차(최신)까지 완전 다운로드 시작!`);
      
      const checkAndDownload = async () => {
        attempts++;
        console.log(`\n🔄 ${attempts}번째 다운로드 시도 중...`);
        
        // 기존 데이터 확인
        let currentData;
        if (databaseInitialized && isDatabaseInitialized()) {
          currentData = await getLottoResults();
        } else {
          currentData = loadLottoDataFromStorage();
        }
        let missingRounds = [];
        
        if (!currentData || !currentData.data) {
          console.log('📥 저장된 데이터 없음 - 전체 다운로드 필요');
          missingRounds = Array.from({length: targetRound}, (_, i) => i + 1);
        } else {
          const existingRounds = currentData.data.map(item => item.round);
          const maxRound = Math.max(...existingRounds);
          
          // 1회차부터 1180회차까지 누락된 회차 찾기
          for (let i = 1; i <= targetRound; i++) {
            if (!existingRounds.includes(i)) {
              missingRounds.push(i);
            }
          }
          
          console.log(`📊 현재 저장됨: ${existingRounds.length}개 회차 (최고: ${maxRound}회차)`);
          console.log(`🔍 누락된 회차: ${missingRounds.length}개`);
          
          if (missingRounds.length > 0) {
            console.log(`❌ 누락 회차 일부: ${missingRounds.slice(0, 10).join(', ')}${missingRounds.length > 10 ? '...' : ''}`);
          }
        }
        
        if (missingRounds.length === 0) {
          console.log(`✅ 1회차부터 ${targetRound}회차(최신)까지 모든 데이터가 완벽하게 저장됨!`);
          return true; // 완료
        }
        
        if (attempts <= maxAttempts) {
          console.log(`🚀 ${missingRounds.length}개 누락 회차만 다운로드 시작... (기존 데이터 유지)`);
          
          try {
            // 기존 데이터는 유지하고 누락된 회차만 다운로드
            await downloadMissingRounds(missingRounds, (progress, current, status) => {
              setDownloadProgress(progress);
            });
            
            // 다운로드 완료 후 2초 대기 후 재확인
            setTimeout(() => {
              checkAndDownload();
            }, 2000);
            
          } catch (error) {
            console.error(`❌ ${attempts}번째 다운로드 실패:`, error);
            
            if (attempts < maxAttempts) {
              console.log(`⏳ 5초 후 ${attempts + 1}번째 시도...`);
              setTimeout(() => {
                checkAndDownload();
              }, 5000);
            } else {
              console.error(`❌ ${maxAttempts}회 시도 모두 실패`);
            }
          }
        }
        
        return false;
      };
      
      // 1.5초 후 시작
      setTimeout(() => {
        checkAndDownload();
      }, 1500);
    };
  }, [databaseInitialized]); // databaseInitialized 의존성

  // 추가 제외 번호 함수들
  const getMostDrawnNumbers = () => {
    // 최신 15회차에서 가장 많이 추첨된 번호들 (최고 빈도수만)
    // 단, 가장 최근 회차는 제외 (전주 기준)
    console.log('🔥 getMostDrawnNumbers 호출됨');
    console.log('lottoData:', lottoData);
    
    if (!lottoData || !lottoData.data || lottoData.data.length === 0) {
      console.log('❌ 로또 데이터 없음');
      return [];
    }
    
    const recentData = lottoData.data
      .sort((a, b) => b.round - a.round)
      .slice(1, 16); // 가장 최근 1개 제외하고 그 다음 15개
    
    console.log('📊 최신 15회차 데이터:', recentData.length, '개');
    console.log('첫 번째 데이터 샘플:', recentData[0]);
    
    const frequency = {};
    
    recentData.forEach((item, index) => {
      let numbers = [];
      if (item.numbers) {
        numbers = [...item.numbers, item.bonusNumber];
      } else {
        numbers = [item.num1, item.num2, item.num3, item.num4, item.num5, item.num6, item.bonus];
      }
      
      console.log(`${index + 1}번째 회차(${item.round}):`, numbers);
      
      numbers.filter(num => num >= 1 && num <= 45).forEach(num => {
        frequency[num] = (frequency[num] || 0) + 1;
      });
    });
    
    console.log('📈 빈도수 계산 완료:', frequency);
    
    // 빈도수를 내림차순으로 정렬
    const sortedFrequency = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1]);
    
    console.log('🔢 정렬된 빈도수 (상위 10개):', sortedFrequency.slice(0, 10));
    
    if (sortedFrequency.length === 0) return [];
    
    // 최고 빈도수 찾기
    const maxFrequency = sortedFrequency[0][1];
    console.log('⭐ 최고 빈도수:', maxFrequency);
    
    // 최고 빈도수와 같은 번호들만 반환
    const result = sortedFrequency
      .filter(([num, freq]) => freq === maxFrequency)
      .map(([num]) => parseInt(num))
      .sort((a, b) => a - b);
    
    console.log('✅ 최종 반환값:', result);
    return result;
  };

  const getConsecutiveNumbers = () => {
    // 연속된 번호들 (1-2, 2-3, 3-4, ... , 44-45)
    const consecutive = [];
    for (let i = 1; i <= 44; i++) {
      consecutive.push(i, i + 1);
    }
    return [...new Set(consecutive)].sort((a, b) => a - b);
  };

  const getMultipleNumbers = (base) => {
    // 특정 수의 배수들
    const multiples = [];
    for (let i = base; i <= 45; i += base) {
      multiples.push(i);
    }
    return multiples;
  };

  const getAnniversaryNumbers = () => {
    // 기념일 번호들 (생일 10,1 + 숑숑생일 9,24 + 결혼기념일 7,11 + 6)
    return [1, 6, 7, 9, 10, 11, 24];
  };

  const getAllTimeMostDrawnNumbers = () => {
    // 전체 데이터에서 가장 많이 나온 번호들 (최고 빈도수만)
    if (!lottoData || !lottoData.data || lottoData.data.length === 0) return [];
    
    const frequency = {};
    
    lottoData.data.forEach(item => {
      let numbers = [];
      if (item.numbers) {
        numbers = [...item.numbers, item.bonusNumber];
      } else {
        numbers = [item.num1, item.num2, item.num3, item.num4, item.num5, item.num6, item.bonus];
      }
      
      numbers.filter(num => num >= 1 && num <= 45).forEach(num => {
        frequency[num] = (frequency[num] || 0) + 1;
      });
    });
    
    // 빈도수를 내림차순으로 정렬
    const sortedFrequency = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1]);
    
    if (sortedFrequency.length === 0) return [];
    
    // 최고 빈도수 찾기
    const maxFrequency = sortedFrequency[0][1];
    
    // 최고 빈도수와 같은 번호들만 반환
    return sortedFrequency
      .filter(([num, freq]) => freq === maxFrequency)
      .map(([num]) => parseInt(num))
      .sort((a, b) => a - b);
  };

  const getAllTimeLeastDrawnNumbers = () => {
    // 전체 데이터에서 가장 적게 나온 번호들 (최저 빈도수만)
    if (!lottoData || !lottoData.data || lottoData.data.length === 0) return [];
    
    const frequency = {};
    // 모든 번호를 0으로 초기화
    for (let i = 1; i <= 45; i++) {
      frequency[i] = 0;
    }
    
    lottoData.data.forEach(item => {
      let numbers = [];
      if (item.numbers) {
        numbers = [...item.numbers, item.bonusNumber];
      } else {
        numbers = [item.num1, item.num2, item.num3, item.num4, item.num5, item.num6, item.bonus];
      }
      
      numbers.filter(num => num >= 1 && num <= 45).forEach(num => {
        frequency[num]++;
      });
    });
    
    // 빈도수를 오름차순으로 정렬
    const sortedFrequency = Object.entries(frequency)
      .sort((a, b) => a[1] - b[1]);
    
    if (sortedFrequency.length === 0) return [];
    
    // 최저 빈도수 찾기
    const minFrequency = sortedFrequency[0][1];
    
    // 최저 빈도수와 같은 번호들만 반환
    return sortedFrequency
      .filter(([num, freq]) => freq === minFrequency)
      .map(([num]) => parseInt(num))
      .sort((a, b) => a - b);
  };

  const getEdgeNumbers = () => {
    // 가장자리 번호들 (1-5, 41-45)
    return [1, 2, 3, 4, 5, 41, 42, 43, 44, 45];
  };

  // 통계 데이터 계산 함수들
  const calculateStatistics = () => {
    if (!lottoData || !lottoData.data || lottoData.data.length === 0) {
      return null;
    }

    // 전체 번호별 빈도수 계산
    const frequency = {};
    for (let i = 1; i <= 45; i++) {
      frequency[i] = 0;
    }

    lottoData.data.forEach(item => {
      let numbers = [];
      if (item.numbers) {
        numbers = [...item.numbers, item.bonusNumber];
      } else {
        numbers = [item.num1, item.num2, item.num3, item.num4, item.num5, item.num6, item.bonus];
      }

      numbers.filter(num => num >= 1 && num <= 45).forEach(num => {
        frequency[num]++;
      });
    });

    // 빈도수 정렬
    const sortedByFrequency = Object.entries(frequency)
      .map(([num, count]) => ({ number: parseInt(num), count }))
      .sort((a, b) => b.count - a.count);

    // 홀수/짝수 통계
    const oddCount = lottoData.data.reduce((sum, item) => {
      let numbers = [];
      if (item.numbers) {
        numbers = item.numbers;
      } else {
        numbers = [item.num1, item.num2, item.num3, item.num4, item.num5, item.num6];
      }
      return sum + numbers.filter(num => num % 2 === 1).length;
    }, 0);

    const evenCount = lottoData.data.length * 6 - oddCount;

    // 연속 번호 통계
    let consecutiveCount = 0;
    lottoData.data.forEach(item => {
      let numbers = [];
      if (item.numbers) {
        numbers = [...item.numbers].sort((a, b) => a - b);
      } else {
        numbers = [item.num1, item.num2, item.num3, item.num4, item.num5, item.num6].sort((a, b) => a - b);
      }

      for (let i = 0; i < numbers.length - 1; i++) {
        if (numbers[i + 1] === numbers[i] + 1) {
          consecutiveCount++;
        }
      }
    });

    // 구간별 통계 (1-10, 11-20, 21-30, 31-40, 41-45)
    const rangeStats = {
      '1-10': 0,
      '11-20': 0,
      '21-30': 0,
      '31-40': 0,
      '41-45': 0
    };

    lottoData.data.forEach(item => {
      let numbers = [];
      if (item.numbers) {
        numbers = item.numbers;
      } else {
        numbers = [item.num1, item.num2, item.num3, item.num4, item.num5, item.num6];
      }

      numbers.forEach(num => {
        if (num >= 1 && num <= 10) rangeStats['1-10']++;
        else if (num >= 11 && num <= 20) rangeStats['11-20']++;
        else if (num >= 21 && num <= 30) rangeStats['21-30']++;
        else if (num >= 31 && num <= 40) rangeStats['31-40']++;
        else if (num >= 41 && num <= 45) rangeStats['41-45']++;
      });
    });

    return {
      totalRounds: lottoData.data.length,
      frequency: sortedByFrequency,
      mostFrequent: sortedByFrequency.slice(0, 10),
      leastFrequent: sortedByFrequency.slice(-10).reverse(),
      oddCount,
      evenCount,
      oddRatio: (oddCount / (oddCount + evenCount) * 100).toFixed(1),
      evenRatio: (evenCount / (oddCount + evenCount) * 100).toFixed(1),
      consecutiveCount,
      consecutiveRatio: (consecutiveCount / (lottoData.data.length * 5) * 100).toFixed(1),
      rangeStats
    };
  };


  const getThisWeekDateNumbers = () => {
    // 이번주 토요일 날짜 번호들 (월, 일)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7; // 이번주 토요일까지 남은 일수
    const thisSaturday = new Date(today);
    thisSaturday.setDate(today.getDate() + daysUntilSaturday);
    
    const month = thisSaturday.getMonth() + 1;
    const day = thisSaturday.getDate();
    
    const dateNumbers = [];
    if (month >= 1 && month <= 45) {
      dateNumbers.push(month);
    }
    if (day >= 1 && day <= 45 && day !== month) {
      dateNumbers.push(day);
    }
    
    return dateNumbers.sort((a, b) => a - b);
  };

  const getNotAppearedNumbers = () => {
    // 최신 15회차에서 한 번도 나오지 않은 번호들
    if (!lottoData || !lottoData.data || lottoData.data.length === 0) return [];
    
    const recentData = lottoData.data
      .sort((a, b) => b.round - a.round)
      .slice(0, 15);
    
    // 나온 번호들 수집
    const appearedNumbers = new Set();
    
    recentData.forEach(item => {
      let numbers = [];
      if (item.numbers) {
        numbers = [...item.numbers, item.bonusNumber];
      } else {
        numbers = [item.num1, item.num2, item.num3, item.num4, item.num5, item.num6, item.bonus];
      }
      
      numbers.filter(num => num >= 1 && num <= 45).forEach(num => {
        appearedNumbers.add(num);
      });
    });
    
    // 1~45 중에서 나오지 않은 번호들 찾기
    const notAppeared = [];
    for (let i = 1; i <= 45; i++) {
      if (!appearedNumbers.has(i)) {
        notAppeared.push(i);
      }
    }
    
    return notAppeared.sort((a, b) => a - b);
  };

  // 자동 제외 번호 설정 (이번주 토요일 날짜 + 저번주 당첨번호)
  useEffect(() => {
    if (autoExcludeEnabled) {
      // 이번주 토요일 날짜 기반 제외 번호 계산
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
      const daysUntilSaturday = (6 - dayOfWeek + 7) % 7; // 이번주 토요일까지 남은 일수
      const thisSaturday = new Date(today);
      thisSaturday.setDate(today.getDate() + daysUntilSaturday);
      
      const month = thisSaturday.getMonth() + 1;
      const day = thisSaturday.getDate();
      
      const dateExcludeNumbers = [];
      if (month >= 1 && month <= 45) {
        dateExcludeNumbers.push(month);
      }
      if (day >= 1 && day <= 45 && day !== month) {
        dateExcludeNumbers.push(day);
      }
      
      // 저번주 당첨번호 계산 (lottoData가 있을 때만)
      const lastWeekNumbers = [];
      if (lottoData && lottoData.data && lottoData.data.length > 0) {
        const latestRound = Math.max(...lottoData.data.map(item => item.round));
        const latestData = lottoData.data.find(item => item.round === latestRound);
        
        if (latestData) {
          let winningNums = [];
          // 기존 형태 지원
          if (latestData.numbers) {
            winningNums = [...latestData.numbers, latestData.bonusNumber].filter(num => num && num >= 1 && num <= 45);
          }
          // 새로운 8컬럼 형태 지원
          else if (latestData.num1) {
            const numbers = [
              latestData.num1, latestData.num2, latestData.num3,
              latestData.num4, latestData.num5, latestData.num6,
              latestData.bonus
            ];
            winningNums = numbers.filter(num => num && num >= 1 && num <= 45);
          }
          lastWeekNumbers.push(...winningNums);
        }
      }
      
      // 날짜 기반 + 저번주 당첨번호 모두 합치기
      const allAutoExcludeNumbers = [...dateExcludeNumbers, ...lastWeekNumbers];
      const uniqueNumbers = [...new Set(allAutoExcludeNumbers)].sort((a, b) => a - b);
      
      setExcludeNumbers(uniqueNumbers);
    } else {
      // 자동 제외가 비활성화된 경우 빈 배열로 설정
      setExcludeNumbers([]);
    }
  }, [autoExcludeEnabled, lottoData?.totalRounds]); // 무한 렌더링 방지를 위해 totalRounds로 변경

  // 범위 문자열 파싱 (예: "1-10" -> [1,2,3,4,5,6,7,8,9,10])
  const parseRangeString = (input) => {
    const numbers = [];
    const parts = input.split(',').map(part => part.trim());
    
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(num => parseInt(num.trim()));
        if (!isNaN(start) && !isNaN(end) && start >= 1 && end <= 45 && start <= end) {
          for (let i = start; i <= end; i++) {
            if (!numbers.includes(i)) {
              numbers.push(i);
            }
          }
        }
      } else {
        const num = parseInt(part);
        if (!isNaN(num) && num >= 1 && num <= 45 && !numbers.includes(num)) {
          numbers.push(num);
        }
      }
    }
    
    return numbers.sort((a, b) => a - b);
  };

  // 제외 번호 추가 (단일 번호 또는 범위)
  const addExcludeNumber = (input, type = 'manual') => {
    console.log('🎯 addExcludeNumber 호출됨, input:', input, 'type:', typeof input, 'buttonType:', type);

    if (typeof input === 'number') {
      // 단일 번호
      if (input >= 1 && input <= 45) {
        console.log('✅ 단일 번호 처리:', input);

        // 이미 제외된 번호인지 확인 (토글 기능)
        const existingItem = excludeNumbersWithType.find(item => item.number === input);

        if (existingItem && existingItem.types.includes(type)) {
          // 이미 해당 타입으로 추가되어 있으면 제거 (토글)
          console.log(`🔄 번호 ${input}의 타입 ${type} 제거 (토글)`);

          setExcludeNumbersWithType(prev => {
            const updated = [...prev];
            const index = updated.findIndex(item => item.number === input);

            if (index !== -1) {
              // 해당 타입만 제거
              updated[index].types = updated[index].types.filter(t => t !== type);

              // 타입이 하나도 없으면 번호 자체를 제거
              if (updated[index].types.length === 0) {
                updated.splice(index, 1);
              }
            }

            console.log('🔄 타입 제거 후 excludeNumbersWithType:', updated);
            return updated;
          });

          // excludeNumbers에서도 확인하여 타입이 없으면 제거
          setExcludeNumbers(prev => {
            const item = excludeNumbersWithType.find(i => i.number === input);
            if (!item || item.types.length === 1) {
              // 이 번호가 제거될 예정이면 excludeNumbers에서도 제거
              return prev.filter(num => num !== input);
            }
            return prev;
          });
        } else {
          // 새로 추가하거나 다른 타입 추가
          console.log(`➕ 번호 ${input}에 타입 ${type} 추가`);

          // excludeNumbers에 추가 (중복 방지)
          if (!excludeNumbers.includes(input)) {
            setExcludeNumbers([...excludeNumbers, input].sort((a, b) => a - b));
          }

          // 타입 추가 (함수형 업데이트)
          setExcludeNumbersWithType(prev => {
            const updated = [...prev];
            const existingIndex = updated.findIndex(item => item.number === input);

            if (existingIndex !== -1) {
              // 기존 번호가 있으면 타입만 추가
              if (!updated[existingIndex].types.includes(type)) {
                updated[existingIndex].types.push(type);
              }
            } else {
              // 새로운 번호면 추가
              updated.push({ number: input, types: [type] });
            }

            console.log('🔄 단일 번호 업데이트된 excludeNumbersWithType:', updated);
            return updated;
          });
        }
      } else {
        console.log('❌ 유효하지 않은 단일 번호:', input);
      }
    } else if (typeof input === 'string') {
      // 범위 문자열
      console.log('📝 문자열 입력 처리:', input);

      if (!input || input.trim() === '') {
        console.log('❌ 빈 문자열 입력');
        return;
      }

      const newNumbers = parseRangeString(input);
      console.log('🔢 파싱된 번호들:', newNumbers);

      if (newNumbers.length === 0) {
        console.log('❌ 파싱 결과가 비어있음');
        return;
      }

      // 각 번호에 대해 토글 확인
      const numbersToAdd = [];
      const numbersToRemove = [];

      newNumbers.forEach(num => {
        const existingItem = excludeNumbersWithType.find(item => item.number === num);
        if (existingItem && existingItem.types.includes(type)) {
          // 이미 해당 타입으로 추가되어 있으면 제거 대상
          numbersToRemove.push(num);
        } else {
          // 추가 대상
          numbersToAdd.push(num);
        }
      });

      console.log('토글 분석 - 추가:', numbersToAdd, '제거:', numbersToRemove);

      // 제거할 번호들 처리
      if (numbersToRemove.length > 0) {
        setExcludeNumbersWithType(prev => {
          const updated = [...prev];

          numbersToRemove.forEach(num => {
            const index = updated.findIndex(item => item.number === num);
            if (index !== -1) {
              // 해당 타입만 제거
              updated[index].types = updated[index].types.filter(t => t !== type);

              // 타입이 하나도 없으면 번호 자체를 제거
              if (updated[index].types.length === 0) {
                updated.splice(index, 1);
              }
            }
          });

          console.log('🔄 타입 제거 후 excludeNumbersWithType:', updated);
          return updated;
        });

        // excludeNumbers 업데이트
        setExcludeNumbers(prev => {
          return prev.filter(num => {
            if (numbersToRemove.includes(num)) {
              const item = excludeNumbersWithType.find(i => i.number === num);
              // 타입이 1개만 있었던 번호는 제거
              return item && item.types.length > 1;
            }
            return true;
          });
        });
      }

      // 추가할 번호들 처리
      if (numbersToAdd.length > 0) {
        // excludeNumbers 업데이트
        const uniqueNumbers = [...new Set([...excludeNumbers, ...numbersToAdd])].sort((a, b) => a - b);
        setExcludeNumbers(uniqueNumbers);

        // 모든 번호에 대해 한 번에 타입 추가 (상태 업데이트 배치)
        setExcludeNumbersWithType(prev => {
          const updated = [...prev];

          numbersToAdd.forEach(num => {
            const existingIndex = updated.findIndex(item => item.number === num);
            if (existingIndex !== -1) {
              // 기존 번호가 있으면 타입만 추가
              if (!updated[existingIndex].types.includes(type)) {
                updated[existingIndex].types.push(type);
              }
            } else {
              // 새로운 번호면 추가
              updated.push({ number: num, types: [type] });
            }
          });

          console.log('🔄 업데이트된 excludeNumbersWithType:', updated);
          return updated;
        });
      }

      console.log('✅ 최종 제외 번호 목록:', excludeNumbers);
    } else {
      console.log('❌ 지원하지 않는 타입:', typeof input, input);
    }
  };

  // 필수 포함 번호 추가 (단일 번호 또는 범위)
  const addMustIncludeNumber = (input) => {
    if (typeof input === 'number') {
      // 단일 번호
      if (input >= 1 && input <= 45 && !mustIncludeNumbers.includes(input)) {
        setMustIncludeNumbers([...mustIncludeNumbers, input].sort((a, b) => a - b));
        setNumberGameCounts(prev => ({...prev, [input]: 5})); // 기본값 5게임
      }
    } else if (typeof input === 'string') {
      // 범위 문자열
      const newNumbers = parseRangeString(input);
      const uniqueNumbers = [...new Set([...mustIncludeNumbers, ...newNumbers])].sort((a, b) => a - b);
      setMustIncludeNumbers(uniqueNumbers);
      
      // 새로 추가된 번호들에 대해 기본 게임 수 설정
      const newCounts = {...numberGameCounts};
      newNumbers.forEach(num => {
        if (!newCounts[num]) {
          newCounts[num] = 5;
        }
      });
      setNumberGameCounts(newCounts);
    }
  };

  // 제외 번호 제거 (모든 번호 제거 가능)
  const removeExcludeNumber = (number) => {
    setExcludeNumbers(excludeNumbers.filter(num => num !== number));
    setExcludeNumbersWithType(excludeNumbersWithType.filter(item => item.number !== number));
  };

  // 필수 포함 번호 제거
  const removeMustIncludeNumber = (number) => {
    setMustIncludeNumbers(mustIncludeNumbers.filter(num => num !== number));
    setNumberGameCounts(prev => {
      const newCounts = {...prev};
      delete newCounts[number];
      return newCounts;
    });
  };

  // 제외 번호 모두 제거 (수동 추가된 것만, 자동 제외가 켜져있으면 자동 제외 번호들은 유지)
  const clearExcludeNumbers = () => {
    if (autoExcludeEnabled) {
      // 이번주 토요일 날짜 계산
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
      const daysUntilSaturday = (6 - dayOfWeek + 7) % 7; // 이번주 토요일까지 남은 일수
      const thisSaturday = new Date(today);
      thisSaturday.setDate(today.getDate() + daysUntilSaturday);
      
      const month = thisSaturday.getMonth() + 1;
      const day = thisSaturday.getDate();
      
      const autoExcludeNumbers = [];
      
      // 이번주 토요일 날짜 기반 자동 제외 번호
      if (month >= 1 && month <= 45) {
        autoExcludeNumbers.push(month);
      }
      if (day >= 1 && day <= 45 && day !== month) {
        autoExcludeNumbers.push(day);
      }
      
      // 저번주 당첨번호
      const lastWeekNumbers = getLastWeekWinningNumbers();
      autoExcludeNumbers.push(...lastWeekNumbers);
      
      // 중복 제거 및 정렬
      const uniqueNumbers = [...new Set(autoExcludeNumbers)].sort((a, b) => a - b);
      const autoExcludeWithType = uniqueNumbers.map(num => ({ number: num, type: 'auto' }));
      setExcludeNumbers(uniqueNumbers);
      setExcludeNumbersWithType(autoExcludeWithType);
    } else {
      // 자동 제외가 꺼져있으면 모든 번호 제거
      setExcludeNumbers([]);
      setExcludeNumbersWithType([]);
    }
  };

  // 필수 포함 번호 모두 제거
  const clearMustIncludeNumbers = () => {
    setMustIncludeNumbers([]);
    setNumberGameCounts({});
  };

  // 특정 번호의 게임 수 변경
  const updateNumberGameCount = (number, count) => {
    setNumberGameCounts(prev => ({
      ...prev,
      [number]: Math.max(0, Math.min(5, count))
    }));
  };

  // 제외 번호의 타입에 따른 CSS 클래스와 스타일 반환
  const getExcludeNumberClass = (number) => {
    const item = excludeNumbersWithType.find(item => item.number === number);
    console.log(`🎨 getExcludeNumberClass 호출 - 번호: ${number}, item:`, item);
    if (!item || !item.types || item.types.length === 0) return 'excluded-ball';
    
    const types = item.types;
    console.log(`🎨 번호 ${number}의 타입들:`, types);
    
    // 다중 타입인 경우 기본 클래스만 반환 (인라인 스타일이 처리)
    if (types.length > 1) {
      console.log(`🎨 다중 타입 (${types.length}개) - 기본 클래스만 반환: excluded-ball`);
      return 'excluded-ball';
    }
    
    // 단일 타입
    const type = types[0];
    const className = `excluded-ball ${type}-excluded`;
    console.log(`🎨 단일 타입 클래스 생성 - 번호: ${number}, 타입: ${type}, 클래스: ${className}`);
    return className;
  };

  // 제외 번호의 다중 타입 인라인 스타일 반환
  const getExcludeNumberStyle = (number) => {
    const item = excludeNumbersWithType.find(item => item.number === number);
    console.log(`🎨 getExcludeNumberStyle 호출 - 번호: ${number}, item:`, item);
    if (!item || !item.types || item.types.length === 0) {
      console.log(`❌ 번호 ${number}: 아이템 없거나 타입 없음`);
      return {};
    }
    
    // 단일 타입에 대해서도 강제로 스타일 적용
    if (item.types.length === 1) {
      const type = item.types[0];
      console.log(`🎨 번호 ${number}: 단일 타입 ${type}`);
      const typeColors = {
        'anniversary': 'rgba(255, 105, 180, 0.8)',     // 핫핑크 (기념일)
        'last-week-winning': 'rgba(121, 85, 72, 0.8)',
        'this-week-date': 'rgba(103, 58, 183, 0.8)',
        'frequent': 'rgba(156, 39, 176, 0.8)',
        'not-appeared': 'rgba(255, 152, 0, 0.8)',
        'all-time-most': 'rgba(33, 150, 243, 0.8)',
        'all-time-least': 'rgba(76, 175, 80, 0.8)',
        'auto': 'rgba(76, 175, 80, 0.8)'
      };
      
      const color = typeColors[type];
      if (color) {
        const style = {
          background: color,
          border: `2px solid ${color.replace('0.9', '1.0')}`,
          borderRadius: '20px',
          // 기본 excluded-ball 스타일 완전 재정의
          display: 'inline-block',
          padding: '8px 16px',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '0.9rem',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          minWidth: '50px',
          textAlign: 'center'
        };
        console.log(`✅ 번호 ${number}: 단일 타입 인라인 스타일 적용`, style);
        return style;
      }
      console.log(`❌ 번호 ${number}: 타입 ${type}에 대한 색상 없음`);
      return {};
    }
    
    const types = item.types;
    const sortedTypes = [...types].sort((a, b) => {
      const typeOrder = {
        'anniversary': 1,
        'last-week-winning': 2,
        'this-week-date': 3,
        'frequent': 4,
        'not-appeared': 5,
        'all-time-most': 6,
        'all-time-least': 7,
        'auto': 10
      };
      
      return (typeOrder[a] || 99) - (typeOrder[b] || 99);
    });
    
    // 타입별 색상 매핑
    const typeColors = {
      'anniversary': 'rgba(255, 105, 180, 0.9)',     // 핫핑크 (기념일)
      'last-week-winning': 'rgba(121, 85, 72, 0.9)',
      'this-week-date': 'rgba(103, 58, 183, 0.9)',
      'frequent': 'rgba(156, 39, 176, 0.9)',
      'not-appeared': 'rgba(255, 152, 0, 0.9)',
      'all-time-most': 'rgba(33, 150, 243, 0.9)',
      'all-time-least': 'rgba(76, 175, 80, 0.9)',
      'auto': 'rgba(76, 175, 80, 0.9)'
    };
    
    // 동적으로 다중 분할 그라데이션 생성 (모두 세로 분할로 통일)
    const createMultiGradient = (types) => {
      const colors = types.map(type => typeColors[type] || 'rgba(244, 67, 54, 0.9)');
      const typeCount = colors.length;
      
      console.log(`🎨 createMultiGradient 호출: ${typeCount}개 타입, 색상:`, colors);
      
      if (typeCount === 1) {
        return colors[0];
      }
      
      // 세로 분할: 각 색상을 동등하게 분할
      const percentage = 100 / typeCount;
      let gradientStops = [];
      
      colors.forEach((color, index) => {
        const start = Math.round(index * percentage * 100) / 100;
        const end = Math.round((index + 1) * percentage * 100) / 100;
        
        if (index === 0) {
          // 첫 번째 색상
          gradientStops.push(`${color} 0%`, `${color} ${end}%`);
        } else if (index === colors.length - 1) {
          // 마지막 색상
          gradientStops.push(`${color} ${start}%`, `${color} 100%`);
        } else {
          // 중간 색상들
          gradientStops.push(`${color} ${start}%`, `${color} ${end}%`);
        }
      });
      
      const result = `linear-gradient(to right, ${gradientStops.join(', ')})`;
      console.log(`🌈 생성된 그라데이션 (${typeCount}분할):`, result);
      return result;
    };
    
    const gradient = createMultiGradient(sortedTypes);
    const typeCount = sortedTypes.length;
    
    console.log(`🎨 다중 타입 (${typeCount}분할) 인라인 스타일 생성 - 번호: ${number}, 타입들: ${sortedTypes.join(', ')}`);
    console.log(`🌈 생성된 그라데이션: ${gradient}`);
    console.log(`📊 색상 배열:`, sortedTypes.map(type => typeColors[type]));
    
    // 타입 개수에 따른 특별한 시각적 효과
    const getBorderIntensity = (count) => {
      if (count >= 4) return { width: '4px', opacity: '1.0', glow: '0.7' };
      if (count === 3) return { width: '3px', opacity: '0.95', glow: '0.5' };
      return { width: '2px', opacity: '0.9', glow: '0.3' };
    };
    
    const borderStyle = getBorderIntensity(typeCount);
    
    const style = {
      background: gradient,
      border: `${borderStyle.width} solid rgba(255, 215, 0, ${borderStyle.opacity})`,
      boxShadow: `0 ${typeCount + 1}px ${(typeCount + 1) * 4}px rgba(255, 215, 0, ${borderStyle.glow})`,
      transform: `${typeCount >= 3 ? 'scale(1.08)' : 'scale(1.05)'}`,
      position: 'relative',
      zIndex: 10 + typeCount,
      borderRadius: '20px',
      // 기본 excluded-ball 스타일 완전 재정의
      display: 'inline-block',
      padding: '8px 16px',
      color: 'white',
      fontWeight: 'bold',
      fontSize: '0.9rem',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      minWidth: '50px',
      textAlign: 'center'
    };
    
    console.log(`✅ 번호 ${number} 최종 인라인 스타일 (${typeCount}분할):`, style);
    return style;
  };

  // 이전 회차들의 당첨번호 조합 가져오기
  const getPreviousWinningCombinations = () => {
    if (!lottoData || !lottoData.data || lottoData.data.length === 0) return [];
    
    return lottoData.data.map(item => {
      let numbers = [];
      if (item.numbers) {
        numbers = [...item.numbers];
      } else {
        numbers = [item.num1, item.num2, item.num3, item.num4, item.num5, item.num6];
      }
      return numbers.filter(num => num >= 1 && num <= 45).sort((a, b) => a - b);
    });
  };

  // 두 번호 조합이 완전히 같은지 확인
  const isIdenticalCombination = (numbers1, numbers2) => {
    if (numbers1.length !== numbers2.length) return false;
    const sorted1 = [...numbers1].sort((a, b) => a - b);
    const sorted2 = [...numbers2].sort((a, b) => a - b);
    return sorted1.every((num, index) => num === sorted2[index]);
  };

  // 두 번호 조합의 겹치는 개수 확인
  const getOverlapCount = (numbers1, numbers2) => {
    const intersection = numbers1.filter(num => numbers2.includes(num));
    return intersection.length;
  };

  // 설정에 따른 중복 검사
  const isDuplicateCombination = (newNumbers, previousCombinations) => {
    for (const prevCombination of previousCombinations) {
      const overlapCount = getOverlapCount(newNumbers, prevCombination);
      
      // 완전 겹침 체크 (6개 모두 일치)
      if (preventExactDuplicates && overlapCount === 6) {
        console.log(`⚠️ 완전 겹침 발견: [${newNumbers.join(', ')}] vs [${prevCombination.join(', ')}]`);
        return true;
      }
      
      // 부분 겹침 체크 (5개 일치)
      if (preventPartialDuplicates && overlapCount === 5) {
        console.log(`⚠️ 부분 겹침(5개) 발견: [${newNumbers.join(', ')}] vs [${prevCombination.join(', ')}]`);
        return true;
      }
    }
    
    return false;
  };

  // 로또 번호 생성 (1-45 중 6개, 제외번호 제외, 필수포함번호 모두 포함, 이전 회차와 겹치지 않음)
  const generateLottoNumbers = () => {
    // 필수 포함 번호 검증
    const validMustInclude = mustIncludeNumbers.filter(num => !excludeNumbers.includes(num));
    
    if (validMustInclude.length > 6) {
      alert('필수 포함 번호가 6개를 초과할 수 없습니다.');
      return;
    }
    
    if (mustIncludeNumbers.length > 0 && validMustInclude.length < mustIncludeNumbers.length) {
      alert(`필수 포함 번호 중 ${mustIncludeNumbers.length - validMustInclude.length}개가 제외된 번호와 겹칩니다.`);
    }

    // 1의 자리 수 기반 제외 번호 생성
    const lastDigitRangeExcludeNumbers = excludeLastDigitRanges ? getExcludeRangesByLastDigit() : [];
    const tensDigitRangeExcludeNumbers = excludeTensDigitRanges ? getExcludeRangesByTensDigit() : [];

    // 사용 가능한 번호 풀 생성
    const availableNumbers = [];
    for (let i = 1; i <= 45; i++) {
      if (!excludeNumbers.includes(i) &&
          !lastDigitRangeExcludeNumbers.includes(i) &&
          !tensDigitRangeExcludeNumbers.includes(i) &&
          !validMustInclude.includes(i)) {
        availableNumbers.push(i);
      }
    }
    
    if (availableNumbers.length + validMustInclude.length < 6) {
      alert('사용 가능한 번호가 부족합니다. 최소 6개의 번호가 필요합니다.');
      return;
    }
    
    // 겹침 방지 옵션이 모두 꺼져있으면 바로 생성
    if (!preventExactDuplicates && !preventPartialDuplicates) {
      // 1게임 생성시에는 모든 필수 포함 번호를 포함
      const numbers = [...validMustInclude];
      
      // 나머지 번호를 랜덤으로 추가
      while (numbers.length < 6 && availableNumbers.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        const num = availableNumbers[randomIndex];
        numbers.push(num);
        availableNumbers.splice(randomIndex, 1);
      }
      
      setGeneratedNumbers(numbers.sort((a, b) => a - b));
      return;
    }
    
    // 이전 회차 당첨번호 조합들 가져오기
    const previousCombinations = getPreviousWinningCombinations();
    console.log('🔍 이전 회차 조합 개수:', previousCombinations.length);
    console.log(`⚙️ 겹침 방지 설정: 완전겹침=${preventExactDuplicates}, 부분겹침=${preventPartialDuplicates}`);
    
    let attempts = 0;
    const maxAttempts = 1000; // 최대 시도 횟수
    let numbers = [];
    
    do {
      numbers = [];
      attempts++;
      
      // 1게임 생성시에는 모든 필수 포함 번호를 포함
      numbers.push(...validMustInclude);
      
      // 사용 가능한 번호 풀 재설정 (매 시도마다)
      const currentAvailable = [];
      for (let i = 1; i <= 45; i++) {
        if (!excludeNumbers.includes(i) && !validMustInclude.includes(i)) {
          currentAvailable.push(i);
        }
      }
      
      // 나머지 번호를 랜덤으로 추가
      while (numbers.length < 6 && currentAvailable.length > 0) {
        const randomIndex = Math.floor(Math.random() * currentAvailable.length);
        const num = currentAvailable[randomIndex];
        numbers.push(num);
        currentAvailable.splice(randomIndex, 1);
      }
      
      // 설정에 따른 중복 검사
      const isDuplicate = isDuplicateCombination(numbers, previousCombinations);

      // 연속된 번호 4개 방지 검사
      const hasConsecutive = preventConsecutiveFour && hasConsecutiveFour(numbers);

      if (!isDuplicate && !hasConsecutive) {
        console.log(`✅ 유니크한 조합 생성 완료 (${attempts}번 시도)`);
        break;
      } else {
        if (isDuplicate) {
          console.log(`⚠️ 겹침 발견, 재시도 중... (${attempts}/${maxAttempts})`);
        }
        if (hasConsecutive) {
          console.log(`⚠️ 연속 4개 번호 발견, 재시도 중... (${attempts}/${maxAttempts})`);
        }
      }
      
      if (attempts >= maxAttempts) {
        console.log('❌ 최대 시도 횟수 초과, 현재 조합으로 진행');
        const warningMessage = preventPartialDuplicates ? 
          '이전 회차와 5개 이상 겹치지 않는 새로운 조합을 찾기 어렵습니다. 현재 조합으로 진행합니다.' :
          '이전 회차와 완전히 겹치지 않는 새로운 조합을 찾기 어렵습니다. 현재 조합으로 진행합니다.';
        alert(warningMessage);
        break;
      }
    } while (true);
    
    setGeneratedNumbers(numbers.sort((a, b) => a - b));
  };

  // 5게임 생성 (제외번호 제외, 필수포함번호 포함, 이전 회차와 겹치지 않음)
  const generate5Games = () => {
    // 1의 자리 수 기반 제외 번호 생성
    const lastDigitRangeExcludeNumbers = excludeLastDigitRanges ? getExcludeRangesByLastDigit() : [];
    const tensDigitRangeExcludeNumbers = excludeTensDigitRanges ? getExcludeRangesByTensDigit() : [];

    // 필수 포함 번호 검증
    const validMustInclude = mustIncludeNumbers.filter(num =>
      !excludeNumbers.includes(num) &&
      !lastDigitRangeExcludeNumbers.includes(num) &&
      !tensDigitRangeExcludeNumbers.includes(num)
    );
    const actualMustIncludeCount = Math.min(mustIncludeCount, validMustInclude.length, 6);

    if (mustIncludeNumbers.length > 0 && validMustInclude.length < Math.min(mustIncludeCount, mustIncludeNumbers.length)) {
      const targetCount = Math.min(mustIncludeCount, mustIncludeNumbers.length);
      alert(`필수 포함 번호 중 ${targetCount - validMustInclude.length}개가 제외된 번호와 겹칩니다.`);
    }

    // 사용 가능한 번호 풀 생성
    const availableNumbers = [];
    for (let i = 1; i <= 45; i++) {
      if (!excludeNumbers.includes(i) &&
          !lastDigitRangeExcludeNumbers.includes(i) &&
          !tensDigitRangeExcludeNumbers.includes(i) &&
          !validMustInclude.includes(i)) {
        availableNumbers.push(i);
      }
    }
    
    if (availableNumbers.length + validMustInclude.length < 6) {
      alert('사용 가능한 번호가 부족합니다. 최소 6개의 번호가 필요합니다.');
      return;
    }
    
    // 사전 검증: 총 필수 포함 요청이 30개(5게임 × 6개)를 초과하는지 확인
    const totalRequests = validMustInclude.reduce((sum, num) => {
      return sum + (numberGameCounts[num] || 0);
    }, 0);
    
    if (totalRequests > 30) {
      alert(`필수 포함 번호 요청이 너무 많습니다. 총 ${totalRequests}개 요청했지만 최대 30개(5게임 × 6개)만 가능합니다.`);
    }
    
    const games = [];
    
    // 각 번호별로 어느 게임에 포함될지 결정
    const gameAssignments = [[], [], [], [], []]; // 5게임의 포함될 번호들
    const warnings = [];
    
    for (const num of validMustInclude) {
      const gameCount = numberGameCounts[num] || 0;
      if (gameCount > 0) {
        // 이 번호가 포함될 게임들을 랜덤하게 선택 (게임당 최대 6개 제한 고려)
        const availableGames = [0, 1, 2, 3, 4];
        const selectedGames = [];
        
        for (let i = 0; i < Math.min(gameCount, 5); i++) {
          // 아직 6개 미만인 게임들만 선택 가능
          const validGames = availableGames.filter(gameIndex => gameAssignments[gameIndex].length < 6);
          
          if (validGames.length > 0) {
            const randomIndex = Math.floor(Math.random() * validGames.length);
            const selectedGame = validGames[randomIndex];
            selectedGames.push(selectedGame);
            
            // 선택된 게임을 availableGames에서 제거
            const removeIndex = availableGames.indexOf(selectedGame);
            availableGames.splice(removeIndex, 1);
          } else {
            // 모든 게임이 6개씩 찼으면 중단
            break;
          }
        }
        
        // 선택된 게임들에 이 번호 추가
        selectedGames.forEach(gameIndex => {
          gameAssignments[gameIndex].push(num);
        });
        
        // 이 번호가 설정된 게임 수만큼 배치되지 못했으면 경고 수집
        if (selectedGames.length < gameCount) {
          warnings.push(`번호 ${num}: ${gameCount}게임 → ${selectedGames.length}게임으로 조정`);
        }
      }
    }
    
    // 경고 메시지가 있으면 사용자에게 알림
    if (warnings.length > 0) {
      alert(`게임당 최대 6개 제한으로 일부 조정되었습니다:\n${warnings.join('\n')}`);
    }

    // 겹침 방지 옵션이 모두 꺼져있으면 바로 생성
    if (!preventExactDuplicates && !preventPartialDuplicates) {
      for (let i = 0; i < 5; i++) {
        const gameAvailable = [...availableNumbers]; // 복사본 생성
        const numbers = [];
        
        // 이 게임에 할당된 필수 포함 번호들 추가
        numbers.push(...gameAssignments[i]);
        
        // 나머지 번호를 랜덤으로 추가
        while (numbers.length < 6) {
          const randomIndex = Math.floor(Math.random() * gameAvailable.length);
          const num = gameAvailable[randomIndex];
          numbers.push(num);
          gameAvailable.splice(randomIndex, 1);
        }
        
        games.push(numbers.sort((a, b) => a - b));
      }
      
      setGeneratedNumbers(games);
      return;
    }
    
    // 이전 회차 당첨번호 조합들 가져오기
    const previousCombinations = getPreviousWinningCombinations();
    console.log('🔍 5게임 생성 - 이전 회차 조합 개수:', previousCombinations.length);
    console.log(`⚙️ 겹침 방지 설정: 완전겹침=${preventExactDuplicates}, 부분겹침=${preventPartialDuplicates}`);
    
    // 5게임 각각에 대해 설정에 따른 겹침 방지 조합 생성
    for (let i = 0; i < 5; i++) {
      let attempts = 0;
      const maxAttempts = 1000; // 게임당 최대 시도 횟수
      let numbers = [];
      
      do {
        numbers = [];
        attempts++;
        
        // 이 게임에 할당된 필수 포함 번호들 추가
        numbers.push(...gameAssignments[i]);
        
        // 사용 가능한 번호 풀 재설정 (매 시도마다)
        const gameAvailable = [];
        for (let j = 1; j <= 45; j++) {
          if (!excludeNumbers.includes(j) && !validMustInclude.includes(j)) {
            gameAvailable.push(j);
          }
        }
        
        // 나머지 번호를 랜덤으로 추가
        while (numbers.length < 6 && gameAvailable.length > 0) {
          const randomIndex = Math.floor(Math.random() * gameAvailable.length);
          const num = gameAvailable[randomIndex];
          numbers.push(num);
          gameAvailable.splice(randomIndex, 1);
        }
        
        // 설정에 따른 중복 검사
        const isDuplicate = isDuplicateCombination(numbers, previousCombinations);

        // 연속된 번호 4개 방지 검사
        const hasConsecutive = preventConsecutiveFour && hasConsecutiveFour(numbers);

        if (!isDuplicate && !hasConsecutive) {
          console.log(`✅ 게임 ${i + 1}: 유니크한 조합 생성 완료 (${attempts}번 시도)`);
          break;
        } else {
          if (isDuplicate) {
            console.log(`⚠️ 게임 ${i + 1}: 겹침 발견, 재시도 중... (${attempts}/${maxAttempts})`);
          }
          if (hasConsecutive) {
            console.log(`⚠️ 게임 ${i + 1}: 연속 4개 번호 발견, 재시도 중... (${attempts}/${maxAttempts})`);
          }
        }
        
        if (attempts >= maxAttempts) {
          console.log(`❌ 게임 ${i + 1}: 최대 시도 횟수 초과, 현재 조합으로 진행`);
          const warningMessage = preventPartialDuplicates ? 
            `게임 ${i + 1}에서 이전 회차와 5개 이상 겹치지 않는 새로운 조합을 찾기 어렵습니다. 현재 조합으로 진행합니다.` :
            `게임 ${i + 1}에서 이전 회차와 완전히 겹치지 않는 새로운 조합을 찾기 어렵습니다. 현재 조합으로 진행합니다.`;
          alert(warningMessage);
          break;
        }
      } while (true);
      
      games.push(numbers.sort((a, b) => a - b));
    }
    
    setGeneratedNumbers(games);
  };

  // 특정 회차 당첨번호 조회 (수동 조회용)
  const checkWinningNumbers = async () => {
    console.log('🔘 수동 조회 버튼 클릭, checkRound 상태:', checkRound);
    if (!checkRound) {
      alert('회차 번호를 입력해주세요.');
      return;
    }
    
    setIsLoading(true);
    setShowAllResults(false); // 단일 조회 시 전체 결과 숨기기
    
    try {
      const result = await searchLottoByRound(parseInt(checkRound));
      if (result) {
        setWinningNumbers(result);
        console.log(`${checkRound}회차 조회 성공:`, result);
      } else {
        alert(`${checkRound}회차 데이터를 찾을 수 없습니다.\n\n💡 팁:\n- 저장된 데이터 범위를 확인해보세요\n- "전체 데이터 새로 다운로드"를 실행해보세요`);
        setWinningNumbers(null);
      }
    } catch (error) {
      alert('조회 중 오류가 발생했습니다.');
      console.error('당첨번호 조회 에러:', error);
      setWinningNumbers(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 전체 회차 조회
  const showAllLottoResults = () => {
    if (!lottoData || !lottoData.data) {
      alert('저장된 데이터가 없습니다.');
      return;
    }

    setIsLoading(true);
    setWinningNumbers(null); // 단일 결과 숨기기
    
    try {
      // 저장된 데이터를 최신순으로 정렬
      const sortedResults = [...lottoData.data]
        .sort((a, b) => b.round - a.round)
        .slice(0, 20) // 최신 20개만 표시 (성능 고려)
        .map(item => {
          // 새로운 8컬럼 형태와 기존 형태 모두 지원
          if (item.numbers) {
            // 기존 형태
            return {
              round: item.round,
              date: item.date,
              numbers: item.numbers,
              bonusNumber: item.bonusNumber
            };
          } else {
            // 새로운 8컬럼 형태
            return {
              round: item.round,
              date: item.date || `${item.round}회차`,
              numbers: [item.num1, item.num2, item.num3, item.num4, item.num5, item.num6],
              bonusNumber: item.bonus
            };
          }
        });

      setAllLottoResults(sortedResults);
      setShowAllResults(true);
      console.log(`전체 조회: ${sortedResults.length}개 회차 표시`);
    } catch (error) {
      console.error('전체 조회 에러:', error);
      alert('전체 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5개 이상 겹치는 조합 분석 함수
  const analyzeOverlapCombinations = () => {
    if (!lottoData || !lottoData.data || lottoData.data.length === 0) {
      alert('저장된 로또 데이터가 없습니다.');
      return;
    }
    
    console.log(`📊 겹침 분석 시작: 총 ${lottoData.data.length}개 회차`);
    
    // 모든 회차의 당첨번호 6개씩 추출
    const allCombinations = lottoData.data.map(item => {
      let numbers = [];
      if (item.numbers) {
        numbers = [...item.numbers];
      } else {
        numbers = [item.num1, item.num2, item.num3, item.num4, item.num5, item.num6];
      }
      return {
        round: item.round,
        numbers: numbers.filter(num => num >= 1 && num <= 45).sort((a, b) => a - b)
      };
    }).filter(item => item.numbers.length === 6);
    
    console.log(`✅ 유효한 조합: ${allCombinations.length}개`);
    
    // 5개 이상 겹치는 경우 찾기
    const overlaps = [];
    
    for (let i = 0; i < allCombinations.length; i++) {
      for (let j = i + 1; j < allCombinations.length; j++) {
        const combo1 = allCombinations[i];
        const combo2 = allCombinations[j];
        
        // 겹치는 번호 개수 세기
        const intersection = combo1.numbers.filter(num => combo2.numbers.includes(num));
        
        if (intersection.length >= 5) {
          overlaps.push({
            round1: combo1.round,
            round2: combo2.round,
            numbers1: combo1.numbers,
            numbers2: combo2.numbers,
            overlap: intersection,
            overlapCount: intersection.length
          });
        }
      }
    }
    
    console.log(`🔍 분석 완료: ${overlaps.length}개의 5개 이상 겹치는 경우 발견`);
    
    if (overlaps.length > 0) {
      console.log('\n📋 겹치는 경우들:');
      overlaps.forEach((overlap, index) => {
        console.log(`\n${index + 1}. ${overlap.round1}회차 vs ${overlap.round2}회차`);
        console.log(`   ${overlap.round1}회차: [${overlap.numbers1.join(', ')}]`);
        console.log(`   ${overlap.round2}회차: [${overlap.numbers2.join(', ')}]`);
        console.log(`   겹치는 번호 (${overlap.overlapCount}개): [${overlap.overlap.join(', ')}]`);
        
        if (overlap.overlapCount === 6) {
          console.log('   ⚠️ 완전히 동일한 조합!');
        } else if (overlap.overlapCount === 5) {
          const diff1 = overlap.numbers1.filter(num => !overlap.overlap.includes(num));
          const diff2 = overlap.numbers2.filter(num => !overlap.overlap.includes(num));
          console.log(`   다른 번호: ${overlap.round1}회차(${diff1.join(', ')}) vs ${overlap.round2}회차(${diff2.join(', ')})`);
        }
      });
    } else {
      console.log('✅ 5개 이상 겹치는 경우가 없습니다.');
    }
    
    // 통계 정보
    const exactMatches = overlaps.filter(o => o.overlapCount === 6).length;
    const fiveMatches = overlaps.filter(o => o.overlapCount === 5).length;
    
    console.log('\n📊 통계:');
    console.log(`   완전히 동일한 조합 (6개 일치): ${exactMatches}건`);
    console.log(`   5개 일치: ${fiveMatches}건`);
    console.log(`   총 겹치는 경우: ${overlaps.length}건`);
    
    // 사용자에게 결과 알림
    const message = `
분석 완료!

📊 총 ${allCombinations.length}개 회차 분석
🔍 5개 이상 겹치는 경우: ${overlaps.length}건

   완전히 동일한 조합 (6개 일치): ${exactMatches}건
   5개 일치: ${fiveMatches}건

자세한 결과는 개발자 콘솔(F12)을 확인하세요.`;
    
    alert(message);
    return overlaps;
  };

  return (
    <div className="lotto">
      <div className="lotto-container">
        <div className="lotto-header">
          <h1>🎰 로또 서비스</h1>
          <p>번호 생성 및 당첨번호 확인</p>
        </div>
        
        <div className="lotto-tabs">
          <button
            className={`tab-btn ${activeTab === 'generator' ? 'active' : ''}`}
            onClick={() => setActiveTab('generator')}
          >
            🎲 번호 생성기
          </button>
          <button
            className={`tab-btn ${activeTab === 'checker' ? 'active' : ''}`}
            onClick={() => setActiveTab('checker')}
          >
            🔍 당첨번호 확인
          </button>
          <button
            className={`tab-btn ${activeTab === 'statistics' ? 'active' : ''}`}
            onClick={() => setActiveTab('statistics')}
          >
            📊 통계
          </button>
        </div>

        <div className="lotto-content">
          {activeTab === 'generator' && (
            <div className="generator-section">
              <div className="exclude-section">
                <h3>제외할 번호</h3>
                
                {/* 빠른 제외 번호 추가 버튼들 */}
                <div className="quick-exclude-buttons">
                  {/* 첫 번째 줄: 메인 버튼들 (큰 크기) */}
                  <div className="button-row-1">
                    <button onClick={() => {
                      console.log('🔘 지난주당첨 버튼 클릭됨');
                      const lastWeekNumbers = getLastWeekWinningNumbers();
                      console.log('📋 지난주 당첨번호들:', lastWeekNumbers);
                      const joinedNumbers = lastWeekNumbers.join(',');
                      console.log('🔗 join된 문자열:', joinedNumbers);
                      addExcludeNumber(joinedNumbers, 'last-week-winning');
                    }} className="quick-exclude-btn last-week-winning">
                      🎰 지난주당첨
                    </button>
                    <button onClick={() => addExcludeNumber(getThisWeekDateNumbers().join(','), 'this-week-date')} className="quick-exclude-btn this-week-date">
                      📅 이번주날짜
                    </button>
                    <button onClick={() => addExcludeNumber(getAnniversaryNumbers().join(','), 'anniversary')} className="quick-exclude-btn anniversary">
                      🎉 기념일
                      <div className="anniversary-numbers">(10,1,9,24,7,11,6)</div>
                    </button>
                  </div>
                  
                  {/* 두 번째 줄: 통계 기반 버튼들 (중간 크기) */}
                  <div className="button-row-2">
                    <button onClick={() => {
                      console.log('🔥 최신최다 버튼 클릭됨');
                      const mostDrawnNumbers = getMostDrawnNumbers();
                      console.log('📊 getMostDrawnNumbers 결과:', mostDrawnNumbers);
                      const joinedNumbers = mostDrawnNumbers.join(',');
                      console.log('🔗 join된 문자열:', joinedNumbers);
                      addExcludeNumber(joinedNumbers, 'frequent');
                    }} className="quick-exclude-btn frequent">
                      🔥 최신최다
                      <div className="range-text">(최신 15회)</div>
                    </button>
                    <button onClick={() => addExcludeNumber(getNotAppearedNumbers().join(','), 'not-appeared')} className="quick-exclude-btn not-appeared">
                      🚫 최신미추첨
                      <div className="range-text">(최신 15회)</div>
                    </button>
                    <button onClick={() => addExcludeNumber(getAllTimeMostDrawnNumbers().join(','), 'all-time-most')} className="quick-exclude-btn all-time-most">
                      🏆 전체최다
                    </button>
                    <button onClick={() => addExcludeNumber(getAllTimeLeastDrawnNumbers().join(','), 'all-time-least')} className="quick-exclude-btn all-time-least">
                      ⚡ 전체최소
                    </button>
                  </div>

                </div>
                
                <div className="exclude-input">
                  <input
                    type="text"
                    placeholder="번호 입력 (범위 지원: 1-10, 20-25)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target.value.trim();
                        if (input) {
                          if (input.includes('-') || input.includes(',')) {
                            addExcludeNumber(input);
                          } else {
                            const num = parseInt(input);
                            if (num) {
                              addExcludeNumber(num);
                            }
                          }
                          e.target.value = '';
                        }
                      }
                    }}
                    className="exclude-input-field"
                  />
                  <button
                    onClick={() => {
                      const input = document.querySelector('.exclude-input-field');
                      const inputValue = input.value.trim();
                      if (inputValue) {
                        if (inputValue.includes('-') || inputValue.includes(',')) {
                          addExcludeNumber(inputValue);
                        } else {
                          const num = parseInt(inputValue);
                          if (num) {
                            addExcludeNumber(num);
                          }
                        }
                        input.value = '';
                      }
                    }}
                    className="add-exclude-btn"
                  >
                    추가
                  </button>
                </div>
                
                <div className="excluded-numbers">
                  {excludeNumbers.length > 0 ? (
                    <>
                      <div className="excluded-list">
                        {excludeNumbers.map(num => {
                          // 해당 번호의 제외 이유들 가져오기
                          const item = excludeNumbersWithType.find(item => item.number === num);
                          const types = item?.types || [];
                          
                          // 타입별 한글 이름 매핑
                          const getTypeName = (type) => {
                            const typeNames = {
                              'anniversary': '기념일(1,6,7,9,10,11,24)',
                              'last-week-winning': '지난주 당첨번호',
                              'this-week-date': '이번주 토요일 날짜',
                              'frequent': '최신최다 출현',
                              'not-appeared': '최신미추첨',
                              'all-time-most': '전체최다 출현',
                              'all-time-least': '전체최소 출현',
                              'auto': '자동 제외'
                            };
                            return typeNames[type] || type;
                          };
                          
                          // 제외 이유들을 문자열로 조합
                          const reasons = types.map(type => getTypeName(type));
                          const isMultiple = reasons.length > 1;
                          const reasonText = isMultiple ? 
                            `🎯 다중 조건: ${reasons.join(' + ')}` : 
                            reasons[0];
                          const title = reasonText ? `${reasonText}로 제외 - 클릭하여 제거` : '클릭하여 제거';
                          
                          // 아이콘 결정 (다중 타입이면 ✕만 표시)
                          const icon = types.length > 1 ? '✕' : '✕';
                          
                          return (
                            <span
                              key={num}
                              className={getExcludeNumberClass(num)}
                              style={getExcludeNumberStyle(num)}
                              onClick={() => removeExcludeNumber(num)}
                              title={title}
                            >
                              {num} {icon}
                            </span>
                          );
                        })}
                      </div>
                      <button onClick={clearExcludeNumbers} className="clear-exclude-btn">
                        모두 제거
                      </button>
                    </>
                  ) : (
                    <div className="no-excludes">제외할 번호를 추가해보세요</div>
                  )}
                </div>
              </div>

              <div className="include-section">
                <h3>필수 포함 번호</h3>
                <div className="include-input">
                  <input
                    type="text"
                    placeholder="번호 입력 (범위 지원: 12-15, 33)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target.value.trim();
                        if (input) {
                          if (input.includes('-') || input.includes(',')) {
                            addMustIncludeNumber(input);
                          } else {
                            const num = parseInt(input);
                            if (num) {
                              addMustIncludeNumber(num);
                            }
                          }
                          e.target.value = '';
                        }
                      }
                    }}
                    className="include-input-field"
                  />
                  <button
                    onClick={() => {
                      const input = document.querySelector('.include-input-field');
                      const inputValue = input.value.trim();
                      if (inputValue) {
                        if (inputValue.includes('-') || inputValue.includes(',')) {
                          addMustIncludeNumber(inputValue);
                        } else {
                          const num = parseInt(inputValue);
                          if (num) {
                            addMustIncludeNumber(num);
                          }
                        }
                        input.value = '';
                      }
                    }}
                    className="add-include-btn"
                  >
                    추가
                  </button>
                </div>
                
                <div className="included-numbers">
                  {mustIncludeNumbers.length > 0 ? (
                    <>
                      <div className="included-list">
                        {mustIncludeNumbers.map(num => (
                          <div key={num} className="included-item">
                            <span
                              className="included-ball"
                              onClick={() => removeMustIncludeNumber(num)}
                              title="클릭하여 제거"
                            >
                              {num} ✕
                            </span>
                            <div className="game-count-setting">
                              <label>
                                5게임 중:
                                <input
                                  type="number"
                                  min="0"
                                  max="5"
                                  value={numberGameCounts[num] || 5}
                                  onChange={(e) => updateNumberGameCount(num, parseInt(e.target.value) || 0)}
                                  className="game-count-input"
                                />
                                게임
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={clearMustIncludeNumbers} className="clear-include-btn">
                        모두 제거
                      </button>
                    </>
                  ) : (
                    <div className="no-includes">필수 포함할 번호를 추가해보세요</div>
                  )}
                </div>
              </div>

              <div className="overlap-prevention-section">
                <h3>제외 패턴 설정</h3>
                <div className="overlap-options">
                  <label className="overlap-option">
                    <input
                      type="checkbox"
                      checked={preventExactDuplicates}
                      onChange={(e) => setPreventExactDuplicates(e.target.checked)}
                    />
                    <span className="overlap-label">
                      🚫 완전 겹침 제외 (6개 모두 일치)
                      <small>이전 회차와 완전히 동일한 조합 방지</small>
                    </span>
                  </label>
                  <label className="overlap-option">
                    <input
                      type="checkbox"
                      checked={preventPartialDuplicates}
                      onChange={(e) => setPreventPartialDuplicates(e.target.checked)}
                    />
                    <span className="overlap-label">
                      ⚠️ 부분 겹침 제외 (5개 일치)
                      <small>이전 회차와 5개 번호가 겹치는 조합 방지</small>
                    </span>
                  </label>
                  <label className="overlap-option">
                    <input
                      type="checkbox"
                      checked={excludeLastDigitRanges}
                      onChange={(e) => setExcludeLastDigitRanges(e.target.checked)}
                    />
                    <span className="overlap-label">
                      🔢 저번주 1의 자리 수 제외
                      <small>가장 많이 나온 1의 자리 수의 모든 대역 번호 제외 (예: 7이면 7,17,27,37 제외)</small>
                    </span>
                  </label>
                  <label className="overlap-option">
                    <input
                      type="checkbox"
                      checked={excludeTensDigitRanges}
                      onChange={(e) => setExcludeTensDigitRanges(e.target.checked)}
                    />
                    <span className="overlap-label">
                      🔟 저번주 10의 자리 수 대역 전체 제외
                      <small>가장 많이 나온 10의 자리 수 대역 제외 (0→1~10, 1→11~20, 2→21~30, 3→31~40, 4→41~45)</small>
                    </span>
                  </label>
                  <label className="overlap-option">
                    <input
                      type="checkbox"
                      checked={preventConsecutiveFour}
                      onChange={(e) => setPreventConsecutiveFour(e.target.checked)}
                    />
                    <span className="overlap-label">
                      📊 연속된 번호 4개 제외
                      <small>연속된 번호가 4개 이상인 조합 방지 (예: 1,2,3,4 또는 15,16,17,18)</small>
                    </span>
                  </label>
                </div>
                {!preventExactDuplicates && !preventPartialDuplicates && (
                  <div className="overlap-warning">
                    ⚡ 겹침 방지가 비활성화되어 있어 생성 속도가 빨라집니다.
                  </div>
                )}
                {preventPartialDuplicates && (
                  <div className="overlap-info">
                    💡 부분 겹침 제외 시 생성 시간이 오래 걸릴 수 있습니다.
                  </div>
                )}
                {excludeLastDigitRanges && (
                  <div className="overlap-info">
                    🔢 1의 자리 제외: {(() => {
                      const analysis = analyzeLastDigits();
                      if (analysis && analysis.mostFrequentDigit !== null) {
                        const excludeNums = getExcludeRangesByLastDigit();
                        const roundInfo = analysis.isFromMultipleRounds
                          ? `${analysis.checkedRounds.length}회차(${analysis.checkedRounds.join(',')})`
                          : `${analysis.checkedRounds[0]}회차`;
                        const tieInfo = analysis.hasMultipleTies ? ' (동점으로 첫 번째 선택)' : '';
                        return `${roundInfo} 분석: 1의 자리 ${analysis.mostFrequentDigit} → ${excludeNums.join(', ')} 제외${tieInfo}`;
                      }
                      return '로또 데이터를 불러와주세요';
                    })()}
                  </div>
                )}
                {excludeTensDigitRanges && (
                  <div className="overlap-info">
                    🔟 10의 자리 대역 제외: {(() => {
                      const analysis = analyzeTensDigits();
                      if (analysis && analysis.mostFrequentTensDigit !== null) {
                        const excludeNums = getExcludeRangesByTensDigit();
                        const roundInfo = analysis.isFromMultipleRounds
                          ? `${analysis.checkedRounds.length}회차(${analysis.checkedRounds.join(',')})`
                          : `${analysis.checkedRounds[0]}회차`;
                        const tieInfo = analysis.hasMultipleTies ? ' (동점으로 첫 번째 선택)' : '';
                        return `${roundInfo} 분석: 10의 자리 ${analysis.mostFrequentTensDigit} 대역 ${excludeNums.length}개 번호 제외 (${excludeNums.join(', ')})${tieInfo}`;
                      }
                      return '로또 데이터를 불러와주세요';
                    })()}
                  </div>
                )}
              </div>

              <div className="generator-controls">
                <button onClick={generateLottoNumbers} className="generate-btn">
                  🎲 1게임 생성
                </button>
                <button onClick={generate5Games} className="generate-btn">
                  🎯 5게임 생성
                </button>
              </div>
              
              <div className="generated-numbers">
                {Array.isArray(generatedNumbers[0]) ? (
                  // 5게임
                  generatedNumbers.map((game, index) => (
                    <div key={index} className="number-row">
                      <span className="game-label">게임 {index + 1}</span>
                      <div className="number-balls">
                        {game.map(num => (
                          <span key={num} className="number-ball">{num}</span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : generatedNumbers.length > 0 ? (
                  // 1게임
                  <div className="number-row">
                    <span className="game-label">추천번호</span>
                    <div className="number-balls">
                      {generatedNumbers.map(num => (
                        <span key={num} className="number-ball">{num}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="no-numbers">번호 생성 버튼을 눌러주세요</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'checker' && (
            <div className="checker-section">
              <div className="checker-info">
                {lottoData && lottoData.data ? (
                  <div className="data-status-section">
                    <div className="data-range-info">
                      <p>📊 저장된 데이터: 1회차 ~ {Math.max(...lottoData.data.map(item => item.round))}회차</p>
                      <small>최신 업데이트: {new Date(lottoData.lastUpdated).toLocaleDateString('ko-KR', {year: 'numeric', month: 'numeric', day: 'numeric'}).replace(/\./g, '.').replace(/\s/g, ' ')}</small>
                      <br/>
                      <small style={{color: 'rgba(255, 255, 255, 0.7)', marginTop: '5px', display: 'inline-block'}}>
                        자동 업데이트 일시: 일요일 오전 7시
                      </small>
                    </div>

                  </div>
                ) : (
                  <div className="no-data-section">
                    <div className="data-status">
                      📥 저장된 로또 데이터가 없습니다
                    </div>
                    <button 
                      onClick={downloadCompleteData}
                      disabled={isLoading}
                      className="download-btn danger-btn"
                      style={{backgroundColor: '#ff4757', color: 'white'}}
                    >
                      {isLoading ? `다운로드 중... ${downloadProgress}%` : '📥 전체 데이터 다운로드'}
                    </button>
                  </div>
                )}
              </div>
              
              <div className="checker-controls">
                <div className="round-input">
                  {lottoData && lottoData.data ? (
                    // 데이터가 있으면 select box 표시 (더 많은 옵션 제공)
                    <select
                      value={checkRound}
                      onChange={async (e) => {
                        const selectedRound = e.target.value;
                        console.log('🎯 select에서 선택된 회차:', selectedRound);
                        setCheckRound(selectedRound);
                        
                        // 선택 시 자동 조회 (빈 값이 아닌 경우에만)
                        if (selectedRound && selectedRound !== 'all') {
                          console.log('🚀 자동 조회 시작:', selectedRound);
                          // 상태 업데이트를 기다린 후 조회
                          setTimeout(async () => {
                            try {
                              const result = await searchLottoByRound(parseInt(selectedRound));
                              if (result) {
                                setWinningNumbers(result);
                                setShowAllResults(false);
                                console.log(`✅ ${selectedRound}회차 자동 조회 성공:`, result);
                              } else {
                                alert(`${selectedRound}회차 데이터를 찾을 수 없습니다.`);
                                setWinningNumbers(null);
                              }
                            } catch (error) {
                              console.error('❌ 자동 조회 에러:', error);
                              alert('조회 중 오류가 발생했습니다.');
                            }
                          }, 100);
                        } else if (selectedRound === 'all') {
                          // 전체 조회
                          console.log('📋 전체 조회 실행');
                          showAllLottoResults();
                        }
                      }}
                      className="round-select"
                    >
                      <option value="">회차 선택 (자동 조회)</option>
                      <option value="all">📋 전체 회차 조회</option>
                      <optgroup label="저장된 회차">
                        {(() => {
                          // 저장된 데이터를 회차 순으로 정렬 (최신순)
                          // 더 많은 옵션 제공 (100개)
                          const sortedData = [...lottoData.data]
                            .sort((a, b) => b.round - a.round)
                            .slice(0, 100);
                          
                          return sortedData.map(item => (
                            <option key={item.round} value={item.round}>
                              {item.round === Math.max(...lottoData.data.map(d => d.round)) ? '✨ ' : ''}
                              {item.round}회차
                              {item.date ? ` (${item.date})` : ''}
                            </option>
                          ));
                        })()}
                      </optgroup>
                    </select>
                  ) : (
                    // 데이터가 없으면 입력창 표시 (API로 조회하기 위해)
                    <>
                      <input
                        type="number"
                        placeholder="회차 번호 입력 (예: 1100)"
                        value={checkRound}
                        onChange={(e) => setCheckRound(e.target.value)}
                        min="1"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            checkWinningNumbers();
                          }
                        }}
                      />
                      <button 
                        onClick={checkWinningNumbers}
                        disabled={isLoading || !checkRound}
                        className="check-btn"
                      >
                        {isLoading ? '조회중...' : '🔍 조회'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {winningNumbers && !showAllResults && (
                <div className="winning-result">
                  <h3>{winningNumbers.round}회차 ({winningNumbers.date})</h3>
                  <div className="winning-numbers">
                    <div className="main-numbers">
                      {winningNumbers.numbers ?
                        winningNumbers.numbers.map(num => (
                          <span key={num} className="winning-ball">{num}</span>
                        )) :
                        // 새로운 8컬럼 형태 지원
                        [winningNumbers.num1, winningNumbers.num2, winningNumbers.num3,
                         winningNumbers.num4, winningNumbers.num5, winningNumbers.num6].map(num => (
                          <span key={num} className="winning-ball">{num}</span>
                        ))
                      }
                    </div>
                    <div className="bonus-section">
                      <span className="plus">+</span>
                      <span className="bonus-ball">{winningNumbers.bonusNumber || winningNumbers.bonus}</span>
                    </div>
                  </div>
                </div>
              )}

              {showAllResults && allLottoResults.length > 0 && (
                <div className="all-results">
                  <div className="all-results-header">
                    <h3>📋 전체 당첨번호 (최신 {allLottoResults.length}개)</h3>
                    <button 
                      onClick={() => setShowAllResults(false)}
                      className="close-all-btn"
                    >
                      ✕ 닫기
                    </button>
                  </div>
                  <div className="all-results-list">
                    {allLottoResults.map(result => (
                      <div key={result.round} className="result-row">
                        <div className="result-info">
                          <span className="result-round">{result.round}회</span>
                          <span className="result-date">{result.date}</span>
                        </div>
                        <div className="result-numbers">
                          <div className="main-numbers">
                            {result.numbers.map(num => (
                              <span key={num} className="result-ball">{num}</span>
                            ))}
                          </div>
                          <div className="bonus-section">
                            <span className="plus">+</span>
                            <span className="bonus-result-ball">{result.bonusNumber}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="all-results-footer">
                    <p>💡 더 많은 회차를 보려면 위의 입력창에 직접 회차를 입력하세요</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'statistics' && (
            <div className="statistics-section">
              {lottoData && lottoData.data ? (
                (() => {
                  const stats = calculateStatistics();
                  if (!stats) {
                    return <div className="no-data">통계 데이터를 계산할 수 없습니다.</div>;
                  }

                  return (
                    <>
                      {/* 기본 정보 */}
                      <div className="stats-header">
                        <h2>📊 로또 번호 통계</h2>
                        <p>총 {stats.totalRounds}회차 데이터 기반</p>
                        <button
                          onClick={analyzeOverlapCombinations}
                          disabled={isLoading}
                          className="download-btn"
                          style={{backgroundColor: '#ffa726', marginTop: '15px'}}
                        >
                          🔍 겹침 분석
                        </button>
                      </div>

                      {/* 가장 많이 나온 번호 TOP 10 */}
                      <div className="stats-card">
                        <h3>🏆 가장 많이 나온 번호 TOP 10</h3>
                        <div className="stats-number-list">
                          {stats.mostFrequent.map((item, index) => (
                            <div key={item.number} className="stats-number-item">
                              <span className="rank">#{index + 1}</span>
                              <span className="number-ball-stat">{item.number}</span>
                              <span className="count">{item.count}회</span>
                              <div className="progress-bar">
                                <div
                                  className="progress-fill"
                                  style={{ width: `${(item.count / stats.mostFrequent[0].count) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 가장 적게 나온 번호 TOP 10 */}
                      <div className="stats-card">
                        <h3>⚡ 가장 적게 나온 번호 TOP 10</h3>
                        <div className="stats-number-list">
                          {stats.leastFrequent.map((item, index) => (
                            <div key={item.number} className="stats-number-item">
                              <span className="rank">#{index + 1}</span>
                              <span className="number-ball-stat least">{item.number}</span>
                              <span className="count">{item.count}회</span>
                              <div className="progress-bar">
                                <div
                                  className="progress-fill least"
                                  style={{ width: `${(item.count / stats.leastFrequent[0].count) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 홀수/짝수 통계 */}
                      <div className="stats-card">
                        <h3>🔢 홀수/짝수 통계</h3>
                        <div className="stats-grid">
                          <div className="stats-item">
                            <div className="stats-label">홀수</div>
                            <div className="stats-value">{stats.oddCount}회 ({stats.oddRatio}%)</div>
                            <div className="progress-bar">
                              <div className="progress-fill odd" style={{ width: `${stats.oddRatio}%` }}></div>
                            </div>
                          </div>
                          <div className="stats-item">
                            <div className="stats-label">짝수</div>
                            <div className="stats-value">{stats.evenCount}회 ({stats.evenRatio}%)</div>
                            <div className="progress-bar">
                              <div className="progress-fill even" style={{ width: `${stats.evenRatio}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 연속 번호 통계 */}
                      <div className="stats-card">
                        <h3>🔗 연속 번호 출현</h3>
                        <div className="stats-item">
                          <div className="stats-value-large">
                            {stats.consecutiveCount}회
                            <span className="stats-ratio">({stats.consecutiveRatio}%)</span>
                          </div>
                          <div className="stats-description">
                            전체 {stats.totalRounds * 5}개 인접 번호 쌍 중 연속 번호 출현 횟수
                          </div>
                        </div>
                      </div>

                      {/* 구간별 통계 */}
                      <div className="stats-card">
                        <h3>📍 구간별 출현 빈도</h3>
                        <div className="range-stats">
                          {Object.entries(stats.rangeStats).map(([range, count]) => {
                            const maxCount = Math.max(...Object.values(stats.rangeStats));
                            return (
                              <div key={range} className="range-item">
                                <div className="range-label">{range}</div>
                                <div className="range-bar">
                                  <div
                                    className="range-fill"
                                    style={{ width: `${(count / maxCount) * 100}%` }}
                                  ></div>
                                </div>
                                <div className="range-count">{count}회</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 전체 번호 빈도표 */}
                      <div className="stats-card">
                        <h3>📋 전체 번호 빈도 (1~45)</h3>
                        <div className="all-numbers-grid">
                          {stats.frequency.map(item => (
                            <div key={item.number} className="number-frequency-item">
                              <div className="number-badge">{item.number}</div>
                              <div className="frequency-count">{item.count}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()
              ) : (
                <div className="no-data-section">
                  <div className="data-status">
                    ⚠️ 로또 데이터가 없습니다
                  </div>
                  <div className="data-management">
                    <button
                      onClick={() => {
                        setActiveTab('checker');
                        setTimeout(() => {
                          if (downloadLatestLottoDataRef.current) {
                            downloadLatestLottoDataRef.current();
                          }
                        }, 100);
                      }}
                      className="download-btn"
                    >
                      📥 데이터 다운로드하기
                    </button>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '15px' }}>
                    통계를 보려면 먼저 로또 데이터를 다운로드해주세요
                  </p>
                </div>
              )}
            </div>
          )}
        </div>


        <div className="navigation">
          <Link to="/" className="back-btn">
            ← 홈으로 돌아가기
          </Link>
          <Link to="/dashboard" className="dashboard-btn">
            📊 대시보드 보기
          </Link>
        </div>
        
        <div className="lotto-footer">
          <p>made by jwkim1001</p>
        </div>
      </div>
    </div>
  );
};

export default Lotto;