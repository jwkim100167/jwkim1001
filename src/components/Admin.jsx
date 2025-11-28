import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { restaurantDataTable, restaurantCategoryTable } from '../data/restaurantData';
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

  // 오늘 뭐먹지 관리 상태
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [newCategory, setNewCategory] = useState({
    location: '',
    location2: '',
    drinkYN: 'N',
    category: '',
    signature: '',
    partyNumMin: 1,
    partyNumMax: 10
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [restaurantDataFromDB, setRestaurantDataFromDB] = useState([]);
  const [restaurantCategoryFromDB, setRestaurantCategoryFromDB] = useState([]);
  const [uncategorizedRestaurants, setUncategorizedRestaurants] = useState([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.loginId !== 'admin')) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // DB에서 레스토랑 데이터 가져오기
  useEffect(() => {
    const fetchRestaurantData = async () => {
      if (activeTab === 'food') {
        setLoadingRestaurants(true);
        try {
          // restaurantDataTable 가져오기
          const { data: dataTable, error: dataError } = await supabase
            .from('restaurantDataTable')
            .select('*');

          if (dataError) {
            console.error('restaurantDataTable 조회 오류:', dataError);
          } else {
            setRestaurantDataFromDB(dataTable || []);
          }

          // restaurantCategoryTable 가져오기
          const { data: categoryTable, error: categoryError } = await supabase
            .from('restaurantCategoryTable')
            .select('*');

          if (categoryError) {
            console.error('restaurantCategoryTable 조회 오류:', categoryError);
          } else {
            setRestaurantCategoryFromDB(categoryTable || []);
          }

          // 비교하여 uncategorized 항목 찾기
          if (dataTable && categoryTable) {
            console.log('restaurantDataTable:', dataTable);
            console.log('restaurantCategoryTable:', categoryTable);

            // 첫 번째 항목의 키 확인
            if (dataTable.length > 0) {
              console.log('restaurantDataTable 첫 항목 키:', Object.keys(dataTable[0]));
            }
            if (categoryTable.length > 0) {
              console.log('restaurantCategoryTable 첫 항목 키:', Object.keys(categoryTable[0]));
            }

            // ID 컬럼명 자동 감지 (r_id 또는 id)
            const dataIdKey = dataTable.length > 0 && 'r_id' in dataTable[0] ? 'r_id' : 'id';
            const catIdKey = categoryTable.length > 0 && 'r_id' in categoryTable[0] ? 'r_id' : 'id';

            console.log('사용할 ID 컬럼:', { dataIdKey, catIdKey });

            // 카테고리 테이블의 ID를 Set으로 만들어서 빠르게 검색
            const categoryIds = new Set(categoryTable.map(cat => {
              const id = cat[catIdKey];
              return typeof id === 'number' ? id : parseInt(id);
            }));

            console.log('categoryIds Set:', categoryIds);

            // uncategorized 필터링
            // admin은 모든 레스토랑, 일반 사용자는 본인이 입력한 레스토랑만
            let filteredByUser = dataTable;
            if (user.loginId !== 'admin') {
              filteredByUser = dataTable.filter(data => {
                const dataUserId = data.u_id;
                const userId = user.id;
                return dataUserId === userId;
              });
              console.log(`사용자 ${user.loginId} (ID: ${user.id})가 입력한 레스토랑:`, filteredByUser);
            } else {
              console.log('Admin 사용자: 모든 레스토랑 표시');
            }

            const uncategorized = filteredByUser.filter(data => {
              const dataId = data[dataIdKey];
              const normalizedId = typeof dataId === 'number' ? dataId : parseInt(dataId);
              const hasCategory = categoryIds.has(normalizedId);

              if (!hasCategory) {
                console.log(`ID ${normalizedId} (${data.name})는 카테고리가 없음`);
              }

              return !hasCategory;
            });

            console.log('Uncategorized restaurants:', uncategorized);
            setUncategorizedRestaurants(uncategorized);
          }
        } catch (error) {
          console.error('데이터 조회 오류:', error);
        } finally {
          setLoadingRestaurants(false);
        }
      }
    };

    fetchRestaurantData();
  }, [activeTab]);

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

  // 레스토랑 선택 핸들러
  const handleRestaurantSelect = (e) => {
    const value = e.target.value;

    if (!value) {
      setSelectedRestaurant('');
      return;
    }

    const r_id = parseInt(value);
    setSelectedRestaurant(r_id);

    // 기본값 설정 (레스토랑 찾기 여부와 관계없이)
    setNewCategory({
      location: '',
      location2: '',
      drinkYN: 'N',
      category: '',
      signature: '',
      partyNumMin: 1,
      partyNumMax: 10
    });
  };

  // 카테고리 입력 핸들러
  const handleCategoryChange = (field, value) => {
    let processedValue = value;

    // 숫자 필드는 parseInt 처리
    if (field === 'partyNumMin' || field === 'partyNumMax') {
      processedValue = value === '' ? 1 : parseInt(value);
      if (isNaN(processedValue)) {
        processedValue = 1;
      }
    }

    setNewCategory(prev => ({
      ...prev,
      [field]: processedValue
    }));
  };

  // 카테고리 추가 핸들러
  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      // 카테고리 필드에 새 카테고리 설정
      setNewCategory(prev => ({
        ...prev,
        category: newCategoryName.trim()
      }));
      setNewCategoryName('');
    }
  };

  // 기존 데이터에서 유니크한 location 목록 가져오기
  const getUniqueLocations = () => {
    const locations = restaurantCategoryFromDB.map(item => item.location).filter(Boolean);
    return [...new Set(locations)].sort();
  };

  // 기존 데이터에서 유니크한 location2 목록 가져오기 (선택된 location에 따라 필터링)
  const getUniqueLocation2s = () => {
    let location2s;
    if (newCategory.location && newCategory.location !== '추후 입력') {
      // 선택된 location에 해당하는 location2만 필터링
      location2s = restaurantCategoryFromDB
        .filter(item => item.location === newCategory.location)
        .map(item => item.location2)
        .filter(Boolean);
    } else {
      // location이 선택되지 않았거나 '추후 입력'이면 모든 location2 표시
      location2s = restaurantCategoryFromDB.map(item => item.location2).filter(Boolean);
    }
    return [...new Set(location2s)].sort();
  };

  // 기존 데이터에서 유니크한 category 목록 가져오기
  const getUniqueCategories = () => {
    const categories = restaurantCategoryFromDB.map(item => item.category).filter(Boolean);
    return [...new Set(categories)].sort();
  };

  // 저장 핸들러
  const handleSaveCategory = async () => {
    setSaveMessage('');

    if (!selectedRestaurant) {
      setSaveMessage('레스토랑을 선택해주세요.');
      return;
    }

    if (!newCategory.location || !newCategory.location2 || !newCategory.category) {
      setSaveMessage('필수 항목(location, location2, category)을 모두 입력해주세요.');
      return;
    }

    try {
      // 선택한 레스토랑의 이름 가져오기
      const selectedRestaurantData = restaurantDataFromDB.find(r => {
        const rid = r.r_id || r.id;
        return rid === selectedRestaurant;
      });

      const restaurantName = selectedRestaurantData ? selectedRestaurantData.name : '';

      // restaurantCategoryTable에 데이터 삽입
      const { error } = await supabase
        .from('restaurantCategoryTable')
        .insert([{
          r_id: selectedRestaurant,
          r_name: restaurantName,
          location: newCategory.location,
          location2: newCategory.location2,
          drinkYN: newCategory.drinkYN,
          category: newCategory.category,
          signature: newCategory.signature,
          partyNumMin: newCategory.partyNumMin,
          partyNumMax: newCategory.partyNumMax
        }]);

      if (error) {
        setSaveMessage('저장에 실패했습니다: ' + error.message);
        return;
      }

      setSaveMessage('성공적으로 저장되었습니다!');

      // 폼 초기화
      setSelectedRestaurant('');
      setNewCategory({
        location: '',
        location2: '',
        drinkYN: 'N',
        category: '',
        signature: '',
        partyNumMin: 1,
        partyNumMax: 10
      });

      // 데이터 다시 조회하여 uncategorized 리스트 업데이트
      const { data: categoryTable } = await supabase
        .from('restaurantCategoryTable')
        .select('*');

      if (categoryTable) {
        setRestaurantCategoryFromDB(categoryTable);

        // ID 컬럼명 자동 감지
        const dataIdKey = restaurantDataFromDB.length > 0 && 'r_id' in restaurantDataFromDB[0] ? 'r_id' : 'id';
        const catIdKey = categoryTable.length > 0 && 'r_id' in categoryTable[0] ? 'r_id' : 'id';

        // 카테고리 테이블의 ID를 Set으로 만들어서 빠르게 검색
        const categoryIds = new Set(categoryTable.map(cat => {
          const id = cat[catIdKey];
          return typeof id === 'number' ? id : parseInt(id);
        }));

        // uncategorized 필터링
        const uncategorized = restaurantDataFromDB.filter(data => {
          const dataId = data[dataIdKey];
          const normalizedId = typeof dataId === 'number' ? dataId : parseInt(dataId);
          return !categoryIds.has(normalizedId);
        });

        setUncategorizedRestaurants(uncategorized);
      }
    } catch (error) {
      console.error('저장 오류:', error);
      setSaveMessage('저장 중 오류가 발생했습니다.');
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
              <div className="food-admin-card">
                <h2>🍽️ 오늘 뭐먹지 - 카테고리 관리</h2>
                <p className="description">
                  restaurantDataTable에는 있지만 restaurantCategoryTable에 없는 항목을 추가할 수 있습니다.
                </p>

                {loadingRestaurants ? (
                  <div className="loading">데이터 로딩 중...</div>
                ) : uncategorizedRestaurants.length === 0 ? (
                  <div className="info-message">
                    모든 레스토랑에 카테고리가 설정되어 있습니다! ✅
                  </div>
                ) : (
                  <>
                    <div className="form-section">
                      {/* 레스토랑 선택 */}
                      <div className="form-group">
                        <label>레스토랑 선택</label>
                        <select
                          value={selectedRestaurant}
                          onChange={handleRestaurantSelect}
                          className="select-box"
                        >
                          <option value="">-- 레스토랑을 선택하세요 --</option>
                          {uncategorizedRestaurants.map(restaurant => {
                            const rid = restaurant.r_id || restaurant.id;
                            return (
                              <option key={rid} value={rid}>
                                {restaurant.name} (ID: {rid})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {selectedRestaurant && (
                        <>
                          {/* Location */}
                          <div className="form-group">
                            <label>Location (대분류) *</label>
                            <select
                              value={newCategory.location}
                              onChange={(e) => handleCategoryChange('location', e.target.value)}
                              className="select-box"
                            >
                              <option value="">-- 대분류 선택 --</option>
                              <option value="추후 입력">추후 입력</option>
                              {getUniqueLocations().map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                              ))}
                            </select>
                          </div>

                          {/* Location2 */}
                          <div className="form-group">
                            <label>Location2 (소분류) *</label>
                            <select
                              value={newCategory.location2}
                              onChange={(e) => handleCategoryChange('location2', e.target.value)}
                              className="select-box"
                            >
                              <option value="">-- 소분류 선택 --</option>
                              <option value="추후 입력">추후 입력</option>
                              {getUniqueLocation2s().map(loc2 => (
                                <option key={loc2} value={loc2}>{loc2}</option>
                              ))}
                            </select>
                          </div>

                          {/* 술 여부 */}
                          <div className="form-group">
                            <label>술 여부</label>
                            <select
                              value={newCategory.drinkYN}
                              onChange={(e) => handleCategoryChange('drinkYN', e.target.value)}
                              className="select-box"
                            >
                              <option value="N">N (술 안됨)</option>
                              <option value="Y">Y (술 가능)</option>
                            </select>
                          </div>

                          {/* 카테고리 선택/추가 */}
                          <div className="form-group">
                            <label>카테고리 *</label>
                            <div className="category-input-group">
                              <select
                                value={newCategory.category}
                                onChange={(e) => handleCategoryChange('category', e.target.value)}
                                className="select-box"
                              >
                                <option value="">-- 기존 카테고리 선택 --</option>
                                {getUniqueCategories().map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                              <span className="or-text">또는</span>
                              <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="새 카테고리 입력"
                                className="new-category-input"
                              />
                              <button
                                type="button"
                                onClick={handleAddCategory}
                                className="add-category-btn"
                              >
                                추가
                              </button>
                            </div>
                            {newCategory.category && (
                              <div className="selected-category">
                                선택됨: <strong>{newCategory.category}</strong>
                              </div>
                            )}
                          </div>

                          {/* Signature */}
                          <div className="form-group">
                            <label>시그니처 메뉴</label>
                            <input
                              type="text"
                              value={newCategory.signature}
                              onChange={(e) => handleCategoryChange('signature', e.target.value)}
                              placeholder="예: 불고기, 초밥, 파스타"
                            />
                          </div>

                          {/* 파티 인원 */}
                          <div className="form-group">
                            <label>파티 인원 (최소 ~ 최대)</label>
                            <div className="party-num-group">
                              <input
                                type="number"
                                value={isNaN(newCategory.partyNumMin) ? 1 : newCategory.partyNumMin}
                                onChange={(e) => handleCategoryChange('partyNumMin', e.target.value)}
                                min="1"
                                max="100"
                              />
                              <span>~</span>
                              <input
                                type="number"
                                value={isNaN(newCategory.partyNumMax) ? 10 : newCategory.partyNumMax}
                                onChange={(e) => handleCategoryChange('partyNumMax', e.target.value)}
                                min="1"
                                max="100"
                              />
                            </div>
                          </div>

                          {/* 저장 버튼 */}
                          <button
                            onClick={handleSaveCategory}
                            className="save-btn"
                          >
                            💾 저장하기
                          </button>

                          {saveMessage && (
                            <div className={`save-message ${saveMessage.includes('성공') ? 'success' : 'error'}`}>
                              {saveMessage}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
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
