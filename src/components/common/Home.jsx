import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabaseClient';
import { getServiceConfig, incrementMenuClickCount } from '../../services/core/supabaseAdmin';
import { sortMoviesByMatch, getMatchBadge } from '../../utils/movieMatch';
import './Home.css';
import AdBanner from './AdBanner';

const SERVICE_LIST = [
  { id: 'world-cup-predict', title: '월드컵 순위 예측',      icon: '⚽', path: '/world-cup-predict', cardClass: 'kbo-card', desc: '2026 FIFA 월드컵 1·2·3위 예측' },
  { id: 'kbo-predict',   title: 'KBO 순위 예측',           icon: '⚾', path: '/kbo-predict/form',   cardClass: 'kbo-card',       desc: '2026 시즌 순위 예측하기' },
  { id: 'kbo-result',    title: 'KBO 예측 점수 확인',        icon: '🏆', path: '/kbo-predict/result', cardClass: 'kbo-card',       desc: '내 예측 점수 확인하기' },
  { id: 'lotto',         title: '로또 서비스',              icon: '🎰', path: '/lotto-basic',        cardClass: 'lotto-card',      desc: '' },
  { id: 'lotto-vip',     title: '로또 서비스\n[멤버십]',    icon: '🎰', path: '/lotto',              cardClass: 'lotto-card',      desc: '' },
  { id: 'whattoeat',     title: '오늘 뭐 먹지?',            icon: '🍽️', path: '/whattoeat',          cardClass: 'momok-card',      desc: '' },
  { id: 'whattoeat-vip', title: '오늘 뭐 먹지?\n[멤버십]',  icon: '🍽️', path: '/momok-best',         cardClass: 'momokbest-card',  desc: '' },
  { id: 'taste',         title: '취향 알기',                icon: '💫', path: '/taste-match',        cardClass: 'taste-card',      desc: '' },
  { id: 'mandalart',     title: '만다라트\n[멤버십]',        icon: '🎯', path: '/mandalart',          cardClass: 'mandalart-card',  desc: '9×9 목표 관리 플래너' },
  { id: 'mini-arcade',   title: '미니게임천국',              icon: '🧠', path: '/mini-arcade',         cardClass: 'arcade-card',     desc: '실시간 멀티플레이 미니게임 6종' },
  { id: 'movie-recommend', title: '영화 추천받기',           icon: '🎬', path: '/movie-recommend',     cardClass: 'movie-card',      desc: '나의 영화 취향 유형 찾기' },
];

