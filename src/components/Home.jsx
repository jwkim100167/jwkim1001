import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  console.log('Home 컴포넌트 렌더링됨');
  
  return (
    <div className="home">
      <div className="home-container">
        <div className="home-header">
          <h1>📊 모니터링 허브</h1>
          <p>다양한 도구와 서비스에 접근하세요</p>
          <div style={{color: 'red', fontSize: '14px', margin: '10px 0'}}>
            HOME 페이지가 정상적으로 로드되었습니다!
          </div>
        </div>
        
        <div className="navigation-cards">
          <Link to="/dashboard" className="nav-card dashboard-card">
            <div className="card-icon">📈</div>
            <div className="card-content">
              <h2>스마트 대시보드</h2>
              <p>환율, 공포와 탐욕 지수, VIX 지수를 실시간으로 모니터링하세요</p>
              <div className="card-features">
                <span>• 실시간 데이터</span>
                <span>• 자동 알림</span>
                <span>• 범위 변경 감지</span>
              </div>
            </div>
            <div className="card-arrow">→</div>
          </Link>
          
          <Link to="/lotto" className="nav-card lotto-card">
            <div className="card-icon">🎰</div>
            <div className="card-content">
              <h2>로또 서비스</h2>
              <p>로또 번호 생성과 당첨번호 확인을 한 곳에서</p>
              <div className="card-features">
                <span>• 스마트 번호 생성</span>
                <span>• 전체 회차 데이터</span>
                <span>• 패턴 분석 (업데이트 예정)</span>
              </div>
            </div>
            <div className="card-arrow">→</div>
          </Link>
          
          <Link to="/jobs" className="nav-card jobs-card">
            <div className="card-icon">💼</div>
            <div className="card-content">
              <h2>채용공고 모니터</h2>
              <p>관심 있는 채용공고만 모아서 매일 업데이트</p>
              <div className="card-features">
                <span>• 맞춤형 필터링</span>
                <span>• 매일 자동 업데이트</span>
                <span>• 다중 사이트 수집</span>
              </div>
            </div>
            <div className="card-arrow">→</div>
          </Link>
        </div>
        
        <div className="home-footer">
          <div className="stats">
            <div className="stat-item">
              <div className="stat-number">3</div>
              <div className="stat-label">서비스</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">모니터링</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">실시간</div>
              <div className="stat-label">업데이트</div>
            </div>
          </div>
          
          <p className="creator">made by jwkim1001</p>
        </div>
      </div>
    </div>
  );
};

export default Home;