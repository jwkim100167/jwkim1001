import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(loginId, password);

    if (result.success) {
      navigate('/');
    } else if (result.needsPasswordChange) {
      navigate('/change-password', {
        state: {
          userId: result.userId,
          loginId: result.loginId,
          userName: result.userName,
          createdAt: result.createdAt,
          status: result.status,
        },
      });
    } else if (result.needsVerification) {
      navigate('/verify', {
        state: {
          userId: result.userId,
          loginId: result.loginId,
          userName: result.userName,
          createdAt: result.createdAt,
        },
      });
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>로그인</h2>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="loginId">아이디</label>
            <input
              type="text"
              id="loginId"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="아이디를 입력하세요"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>

          <button
            type="button"
            className="register-link-btn"
            onClick={() => navigate('/register')}
          >
            회원가입
          </button>

          <button
            type="button"
            className="back-btn"
            onClick={() => navigate('/')}
          >
            홈으로 돌아가기
          </button>
        </form>
      </div>
    </div>
  );
}
