import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import './Admin.css';

export default function Admin() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');

  // 비밀번호 변경 상태
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.loginId !== 'admin')) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // 비밀번호 변경 핸들러
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMessage('');

    if (newPassword !== confirmPassword) {
      setPasswordMessage('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (newPassword.length < 4) {
      setPasswordMessage('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }

    try {
      // 현재 비밀번호 확인
      const { data: userData, error: checkError } = await supabase
        .from('userTable')
        .select('password')
        .eq('id', user.id)
        .single();

      if (checkError || !userData) {
        setPasswordMessage('사용자 정보를 찾을 수 없습니다.');
        return;
      }

      if (userData.password !== currentPassword) {
        setPasswordMessage('현재 비밀번호가 일치하지 않습니다.');
        return;
      }

      // 비밀번호 업데이트
      const { error: updateError } = await supabase
        .from('userTable')
        .update({ password: newPassword })
        .eq('id', user.id);

      if (updateError) {
        setPasswordMessage('비밀번호 변경에 실패했습니다.');
        return;
      }

      setPasswordMessage('비밀번호가 성공적으로 변경되었습니다.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      setPasswordMessage('비밀번호 변경 중 오류가 발생했습니다.');
    }
  };

  // 인증 로딩 중
  if (authLoading) {
    return <div className="admin"><div className="loading">로딩 중...</div></div>;
  }

  // admin이 아니면 null 반환 (useEffect에서 리다이렉트)
  if (!user || user.loginId !== 'admin') {
    return null;
  }

  return (
    <div className="admin">
      <div className="admin-container">
        <h1>📊 관리자 페이지</h1>

        {/* 탭 네비게이션 */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            기본정보
          </button>
          <button
            className={`tab-btn ${activeTab === 'lotto' ? 'active' : ''}`}
            onClick={() => navigate('/lottoadmin')}
          >
            로또
          </button>
          <button
            className={`tab-btn ${activeTab === 'food' ? 'active' : ''}`}
            onClick={() => setActiveTab('food')}
          >
            오늘 뭐먹지
          </button>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="tab-content">
          {/* 기본정보 탭 */}
          {activeTab === 'profile' && (
            <div className="profile-tab">
              <div className="user-info-card">
                <h2>관리자 정보</h2>
                <div className="info-item">
                  <span className="label">아이디:</span>
                  <span className="value">{user.loginId}</span>
                </div>
                <div className="info-item">
                  <span className="label">가입일:</span>
                  <span className="value">{new Date(user.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>

              <div className="password-change-card">
                <h2>비밀번호 변경</h2>
                <form onSubmit={handlePasswordChange}>
                  <div className="form-group">
                    <label>현재 비밀번호</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>새 비밀번호</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>새 비밀번호 확인</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  {passwordMessage && (
                    <div className={`password-message ${passwordMessage.includes('성공') ? 'success' : 'error'}`}>
                      {passwordMessage}
                    </div>
                  )}
                  <button type="submit" className="change-password-btn">
                    비밀번호 변경
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 오늘 뭐먹지 탭 */}
          {activeTab === 'food' && (
            <div className="food-tab">
              <div className="coming-soon">
                <h2>🍽️ 오늘 뭐먹지</h2>
                <p>기획 중입니다...</p>
              </div>
            </div>
          )}
        </div>

        <div className="action-buttons">
          <button className="home-btn" onClick={() => navigate('/')}>
            🏠 홈으로
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            🚪 로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
