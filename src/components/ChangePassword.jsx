import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { changePassword, finishLogin, isValidPassword } from '../services/authService';
import './ChangePassword.css';

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginDirect } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { userId, loginId, userName, createdAt, status } = location.state || {};

  useEffect(() => {
    if (!userId || !loginId) {
      navigate('/login');
    }
  }, [userId, loginId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isValidPassword(newPassword)) {
      setError('비밀번호는 3종류 8자 이상 또는 2종류 10자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    const result = await changePassword(userId, newPassword);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    // 비밀번호 변경 성공 → status에 따라 분기
    if (status === 'ONLINE') {
      const user = await finishLogin(userId, loginId, createdAt, userName);
      loginDirect(user);
      navigate('/');
    } else {
      navigate('/verify', { state: { userId, loginId, userName, createdAt } });
    }
  };

  const getStrengthInfo = () => {
    if (!newPassword) return null;
    const types = [
      /[A-Z]/.test(newPassword),
      /[a-z]/.test(newPassword),
      /[0-9]/.test(newPassword),
      /[^A-Za-z0-9]/.test(newPassword),
    ].filter(Boolean).length;
    const len = newPassword.length;

    if (types >= 3 && len >= 8) {
      return { valid: true, text: '사용 가능한 비밀번호입니다.' };
    }
    if (types >= 3) return { valid: false, text: `3종류 충족 (${len}/8자)` };
    return { valid: false, text: `${types}종류 충족 — 종류를 더 추가하세요 (3종류 필요)` };
  };

  const strength = getStrengthInfo();

  return (
    <div className="change-pw-page">
      <div className="change-pw-container">
        <h2>비밀번호 변경</h2>
        <p className="change-pw-desc">
          보안 기준에 맞는 새 비밀번호를 설정해주세요.
        </p>

        <div className="pw-rules">
          <p>비밀번호 조건</p>
          <ul>
            <li>영문 대문자·소문자·숫자·특수문자 중 <strong>3종류 이상 + 8자 이상</strong></li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="change-pw-form">
          <div className="form-group">
            <label htmlFor="newPassword">새 비밀번호</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="새 비밀번호를 입력하세요"
              required
              autoFocus
            />
            {strength && (
              <span className={`pw-strength ${strength.valid ? 'valid' : 'invalid'}`}>
                {strength.text}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">비밀번호 확인</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호를 다시 입력하세요"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="change-pw-btn" disabled={loading}>
            {loading ? '변경 중...' : '비밀번호 변경'}
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
