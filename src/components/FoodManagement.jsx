import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import './FoodManagement.css';

export default function FoodManagement({ user }) {
  const [foodSubMenu, setFoodSubMenu] = useState('category');

  // 카테고리 관리 상태
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

  // 레스토랑 추가 상태
  const [newRestaurant, setNewRestaurant] = useState({
    name: '',
    address: '',
    px: '',
    py: '',
    mcidName: '',
    link: ''
  });
  const [restaurantSaveMessage, setRestaurantSaveMessage] = useState('');

  // DB에서 레스토랑 데이터 가져오기
  useEffect(() => {
    fetchRestaurantData();
  }, [user]);

  const fetchRestaurantData = async () => {
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
        // ID 컬럼명 자동 감지
        const dataIdKey = dataTable.length > 0 && 'r_id' in dataTable[0] ? 'r_id' : 'id';
        const catIdKey = categoryTable.length > 0 && 'r_id' in categoryTable[0] ? 'r_id' : 'id';

        // 카테고리 테이블의 ID를 Set으로 만들어서 빠르게 검색
        const categoryIds = new Set(categoryTable.map(cat => {
          const id = cat[catIdKey];
          return typeof id === 'number' ? id : parseInt(id);
        }));

        // uncategorized 필터링
        // admin은 모든 레스토랑, 일반 사용자는 본인이 입력한 레스토랑만
        let filteredByUser = dataTable;
        if (user.loginId !== 'admin') {
          filteredByUser = dataTable.filter(data => {
            const dataUserId = data.u_id;
            const userId = user.id;
            return dataUserId === userId;
          });
        }

        const uncategorized = filteredByUser.filter(data => {
          const dataId = data[dataIdKey];
          const normalizedId = typeof dataId === 'number' ? dataId : parseInt(dataId);
          return !categoryIds.has(normalizedId);
        });

        setUncategorizedRestaurants(uncategorized);
      }
    } catch (error) {
      console.error('데이터 조회 오류:', error);
    } finally {
      setLoadingRestaurants(false);
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
    if (field === 'partyNumMin' || field === 'partyNumMax') {
      processedValue = value === '' ? 1 : parseInt(value);
      if (isNaN(processedValue)) {
        processedValue = 1;
      }
    }
    setNewCategory(prev => ({ ...prev, [field]: processedValue }));
  };

  // 카테고리 추가 핸들러
  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      setNewCategory(prev => ({ ...prev, category: newCategoryName.trim() }));
      setNewCategoryName('');
    }
  };

  // 유니크 값 가져오기
  const getUniqueLocations = () => {
    const locations = restaurantCategoryFromDB.map(item => item.location).filter(Boolean);
    return [...new Set(locations)].sort();
  };

  const getUniqueLocation2s = () => {
    let location2s;
    if (newCategory.location && newCategory.location !== '추후 입력') {
      location2s = restaurantCategoryFromDB
        .filter(item => item.location === newCategory.location)
        .map(item => item.location2)
        .filter(Boolean);
    } else {
      location2s = restaurantCategoryFromDB.map(item => item.location2).filter(Boolean);
    }
    return [...new Set(location2s)].sort();
  };

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
      const selectedRestaurantData = restaurantDataFromDB.find(r => {
        const rid = r.r_id || r.id;
        return rid === selectedRestaurant;
      });
      const restaurantName = selectedRestaurantData ? selectedRestaurantData.name : '';

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

      // 데이터 다시 조회
      fetchRestaurantData();
    } catch (error) {
      console.error('저장 오류:', error);
      setSaveMessage('저장 중 오류가 발생했습니다.');
    }
  };

  // 레스토랑 추가 핸들러
  const handleRestaurantChange = (field, value) => {
    setNewRestaurant(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveRestaurant = async () => {
    setRestaurantSaveMessage('');

    if (!newRestaurant.name || !newRestaurant.address) {
      setRestaurantSaveMessage('이름과 주소는 필수 항목입니다.');
      return;
    }

    try {
      const { error } = await supabase
        .from('restaurantDataTable')
        .insert([{
          name: newRestaurant.name,
          address: newRestaurant.address,
          px: newRestaurant.px ? parseFloat(newRestaurant.px) : null,
          py: newRestaurant.py ? parseFloat(newRestaurant.py) : null,
          mcidName: newRestaurant.mcidName || null,
          link: newRestaurant.link || null,
          u_id: user.id
        }]);

      if (error) {
        setRestaurantSaveMessage('저장에 실패했습니다: ' + error.message);
        return;
      }

      setRestaurantSaveMessage('레스토랑이 성공적으로 추가되었습니다!');
      setNewRestaurant({
        name: '',
        address: '',
        px: '',
        py: '',
        mcidName: '',
        link: ''
      });

      // 데이터 다시 조회
      fetchRestaurantData();
    } catch (error) {
      console.error('레스토랑 저장 오류:', error);
      setRestaurantSaveMessage('저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="food-management">
      <h2>🍽️ 오늘 뭐먹지</h2>

      {/* 서브 메뉴 */}
      <div className="food-sub-menu">
        <button
          className={`sub-menu-btn ${foodSubMenu === 'category' ? 'active' : ''}`}
          onClick={() => setFoodSubMenu('category')}
        >
          카테고리 관리
        </button>
        <button
          className={`sub-menu-btn ${foodSubMenu === 'restaurant' ? 'active' : ''}`}
          onClick={() => setFoodSubMenu('restaurant')}
        >
          레스토랑 관리
        </button>
      </div>

      {/* 카테고리 관리 */}
      {foodSubMenu === 'category' && (
        <div className="food-admin-card">
          <h3>카테고리 관리</h3>
          <p className="description">
            본인이 입력한 레스토랑 중 카테고리가 없는 항목에 카테고리를 추가할 수 있습니다.
          </p>

          {loadingRestaurants ? (
            <div className="loading">데이터 로딩 중...</div>
          ) : uncategorizedRestaurants.length === 0 ? (
            <div className="info-message">
              모든 레스토랑에 카테고리가 설정되어 있습니다! ✅
            </div>
          ) : (
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
                  <button onClick={handleSaveCategory} className="save-btn">
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
          )}
        </div>
      )}

      {/* 레스토랑 관리 */}
      {foodSubMenu === 'restaurant' && (
        <div className="food-admin-card">
          <h3>레스토랑 추가</h3>
          <p className="description">
            새로운 레스토랑을 등록할 수 있습니다.
          </p>

          <div className="form-section">
            <div className="form-group">
              <label>레스토랑 이름 *</label>
              <input
                type="text"
                value={newRestaurant.name}
                onChange={(e) => handleRestaurantChange('name', e.target.value)}
                placeholder="예: 봉천 한정식"
              />
            </div>

            <div className="form-group">
              <label>주소 *</label>
              <input
                type="text"
                value={newRestaurant.address}
                onChange={(e) => handleRestaurantChange('address', e.target.value)}
                placeholder="예: 서울시 관악구 봉천동 123-45"
              />
            </div>

            <div className="form-group">
              <label>경도 (px)</label>
              <input
                type="number"
                step="0.0000001"
                value={newRestaurant.px}
                onChange={(e) => handleRestaurantChange('px', e.target.value)}
                placeholder="예: 127.0899607"
              />
            </div>

            <div className="form-group">
              <label>위도 (py)</label>
              <input
                type="number"
                step="0.0000001"
                value={newRestaurant.py}
                onChange={(e) => handleRestaurantChange('py', e.target.value)}
                placeholder="예: 37.68101"
              />
            </div>

            <div className="form-group">
              <label>카테고리</label>
              <input
                type="text"
                value={newRestaurant.mcidName}
                onChange={(e) => handleRestaurantChange('mcidName', e.target.value)}
                placeholder="예: 음식점"
              />
            </div>

            <div className="form-group">
              <label>링크</label>
              <input
                type="text"
                value={newRestaurant.link}
                onChange={(e) => handleRestaurantChange('link', e.target.value)}
                placeholder="예: https://example.com/review1"
              />
            </div>

            <button onClick={handleSaveRestaurant} className="save-btn">
              💾 레스토랑 추가하기
            </button>

            {restaurantSaveMessage && (
              <div className={`save-message ${restaurantSaveMessage.includes('성공') ? 'success' : 'error'}`}>
                {restaurantSaveMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
