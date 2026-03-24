import React from 'react';
import { useNavigate } from 'react-router-dom';
import './KboLanding.css';

export default function KboLanding() {
  const navigate = useNavigate();

  return (
    <div className="kbo-landing-page">
      <div className="kbo-landing-container">
        <button className="landing-back-btn" onClick={() => navigate('/')}>← 홈</button>

        <div className="landing-header">
          <div className="landing-icon">⚾</div>
          <h1>2026 KBO 순위 예측</h1>
        </div>

        <p className="landing-question">예측에 참여하셨나요?</p>

        <div className="landing-choices">
          <button className="choice-card choice-no" onClick={() => navigate('/kbo-predict/form')}>
            <span className="choice-emoji">✏️</span>
            <span className="choice-title">아직 안 했어요</span>
            <span className="choice-desc">지금 예측하러 가기</span>
          </button>

          <button className="choice-card choice-yes" onClick={() => navigate('/kbo-predict/result')}>
            <span className="choice-emoji">🏆</span>
            <span className="choice-title">예측했어요</span>
            <span className="choice-desc">내 점수 확인하기</span>
          </button>
        </div>
      </div>
    </div>
  );
}