const Home = () => {
  console.log('Home 컴포넌트 렌더링됨');
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [serviceConfig, setServiceConfig] = useState({ enabledMap: null, sortedIds: [] });
  const [newMovies, setNewMovies]           = useState([]);
  const [userMovieResult, setUserMovieResult] = useState(null);
  const [newMoviesLoading, setNewMoviesLoading] = useState(true);

  useEffect(() => {
    getServiceConfig().then((cfg) => {
      if (cfg) setServiceConfig(cfg);
    });
  }, []);

  // 신규 개봉 영화 + 사용자 취향 결과 병렬 조회
  useEffect(() => {
    if (isAuthenticated === undefined) return; // auth 로딩 중

    const fetchData = async () => {
      setNewMoviesLoading(true);
      const currentYear = new Date().getFullYear();

      const [moviesRes, resultRes] = await Promise.all([
        supabase
          .from('movies')
          .select('title, title_en, year, release_month, type_codes, suffix, director')
          .gte('year', currentYear - 1)
          .not('release_month', 'is', null)
          .order('year', { ascending: false })
          .order('release_month', { ascending: false })
          .limit(20),
        isAuthenticated && user?.id
          ? supabase
              .from('movie_recommend_results')
              .select('type_code, suffix')
              .eq('user_id', String(user.id))
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const result = resultRes.data || null;
      setUserMovieResult(result);

      const rawMovies = moviesRes.data || [];
      const processed = sortMoviesByMatch(rawMovies, result?.type_code, result?.suffix);
      // 미분류 영화도 최대 3편 보충
      const unclassified = rawMovies
        .filter(m => !m.type_codes || m.type_codes.length === 0)
        .slice(0, 3);
      const combined = processed.length > 0
        ? processed
        : unclassified.slice(0, 5);
      setNewMovies(combined);
      setNewMoviesLoading(false);
    };

    fetchData();
  }, [isAuthenticated, user?.id]);

  const getStatus = (id) => {
    if (!serviceConfig.enabledMap) return ['kbo-predict', 'kbo-result', 'world-cup-predict', 'cobra', 'mandalart'].includes(id) ? 'on' : 'offline';
    const val = serviceConfig.enabledMap[id];
    if (val === undefined) return 'on'; // DB에 없는 서비스는 기본 ON
    if (val === true  || val === 'on')      return 'on';
    if (val === false || val === 'offline') return 'offline';
    if (val === 'hidden') return 'hidden';
    return 'on';
  };

  const orderedServiceList = serviceConfig.sortedIds.length > 0
    ? [
        ...serviceConfig.sortedIds.map(id => SERVICE_LIST.find(s => s.id === id)).filter(Boolean),
        ...SERVICE_LIST.filter(s => !serviceConfig.sortedIds.includes(s.id)),
      ]
    : SERVICE_LIST;

  const visibleList   = orderedServiceList.filter((s) => getStatus(s.id) !== 'hidden');
  const enabledCount  = visibleList.filter((s) => getStatus(s.id) === 'on').length;
  const disabledCount = visibleList.filter((s) => getStatus(s.id) === 'offline').length;

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
          <h1>🎯 JW클럽하우스</h1>

        </div>

        <AdBanner slot={import.meta.env.VITE_ADSENSE_SLOT_HOME_TOP} className="ad-home-top" />

        <div className="navigation-cards">
          {orderedServiceList.map((svc) => {
            const status = getStatus(svc.id);
            if (status === 'hidden') return null;
            const title = svc.title.split('\n').map((t, i) => <React.Fragment key={i}>{t}{i === 0 && svc.title.includes('\n') && <br/>}</React.Fragment>);
            return status === 'on' ? (
              <Link key={svc.id} to={svc.path} className={`nav-card ${svc.cardClass}`} onClick={() => incrementMenuClickCount(svc.id)}>
                <div className="card-icon">{svc.icon}</div>
                <div className="card-content">
                  <h2>{title}</h2>
                  {svc.desc && <div className="card-desc">{svc.desc}</div>}
                </div>
                <div className="card-arrow">→</div>
              </Link>
            ) : (
              <div key={svc.id} className={`nav-card ${svc.cardClass} disabled-card`}>
                <div className="card-icon">{svc.icon}</div>
                <div className="card-content">
                  <h2>{title}</h2>
                  <div className="service-status">잠시 휴업 중</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 신규 개봉 · 취향 매칭 섹션 */}
        {!newMoviesLoading && (
          <div className="new-movies-section">
            <div className="new-movies-header">
              <span className="new-movies-title">🎬 최근 개봉 영화</span>
              {userMovieResult && (
                <span className="new-movies-subtitle">
                  {userMovieResult.type_code}-{userMovieResult.suffix} 기준 매칭
                </span>
              )}
            </div>

            {isAuthenticated && !userMovieResult ? (
              <div className="new-movies-no-result">
                <span>영화 취향 검사 후 나에게 맞는 영화를 확인하세요</span>
                <Link to="/movie-recommend" className="new-movies-cta">취향 검사하기 →</Link>
              </div>
            ) : newMovies.length > 0 ? (
              <div className="new-movies-list">
                {newMovies.map((movie, i) => {
                  const badge = (movie.score != null) ? getMatchBadge(movie.score, movie.suffixOk) : null;
                  const dateStr = movie.release_month
                    ? `${movie.year}.${String(movie.release_month).padStart(2, '0')}`
                    : `${movie.year}`;
                  return (
                    <div key={i} className="new-movie-item">
                      <div className="new-movie-info">
                        <div className="new-movie-title">{movie.title}</div>
                        <div className="new-movie-meta">{dateStr}{movie.director ? ` · ${movie.director}` : ''}</div>
                      </div>
                      <div className="new-movie-badges">
                        {badge ? (
                          <span className={`new-match-badge match-${movie.score}`}>
                            {badge.emoji} {badge.label}
                          </span>
                        ) : (!movie.type_codes || movie.type_codes.length === 0) ? (
                          <span className="new-match-badge unclassified">분류 중</span>
                        ) : null}
                        {badge && movie.suffixOk && movie.suffix !== 'both' && (
                          <span className="new-suffix-ok">
                            {movie.suffix === 'C' ? '순한맛' : '매운맛'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="new-movies-empty">최근 개봉 영화 정보가 없어요</div>
            )}
          </div>
        )}

        <AdBanner slot={import.meta.env.VITE_ADSENSE_SLOT_HOME_BOTTOM} className="ad-home-bottom" />

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
          <p style={{ marginTop: '8px', fontSize: '0.75rem' }}>
            <Link to="/privacy" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>개인정보처리방침</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
