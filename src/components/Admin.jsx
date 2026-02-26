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

  // 오늘 뭐먹지 - 카테고리 관리 상태 (categorized 레스토랑 수정)
  const [categorizedRestaurants, setCategorizedRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [editCategoryRecordId, setEditCategoryRecordId] = useState(null);
  const [editCategoryData, setEditCategoryData] = useState({
    mealTime: '', mealKind: '', location: '', location2: '',
    drinkYN: 'N', category: '', signature: '', partyNumMin: 1, partyNumMax: 10
  });
  const [saveMessage, setSaveMessage] = useState('');
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.loginId !== 'admin')) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // 카테고리가 등록된 레스토랑 목록 로드
  // restaurantCategoryTable.r_id → restaurantDataTable.id(PK) 관계
  const loadCategorizedRestaurants = async () => {
    setLoadingRestaurants(true);
    try {
      // 1. restaurantCategoryTable에서 r_id 목록 가져오기
      const { data: cats, error: catError } = await supabase
        .from('restaurantCategoryTable')
        .select('r_id')
        .not('r_id', 'is', null);
      if (catError) throw catError;

      const uniqueRIds = [...new Set((cats || []).map(c => c.r_id))];
      if (uniqueRIds.length === 0) {
        setCategorizedRestaurants([]);
        return;
      }

      // 2. restaurantDataTable.id(PK) 기준으로 이름 가져오기
      const { data: restaurants, error: rError } = await supabase
        .from('restaurantDataTable')
        .select('id, name')
        .in('id', uniqueRIds)
        .order('name', { ascending: true });
      if (rError) throw rError;

      setCategorizedRestaurants(restaurants || []);
    } catch (e) {
      console.error('카테고리 목록 로드 실패:', e);
    } finally {
      setLoadingRestaurants(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'food') {
      loadCategorizedRestaurants();
    }
  }, [activeTab]);

  // 레스토랑 선택 시 restaurantCategoryTable에서 기존 값 불러오기
  const handleRestaurantSelect = async (id) => {
    setSelectedRestaurantId(id);
    setSaveMessage('');
    if (!id) {
      setEditCategoryRecordId(null);
      setEditCategoryData({ mealTime: '', mealKind: '', location: '', location2: '', drinkYN: 'N', category: '', signature: '', partyNumMin: 1, partyNumMax: 10 });
      return;
    }
    const { data, error } = await supabase
      .from('restaurantCategoryTable')
      .select('*')
      .eq('r_id', parseInt(id))
      .limit(1)
      .single();
    if (!error && data) {
      setEditCategoryRecordId(data.id);
      setEditCategoryData({
        mealTime: data.mealTime || '',
        mealKind: data.mealKind || '',
        location: data.location || '',
        location2: data.location2 || '',
        drinkYN: data.drinkYN || 'N',
        category: data.category || '',
        signature: data.signature || '',
        partyNumMin: data.partyNumMin ?? 1,
        partyNumMax: data.partyNumMax ?? 10,
      });
    }
  };

  // 카테고리 수정 저장
  const handleSaveCategory = async () => {
    setSaveMessage('');
    if (!editCategoryRecordId) { setSaveMessage('레스토랑을 선택해주세요.'); return; }
    if (!editCategoryData.location || !editCategoryData.location2 || !editCategoryData.category) {
      setSaveMessage('대분류, 소분류, 카테고리는 필수 항목입니다.');
      return;
    }
    try {
      const { error } = await supabase
        .from('restaurantCategoryTable')
        .update({
          mealTime: editCategoryData.mealTime || null,
          mealKind: editCategoryData.mealKind || null,
          location: editCategoryData.location,
          location2: editCategoryData.location2,
          drinkYN: editCategoryData.drinkYN,
          category: editCategoryData.category,
          signature: editCategoryData.signature || null,
          partyNumMin: editCategoryData.partyNumMin,
          partyNumMax: editCategoryData.partyNumMax,
        })
        .eq('id', editCategoryRecordId);
      if (error) { setSaveMessage('수정 실패: ' + error.message); return; }
      setSaveMessage('수정이 완료되었습니다!');
    } catch (e) {
      console.error('카테고리 수정 오류:', e);
      setSaveMessage('수정 중 오류가 발생했습니다.');
    }
  };

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

  if (authLoading) {
    return <div className="admin"><div className="loading">로딩 중...</div></div>;
  }

  if (!user || user.loginId !== 'admin') {
    return null;
  }

  return (
    <div className="admin">
      <div className="admin-container">
        <h1>📊 관리자 페이지</h1>

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
              <div className="food-admin-card">
                <h2>✏️ 오늘 뭐먹지 - 카테고리 관리</h2>
                <p className="description">
                  restaurantCategoryTable에 등록된 레스토랑의 카테고리를 수정합니다.
                </p>

                {loadingRestaurants ? (
                  <div className="loading">데이터 로딩 중...</div>
                ) : (
                  <div className="form-section">
                    <div className="form-group">
                      <label>레스토랑 선택 *</label>
                      <select
                        value={selectedRestaurantId}
                        onChange={(e) => handleRestaurantSelect(e.target.value)}
                        className="select-box"
                      >
                        <option value="">레스토랑을 선택하세요</option>
                        {categorizedRestaurants.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    {editCategoryRecordId && (
                      <>
                        <div className="form-group">
                          <label>대분류 *</label>
                          <input type="text" value={editCategoryData.location}
                            onChange={(e) => setEditCategoryData(prev => ({ ...prev, location: e.target.value, location2: '' }))}
                            className="input-box" />
                        </div>
                        <div className="form-group">
                          <label>소분류 *</label>
                          <input type="text" value={editCategoryData.location2}
                            onChange={(e) => setEditCategoryData(prev => ({ ...prev, location2: e.target.value }))}
                            className="input-box" />
                        </div>
                        <div className="form-group">
                          <label>카테고리 *</label>
                          <input type="text" value={editCategoryData.category}
                            onChange={(e) => setEditCategoryData(prev => ({ ...prev, category: e.target.value }))}
                            className="input-box" />
                        </div>
                        <div className="form-group">
                          <label>점심/저녁</label>
                          <select value={editCategoryData.mealTime}
                            onChange={(e) => setEditCategoryData(prev => ({ ...prev, mealTime: e.target.value }))}
                            className="select-box">
                            <option value="">선택하세요</option>
                            <option value="점심">점심</option>
                            <option value="저녁">저녁</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>식사 종류</label>
                          <input type="text" value={editCategoryData.mealKind}
                            onChange={(e) => setEditCategoryData(prev => ({ ...prev, mealKind: e.target.value }))}
                            className="input-box" />
                        </div>
                        <div className="form-group">
                          <label>주류 가능 여부</label>
                          <select value={editCategoryData.drinkYN}
                            onChange={(e) => setEditCategoryData(prev => ({ ...prev, drinkYN: e.target.value }))}
                            className="select-box">
                            <option value="Y">Y (가능)</option>
                            <option value="N">N (불가능)</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>시그니처 메뉴</label>
                          <input type="text" value={editCategoryData.signature}
                            onChange={(e) => setEditCategoryData(prev => ({ ...prev, signature: e.target.value }))}
                            placeholder="예: 제육볶음" className="input-box" />
                        </div>
                        <div className="party-num-group">
                          <div className="form-group">
                            <label>최소 인원</label>
                            <input type="number" min="1" value={editCategoryData.partyNumMin}
                              onChange={(e) => setEditCategoryData(prev => ({ ...prev, partyNumMin: parseInt(e.target.value) || 1 }))} />
                          </div>
                          <div className="form-group">
                            <label>최대 인원</label>
                            <input type="number" min="1" value={editCategoryData.partyNumMax}
                              onChange={(e) => setEditCategoryData(prev => ({ ...prev, partyNumMax: parseInt(e.target.value) || 1 }))} />
                          </div>
                        </div>
                        <button onClick={handleSaveCategory} className="save-btn">
                          💾 수정 저장하기
                        </button>
                      </>
                    )}

                    {saveMessage && (
                      <div className={`save-message ${saveMessage.includes('완료') ? 'success' : 'error'}`}>
                        {saveMessage}
                      </div>
                    )}
                  </div>
                )}
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
