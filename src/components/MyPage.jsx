import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { getSavedGames, deleteSavedGames } from '../services/supabaseLotto';
import './MyPage.css';

export default function MyPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [savedGames, setSavedGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadSavedGames();
    }
  }, [user]);

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

  const handleDeleteRound = async (lottoNumber) => {
    if (!window.confirm(`${lottoNumber}회차의 저장된 게임을 모두 삭제하시겠습니까?`)) {
      return;
    }

    const result = await deleteSavedGames(user.id, lottoNumber);
    if (result.success) {
      alert(`${result.deletedCount}개 게임이 삭제되었습니다.`);
      loadSavedGames();
    } else {
      alert('삭제 실패');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    navigate('/login');
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

        {/* 저장된 게임 */}
        <div className="saved-games-section">
          <h2>💾 저장된 로또 게임</h2>
          {loading ? (
            <div className="loading">로딩 중...</div>
          ) : Object.keys(savedGames).length === 0 ? (
            <div className="no-saved-games">저장된 게임이 없습니다.</div>
          ) : (
            <div className="saved-games-list">
              {Object.entries(savedGames)
                .sort(([a], [b]) => b - a)
                .map(([lottoNumber, games]) => (
                  <div key={lottoNumber} className="round-games-card">
                    <div className="round-header">
                      <h3>🎰 {lottoNumber}회차 ({games.length}게임)</h3>
                      <button
                        className="delete-round-btn"
                        onClick={() => handleDeleteRound(lottoNumber)}
                        title="전체 삭제"
                      >
                        🗑️
                      </button>
                    </div>
                    <div className="games-grid">
                      {games.map((game, index) => (
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
                  </div>
                ))}
            </div>
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
