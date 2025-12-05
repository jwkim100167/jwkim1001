import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Komom.css';

const Komom = () => {
  const navigate = useNavigate();

  return (
    <div className="komom">
      <div className="komom-container">
        <div className="komom-header">
          <h1>🍽️ KOMOM</h1>
          <p>준비 중입니다...</p>
        </div>

        <div className="coming-soon">
          <div className="coming-soon-icon">🚧</div>
          <h2>Coming Soon</h2>
          <p>새로운 기능을 준비하고 있습니다.</p>
        </div>

        <button className="back-btn" onClick={() => navigate('/')}>
          ← 홈으로 돌아가기
        </button>

        <div className="komom-footer">
          <p>made by jwkim1001</p>
        </div>
      </div>
    </div>
  );
};

export default Komom;
