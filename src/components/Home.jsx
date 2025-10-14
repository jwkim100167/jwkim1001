import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  console.log('Home 컴포넌트 렌더링됨');
  
  return (
    <div className="home">
      <div className="home-container">
        <div className="home-header">
          <h1>🎯 JW 서비스 허브</h1>
          <p>다양한 웹 서비스를 한 곳에서</p>
        </div>

        <div className="navigation-cards">
          <Link to="/lotto" className="nav-card lotto-card">
            <div className="card-icon">🎰</div>
            <div className="card-content">
              <h2>로또 서비스</h2>
              <p>로또 번호 생성과 당첨번호 확인을 한 곳에서</p>
              <div className="card-features">
                <span>• 스마트 번호 생성</span>
                <span>• 전체 회차 데이터</span>
                <span>• 다양한 옵션 설정</span>
              </div>
            </div>
            <div className="card-arrow">→</div>
          </Link>

          <Link to="/momok" className="nav-card momok-card">
            <div className="card-icon">🍽️</div>
            <div className="card-content">
              <h2>MOMOK</h2>
              <p>오늘 점심 뭐 먹지? 고민 끝!</p>
              <div className="card-features">
                <span>• 랜덤 메뉴 추천</span>
                <span>• 싫어하는 음식 필터링</span>
                <span>• 네이버 지도 연동</span>
              </div>
            </div>
            <div className="card-arrow">→</div>
          </Link>

          <div className="nav-card dashboard-card disabled-card">
            <div className="card-icon">📈</div>
            <div className="card-content">
              <h2>스마트 대시보드</h2>
              <p>환율, 공포와 탐욕 지수, VIX 지수를 실시간으로 모니터링하세요</p>
              <div className="card-features">
                <span>• 실시간 데이터</span>
                <span>• 자동 알림</span>
                <span>• 범위 변경 감지</span>
              </div>
              <div className="service-status">서비스 준비중</div>
            </div>
          </div>

          <div className="nav-card jobs-card disabled-card">
            <div className="card-icon">💼</div>
            <div className="card-content">
              <h2>채용공고 모니터</h2>
              <p>관심 있는 채용공고만 모아서 매일 업데이트</p>
              <div className="card-features">
                <span>• 맞춤형 필터링</span>
                <span>• 매일 자동 업데이트</span>
                <span>• 다중 사이트 수집</span>
              </div>
              <div className="service-status">서비스 준비중</div>
            </div>
          </div>
        </div>

        <div className="home-footer">
          <div className="stats">
            <div className="stat-item">
              <div className="stat-number">2</div>
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