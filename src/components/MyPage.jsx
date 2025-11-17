import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { getSavedGames, getLottoNumberByRoundFromSupabase, getLatestLottoNumberFromSupabase } from '../services/supabaseLotto';
import './MyPage.css';

// 요약 회차 아이템 컴포넌트
function SummaryRoundItem({ round, games }) {
  const [winningData, setWinningData] = useState(null);
  const [bestRank, setBestRank] = useState(null);

  useEffect(() => {
    // 해당 회차의 당첨번호 가져오기
    getLottoNumberByRoundFromSupabase(round).then((data) => {
      setWinningData(data);

      if (data && games) {
        // 모든 게임의 등수 계산
        const ranks = games.map((game) => {
          const gameNumbers = [
            game.count1,
            game.count2,
            game.count3,
            game.count4,
            game.count5,
            game.count6,
          ];
          return calculateRankStatic(gameNumbers, data);
        });

        // 최고 등수 찾기 (1등이 가장 좋음)
        const numericRanks = ranks.filter((r) => typeof r === 'number');
        if (numericRanks.length > 0) {
          setBestRank(Math.min(...numericRanks));
        } else {
          setBestRank('낙첨');
        }
      }
    });
  }, [round, games]);

  return (
    <div className="summary-item">
      <span className="summary-round">{round}회</span>
      {!winningData ? (
        <span className="summary-result no-data">당첨번호 없음</span>
      ) : bestRank === null ? (
        <span className="summary-result loading">계산 중...</span>
      ) : (
        <span className={`summary-result rank-${bestRank}`}>
          {typeof bestRank === 'number' ? `${bestRank}등` : bestRank}
        </span>
      )}
    </div>
  );
}

// 정적 등수 계산 함수
function calculateRankStatic(gameNumbers, winningData) {
  if (!winningData) return null;

  const winningNums = [
    winningData.num1,
    winningData.num2,
    winningData.num3,
    winningData.num4,
    winningData.num5,
    winningData.num6,
  ];

  const matchCount = gameNumbers.filter((num) => winningNums.includes(num)).length;
  const hasBonus = gameNumbers.includes(winningData.bonus);

  if (matchCount === 6) return 1;
  if (matchCount === 5 && hasBonus) return 2;
  if (matchCount === 5) return 3;
  if (matchCount === 4) return 4;
  if (matchCount === 3) return 5;
  return '낙첨';
}

