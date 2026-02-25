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
              <span className="user-greeting">👋 {user.userName || user.loginId}님</span>
              {user.loginId === 'admin' ? (
                <button className="auth-icon-btn admin-btn" onClick={() => navigate('/admin')} title="관리자 페이지">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                  </svg>
                </button>
              ) : (
                <button className="auth-icon-btn mypage-btn" onClick={() => navigate('/mypage')} title="마이페이지">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"/>
                  </svg>
                </button>
              )}
              <button className="auth-icon-btn logout-btn" onClick={handleLogout} title="로그아웃">
                ⏻
              </button>
            </>
          ) : (
            <>
              <button className="auth-btn login-btn" onClick={() => navigate('/login')}>
                로그인
              </button>
              <button className="auth-btn register-btn" onClick={() => navigate('/register')}>
                회원가입
              </button>
            </>
          )}
        </div>

        <div className="home-header">
          <h1>🎯 미니게임천국(등대지기)</h1>
          <p>다양한 웹 서비스를 한 곳에서</p>
        </div>

        <div className="navigation-cards">
          {/* 로또 서비스 (기본) */}
          <Link to="/lotto-basic" className="nav-card lotto-card">
            <div className="card-icon">🎰</div>
            <div className="card-content">
              <h2>로또 서비스</h2>
            </div>
            <div className="card-arrow">→</div>
          </Link>

          {/* 로또 서비스 - 멤버십 (로그인 필요) */}
          {isAuthenticated ? (
            <Link to="/lotto" className="nav-card lotto-card">
              <div className="card-icon">🎰</div>
              <div className="card-content">
                <h2>로또 서비스 - 멤버십</h2>
                <div className="card-desc">로그인 전용</div>
              </div>
              <div className="card-arrow">→</div>
            </Link>
          ) : (
            <div className="nav-card lotto-card disabled-card">
              <div className="card-icon">🎰</div>
              <div className="card-content">
                <h2>로또 서비스 - 멤버십</h2>
                <div className="service-status">로그인 필요</div>
              </div>
            </div>
          )}

          {/* MOMOK */}
          <Link to="/momok" className="nav-card momok-card">
            <div className="card-icon">🍽️</div>
            <div className="card-content">
              <h2>MOMOK</h2>
            </div>
            <div className="card-arrow">→</div>
          </Link>

          {/* MOMOK - 멤버십 (로그인 필요) */}
          {isAuthenticated ? (
            <Link to="/momok-best" className="nav-card momokbest-card">
              <div className="card-icon">🏆</div>
              <div className="card-content">
                <h2>MOMOK - 멤버십</h2>
                <div className="card-desc">로그인 전용</div>
              </div>
              <div className="card-arrow">→</div>
            </Link>
          ) : (
            <div className="nav-card momokbest-card disabled-card">
              <div className="card-icon">🏆</div>
              <div className="card-content">
                <h2>MOMOK - 멤버십</h2>
                <div className="service-status">로그인 필요</div>
              </div>
            </div>
          )}

          <div className="nav-card whattoeat-card disabled-card">
            <div className="card-icon">🍽️</div>
            <div className="card-content">
              <h2>오늘 뭐 먹지?</h2>
              <div className="service-status">서비스 준비중</div>
            </div>
          </div>

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
              <div className="stat-number">{isAuthenticated ? 4 : 2}</div>
              <div className="stat-label">운영중</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">4</div>
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
