import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home = () => {
  console.log('Home 컴포넌트 렌더링됨');
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="home">
      <div className="home-container">
        <div className="auth-buttons">
          {isAuthenticated ? (
            <>
              <span className="user-greeting">👋 {user.loginId}님</span>
              {user.loginId === 'admin' ? (
                <button className="auth-btn admin-btn" onClick={() => navigate('/admin')}>
                  📊 관리자 페이지
                </button>
              ) : (
                <button className="auth-btn mypage-btn" onClick={() => navigate('/mypage')}>
                  마이페이지
                </button>
              )}
              <button className="auth-btn logout-btn" onClick={handleLogout}>
                로그아웃
              </button>
            </>
          ) : (
            <button className="auth-btn login-btn" onClick={() => navigate('/login')}>
              로그인
            </button>
          )}
        </div>

        <div className="home-header">
          <h1>🎯 미니게임천국(등대지기)</h1>
          <p>다양한 웹 서비스를 한 곳에서</p>
        </div>

        <div className="navigation-cards">
          <Link to="/lotto" className="nav-card lotto-card">
            <div className="card-icon">🎰</div>
            <div className="card-content">
              <h2>로또 서비스</h2>
            </div>
            <div className="card-arrow">→</div>
          </Link>

          <Link to="/momok" className="nav-card momok-card">
            <div className="card-icon">🍽️</div>
            <div className="card-content">
              <h2>MOMOK</h2>
            </div>
            <div className="card-arrow">→</div>
          </Link>

          <Link to="/whattoeat" className="nav-card whattoeat-card">
            <div className="card-icon">🍽️</div>
            <div className="card-content">
              <h2>오늘 뭐 먹지?</h2>
              <div className="card-desc">로그인 필요</div>
            </div>
            <div className="card-arrow">→</div>
          </Link>

          <div className="nav-card komom-card disabled-card">
            <div className="card-icon">🍴</div>
            <div className="card-content">
              <h2>KOMOM</h2>
              <div className="service-status">서비스 준비중</div>
            </div>
          </div>

          <div className="nav-card dashboard-card disabled-card">
            <div className="card-icon">📈</div>
            <div className="card-content">
              <h2>스마트 대시보드</h2>
              <div className="service-status">서비스 준비중</div>
            </div>
          </div>

          <div className="nav-card jobs-card disabled-card">
            <div className="card-icon">💼</div>
            <div className="card-content">
              <h2>채용공고 모니터</h2>
              <div className="service-status">서비스 준비중</div>
            </div>
          </div>
        </div>

        <div className="home-footer">
          <div className="stats">
            <div className="stat-item">
              <div className="stat-number">4</div>
              <div className="stat-label">운영중</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">2</div>
              <div className="stat-label">준비중</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">서비스</div>
            </div>
          </div>

          <p className="creator">made by jwkim1001</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
