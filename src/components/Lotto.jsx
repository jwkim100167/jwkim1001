import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
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
import { getAllLottoDataFromSupabase, getLottoNumberByRoundFromSupabase, getLatestLottoNumberFromSupabase, saveGeneratedGames, getSavedGames } from '../services/supabaseLotto';
import './Lotto.css';

const Lotto = () => {
  // console.log('Lotto 컴포넌트 렌더링됨'); // 무한 렌더링 디버깅용 제거
  
  const [activeTab, setActiveTab] = useState('generator');
  // 5개 슬롯을 항상 유지 (빈 슬롯은 null)
  const [generatedNumbers, setGeneratedNumbers] = useState([null, null, null, null, null]);
  // 각 게임이 수정되었는지 추적 (true면 저장 버튼 표시)
  const [gameModified, setGameModified] = useState([false, false, false, false, false]);
  const [isLoading, setIsLoading] = useState(false);
  const [lottoData, setLottoData] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [checkRound, setCheckRound] = useState('');
  const [analysisRound, setAnalysisRound] = useState(''); // 분석 탭 회차 선택
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
  const [filterOddEven, setFilterOddEven] = useState(false); // 홀짝 극단 비율(0:6, 6:0) 필터
  const [filterSumRange, setFilterSumRange] = useState(false); // 번호 합계 100~170 범위 필터
  const [filterHighLow, setFilterHighLow] = useState(false); // 고저 극단 비율(0:6, 6:0) 필터
  const [filterACValue, setFilterACValue] = useState(false); // AC값 7 미만 제외 필터
  const [showHelp, setShowHelp] = useState(null); // 도움말 표시 상태 ('generate', 'exclude', 'include', 'pattern' 등)
  const [showExcludeOptions, setShowExcludeOptions] = useState(false); // 제외할 번호 옵션 표시 상태
  const [showIncludeOptions, setShowIncludeOptions] = useState(false); // 필수 포함 번호 옵션 표시 상태
  const [showPatternOptions, setShowPatternOptions] = useState(false); // 제외 패턴 옵션 표시 상태
  const [loginRequiredMsg, setLoginRequiredMsg] = useState(false);

  // Auth hooks
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  // 생성 컨트롤 높이 측정 (spacer용)
  const controlsRef = useRef(null);
  const [controlsHeight, setControlsHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      if (controlsRef.current) {
        setControlsHeight(controlsRef.current.offsetHeight);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [generatedNumbers]);

  // 디버깅: Supabase auth UUID 확인
  useEffect(() => {
    if (user) {
      console.log('🔑 현재 로그인한 사용자 전체 정보:', user);
      // Supabase 세션에서 auth.uid() 값 확인
      import('../supabaseClient').then(({ supabase }) => {
        supabase.auth.getUser().then(({ data, error }) => {
          if (data?.user) {
            console.log('🔐 Supabase Auth UUID (auth.uid()):', data.user.id);
            console.log('📋 이 UUID를 복사해서 userTable의 uuid 컬럼에 넣으세요!');
          }
        });
      });
    }
  }, [user]);

  // 저장된 게임 불러오기 함수
  const loadSavedGamesFromDB = async () => {
    if (!user?.id) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (!lottoData?.data || lottoData.data.length === 0) {
      alert("로또 데이터가 로드되지 않았습니다.");
      return;
    }

    try {
      // 현재 회차 계산 (최신 회차 + 1)
      console.log('🔍 불러오기 - lottoData 총 회차:', lottoData.data.length);
      // 배열 순서와 무관하게 가장 큰 round 값 찾기
      const latestRound = Math.max(...lottoData.data.map(item => item.round));
      console.log('🔍 DB 최신 회차:', latestRound, '타입:', typeof latestRound);
      const currentRound = latestRound + 1;

      console.log(`📥 저장된 게임 불러오기 시도 - ${currentRound}회차`);

      // 현재 회차의 저장된 게임 가져오기
      const savedGames = await getSavedGames(user.id, currentRound);

      if (savedGames && savedGames.length > 0) {
        console.log(`✅ ${savedGames.length}개의 저장된 게임을 찾았습니다.`);

        // 5개 슬롯 배열 초기화
        const loadedGames = [null, null, null, null, null];

        // 저장된 게임을 g_number에 맞춰 배치
        savedGames.forEach(game => {
          const slotIndex = game.g_number - 1; // g_number는 1부터 시작
          if (slotIndex >= 0 && slotIndex < 5) {
            loadedGames[slotIndex] = [
              game.count1,
              game.count2,
              game.count3,
              game.count4,
              game.count5,
              game.count6
            ];
          }
        });

        setGeneratedNumbers(loadedGames);
        // 불러온 게임은 수정되지 않은 상태로 표시 (저장 버튼 숨김)
        setGameModified([false, false, false, false, false]);
        alert(`${savedGames.length}개의 저장된 게임을 불러왔습니다.`);
        console.log('✅ 저장된 게임을 불러왔습니다:', loadedGames);
      } else {
        alert('저장된 게임이 없습니다.');
        console.log('ℹ️ 저장된 게임이 없습니다.');
      }
    } catch (error) {
      console.error('❌ 저장된 게임 불러오기 실패:', error);
      alert('게임 불러오기에 실패했습니다.');
    }
  };

  // 로또 페이지 진입 시 저장된 게임 자동 불러오기
  useEffect(() => {
    const loadSavedGamesOnMount = async () => {
      if (!user?.id || !lottoData?.data || lottoData.data.length === 0) {
        return;
      }

      try {
        // 현재 회차 계산 (최신 회차 + 1)
        const latestRound = Math.max(...lottoData.data.map(item => item.round));
        const currentRound = latestRound + 1;

        console.log(`🔍 DB 최신 회차: ${latestRound}회, 현재 회차: ${currentRound}회`);
        console.log(`📥 저장된 게임 자동 불러오기 시도 - ${currentRound}회차`);

        // 현재 회차의 저장된 게임 가져오기
        const savedGames = await getSavedGames(user.id, currentRound);

        // 5개 슬롯 배열 초기화
        const loadedGames = [null, null, null, null, null];

        if (savedGames && savedGames.length > 0) {
          console.log(`✅ ${savedGames.length}개의 저장된 게임을 찾았습니다.`);

          // 저장된 게임을 g_number에 맞춰 배치
          savedGames.forEach(game => {
            const slotIndex = game.g_number - 1; // g_number는 1부터 시작
            if (slotIndex >= 0 && slotIndex < 5) {
              loadedGames[slotIndex] = [
                game.count1,
                game.count2,
                game.count3,
                game.count4,
                game.count5,
                game.count6
              ];
            }
          });

          console.log('✅ 저장된 게임을 자동으로 불러왔습니다:', loadedGames);
        } else {
          console.log('ℹ️ 저장된 게임이 없습니다. 빈 슬롯으로 초기화합니다.');
        }

        // 저장된 게임이 있든 없든 슬롯 상태 업데이트
        setGeneratedNumbers(loadedGames);
        // 불러온 게임은 수정되지 않은 상태로 표시 (저장 버튼 숨김)
        setGameModified([false, false, false, false, false]);
      } catch (error) {
        console.error('❌ 저장된 게임 불러오기 실패:', error);
      }
    };

    loadSavedGamesOnMount();
  }, [user, lottoData]);

  // Logout handler
  const handleLogout = () => {
    logout();
  };

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

  // Supabase에서 데이터 로드
  useEffect(() => {
    const loadFromSupabase = async () => {
      console.log('🔄 Supabase에서 로또 데이터 로드 시작...');
      setIsLoading(true);

      try {
        const supabaseData = await getAllLottoDataFromSupabase();
        if (supabaseData && supabaseData.data && supabaseData.data.length > 0) {
          console.log(`✅ Supabase에서 ${supabaseData.data.length}개 회차 로드 완료`);
          console.log('🔍 첫 번째 데이터:', supabaseData.data[0]);
          console.log('🔍 마지막 데이터:', supabaseData.data[supabaseData.data.length - 1]);
          setLottoData(supabaseData);
        } else {
          console.error('❌ Supabase에서 데이터를 가져올 수 없습니다.');
        }
      } catch (error) {
        console.error('❌ Supabase 로드 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFromSupabase();
  }, []);

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

          // 필수 포함 번호와 충돌하면 제거
          if (mustIncludeNumbers.includes(input)) {
            setMustIncludeNumbers(mustIncludeNumbers.filter(num => num !== input));
            alert(`번호 ${input}이(가) 필수 포함 번호에서 제거되었습니다. (제외 번호와 충돌)`);
          }

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
        // 필수 포함 번호와 충돌하는 번호 찾기
        const conflictingWithInclude = numbersToAdd.filter(num => mustIncludeNumbers.includes(num));
        if (conflictingWithInclude.length > 0) {
          setMustIncludeNumbers(mustIncludeNumbers.filter(num => !conflictingWithInclude.includes(num)));
          alert(`필수 포함 번호에서 제거됨: ${conflictingWithInclude.join(', ')} (제외 번호와 충돌)`);
        }

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
        // 제외 번호와 충돌 검사
        if (excludeNumbers.includes(input)) {
          alert(`번호 ${input}은(는) 제외 번호에 포함되어 있어 추가할 수 없습니다.`);
          return;
        }
        setMustIncludeNumbers([...mustIncludeNumbers, input].sort((a, b) => a - b));
        setNumberGameCounts(prev => ({...prev, [input]: 5})); // 기본값 5게임
      }
    } else if (typeof input === 'string') {
      // 범위 문자열
      const newNumbers = parseRangeString(input);

      // 제외 번호와 충돌하는 번호 찾기
      const conflictNumbers = newNumbers.filter(num => excludeNumbers.includes(num));
      const validNumbers = newNumbers.filter(num => !excludeNumbers.includes(num));

      if (conflictNumbers.length > 0) {
        alert(`제외 번호와 충돌: ${conflictNumbers.join(', ')}은(는) 추가할 수 없습니다.`);
      }

      if (validNumbers.length > 0) {
        const uniqueNumbers = [...new Set([...mustIncludeNumbers, ...validNumbers])].sort((a, b) => a - b);
        setMustIncludeNumbers(uniqueNumbers);

        // 새로 추가된 번호들에 대해 기본 게임 수 설정
        const newCounts = {...numberGameCounts};
        validNumbers.forEach(num => {
          if (!newCounts[num]) {
            newCounts[num] = 5;
          }
        });
        setNumberGameCounts(newCounts);
      }
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

  // 홀짝 극단 비율 체크 (0:6 또는 6:0이면 true)
  const hasExtremeOddEven = (numbers) => {
    const oddCount = numbers.filter(n => n % 2 !== 0).length;
    return oddCount === 0 || oddCount === 6;
  };

  // 번호 합계 범위 체크 (100~170 범위 밖이면 true)
  const isOutOfSumRange = (numbers) => {
    const sum = numbers.reduce((a, b) => a + b, 0);
    return sum < 100 || sum > 170;
  };

  // 고저 극단 비율 체크 (1~22: 저, 23~45: 고, 0:6 또는 6:0이면 true)
  const hasExtremeHighLow = (numbers) => {
    const lowCount = numbers.filter(n => n <= 22).length;
    return lowCount === 0 || lowCount === 6;
  };

  // AC값 계산 (번호 간 차이 값의 종류 수)
  const calcACValue = (numbers) => {
    const diffs = new Set();
    for (let i = 0; i < numbers.length; i++) {
      for (let j = i + 1; j < numbers.length; j++) {
        diffs.add(Math.abs(numbers[i] - numbers[j]));
      }
    }
    return diffs.size;
  };

  // AC값 7 미만이면 단순 패턴으로 판단
  const hasLowACValue = (numbers) => calcACValue(numbers) < 7;

  // 특정 게임 슬롯에 번호 생성 (targetSlot: 0-4, null이면 첫 번째 빈 슬롯)
  const generateSingleGame = (targetSlot = null) => {
    if (!isAuthenticated) {
      setLoginRequiredMsg(true);
      setTimeout(() => setLoginRequiredMsg(false), 2500);
      return;
    }
    // 필수 포함 번호 검증
    if (mustIncludeNumbers.length > 6) {
      alert('필수 포함 번호가 6개를 초과할 수 없습니다.');
      return;
    }

    // 대상 슬롯 결정
    let slotIndex = targetSlot;
    if (slotIndex === null) {
      // 첫 번째 빈 슬롯 찾기
      slotIndex = generatedNumbers.findIndex(game => game === null);
      if (slotIndex === -1) {
        alert('모든 게임 슬롯이 차있습니다.');
        return;
      }
    } else {
      // 지정된 슬롯이 비어있지 않고 번호가 부족한지 확인
      const currentGame = generatedNumbers[slotIndex];
      if (currentGame && currentGame.length >= 6) {
        alert('이미 6개 번호가 모두 생성되었습니다.');
        return;
      }
    }

    // 현재 슬롯의 기존 번호 가져오기
    const currentGame = generatedNumbers[slotIndex];
    const existingNumbers = currentGame || [];
    const neededCount = 6 - existingNumbers.length;

    if (neededCount <= 0) {
      alert('이미 6개 번호가 모두 생성되었습니다.');
      return;
    }

    // 1의 자리 수 기반 제외 번호 생성
    const lastDigitRangeExcludeNumbers = excludeLastDigitRanges ? getExcludeRangesByLastDigit() : [];
    const tensDigitRangeExcludeNumbers = excludeTensDigitRanges ? getExcludeRangesByTensDigit() : [];

    // 사용 가능한 번호 풀 생성 (필수 포함 번호 + 기존 번호 제외)
    const availableNumbers = [];
    for (let i = 1; i <= 45; i++) {
      if (!existingNumbers.includes(i) && !mustIncludeNumbers.includes(i)) {
        availableNumbers.push(i);
      }
    }

    // 제외 옵션 적용
    let filteredNumbers = availableNumbers.filter(num =>
      !excludeNumbers.includes(num) &&
      !lastDigitRangeExcludeNumbers.includes(num) &&
      !tensDigitRangeExcludeNumbers.includes(num)
    );

    // 제외 후 번호가 부족하면 제외 옵션 무시
    const finalAvailableNumbers = (filteredNumbers.length + mustIncludeNumbers.length < neededCount)
      ? availableNumbers
      : filteredNumbers;

    // 새 번호 생성
    const newNumbers = [...existingNumbers, ...mustIncludeNumbers];
    const tempAvailable = [...finalAvailableNumbers];

    while (newNumbers.length < 6 && tempAvailable.length > 0) {
      const randomIndex = Math.floor(Math.random() * tempAvailable.length);
      const num = tempAvailable[randomIndex];
      newNumbers.push(num);
      tempAvailable.splice(randomIndex, 1);
    }

    // 슬롯에 저장
    const newSlots = [...generatedNumbers];
    newSlots[slotIndex] = newNumbers.sort((a, b) => a - b);
    setGeneratedNumbers(newSlots);

    // 수정됨으로 표시
    const newModified = [...gameModified];
    newModified[slotIndex] = true;
    setGameModified(newModified);
  };

  // 전체게임 생성 (5게임 모두 생성)
  const generate5Games = async () => {
    if (!isAuthenticated) {
      setLoginRequiredMsg(true);
      setTimeout(() => setLoginRequiredMsg(false), 2500);
      return;
    }
    // 저장된 게임 확인
    if (user?.id && lottoData?.data && lottoData.data.length > 0) {
      try {
        const latestRound = Math.max(...lottoData.data.map(item => item.round));
        const currentRound = latestRound + 1;
        const savedGames = await getSavedGames(user.id, currentRound);

        if (savedGames && savedGames.length > 0) {
          const savedGameNumbers = savedGames.map(g => g.g_number).join(', ');
          const confirmed = window.confirm(
            `게임 ${savedGameNumbers}번은 이미 저장되어있습니다.\n계속 하시겠습니까?\n\n(새로 생성된 게임으로 덮어씌워집니다)`
          );
          if (!confirmed) {
            return;
          }
        }
      } catch (error) {
        console.error('저장된 게임 확인 실패:', error);
      }
    }

    // 1의 자리 수 기반 제외 번호 생성
    const lastDigitRangeExcludeNumbers = excludeLastDigitRanges ? getExcludeRangesByLastDigit() : [];
    const tensDigitRangeExcludeNumbers = excludeTensDigitRanges ? getExcludeRangesByTensDigit() : [];

    // 필수 포함 번호 검증 (제외 번호와 겹칠 수 없도록 이미 방지됨)
    if (mustIncludeNumbers.length > 6) {
      alert('필수 포함 번호가 6개를 초과할 수 없습니다.');
      return;
    }

    // 사용 가능한 번호 풀 생성 (필수 포함 번호 제외한 전체)
    const availableNumbers = [];
    for (let i = 1; i <= 45; i++) {
      if (!mustIncludeNumbers.includes(i)) {
        availableNumbers.push(i);
      }
    }

    // 제외 옵션 적용 (가능한 경우에만)
    let filteredNumbers = availableNumbers.filter(num =>
      !excludeNumbers.includes(num) &&
      !lastDigitRangeExcludeNumbers.includes(num) &&
      !tensDigitRangeExcludeNumbers.includes(num)
    );

    // 제외 후 번호가 부족하면 제외 옵션 무시하고 전체 사용
    const finalAvailableNumbers = (filteredNumbers.length + mustIncludeNumbers.length < 6)
      ? availableNumbers
      : filteredNumbers;
    
    const games = [];

    // 모든 필수 포함 번호를 모든 게임에 포함
    const gameAssignments = [
      [...mustIncludeNumbers],
      [...mustIncludeNumbers],
      [...mustIncludeNumbers],
      [...mustIncludeNumbers],
      [...mustIncludeNumbers]
    ];

    // 겹침 방지 옵션이 모두 꺼져있으면 바로 생성
    if (!preventExactDuplicates && !preventPartialDuplicates && !filterOddEven && !filterSumRange && !filterHighLow && !filterACValue) {
      for (let i = 0; i < 5; i++) {
        const gameAvailable = [...finalAvailableNumbers]; // 복사본 생성
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
      // 모든 슬롯을 수정됨으로 표시 (저장 버튼 보이기)
      setGameModified([true, true, true, true, true]);
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
        const gameAvailable = [...finalAvailableNumbers];

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

        // 통계 기반 필터 검사
        const isOddEvenExtreme = filterOddEven && hasExtremeOddEven(numbers);
        const isOutOfSum = filterSumRange && isOutOfSumRange(numbers);
        const isHighLowExtreme = filterHighLow && hasExtremeHighLow(numbers);
        const isLowAC = filterACValue && hasLowACValue(numbers);

        if (!isDuplicate && !hasConsecutive && !isOddEvenExtreme && !isOutOfSum && !isHighLowExtreme && !isLowAC) {
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

    // 5개 슬롯에 맞춰서 저장 (부족하면 null로 채움)
    while (games.length < 5) {
      games.push(null);
    }
    setGeneratedNumbers(games);
    // 모든 슬롯을 수정됨으로 표시 (저장 버튼 보이기)
    setGameModified([true, true, true, true, true]);
  };

  // 개별 게임 저장 핸들러
  const handleSaveGame = async (game, gameIndex) => {
    if (!isAuthenticated) {
      alert("로그인이 필요한 기능입니다.");
      navigate("/login");
      return;
    }

    console.log('👤 현재 사용자 정보:', user);
    console.log('👤 user.id:', user?.id);

    if (!user?.id) {
      alert("사용자 정보를 찾을 수 없습니다. user.id가 없습니다.");
      return;
    }

    // 저장된 게임 확인
    if (lottoData?.data && lottoData.data.length > 0) {
      try {
        const latestRound = Math.max(...lottoData.data.map(item => item.round));
        const currentRound = latestRound + 1;
        const savedGames = await getSavedGames(user.id, currentRound);

        // 해당 게임 번호가 이미 저장되어 있는지 확인
        const isGameSaved = savedGames.some(g => g.g_number === gameIndex + 1);
        if (isGameSaved) {
          const confirmed = window.confirm(
            `게임 ${gameIndex + 1}번은 이미 저장되어있습니다.\n계속 하시겠습니까?\n\n(기존 게임을 덮어씌웁니다)`
          );
          if (!confirmed) {
            return;
          }
        }
      } catch (error) {
        console.error('저장된 게임 확인 실패:', error);
      }
    }

    try {
      const latestRound = Math.max(...lottoData.data.map(item => item.round));
      const currentRound = latestRound + 1;
      console.log('💾 저장 시도:', { userId: user.id, currentRound, game });
      const result = await saveGeneratedGames(user.id, currentRound, [game]);
      if (result.success) {
        alert("게임이 저장되었습니다!");
      } else {
        alert(`저장 실패: ${result.error}`);
      }
    } catch (error) {
      console.error("게임 저장 중 오류:", error);
      alert("게임 저장 중 오류가 발생했습니다.");
    }
  };

  // 전체 게임 저장 핸들러
  const handleSaveAllGames = async () => {
    if (!isAuthenticated) {
      alert("로그인이 필요한 기능입니다.");
      navigate("/login");
      return;
    }

    if (!user?.id) {
      alert("사용자 정보를 찾을 수 없습니다.");
      return;
    }

    // null이 아닌 게임만 필터링
    const validGames = generatedNumbers.filter(game => game !== null);

    if (validGames.length === 0) {
      alert("저장할 게임이 없습니다.");
      return;
    }

    // 저장된 게임 확인
    if (lottoData?.data && lottoData.data.length > 0) {
      try {
        const latestRound = Math.max(...lottoData.data.map(item => item.round));
        const currentRound = latestRound + 1;
        const savedGames = await getSavedGames(user.id, currentRound);

        if (savedGames && savedGames.length > 0) {
          const savedGameNumbers = savedGames.map(g => g.g_number).join(', ');
          const confirmed = window.confirm(
            `게임 ${savedGameNumbers}번은 이미 저장되어있습니다.\n계속 하시겠습니까?\n\n(기존 게임을 덮어씌웁니다)`
          );
          if (!confirmed) {
            return;
          }
        }
      } catch (error) {
        console.error('저장된 게임 확인 실패:', error);
      }
    }

    try {
      console.log('🔍 전체 게임 저장 - lottoData 총 회차:', lottoData.data.length);
      // 배열 순서와 무관하게 가장 큰 round 값 찾기
      const latestRound = Math.max(...lottoData.data.map(item => item.round));
      console.log('🔍 전체 게임 저장 - DB 최신 회차:', latestRound, '타입:', typeof latestRound);
      const currentRound = latestRound + 1;
      console.log('🔍 전체 게임 저장 - 저장할 회차:', currentRound);
      const result = await saveGeneratedGames(user.id, currentRound, generatedNumbers);
      if (result.success) {
        alert(`${result.savedCount}개 게임이 저장되었습니다!`);
      } else {
        alert(`저장 실패: ${result.error}`);
      }
    } catch (error) {
      console.error("전체 게임 저장 중 오류:", error);
      alert("전체 게임 저장 중 오류가 발생했습니다.");
    }
  };

  // 게임 삭제 핸들러
  const handleDeleteGame = (index) => {
    const newNumbers = [...generatedNumbers];
    newNumbers[index] = null;
    setGeneratedNumbers(newNumbers);
    // 삭제하면 수정됨으로 표시
    const newModified = [...gameModified];
    newModified[index] = true;
    setGameModified(newModified);
  };

  // 게임 내 번호 개별 삭제 핸들러
  const handleRemoveNumber = (gameIndex, numberIndex) => {
    const newNumbers = [...generatedNumbers];
    const currentGame = [...newNumbers[gameIndex]];
    currentGame.splice(numberIndex, 1);
    newNumbers[gameIndex] = currentGame.length > 0 ? currentGame : null;
    setGeneratedNumbers(newNumbers);
    // 번호를 수정하면 수정됨으로 표시
    const newModified = [...gameModified];
    newModified[gameIndex] = true;
    setGameModified(newModified);
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
    
    console.log('\n🔍 분석:');
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
        <div className="auth-buttons">
          {isAuthenticated ? (
            <>
              <span className="user-greeting">👋 {user.userName || user.loginId}님</span>
              <button className="auth-icon-btn mypage-btn" onClick={() => navigate('/mypage')} title="마이페이지">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"/>
                </svg>
              </button>
              <button className="auth-icon-btn logout-btn" onClick={handleLogout} title="로그아웃">
                ⏻
              </button>
            </>
          ) : (
            <button className="auth-btn login-btn" onClick={() => navigate('/login')}>
              로그인
            </button>
          )}
        </div>

        <div className="lotto-header">
          <h1>🎰 로또 서비스</h1>
        </div>
        
        <div className="lotto-tabs">
          <button
            className={`tab-btn ${activeTab === 'generator' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('generator');
              setGeneratedNumbers([]); // 생성된 번호 초기화
            }}
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
            className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            📊 분석
          </button>
        </div>

        {loginRequiredMsg && (
          <div className="mb-nolife-toast">🔒 로그인이 필요합니다!</div>
        )}

        {/* 게임 생성 컨트롤 - generator 탭일 때만 표시 */}
        {activeTab === 'generator' && (
          <>
          <div ref={controlsRef} className="generator-controls-top">
            {/* 상태 표시줄: 슬롯 현황 + 불러오기/저장 */}
            <div className="gen-status-row">
              <div className="gen-slot-indicators">
                {generatedNumbers.map((game, i) => (
                  <span key={i} className={`gen-slot-dot ${game ? 'filled' : ''}`} />
                ))}
                <span className="gen-slot-count">
                  {generatedNumbers.filter(g => g !== null).length}/5 생성됨
                </span>
              </div>
              <div className="gen-mgmt-btns">
                <button className="gen-load-btn" onClick={loadSavedGamesFromDB}>📥 불러오기</button>
                <button className="gen-save-btn" onClick={handleSaveAllGames}>💾 저장</button>
              </div>
            </div>

            {/* 전체 생성 버튼 */}
            <button onClick={generate5Games} className="generate-btn-full">
              🎲 전체 생성
            </button>

            {/* 개별 슬롯 버튼 */}
            <div className="individual-game-buttons">
              {generatedNumbers.map((game, i) => (
                <button
                  key={i}
                  onClick={() => generateSingleGame(i)}
                  className={`generate-btn-small ${game ? 'filled' : ''}`}
                >
                  {game ? `↺ ${i + 1}` : `게임 ${i + 1}`}
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: controlsHeight }} />
          </>
        )}
        <div className="lotto-content">
          {activeTab === 'generator' && (
            <div className="generator-section">
              {/* 생성된 번호 표시 - 항상 5개 슬롯 표시 */}
              <div className="generated-numbers">
                {generatedNumbers.map((game, gameIndex) => (
                  <div key={gameIndex} className="number-row">
                    <span className="game-label">게임 {gameIndex + 1}</span>
                    {game ? (
                      <>
                        <div className="number-balls">
                          {game.map((num, numIndex) => (
                            <span key={numIndex} className="number-ball-wrapper">
                              <span className="number-ball">{num}</span>
                              <button
                                className="remove-number-btn"
                                onClick={() => handleRemoveNumber(gameIndex, numIndex)}
                                title="번호 제거"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="game-actions">
                          {gameModified[gameIndex] && (
                            <button className="save-game-btn" onClick={() => handleSaveGame(game, gameIndex)} title="저장">💾</button>
                          )}
                          <button className="delete-game-btn" onClick={() => handleDeleteGame(gameIndex)} title="삭제">❌</button>
                        </div>
                      </>
                    ) : (
                      <div className="empty-slot">빈 슬롯</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="exclude-section">
                <div className="section-title-with-help">
                  <h3
                    className="option-title"
                    onClick={() => setShowExcludeOptions(!showExcludeOptions)}
                    style={{ cursor: 'pointer' }}
                  >
                    {showExcludeOptions ? '▼' : '▶'} 🚫 제외할 번호
                  </h3>
                  <button
                    className="help-btn-small"
                    onClick={() => setShowHelp(showHelp === 'exclude' ? null : 'exclude')}
                  >
                    ❓
                  </button>
                </div>
                {showHelp === 'exclude' && (
                  <div className="help-tooltip" onClick={() => setShowHelp(null)}>
                    <p><strong>선택</strong> - 생성에서 제외할 번호를 선택합니다</p>
                    <p>• 빠른 버튼: 자주 사용하는 패턴 즉시 제외</p>
                    <p>• 직접 입력: 원하는 번호나 범위 지정 가능</p>
                    <p>• 예시: 1,2,3 또는 10-20</p>
                  </div>
                )}

                {showExcludeOptions && (
                  <>

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
                      🎰 지난주당첨번호
                    </button>
                    <button onClick={() => addExcludeNumber(getThisWeekDateNumbers().join(','), 'this-week-date')} className="quick-exclude-btn this-week-date">
                      📅 이번주추첨날짜
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

                <div className="input-divider"></div>

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
                  </>
                )}
              </div>

              <div className="overlap-prevention-section">
                <div className="section-title-with-help">
                  <h3
                    className="option-title"
                    onClick={() => setShowPatternOptions(!showPatternOptions)}
                    style={{ cursor: 'pointer' }}
                  >
                    {showPatternOptions ? '▼' : '▶'} 🎯 제외할 패턴
                  </h3>
                  <button
                    className="help-btn-small"
                    onClick={() => setShowHelp(showHelp === 'pattern' ? null : 'pattern')}
                  >
                    ❓
                  </button>
                </div>
                {showHelp === 'pattern' && (
                  <div className="help-tooltip" onClick={() => setShowHelp(null)}>
                    <p><strong>선택</strong> - 고급 제외 패턴을 설정합니다</p>
                    <p>• 완전 겹침: 이전 회차와 6개 모두 같은 조합 방지</p>
                    <p>• 부분 겹침: 5개 이상 같은 조합 방지</p>
                    <p>• 연속 번호: 4개 이상 연속된 번호 방지</p>
                    <p>• 홀짝 비율: 극단적 홀짝 비율(0:6, 6:0) 방지</p>
                    <p>• 합계 구간: 번호 합계 100~170 범위 밖 조합 방지</p>
                    <p>• 고저 비율: 극단적 고저 비율(0:6, 6:0) 방지</p>
                    <p>• AC값: 번호 패턴이 너무 단순한 조합 방지</p>
                  </div>
                )}

                {showPatternOptions && (
                  <>
                <div className="overlap-options">
                  <div className="overlap-select-all">
                    <button
                      className="overlap-select-all-btn"
                      onClick={() => {
                        const allChecked = preventExactDuplicates && preventPartialDuplicates && excludeLastDigitRanges && excludeTensDigitRanges && preventConsecutiveFour && filterOddEven && filterSumRange && filterHighLow && filterACValue;
                        const next = !allChecked;
                        setPreventExactDuplicates(next);
                        setPreventPartialDuplicates(next);
                        setExcludeLastDigitRanges(next);
                        setExcludeTensDigitRanges(next);
                        setPreventConsecutiveFour(next);
                        setFilterOddEven(next);
                        setFilterSumRange(next);
                        setFilterHighLow(next);
                        setFilterACValue(next);
                      }}
                    >
                      {preventExactDuplicates && preventPartialDuplicates && excludeLastDigitRanges && excludeTensDigitRanges && preventConsecutiveFour && filterOddEven && filterSumRange && filterHighLow && filterACValue ? '전체 해제' : '전체 체크'}
                    </button>
                  </div>
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
                      🔢 지난주 최다 1의 자리 수 제외
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
                      🔟 지난주 최다 10의 자리 수 대역 전체 제외
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
                  <label className="overlap-option">
                    <input
                      type="checkbox"
                      checked={filterOddEven}
                      onChange={(e) => setFilterOddEven(e.target.checked)}
                    />
                    <span className="overlap-label">
                      ⚖️ 홀짝 극단 비율 제외
                      <small>홀수 또는 짝수만으로 이루어진 조합 방지 (0:6, 6:0)</small>
                    </span>
                  </label>
                  <label className="overlap-option">
                    <input
                      type="checkbox"
                      checked={filterSumRange}
                      onChange={(e) => setFilterSumRange(e.target.checked)}
                    />
                    <span className="overlap-label">
                      ➕ 번호 합계 구간 설정 (100~170)
                      <small>6개 번호 합계가 100~170 범위를 벗어나는 조합 방지</small>
                    </span>
                  </label>
                  <label className="overlap-option">
                    <input
                      type="checkbox"
                      checked={filterHighLow}
                      onChange={(e) => setFilterHighLow(e.target.checked)}
                    />
                    <span className="overlap-label">
                      📈 고저 극단 비율 제외
                      <small>1~22(저) 또는 23~45(고)에서만 추출된 조합 방지 (0:6, 6:0)</small>
                    </span>
                  </label>
                  <label className="overlap-option">
                    <input
                      type="checkbox"
                      checked={filterACValue}
                      onChange={(e) => setFilterACValue(e.target.checked)}
                    />
                    <span className="overlap-label">
                      🔬 AC값 필터 (끝수 복잡도)
                      <small>번호 간 차이 값의 종류가 7 미만인 단순 패턴 조합 방지</small>
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
                        return `${roundInfo} 분석: 1의 자리 ${analysis.mostFrequentDigit} 대역 ${excludeNums.length}개 번호 제외 (${excludeNums.join(', ')})${tieInfo}`;
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
                  </>
                )}
              </div>

              <div className="include-section">
                <div className="section-title-with-help">
                  <h3
                    className="option-title"
                    onClick={() => setShowIncludeOptions(!showIncludeOptions)}
                    style={{ cursor: 'pointer' }}
                  >
                    {showIncludeOptions ? '▼' : '▶'} ✅ 포함할 번호
                  </h3>
                  <button
                    className="help-btn-small"
                    onClick={() => setShowHelp(showHelp === 'include' ? null : 'include')}
                  >
                    ❓
                  </button>
                </div>
                {showHelp === 'include' && (
                  <div className="help-tooltip" onClick={() => setShowHelp(null)}>
                    <p><strong>선택</strong> - 반드시 포함할 번호를 선택합니다</p>
                    <p>• 생성되는 모든 게임에 이 번호들이 포함됩니다</p>
                    <p>• 최대 6개까지 선택 가능</p>
                    <p>• 예시: 7,11,23 또는 1-5</p>
                  </div>
                )}

                {showIncludeOptions && (
                  <>
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
                  </>
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

          {activeTab === 'analysis' && (
            isAuthenticated ? (
              <div className="analysis-section">
              <div className="analysis-container">
                <h2>당첨번호 분석</h2>

                {/* 회차 선택 */}
                <div className="round-selector">
                  <label htmlFor="analysis-round-select">분석할 회차 선택:</label>
                  {(() => {
                    console.log('🔍 분석 탭 디버그:', {
                      lottoData존재: !!lottoData,
                      data존재: !!lottoData?.data,
                      데이터길이: lottoData?.data?.length,
                      analysisRound: analysisRound
                    });
                    return null;
                  })()}
                  {lottoData && lottoData.data && lottoData.data.length > 0 ? (
                    <select
                      id="analysis-round-select"
                      value={analysisRound}
                      onChange={(e) => setAnalysisRound(e.target.value)}
                      className="round-select"
                    >
                      <option value="">최신 회차</option>
                      {[...lottoData.data]
                        .sort((a, b) => b.round - a.round)
                        .map(item => (
                          <option key={item.round} value={item.round}>
                            {item.round === Math.max(...lottoData.data.map(d => d.round)) ? '✨ ' : ''}
                            {item.round}회차
                            {item.date ? ` (${item.date})` : ''}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <p>데이터 로딩 중...</p>
                  )}
                </div>

                {lottoData && lottoData.data && lottoData.data.length > 0 ? (
                  (() => {
                    const sortedData = [...lottoData.data].sort((a, b) => b.round - a.round);
                    const selectedRoundData = analysisRound
                      ? sortedData.find(r => r.round === parseInt(analysisRound))
                      : sortedData[0];

                    if (!selectedRoundData) {
                      return <div className="no-data">선택한 회차를 찾을 수 없습니다</div>;
                    }

                    const latestRound = selectedRoundData;
                    const selectedIndex = sortedData.findIndex(r => r.round === latestRound.round);
                    const lastWeekRound = sortedData[selectedIndex + 1];
                    const twoWeeksAgoRound = sortedData[selectedIndex + 2];

                    if (!latestRound || !lastWeekRound || !twoWeeksAgoRound) {
                      return <div className="no-data">분석할 데이터가 부족합니다</div>;
                    }

                    // 각 회차의 당첨번호 (보너스 제외)
                    const latestNumbers = [latestRound.num1, latestRound.num2, latestRound.num3,
                                          latestRound.num4, latestRound.num5, latestRound.num6];
                    const lastWeekNumbers = [lastWeekRound.num1, lastWeekRound.num2, lastWeekRound.num3,
                                            lastWeekRound.num4, lastWeekRound.num5, lastWeekRound.num6];
                    const twoWeeksAgoNumbers = [twoWeeksAgoRound.num1, twoWeeksAgoRound.num2, twoWeeksAgoRound.num3,
                                               twoWeeksAgoRound.num4, twoWeeksAgoRound.num5, twoWeeksAgoRound.num6];

                    // 선택 회차와 이전 회차들의 겹침 계산 (당첨번호끼리 비교)
                    const overlapWith1 = latestNumbers.filter(num => lastWeekNumbers.includes(num));
                    const overlapWith2 = latestNumbers.filter(num => twoWeeksAgoNumbers.includes(num));

                    // 선택 회차 기준 이전 15회
                    const recent15Rounds = sortedData.slice(selectedIndex + 1, selectedIndex + 16);

                    const recentFreq = {};
                    recent15Rounds.forEach(round => {
                      [round.num1, round.num2, round.num3, round.num4, round.num5, round.num6, round.bonus]
                        .filter(num => num)
                        .forEach(num => {
                          recentFreq[num] = (recentFreq[num] || 0) + 1;
                        });
                    });
                    const sortedRecentFreq = Object.entries(recentFreq).sort((a, b) => b[1] - a[1]);
                    const maxRecentFreq = sortedRecentFreq[0]?.[1] || 0;
                    const recentTop10 = sortedRecentFreq
                      .filter(([, freq]) => freq === maxRecentFreq)
                      .map(([num]) => parseInt(num))
                      .sort((a, b) => a - b);

                    const recent15Numbers = new Set();
                    recent15Rounds.forEach(round => {
                      [round.num1, round.num2, round.num3, round.num4, round.num5, round.num6, round.bonus]
                        .filter(num => num)
                        .forEach(num => recent15Numbers.add(num));
                    });
                    const notDrawnRecently = [];
                    for (let i = 1; i <= 45; i++) {
                      if (!recent15Numbers.has(i)) notDrawnRecently.push(i);
                    }

                    const top10Numbers = getAllTimeMostDrawnNumbers();
                    const bottom10Numbers = getAllTimeLeastDrawnNumbers();

                    // 선택 회차와의 겹침 계산 (보너스 제외)
                    const latestNumbersSet = new Set(latestNumbers);
                    const excludedSet = new Set(excludeNumbers);

                    const latestInExcluded = [...latestNumbers, latestRound.bonus]
                                              .filter(num => excludedSet.has(num));
                    const lastWeekOverlap = [...lastWeekNumbers, lastWeekRound.bonus]
                                           .filter(num => excludedSet.has(num));
                    const twoWeeksAgoOverlap = [...twoWeeksAgoNumbers, twoWeeksAgoRound.bonus]
                                              .filter(num => excludedSet.has(num));

                    // 통계 데이터와 선택 회차의 겹침 (보너스 제외)
                    const recentTop10Overlap = recentTop10.filter(num => latestNumbersSet.has(num));
                    const notDrawnOverlap = notDrawnRecently.filter(num => latestNumbersSet.has(num));
                    const top10Overlap = top10Numbers.filter(num => latestNumbersSet.has(num));
                    const bottom10Overlap = bottom10Numbers.filter(num => latestNumbersSet.has(num));

                    // 선택 회차 번호 중 통계와 겹치는 번호들
                    const allOverlappingNumbers = new Set([
                      ...overlapWith1,
                      ...overlapWith2,
                      ...recentTop10Overlap,
                      ...notDrawnOverlap,
                      ...top10Overlap,
                      ...bottom10Overlap
                    ]);

                    return (
                      <div className="analysis-content">
                        <div className="this-week-card">
                          <h3>🎯 선택 회차 ({latestRound.round}회 - {latestRound.date})</h3>
                          <div className="winning-numbers-large">
                            {[latestRound.num1, latestRound.num2, latestRound.num3, latestRound.num4, latestRound.num5, latestRound.num6].map((num, idx) => (
                              <span key={idx} className={`number-ball large ${allOverlappingNumbers.has(num) ? 'overlap' : ''}`}>{num}</span>
                            ))}
                            <span className="bonus-label">+</span>
                            <span className="number-ball large bonus">
                              {latestRound.bonus}
                            </span>
                          </div>

                        </div>

                        <div className="comparison-card compact">
                          <h3>📅 선택 -1회차 ({lastWeekRound.round}회 - {lastWeekRound.date})</h3>
                          <div className="winning-numbers">
                            {lastWeekNumbers.map((num, idx) => (
                              <span key={idx} className={`number-ball ${overlapWith1.includes(num) ? 'overlap' : ''}`}>{num}</span>
                            ))}
                            <span className="bonus-label">+</span>
                            <span className="number-ball bonus">
                              {lastWeekRound.bonus}
                            </span>
                          </div>
                          <div className="overlap-result">
                            {overlapWith1.length > 0 ? (
                              <p className="warning">⚠️ 선택 회차와 겹침: {overlapWith1.join(', ')} ({overlapWith1.length}개)</p>
                            ) : (
                              <p className="success">✅ 선택 회차와 겹치지 않음</p>
                            )}
                          </div>
                          {lastWeekOverlap.length > 0 && (
                            <p className="exclude-note" style={{fontSize: '0.9em', color: '#888', marginTop: '5px'}}>
                              (제외 옵션과 겹침: {lastWeekOverlap.join(', ')})
                            </p>
                          )}
                        </div>

                        <div className="comparison-card compact">
                          <h3>📅 선택 -2회차 ({twoWeeksAgoRound.round}회 - {twoWeeksAgoRound.date})</h3>
                          <div className="winning-numbers">
                            {twoWeeksAgoNumbers.map((num, idx) => (
                              <span key={idx} className={`number-ball ${overlapWith2.includes(num) ? 'overlap' : ''}`}>{num}</span>
                            ))}
                            <span className="bonus-label">+</span>
                            <span className="number-ball bonus">
                              {twoWeeksAgoRound.bonus}
                            </span>
                          </div>
                          <div className="overlap-result">
                            {overlapWith2.length > 0 ? (
                              <p className="warning">⚠️ 선택 회차와 겹침: {overlapWith2.join(', ')} ({overlapWith2.length}개)</p>
                            ) : (
                              <p className="success">✅ 선택 회차와 겹치지 않음</p>
                            )}
                          </div>
                          {twoWeeksAgoOverlap.length > 0 && (
                            <p className="exclude-note" style={{fontSize: '0.9em', color: '#888', marginTop: '5px'}}>
                              (제외 옵션과 겹침: {twoWeeksAgoOverlap.join(', ')})
                            </p>
                          )}
                        </div>

                        <div className="stats-comparison-grid">
                          <div className="stat-card">
                            <h4>🔥 최신 최다 (이전 15회)</h4>
                            <div className="number-chips">
                              {recentTop10.map(num => (
                                <span key={num} className={`chip ${recentTop10Overlap.includes(num) ? 'overlap' : ''}`}>{num}</span>
                              ))}
                            </div>
                            <p className="overlap-count">
                              선택 회차와 겹침: <strong>{recentTop10Overlap.length}개</strong>
                              {recentTop10Overlap.length > 0 && ` (${recentTop10Overlap.join(', ')})`}
                            </p>
                          </div>

                          <div className="stat-card">
                            <h4>❄️ 최신 미추첨 (이전 15회)</h4>
                            <div className="number-chips">
                              {notDrawnRecently.slice(0, 10).map(num => (
                                <span key={num} className={`chip ${notDrawnOverlap.includes(num) ? 'overlap' : ''}`}>{num}</span>
                              ))}
                              {notDrawnRecently.length > 10 && <span className="more">+{notDrawnRecently.length - 10}</span>}
                            </div>
                            <p className="overlap-count">
                              선택 회차와 겹침: <strong>{notDrawnOverlap.length}개</strong>
                              {notDrawnOverlap.length > 0 && ` (${notDrawnOverlap.join(', ')})`}
                            </p>
                          </div>

                          <div className="stat-card">
                            <h4>👑 전체 최다</h4>
                            <div className="number-chips">
                              {top10Numbers.map(num => (
                                <span key={num} className={`chip ${top10Overlap.includes(num) ? 'overlap' : ''}`}>{num}</span>
                              ))}
                            </div>
                            <p className="overlap-count">
                              선택 회차와 겹침: <strong>{top10Overlap.length}개</strong>
                              {top10Overlap.length > 0 && ` (${top10Overlap.join(', ')})`}
                            </p>
                          </div>

                          <div className="stat-card">
                            <h4>🎲 전체 최소</h4>
                            <div className="number-chips">
                              {bottom10Numbers.map(num => (
                                <span key={num} className={`chip ${bottom10Overlap.includes(num) ? 'overlap' : ''}`}>{num}</span>
                              ))}
                            </div>
                            <p className="overlap-count">
                              선택 회차와 겹침: <strong>{bottom10Overlap.length}개</strong>
                              {bottom10Overlap.length > 0 && ` (${bottom10Overlap.join(', ')})`}
                            </p>
                          </div>
                        </div>


                      </div>
                    );
                  })()
                ) : (
                  <div className="no-data">
                    분석을 보려면 먼저 로또 데이터를 로드해주세요
                  </div>
                )}
              </div>
            </div>
            ) : (
              <div className="login-required">
                <h2>🔒 로그인이 필요합니다</h2>
                <p>분석 기능은 로그인 후 이용하실 수 있습니다.</p>
                <button className="login-required-btn" onClick={() => navigate('/login')}>
                  로그인하러 가기
                </button>
              </div>
            )
          )}
        </div>


        <div className="navigation">
        </div>


        <div className="navigation">
          <Link to="/" className="back-btn">
            ← 홈으로 돌아가기
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
