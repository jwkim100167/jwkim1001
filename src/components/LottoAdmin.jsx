import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { getSavedGames, getLottoNumberByRoundFromSupabase, getLatestLottoNumberFromSupabase, saveGeneratedGames, getAllLottoDataFromSupabase } from '../services/supabaseLotto';
import './LottoAdmin.css';

// 사용자별 당첨 정보 컴포넌트
function UserWinningInfo({ userId, loginId, latestRounds, currentRound, onForceParticipate }) {
  const [userGames, setUserGames] = useState([]);
  const [winningInfo, setWinningInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [forcing, setForcing] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      try {
        // 사용자의 모든 게임 가져오기
        const games = await getSavedGames(userId);

        // 최신 5개 회차만 필터링
        const filteredGames = games.filter(game =>
          latestRounds.includes(game.l_number)
        );

        setUserGames(filteredGames);

        // 각 회차의 당첨번호 가져오고 등수 계산
        const winningResults = {};

        for (const round of latestRounds) {
          const roundGames = filteredGames.filter(g => g.l_number === round);

          if (roundGames.length > 0) {
            const winningData = await getLottoNumberByRoundFromSupabase(round);

            if (winningData) {
              const ranks = roundGames.map(game => {
                const gameNumbers = [
                  game.count1,
                  game.count2,
                  game.count3,
                  game.count4,
                  game.count5,
                  game.count6
                ];
                return calculateRank(gameNumbers, winningData);
              });

              // 최고 등수 찾기
              const numericRanks = ranks.filter(r => typeof r === 'number');
              const bestRank = numericRanks.length > 0 ? Math.min(...numericRanks) : '낙첨';

              winningResults[round] = {
                gameCount: roundGames.length,
                bestRank: bestRank
              };
            } else {
              // 당첨번호가 없는 경우 (미래 회차)
              winningResults[round] = {
                gameCount: roundGames.length,
                bestRank: '대기중'
              };
            }
          }
        }

        setWinningInfo(winningResults);
      } catch (error) {
        console.error('사용자 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [userId, latestRounds]);

  // 등수 계산 함수
  const calculateRank = (gameNumbers, winningData) => {
    if (!winningData) return null;

    const winningNums = [
      winningData.num1,
      winningData.num2,
      winningData.num3,
      winningData.num4,
      winningData.num5,
      winningData.num6
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

  return (
    <div className="user-winning-row">
      <div className="user-name">{loginId}</div>
      {loading ? (
        <div className="loading-cell" colSpan={latestRounds.length}>로딩 중...</div>
      ) : (
        latestRounds.map(round => {
          const info = winningInfo[round];
          if (!info) {
            if (round === currentRound) {
              return (
                <div key={round} className="round-cell no-play">
                  <button
                    className="force-participate-btn"
                    disabled={forcing}
                    onClick={async () => {
                      setForcing(true);
                      await onForceParticipate(userId, currentRound);
                      // 해당 유저 데이터 새로고침
                      const games = await getSavedGames(userId);
                      const filteredGames = games.filter(game => latestRounds.includes(game.l_number));
                      setUserGames(filteredGames);
                      const roundGames = filteredGames.filter(g => g.l_number === currentRound);
                      if (roundGames.length > 0) {
                        setWinningInfo(prev => ({
                          ...prev,
                          [currentRound]: { gameCount: roundGames.length, bestRank: '대기중' }
                        }));
                      }
                      setForcing(false);
                    }}
                  >
                    {forcing ? '생성 중...' : '강제 참여'}
                  </button>
                </div>
              );
            }
            return (
              <div key={round} className="round-cell no-play">
                미참여
              </div>
            );
          }

          return (
            <div key={round} className="round-cell">
              {info.bestRank === '대기중' ? (
                <>
                  <span className="rank rank-waiting">참여</span>
                  <span className="game-count">({info.gameCount}게임)</span>
                </>
              ) : (
                <>
                  <span className={`rank rank-${info.bestRank}`}>
                    {typeof info.bestRank === 'number' ? `${info.bestRank}등` : info.bestRank}
                  </span>
                  <span className="game-count">({info.gameCount}게임)</span>
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default function LottoAdmin() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [latestRounds, setLatestRounds] = useState([]);

  useEffect(() => {
    if (!authLoading && (!user || user.loginId !== 'admin')) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && user.loginId === 'admin') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 최신 회차 가져오기
      const latestData = await getLatestLottoNumberFromSupabase();
      if (latestData) {
        const latest = latestData.round;
        // 다음 회차 + 최신 4개 회차
        const rounds = [latest + 1, ...Array.from({ length: 4 }, (_, i) => latest - i)];
        setLatestRounds(rounds);
      }

      // 모든 사용자 가져오기 (admin, test 제외)
      const { data, error } = await supabase
        .from('userTable')
        .select('id, login_id, userName')
        .not('login_id', 'in', '(admin,test)')
        .order('login_id', { ascending: true });

      if (error) {
        console.error('사용자 조회 실패:', error);
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // 어드민 강제 번호 생성 (멤버십 알고리즘 기반, 기본 옵션)
  const handleForceParticipate = async (userId, currentRound) => {
    try {
      const lottoData = await getAllLottoDataFromSupabase();
      if (!lottoData?.data?.length) { alert('로또 데이터 로드 실패'); return; }

      const sortedData = [...lottoData.data].sort((a, b) => b.round - a.round);

      // Fisher-Yates shuffle
      const shuffle = (arr) => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      };

      // 1~45 중 30개 중복 없이 랜덤 선택 → 5게임 × 6개
      const pool = shuffle(Array.from({ length: 45 }, (_, i) => i + 1)).slice(0, 30);
      const games = Array.from({ length: 5 }, (_, i) =>
        pool.slice(i * 6, i * 6 + 6).sort((a, b) => a - b)
      );

      const result = await saveGeneratedGames(userId, currentRound, games);
      if (!result.success) alert(`저장 실패: ${result.error}`);
    } catch (e) {
      console.error('강제 참여 실패:', e);
      alert('번호 생성 중 오류가 발생했습니다.');
    }
  };

  // 인증 로딩 중
  if (authLoading) {
    return <div className="admin"><div className="loading">로딩 중...</div></div>;
  }

  // admin이 아니면 null 반환 (useEffect에서 리다이렉트)
  if (!user || user.loginId !== 'admin') {
    return null;
  }

  return (
    <div className="admin">
      <div className="admin-container">
        <h1>📊 관리자 페이지</h1>

        <div className="admin-header">
          <div className="admin-info">
            <span className="admin-label">관리자:</span>
            <span className="admin-value">{user.loginId}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            🚪 로그아웃
          </button>
        </div>

        {loading ? (
          <div className="loading">데이터 로딩 중...</div>
        ) : (
          <div className="winning-table">
            <h2>최근 5주 당첨 내역</h2>

            <div className="table-header">
              <div className="user-name">사용자</div>
              {latestRounds.map(round => (
                <div key={round} className="round-header">
                  {round}회
                </div>
              ))}
            </div>

            <div className="table-body">
              {users.length === 0 ? (
                <div className="no-users">등록된 사용자가 없습니다.</div>
              ) : (
                users.map(u => (
                  <UserWinningInfo
                    key={u.id}
                    userId={u.id}
                    loginId={u.login_id || u.userName || String(u.id)}
                    latestRounds={latestRounds}
                    currentRound={latestRounds[0]}
                    onForceParticipate={handleForceParticipate}
                  />
                ))
              )}
            </div>
          </div>
        )}

        <div className="action-buttons">
          <button className="home-btn" onClick={() => navigate('/')}>
            🏠 홈으로
          </button>
        </div>
      </div>
    </div>
  );
}
