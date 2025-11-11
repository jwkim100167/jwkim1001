import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Momok.css';

const Momok = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  // 각 칸의 상태 관리
  const [grid, setGrid] = useState({
    1: '술 여부',
    2: '카테고리',
    3: '파티원',
    4: '',
    5: '위치',
    6: '',
    7: '',
    8: '',
    9: ''
  });

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="momok">
      <div className="momok-container">
        <div className="auth-buttons">
          {isAuthenticated ? (
            <>
              <span className="user-greeting">👋 {user.loginId}님</span>
              <button className="auth-btn mypage-btn" onClick={() => navigate('/mypage')}>
                마이페이지
              </button>
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

        <div className="momok-header">
          <h1>🍽️ MOMOK</h1>
          <p>오늘 점심 뭐 먹지? 고민 끝!</p>
        </div>

        <div className="grid-container">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <div key={num} className={`grid-item grid-item-${num}`}>
              <div className="grid-number">{num}</div>
              <div className="grid-content">{grid[num]}</div>
            </div>
          ))}
        </div>

        <button className="back-btn" onClick={() => navigate('/')}>
          ← 홈으로 돌아가기
        </button>

        <div className="momok-footer">
          <p>made by jwkim1001</p>
        </div>
      </div>
    </div>
  );
};

export default Momok;
