import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getAllLottoDataFromSupabase, saveGeneratedGames, getSavedGames } from '../services/supabaseLotto';
import './Lotto.css';

const LottoMembership = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [lottoData, setLottoData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [generatedNumbers, setGeneratedNumbers] = useState([null, null, null, null, null]);
  const [excludeNumbers, setExcludeNumbers] = useState([]);
  const [mustIncludeNumbers, setMustIncludeNumbers] = useState([]);
  const [excludeInput, setExcludeInput] = useState('');
  const [includeInput, setIncludeInput] = useState('');
  const [warningMsg, setWarningMsg] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [groupOptions, setGroupOptions] = useState({ A: '포함', B2: '포함', B1: '포함', C: '포함' });

  useEffect(() => {
    (async () => {
      const data = await getAllLottoDataFromSupabase();
      setLottoData(data);
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (user?.id && lottoData?.data?.length) {
      loadSavedGames(true); // 자동 로드는 알림 없이
    }
  }, [user, lottoData]);

  // ─── 번호대 분류 ─────────────────────────────────────────────
  // 0번대: 1~10 / 10번대: 11~20 / 20번대: 21~30 / 30번대: 31~40 / 40번대: 41~45
  const getDecadeIndex = (num) => {
    if (num <= 10) return 0;
    if (num <= 20) return 1;
    if (num <= 30) return 2;
    if (num <= 40) return 3;
    return 4;
  };

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // 5개 번호를 번호대에 맞는 게임(0~4)에 1개씩 배정
  // - 해당 번호대에 후보가 있으면 랜덤 1개 → 그 게임 배정
  // - 해당 번호대에 후보가 없는 게임 → 다른 번호대에서 안 뽑힌 leftover로 채움
  const assignByDecade = (numbers) => {
    const decadeRanges = [[1,10],[11,20],[21,30],[31,40],[41,45]];
    const assignment = [null, null, null, null, null];
    const leftover = [];

    decadeRanges.forEach(([min, max], d) => {
      const group = shuffle(numbers.filter(n => n >= min && n <= max));
      if (group.length > 0) {
        assignment[d] = group[0];       // 해당 번호대 → 해당 게임 배정
        leftover.push(...group.slice(1)); // 나머지 → leftover
      }
    });

    // 빈 게임 슬롯을 leftover로 채움
    const pool = shuffle(leftover);
    assignment.forEach((val, i) => {
      if (val === null && pool.length > 0) assignment[i] = pool.shift();
    });

    return assignment; // index = 게임번호(0~4), 값 = 배정된 번호
  };

  // 후보 배열에서 count개를 번호대별 best-effort로 선택
  const pickByDecade = (candidates, count) => {
    const grouped = [[], [], [], [], []];
    candidates.forEach(n => grouped[getDecadeIndex(n)].push(n));

    const picked = [];
    for (let d = 0; d < 5 && picked.length < count; d++) {
      if (grouped[d].length > 0) {
        const idx = Math.floor(Math.random() * grouped[d].length);
        picked.push(grouped[d][idx]);
      }
    }
    if (picked.length < count) {
      const remaining = shuffle(candidates.filter(n => !picked.includes(n)));
      while (picked.length < count && remaining.length > 0) {
        picked.push(remaining.shift());
      }
    }
    return picked;
  };

  // frequencyMap에서 excluded를 제외하고 count개를 번호대별 best-effort(빈도순)로 선택
  const pickByFreqAndDecade = (frequencyMap, excluded, count) => {
    // 빈도수 내림차순, 동점 시 번호 오름차순
    const sortedNums = Object.keys(frequencyMap)
      .map(Number)
      .filter(n => !excluded.includes(n))
      .sort((a, b) => frequencyMap[b] - frequencyMap[a] || a - b);

    // 번호대별 그룹 (이미 빈도순으로 정렬됨)
    const grouped = [[], [], [], [], []];
    sortedNums.forEach(n => grouped[getDecadeIndex(n)].push(n));

    const picked = [];
    for (let d = 0; d < 5 && picked.length < count; d++) {
      if (grouped[d].length > 0) {
        picked.push(grouped[d].shift());
      }
    }
    if (picked.length < count) {
      const remaining = sortedNums.filter(n => !picked.includes(n));
      while (picked.length < count && remaining.length > 0) {
        picked.push(remaining.shift());
      }
    }
    return picked;
  };

  // 데이터 items에서 번호별 빈도수 계산 (보너스 포함)
  const computeFrequency = (items) => {
    const freq = {};
    items.forEach(item => {
      [item.num1, item.num2, item.num3, item.num4, item.num5, item.num6, item.bonus]
        .filter(n => n >= 1 && n <= 45)
        .forEach(n => { freq[n] = (freq[n] || 0) + 1; });
    });
    return freq;
  };

  // ─── Step 1: 저번주 당첨번호 7개 중 5개 선정 (A) ────────────
  const pickFromLastWeek = () => {
    if (!lottoData?.data?.length) return [];
    const latest = [...lottoData.data].sort((a, b) => b.round - a.round)[0];
    const lastWeek7 = [latest.num1, latest.num2, latest.num3, latest.num4, latest.num5, latest.num6, latest.bonus]
      .filter(n => n >= 1 && n <= 45);
    return pickByDecade(lastWeek7, 5);
  };

  // ─── Step 2a: 최신최다 5개 (B-1), A 제외 ────────────────────
  const pickRecentFreq5 = (excludedA) => {
    if (!lottoData?.data?.length) return [];
    const sortedData = [...lottoData.data].sort((a, b) => b.round - a.round);
    let windowSize = 15;

    while (windowSize <= sortedData.length) {
      const freq = computeFrequency(sortedData.slice(0, windowSize));
      const candidates = Object.keys(freq).map(Number).filter(n => !excludedA.includes(n));
      if (candidates.length >= 5) {
        const picked = pickByFreqAndDecade(freq, excludedA, 5);
        if (picked.length >= 5) return picked;
      }
      windowSize += 5;
    }

    // 전체 탐색 후에도 부족하면 랜덤 fallback
    const all = Array.from({ length: 45 }, (_, i) => i + 1).filter(n => !excludedA.includes(n));
    return shuffle(all).slice(0, 5);
  };

  // ─── Step 2b: 역대최다 5개 (B-2), A + B-1 제외 ──────────────
  const pickAllTimeFreq5 = (excluded) => {
    if (!lottoData?.data?.length) return [];
    const freq = computeFrequency(lottoData.data);
    return pickByFreqAndDecade(freq, excluded, 5);
  };

  // ─── Step C: 최신 출현 번호 15개 (confirmed + 제외 제외, 최신순) ──
  const pickRecentNums15 = (excluded) => {
    const sortedData = [...lottoData.data].sort((a, b) => b.round - a.round);
    const seen = new Set(excluded);
    const result = [];
    for (const item of sortedData) {
      for (const n of [item.num1, item.num2, item.num3, item.num4, item.num5, item.num6]) {
        if (n >= 1 && n <= 45 && !seen.has(n)) {
          seen.add(n);
          result.push(n);
          if (result.length >= 15) return result;
        }
      }
    }
    // 15개 미만이면 나머지를 랜덤 fallback
    const extra = shuffle(
      Array.from({ length: 45 }, (_, i) => i + 1).filter(n => !seen.has(n))
    );
    while (result.length < 15 && extra.length > 0) result.push(extra.shift());
    return result;
  };

  // ─── 연속 번호 4개 체크 ───────────────────────────────────────
  const hasConsecutiveFour = (numbers) => {
    const sorted = [...numbers].sort((a, b) => a - b);
    for (let i = 0; i <= sorted.length - 4; i++) {
      let count = 1;
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j] === sorted[j - 1] + 1) { count++; if (count >= 4) return true; }
        else break;
      }
    }
    return false;
  };

  // ─── 역대 당첨 조합 가져오기 (보너스 제외) ───────────────────
  const getPreviousWinningCombinations = () => {
    if (!lottoData?.data?.length) return [];
    return lottoData.data.map(item =>
      [item.num1, item.num2, item.num3, item.num4, item.num5, item.num6]
        .filter(n => n >= 1 && n <= 45)
        .sort((a, b) => a - b)
    );
  };

  // ─── 게임 유효성 체크 (완전겹침 / 부분겹침 / 연속4개) ────────
  const isInvalidGame = (game, prevCombos) => {
    if (hasConsecutiveFour(game)) return true;
    const sorted = [...game].sort((a, b) => a - b);
    for (const prev of prevCombos) {
      const overlap = sorted.filter(n => prev.includes(n)).length;
      if (overlap >= 5) return true; // 5개 이상 겹침 (완전 포함)
    }
    return false;
  };

  // ─── 메인 생성 함수 ───────────────────────────────────────────
  const generateMembershipGames = async () => {
    if (!lottoData?.data?.length) { alert('데이터 로딩 중입니다. 잠시 후 시도해주세요.'); return; }

    // 기존 저장 게임 확인
    const latestRound = Math.max(...lottoData.data.map(i => i.round));
    const currentRound = latestRound + 1;
    if (user?.id) {
      const saved = await getSavedGames(user.id, currentRound);
      if (saved?.length > 0) {
        const ok = window.confirm(
          `게임 ${saved.map(g => g.g_number).join(', ')}번은 이미 저장되어있습니다.\n계속 하시겠습니까?\n\n(새로 생성된 게임으로 덮어씌워집니다)`
        );
        if (!ok) return;
      }
    }

    // Step 1~3: 항상 계산 (옵션에 무관하게 제외 체인 유지)
    const A_nums  = pickFromLastWeek();
    const B2_nums = pickAllTimeFreq5([...A_nums]);
    const B1_nums = pickRecentFreq5([...A_nums, ...B2_nums]);

    // Step 4: 옵션 적용
    const allExcludes = [...new Set([...excludeNumbers, ...thisSaturdayDateNums])];
    const A_on  = groupOptions.A  === '포함';
    const B2_on = groupOptions.B2 === '포함';
    const B1_on = groupOptions.B1 === '포함';

    const confirmed = [
      ...(A_on  ? A_nums  : []),
      ...(B2_on ? B2_nums : []),
      ...(B1_on ? B1_nums : []),
    ];

    // C 계산 (confirmed + allExcludes + forceInclude 제외)
    const forceInclude = mustIncludeNumbers.filter(n => !confirmed.includes(n) && !allExcludes.includes(n));
    const C_nums = pickRecentNums15([...new Set([...confirmed, ...allExcludes, ...forceInclude])]);
    const C_on = groupOptions.C === '포함';
    const cPool = C_on ? [...forceInclude, ...C_nums].slice(0, 15) : [];
    if (C_on) confirmed.push(...cPool);

    // 미포함 그룹 번호 → 랜덤에서도 제외
    const mipoham = [
      ...(groupOptions.A  === '미포함' ? A_nums  : []),
      ...(groupOptions.B2 === '미포함' ? B2_nums : []),
      ...(groupOptions.B1 === '미포함' ? B1_nums : []),
      ...(groupOptions.C  === '미포함' ? C_nums  : []),
    ];

    // 랜덤 슬롯 수
    const confirmedSlots = (A_on ? 1 : 0) + (B2_on ? 1 : 0) + (B1_on ? 1 : 0) + (C_on ? 3 : 0);
    const randomSlotsPerGame = 6 - confirmedSlots;
    const totalRandom = randomSlotsPerGame * 5;

    const randomExcluded = [...new Set([...confirmed, ...mipoham, ...allExcludes])];
    const forceForRandom = C_on ? [] : mustIncludeNumbers.filter(n => !randomExcluded.includes(n));
    const randomPool = [
      ...forceForRandom,
      ...shuffle(Array.from({ length: 45 }, (_, i) => i + 1).filter(n => !randomExcluded.includes(n) && !forceForRandom.includes(n))),
    ].slice(0, totalRandom);
    // fallback
    if (randomPool.length < totalRandom) {
      const extra = shuffle(Array.from({ length: 45 }, (_, i) => i + 1).filter(n => !randomPool.includes(n) && !confirmed.includes(n)));
      while (randomPool.length < totalRandom && extra.length > 0) randomPool.push(extra.shift());
    }

    // Step 5: 배치
    const prevCombos = getPreviousWinningCombinations();
    const MAX_ATTEMPTS = 100;
    let bestGames = null;
    let exceeded = false;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const aAssign  = A_on  ? assignByDecade(A_nums)  : Array(5).fill(null);
      const b2Assign = B2_on ? assignByDecade(B2_nums) : Array(5).fill(null);
      const b1Assign = B1_on ? assignByDecade(B1_nums) : Array(5).fill(null);
      const shuffledC = C_on ? shuffle(cPool) : [];
      const shuffledR = shuffle(randomPool);

      const games = Array.from({ length: 5 }, (_, i) => {
        const row = [aAssign[i], b2Assign[i], b1Assign[i]];
        if (C_on) row.push(shuffledC[i * 3], shuffledC[i * 3 + 1], shuffledC[i * 3 + 2]);
        for (let r = 0; r < randomSlotsPerGame; r++) row.push(shuffledR[i * randomSlotsPerGame + r]);
        return row.filter(n => n != null).sort((a, b) => a - b);
      });

      if (games.every(g => !isInvalidGame(g, prevCombos))) {
        bestGames = games;
        break;
      }
      if (attempt === MAX_ATTEMPTS - 1) {
        bestGames = games;
        exceeded = true;
      }
    }

    setGeneratedNumbers(bestGames);
    setDebugInfo({
      A:  A_on  ? [...A_nums].sort((a,b)=>a-b)  : null,
      B2: B2_on ? [...B2_nums].sort((a,b)=>a-b) : null,
      B1: B1_on ? [...B1_nums].sort((a,b)=>a-b) : null,
      C:  C_on  ? [...cPool]                     : null,
      dateExcludes: thisSaturdayDateNums,
    });
    setWarningMsg(exceeded ? '⚠️ 100회 시도 초과: 제약 조건을 완전히 충족하지 못한 결과입니다.' : '');
  };

  // ─── 전체 저장 ───────────────────────────────────────────────
  const handleSaveAllGames = async () => {
    if (!isAuthenticated || !user?.id) { alert('로그인이 필요합니다.'); return; }
    if (!generatedNumbers.some(g => g !== null)) { alert('저장할 게임이 없습니다.'); return; }

    const latestRound = Math.max(...lottoData.data.map(i => i.round));
    const currentRound = latestRound + 1;
    const saved = await getSavedGames(user.id, currentRound);
    if (saved?.length > 0) {
      const ok = window.confirm(`게임 ${saved.map(g => g.g_number).join(', ')}번은 이미 저장되어있습니다.\n덮어씌우시겠습니까?`);
      if (!ok) return;
    }

    const result = await saveGeneratedGames(user.id, currentRound, generatedNumbers);
    alert(result.success ? `${result.savedCount}개 게임이 저장되었습니다!` : `저장 실패: ${result.error}`);
  };

  // ─── 저장 게임 불러오기 ──────────────────────────────────────
  const loadSavedGames = async (silent = false) => {
    if (!user?.id) {
      if (!silent) alert('로그인이 필요합니다.');
      return;
    }
    if (!lottoData?.data?.length) {
      if (!silent) alert('데이터 로딩 중입니다. 잠시 후 시도해주세요.');
      return;
    }
    try {
      const latestRound = Math.max(...lottoData.data.map(i => i.round));
      const currentRound = latestRound + 1;
      console.log(`📥 불러오기 시도 - userId: ${user.id}, 회차: ${currentRound}`);
      const savedGames = await getSavedGames(user.id, currentRound);
      console.log(`📋 조회 결과: ${savedGames?.length ?? 0}개`, savedGames);
      if (savedGames?.length > 0) {
        const loaded = [null, null, null, null, null];
        savedGames.forEach(g => {
          const idx = g.g_number - 1;
          if (idx >= 0 && idx < 5) {
            loaded[idx] = [g.count1, g.count2, g.count3, g.count4, g.count5, g.count6];
          }
        });
        setGeneratedNumbers(loaded);
        if (!silent) alert(`${savedGames.length}개 게임을 불러왔습니다.`);
      } else {
        if (!silent) alert('저장된 게임이 없습니다.');
      }
    } catch (err) {
      console.error('❌ 불러오기 실패:', err);
      if (!silent) alert('게임 불러오기에 실패했습니다.');
    }
  };

  // ─── 이번주 토요일 Date 객체 ─────────────────────────────────
  const getThisSaturday = () => {
    const today = new Date();
    const sat = new Date(today);
    sat.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7));
    return sat;
  };

  const getThisSaturdayStr = () => {
    const sat = getThisSaturday();
    return `${sat.getFullYear()}년 ${sat.getMonth() + 1}월 ${sat.getDate()}일 (토)`;
  };

  // ─── 이번주 추첨날짜에서 자동 제외 번호 (월, 일) ─────────────
  const getThisSaturdayDateNumbers = () => {
    const sat = getThisSaturday();
    const month = sat.getMonth() + 1;
    const day = sat.getDate();
    const nums = [];
    if (month >= 1 && month <= 45) nums.push(month);
    if (day >= 1 && day <= 45 && day !== month) nums.push(day);
    return nums;
  };

  // ─── 번호볼 색상 ─────────────────────────────────────────────
  const getBallColor = (num) => {
    if (num <= 10) return '#fbc400';
    if (num <= 20) return '#69c8f2';
    if (num <= 30) return '#ff7272';
    if (num <= 40) return '#aaa';
    return '#b0d840';
  };

  // ─── 입력 파싱 ───────────────────────────────────────────────
  const parseNumInput = (input) =>
    input.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 45);

  const handleAddExclude = () => {
    const nums = parseNumInput(excludeInput);
    setExcludeNumbers(prev => [...new Set([...prev, ...nums])]);
    setExcludeInput('');
  };

  const handleAddInclude = () => {
    const nums = parseNumInput(includeInput);
    setMustIncludeNumbers(prev => [...new Set([...prev, ...nums])]);
    setIncludeInput('');
  };

  const thisSaturdayStr = getThisSaturdayStr();
  const thisSaturdayDateNums = getThisSaturdayDateNumbers();

  if (isLoading) {
    return (
      <div className="lotto">
        <div className="lotto-container">
          <p style={{ padding: 20, textAlign: 'center', color: '#888' }}>데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lotto">
      <div className="lotto-container">

        {/* 헤더 */}
        <div className="lotto-header">
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#888', padding: '0 0 8px', display: 'block' }}
          >
            ← 홈으로
          </button>
          <h1>🎰 로또 멤버십</h1>
          <p style={{ color: '#888', marginTop: 4, fontSize: 14 }}>
            이번주 추첨일: <strong>{thisSaturdayStr}</strong>
          </p>
          <p style={{ color: '#aaa', marginTop: 2, fontSize: 12 }}>
            📅 날짜 자동 제외: <strong>{thisSaturdayDateNums.join(', ')}</strong>
          </p>
        </div>

        {/* 비로그인 안내 */}
        {!isAuthenticated && (
          <div className="mb-nolife-toast">
            🔒 로그인이 필요합니다.{' '}
            <span
              onClick={() => navigate('/login')}
              style={{ textDecoration: 'underline', cursor: 'pointer' }}
            >
              로그인하기
            </span>
          </div>
        )}

        {/* 슬롯 현황 + 불러오기/저장 */}
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
            <button className="gen-load-btn" onClick={() => loadSavedGames()}>📥 불러오기</button>
            <button className="gen-save-btn" onClick={handleSaveAllGames}>💾 저장</button>
          </div>
        </div>

        {/* 생성된 번호 표시 */}
        <div className="generated-numbers">
          {generatedNumbers.map((game, gameIndex) => (
            <div key={gameIndex} className="number-row">
              <span className="game-label">게임 {gameIndex + 1}</span>
              {game ? (
                <div className="number-balls">
                  {game.map((num, numIndex) => {
                    const isFromA  = debugInfo?.A?.includes(num);
                    const isFromB2 = debugInfo?.B2?.includes(num);
                    const isFromB1 = debugInfo?.B1?.includes(num);
                    const ring = isFromA
                      ? '0 0 0 3px #ffd700'   // 저번주: 금색
                      : isFromB2
                        ? '0 0 0 3px #4caf50' // 역대최다: 초록
                        : isFromB1
                          ? '0 0 0 3px #2196f3' // 최신최다: 파랑
                          : 'none';
                    return (
                      <span
                        key={numIndex}
                        className="number-ball"
                        style={{ backgroundColor: getBallColor(num), boxShadow: ring }}
                      >
                        {num}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className="number-balls">
                  <span style={{ color: '#ccc', letterSpacing: 4 }}>— — — — — —</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 선정 정보 */}
        {debugInfo && (
          <div style={{
            background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8,
            padding: '10px 14px', margin: '12px 0', fontSize: 13, color: '#555', lineHeight: 1.8
          }}>
            {debugInfo.A  && <div>📌 저번주 선정 (A): <strong>[{debugInfo.A.join(', ')}]</strong></div>}
            {debugInfo.B2 && <div>⭐ 역대최다 (B2): <strong>[{debugInfo.B2.join(', ')}]</strong></div>}
            {debugInfo.B1 && <div>🔥 최신최다 (B1): <strong>[{debugInfo.B1.join(', ')}]</strong></div>}
            {debugInfo.C  && <div>🕐 최신출현 (C): <strong>[{debugInfo.C.join(', ')}]</strong></div>}
            <div>📅 날짜 자동 제외: <strong>[{debugInfo.dateExcludes.join(', ')}]</strong></div>
          </div>
        )}

        {warningMsg && (
          <div style={{ color: '#e08800', fontSize: 13, padding: '6px 0' }}>{warningMsg}</div>
        )}

        {/* 그룹 옵션 */}
        {(() => {
          const groups = [
            { key: 'A',  label: 'A',  desc: '저번주',   color: '#ffd700' },
            { key: 'B2', label: 'B2', desc: '역대최다', color: '#4caf50' },
            { key: 'B1', label: 'B1', desc: '최신최다', color: '#2196f3' },
            { key: 'C',  label: 'C',  desc: '최신출현', color: '#9c27b0' },
          ];
          const opts = ['포함', '미포함', 'PASS'];
          const btnStyle = (active) => ({
            padding: '3px 10px', fontSize: 12, border: '1px solid #ddd', borderRadius: 6,
            cursor: 'pointer', fontWeight: active ? 700 : 400,
            background: active ? '#333' : '#f5f5f5',
            color: active ? '#fff' : '#555',
          });
          return (
            <div style={{ margin: '12px 0', background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>📋 그룹 옵션</div>
              {groups.map(({ key, label, desc, color }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, width: 22 }}>{label}</span>
                  <span style={{ fontSize: 12, color: '#888', width: 48 }}>{desc}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {opts.map(opt => (
                      <button key={opt} style={btnStyle(groupOptions[key] === opt)}
                        onClick={() => setGroupOptions(prev => ({ ...prev, [key]: opt }))}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* 전략 확인 모달 */}
        {showStrategyModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
          }}>
            <div style={{
              background: '#fff', borderRadius: 14, padding: '24px 22px',
              width: 'min(90vw, 360px)', boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
            }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>🎲 번호 생성 전략</h3>
              {(() => {
                const rows = [
                  { color: '#ffd700', label: 'A  저번주',   opt: groupOptions.A,  slots: 1 },
                  { color: '#4caf50', label: 'B2 역대최다', opt: groupOptions.B2, slots: 1 },
                  { color: '#2196f3', label: 'B1 최신최다', opt: groupOptions.B1, slots: 1 },
                  { color: '#9c27b0', label: 'C  최신출현', opt: groupOptions.C,  slots: 3 },
                ];
                const confirmedSlots = rows.reduce((s, r) => s + (r.opt === '포함' ? r.slots : 0), 0);
                const randomSlots = 6 - confirmedSlots;
                return (
                  <div style={{ fontSize: 13, lineHeight: 2.2, color: '#444' }}>
                    {rows.map(({ color, label, opt, slots }) => (
                      <div key={label}>
                        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color, marginRight: 6, verticalAlign: 'middle' }} />
                        <strong>{label}</strong>
                        <span style={{ marginLeft: 8, color: opt === '포함' ? '#333' : opt === '미포함' ? '#e53935' : '#aaa', fontWeight: 600 }}>
                          [{opt}] {opt === '포함' ? `→ 게임당 ${slots}개` : opt === '미포함' ? '(랜덤에서도 제외)' : '(무시)'}
                        </span>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid #eee', marginTop: 4, paddingTop: 4, fontSize: 12, color: '#666' }}>
                      게임당 확정 <strong>{confirmedSlots}</strong>개 + 랜덤 <strong>{randomSlots}</strong>개 = 6개 × 5게임
                    </div>
                  </div>
                );
              })()}
              <div style={{ fontSize: 12, color: '#888', marginTop: 10, lineHeight: 1.8 }}>
                <div>📅 날짜 자동 제외: <strong>{thisSaturdayDateNums.length > 0 ? thisSaturdayDateNums.join(', ') : '없음'}</strong></div>
                <div>🚫 사용자 제외: <strong>{excludeNumbers.length > 0 ? excludeNumbers.join(', ') : '없음'}</strong></div>
                <div>✅ 사용자 포함: <strong>{mustIncludeNumbers.length > 0 ? mustIncludeNumbers.join(', ') : '없음'}</strong></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                <button
                  onClick={() => { setShowStrategyModal(false); generateMembershipGames(); }}
                  style={{
                    flex: 1, padding: '10px 0', background: '#e53935', color: '#fff',
                    border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer'
                  }}
                >
                  생성
                </button>
                <button
                  onClick={() => setShowStrategyModal(false)}
                  style={{
                    flex: 1, padding: '10px 0', background: '#f5f5f5', color: '#555',
                    border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer'
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 생성 버튼 */}
        <button
          className="generate-btn-full"
          onClick={() => {
            if (!isAuthenticated) { navigate('/login'); return; }
            setShowStrategyModal(true);
          }}
          disabled={!isAuthenticated || isLoading}
          style={{ opacity: isAuthenticated ? 1 : 0.5 }}
        >
          🎲 번호 생성
        </button>

        {/* 제외할 번호 */}
        <div className="exclude-section">
          <h3>🚫 제외할 번호</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              value={excludeInput}
              onChange={e => setExcludeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddExclude()}
              placeholder="예: 3, 15, 27"
              className="exclude-input-field"
            />
            <button className="add-exclude-btn" onClick={handleAddExclude}>추가</button>
          </div>
          <div className="excluded-numbers">
            <div className="excluded-list">
              {excludeNumbers.length === 0 && (
                <span style={{ color: '#bbb', fontSize: 13 }}>없음</span>
              )}
              {excludeNumbers.map(num => (
                <span
                  key={num}
                  className="excluded-ball"
                  onClick={() => setExcludeNumbers(prev => prev.filter(n => n !== num))}
                  title="클릭하여 제거"
                >
                  {num}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 포함할 번호 */}
        <div className="include-section">
          <h3>✅ 포함할 번호</h3>
          <p style={{ fontSize: 12, color: '#999', margin: '2px 0 8px' }}>
            확정 10개에 이미 포함된 번호는 무시됩니다.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              value={includeInput}
              onChange={e => setIncludeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddInclude()}
              placeholder="예: 7, 23, 38"
              className="exclude-input-field"
            />
            <button className="add-exclude-btn" onClick={handleAddInclude}>추가</button>
          </div>
          <div className="excluded-numbers">
            <div className="excluded-list">
              {mustIncludeNumbers.length === 0 && (
                <span style={{ color: '#bbb', fontSize: 13 }}>없음</span>
              )}
              {mustIncludeNumbers.map(num => (
                <span
                  key={num}
                  className="excluded-ball"
                  onClick={() => setMustIncludeNumbers(prev => prev.filter(n => n !== num))}
                  title="클릭하여 제거"
                  style={{ background: '#4caf50', borderColor: '#4caf50', color: '#fff' }}
                >
                  {num}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LottoMembership;
