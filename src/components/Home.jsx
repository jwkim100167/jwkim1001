import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getServiceConfig } from '../services/supabaseAdmin';
import './Home.css';

const SERVICE_LIST = [
  { id: 'world-cup-predict', title: '월드컵 순위 예측',      icon: '⚽', path: '/world-cup-predict', cardClass: 'kbo-card', desc: '2026 FIFA 월드컵 1·2·3위 예측' },
  { id: 'kbo-predict',   title: 'KBO 순위 예측',           icon: '⚾', path: '/kbo-predict/form',   cardClass: 'kbo-card',       desc: '2026 시즌 순위 예측하기' },
  { id: 'kbo-result',    title: 'KBO 예측 점수 확인',        icon: '🏆', path: '/kbo-predict/result', cardClass: 'kbo-card',       desc: '내 예측 점수 확인하기' },
  { id: 'lotto',         title: '로또 서비스',              icon: '🎰', path: '/lotto-basic',        cardClass: 'lotto-card',      desc: '' },
  { id: 'lotto-vip',     title: '로또 서비스\n[멤버십]',    icon: '🎰', path: '/lotto',              cardClass: 'lotto-card',      desc: '' },
  { id: 'whattoeat',     title: '오늘 뭐 먹지?',            icon: '🍽️', path: '/whattoeat',          cardClass: 'momok-card',      desc: '' },
  { id: 'whattoeat-vip', title: '오늘 뭐 먹지?\n[멤버십]',  icon: '🍽️', path: '/momok-best',         cardClass: 'momokbest-card',  desc: '' },
  { id: 'taste',         title: '취향 알기',                icon: '💫', path: '/taste-match',        cardClass: 'taste-card',      desc: '' },
  { id: 'cobra',         title: '코브라 게임',              icon: '🐍', path: '/cobra',              cardClass: 'cobra-card',      desc: '방 만들고 친구와 함께!' },
];

const Home = () => {
  console.log('Home 컴포넌트 렌더링됨');
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [serviceConfig, setServiceConfig] = useState(null);

  useEffect(() => {
    getServiceConfig().then((cfg) => {
      if (cfg) setServiceConfig(cfg);
    });
  }, []);

  const isEnabled = (id) => {
    if (!serviceConfig) return ['kbo-predict', 'kbo-result', 'world-cup-predict', 'cobra'].includes(id); // 로딩 전 기본값
    return serviceConfig[id] ?? false;
  };

  const enabledCount  = SERVICE_LIST.filter((s) => isEnabled(s.id)).length;
  const disabledCount = SERVICE_LIST.length - enabledCount;

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
          <h1>🎯 미니게임천국</h1>
          <p>3월까지는 "KBO 순위 예측" 만 운영합니다.</p>
        </div>

        <div className="navigation-cards">
          {SERVICE_LIST.map((svc) =>
            isEnabled(svc.id) ? (
              <Link key={svc.id} to={svc.path} className={`nav-card ${svc.cardClass}`}>
                <div className="card-icon">{svc.icon}</div>
                <div className="card-content">
                  <h2>{svc.title.split('\n').map((t, i) => <React.Fragment key={i}>{t}{i === 0 && svc.title.includes('\n') && <br/>}</React.Fragment>)}</h2>
                  {svc.desc && <div className="card-desc">{svc.desc}</div>}
                </div>
                <div className="card-arrow">→</div>
              </Link>
            ) : (
              <div key={svc.id} className={`nav-card ${svc.cardClass} disabled-card`}>
                <div className="card-icon">{svc.icon}</div>
                <div className="card-content">
                  <h2>{svc.title.split('\n').map((t, i) => <React.Fragment key={i}>{t}{i === 0 && svc.title.includes('\n') && <br/>}</React.Fragment>)}</h2>
                  <div className="service-status">잠시 휴업 중</div>
                </div>
              </div>
            )
          )}
        </div>

        <div className="home-footer">
          <div className="stats">
            <div className="stat-item">
              <div className="stat-number">{enabledCount}</div>
              <div className="stat-label">운영중</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{disabledCount}</div>
              <div className="stat-label">휴업중</div>
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
