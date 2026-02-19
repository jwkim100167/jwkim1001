import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, isValidPassword } from '../services/authService';
import './Register.css';

export default function Register() {
  const [loginId, setLoginId] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const getStrengthInfo = () => {
    if (!password) return null;
    const types = [
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ].filter(Boolean).length;
    const len = password.length;

    if (types >= 3 && len >= 8) {
      return { valid: true, text: '사용 가능한 비밀번호입니다.' };
    }
    if (types >= 3) return { valid: false, text: `3종류 충족 (${len}/8자)` };
    return { valid: false, text: `${types}종류 충족 — 종류를 더 추가하세요 (3종류 필요)` };
  };

  const validate = () => {
    if (!userName.trim()) return '이름을 입력해주세요.';
    if (loginId.length < 3) return '아이디는 3자 이상이어야 합니다.';
    if (!/^[a-zA-Z0-9_]+$/.test(loginId)) return '아이디는 영문, 숫자, 밑줄(_)만 사용 가능합니다.';
    if (!isValidPassword(password)) return '비밀번호는 3종류 8자 이상이어야 합니다.';
    if (password !== passwordConfirm) return '비밀번호가 일치하지 않습니다.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const result = await register(loginId, password, userName.trim());
    setLoading(false);

    if (result.success) {
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
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <h2>회원가입</h2>

        <div className="pw-rules">
          <p>비밀번호 조건</p>
          <ul>
            <li>영문 대문자·소문자·숫자·특수문자 중 <strong>3종류 이상 + 8자 이상</strong></li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="userName">이름</label>
            <input
              type="text"
              id="userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="사용할 이름을 입력하세요"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="loginId">아이디</label>
            <input
              type="text"
              id="loginId"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="영문, 숫자, 밑줄 3자 이상"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="3종류 8자 이상 또는 2종류 10자 이상"
              required
            />
            {(() => { const s = getStrengthInfo(); return s ? (
              <span className={`pw-strength ${s.valid ? 'valid' : 'invalid'}`}>{s.text}</span>
            ) : null; })()}
          </div>

          <div className="form-group">
            <label htmlFor="passwordConfirm">비밀번호 확인</label>
            <input
              type="password"
              id="passwordConfirm"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호를 다시 입력하세요"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button type="submit" className="register-btn" disabled={loading}>
            {loading ? '처리 중...' : '회원가입'}
          </button>

          <button
            type="button"
            className="back-btn"
            onClick={() => navigate('/login')}
          >
            로그인으로 돌아가기
          </button>
        </form>
      </div>
    </div>
  );
}