export default function MyPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [savedGames, setSavedGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState(null);
  const [winningNumbers, setWinningNumbers] = useState(null);
  const [roundOptions, setRoundOptions] = useState([]);
  const [latestRound, setLatestRound] = useState(null);
  const [nextRound, setNextRound] = useState(null);

  useEffect(() => {
    console.log('🔵 MyPage useEffect 실행됨, user:', user);
    if (user?.id) {
      console.log('✅ user.id 있음:', user.id);
      // 최신 회차 가져오기
      getLatestLottoNumberFromSupabase().then((data) => {
        console.log('🔍 최신 회차 데이터:', data);
        if (data) {
          const latest = data.round;
          console.log('📊 최신 회차:', latest, '다음 회차:', latest + 1);
          setLatestRound(latest);
          setNextRound(latest + 1);

          // 요약보기 + 최신 5개 회차
          const last5Rounds = Array.from({ length: 5 }, (_, i) => latest - i);
          console.log('📋 요약보기 회차:', last5Rounds);
          setRoundOptions(['summary', ...last5Rounds]);

          // 기본값은 요약보기
          setSelectedRound('summary');
        }
      });

      loadSavedGames();
    } else {
      console.log('❌ user 또는 user.id 없음');
    }
  }, [user]);

  // 선택된 회차 변경 시 당첨번호 가져오기
  useEffect(() => {
    if (selectedRound && selectedRound !== 'summary') {
      loadWinningNumbers(selectedRound);
    }
  }, [selectedRound]);

  const loadWinningNumbers = async (round) => {
    try {
      const data = await getLottoNumberByRoundFromSupabase(round);
      setWinningNumbers(data);
    } catch (error) {
      console.error('당첨번호 로드 실패:', error);
      setWinningNumbers(null);
    }
  };

  // 당첨 등수 계산 (보너스 번호 제외한 6개 번호만 비교)
  const calculateRank = (gameNumbers, winningData) => {
    if (!winningData) return null;

    const winningNums = [
      winningData.num1,
      winningData.num2,
      winningData.num3,
      winningData.num4,
      winningData.num5,
      winningData.num6,
    ];

    const matchCount = gameNumbers.filter(num => winningNums.includes(num)).length;
    const hasBonus = gameNumbers.includes(winningData.bonus);

    if (matchCount === 6) return 1;
    if (matchCount === 5 && hasBonus) return 2;
    if (matchCount === 5) return 3;
    if (matchCount === 4) return 4;
    if (matchCount === 3) return 5;
    return '낙첨';
  };

  const loadSavedGames = async () => {
    setLoading(true);
    try {
      const games = await getSavedGames(user.id);
      // l_number별로 그룹화
      const groupedGames = games.reduce((acc, game) => {
        if (!acc[game.l_number]) {
          acc[game.l_number] = [];
        }
        acc[game.l_number].push(game);
        return acc;
      }, {});
      setSavedGames(groupedGames);
    } catch (error) {
      console.error('저장된 게임 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // 번호가 당첨번호에 포함되는지 확인
  const isWinningNumber = (number) => {
    if (!winningNumbers) return false;
    return [
      winningNumbers.num1,
      winningNumbers.num2,
      winningNumbers.num3,
      winningNumbers.num4,
      winningNumbers.num5,
      winningNumbers.num6,
    ].includes(number);
  };

  // 선택된 회차의 저장된 게임 가져오기
  const selectedRoundGames = selectedRound && selectedRound !== 'summary' ? savedGames[selectedRound] : null;

  // 이번주 선택번호 (최신회차 + 1)
  const thisWeekGames = nextRound ? savedGames[nextRound] : null;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // 인증 로딩 중이면 로딩 표시
  if (authLoading) {
    return <div className="mypage"><div className="loading">로딩 중...</div></div>;
  }

  // 로딩 완료 후 user가 없으면 null 반환 (useEffect에서 리다이렉트)
  if (!user) {
    return null;
  }

  return (
    <div className="mypage">
      <div className="mypage-container">
        <h1>🎰 마이페이지</h1>

        <div className="user-info-card">
          <h2>사용자 정보</h2>
          <div className="info-item">
            <span className="label">아이디:</span>
            <span className="value">{user.loginId}</span>
          </div>
          <div className="info-item">
            <span className="label">가입일:</span>
            <span className="value">{new Date(user.createdAt).toLocaleDateString('ko-KR')}</span>
          </div>
        </div>

        {/* 이번주 선택번호 */}
        <div className="this-week-section">
          <h2>🎲 이번주 선택번호 {nextRound && `(${nextRound}회)`}</h2>
          {loading || !nextRound ? (
            <div className="loading">로딩 중...</div>
          ) : !thisWeekGames || thisWeekGames.length === 0 ? (
            <div className="no-selection">이번주는 선택하지 않았습니다.</div>
          ) : (
            <div className="games-grid">
              {thisWeekGames.sort((a, b) => a.g_number - b.g_number).map((game, index) => (
                <div key={game.id || index} className="saved-game-item">
                  <span className="game-number">게임 {game.g_number}</span>
                  <div className="game-balls">
                    <span className="ball">{game.count1}</span>
                    <span className="ball">{game.count2}</span>
                    <span className="ball">{game.count3}</span>
                    <span className="ball">{game.count4}</span>
                    <span className="ball">{game.count5}</span>
                    <span className="ball">{game.count6}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 회차 선택 */}
        <div className="round-selector-section">
          <h2>🎯 당첨 확인</h2>
          <div className="round-selector">
            <label htmlFor="round-select">회차 선택:</label>
            <select
              id="round-select"
              value={selectedRound || ''}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedRound(value === 'summary' ? 'summary' : Number(value));
              }}
            >
              {roundOptions.map((round) => (
                <option key={round} value={round}>
                  {round === 'summary' ? '📊 요약보기' : `${round}회차`}
                </option>
              ))}
            </select>
          </div>

          {/* 요약보기 */}
          {selectedRound === 'summary' ? (
            <div className="summary-view">
              <h3>최근 5회차 당첨 요약</h3>
              {loading || !latestRound ? (
                <div className="loading">로딩 중...</div>
              ) : (
                <div className="summary-list">
                  {Array.from({ length: 5 }, (_, i) => latestRound - i).map((round) => {
                    const games = savedGames[round];
                    if (!games || games.length === 0) {
                      return (
                        <div key={round} className="summary-item">
                          <span className="summary-round">{round}회</span>
                          <span className="summary-result no-play">선택하지 않음</span>
                        </div>
                      );
                    }

                    // 해당 회차의 당첨번호를 가져와서 등수 계산 필요
                    return (
                      <SummaryRoundItem key={round} round={round} games={games} />
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* 선택된 회차의 당첨번호 표시 */}
              {winningNumbers && (
                <div className="winning-numbers">
                  <h3>당첨번호</h3>
                  <div className="winning-balls">
                    <span className="ball winning">{winningNumbers.num1}</span>
                    <span className="ball winning">{winningNumbers.num2}</span>
                    <span className="ball winning">{winningNumbers.num3}</span>
                    <span className="ball winning">{winningNumbers.num4}</span>
                    <span className="ball winning">{winningNumbers.num5}</span>
                    <span className="ball winning">{winningNumbers.num6}</span>
                    <span className="plus">+</span>
                    <span className="ball bonus">{winningNumbers.bonus}</span>
                  </div>
                </div>
              )}

              {/* 선택된 회차의 게임 표시 */}
              {loading ? (
                <div className="loading">로딩 중...</div>
              ) : !selectedRoundGames || selectedRoundGames.length === 0 ? (
                <div className="no-selection">해당 주는 선택하지 않았습니다.</div>
              ) : (
                <div className="selected-round-games">
                  <h3>{selectedRound}회차 내 게임 ({selectedRoundGames.length}개)</h3>
                  <div className="games-grid">
                    {selectedRoundGames.sort((a, b) => a.g_number - b.g_number).map((game, index) => (
                      <div key={game.id || index} className="saved-game-item">
                        <span className="game-number">게임 {game.g_number}</span>
                        <div className="game-balls">
                          <span className={`ball ${isWinningNumber(game.count1) ? 'matched' : ''}`}>
                            {game.count1}
                          </span>
                          <span className={`ball ${isWinningNumber(game.count2) ? 'matched' : ''}`}>
                            {game.count2}
                          </span>
                          <span className={`ball ${isWinningNumber(game.count3) ? 'matched' : ''}`}>
                            {game.count3}
                          </span>
                          <span className={`ball ${isWinningNumber(game.count4) ? 'matched' : ''}`}>
                            {game.count4}
                          </span>
                          <span className={`ball ${isWinningNumber(game.count5) ? 'matched' : ''}`}>
                            {game.count5}
                          </span>
                          <span className={`ball ${isWinningNumber(game.count6) ? 'matched' : ''}`}>
                            {game.count6}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="action-buttons">
          <button className="home-btn" onClick={() => navigate('/')}>
            🏠 홈으로
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            🚪 로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
