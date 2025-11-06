import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './MyPage.css';

export default function MyPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

        <div className="action-buttons">
          <button className="home-btn" onClick={() => navigate('/')}>
            🏠 홈으로
          </button>
          <button className="lotto-btn" onClick={() => navigate('/lotto')}>
            🎲 로또 번호 생성
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            🚪 로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
