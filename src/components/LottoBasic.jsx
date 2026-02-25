import React from 'react';
import { useNavigate } from 'react-router-dom';

const LottoBasic = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      textAlign: 'center',
      padding: '20px',
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎰</div>
      <h1 style={{ fontSize: '2rem', marginBottom: '12px' }}>로또 서비스</h1>
      <p style={{ opacity: 0.8, marginBottom: '30px' }}>서비스를 준비 중입니다.</p>
      <button
        onClick={() => navigate('/')}
        style={{
          padding: '10px 24px',
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.5)',
          borderRadius: '8px',
          color: 'white',
          fontSize: '0.95rem',
          cursor: 'pointer',
        }}
      >
        홈으로
      </button>
    </div>
  );
};

export default LottoBasic;
