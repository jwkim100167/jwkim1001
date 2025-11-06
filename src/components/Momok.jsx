import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Momok.css';

const Momok = () => {
  const [activeTab, setActiveTab] = useState('recommend');
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [dislikedFoods, setDislikedFoods] = useState([]);
  const [likedFoods, setLikedFoods] = useState([]);
  const [inputFood, setInputFood] = useState('');
  const [inputLikedFood, setInputLikedFood] = useState('');
  const [menuData, setMenuData] = useState([]);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [newRestaurantInput, setNewRestaurantInput] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('🍴');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [excludedCategories, setExcludedCategories] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  // Auth hooks
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  // Logout handler
  const handleLogout = () => {
    logout();
  };


  // 식당별 후기 링크 매핑
  const reviewLinks = {
    "피자파쪼": "https://blog.naver.com/jwkim_1001/224025105327",
    "빙고선술집": "https://blog.naver.com/jwkim_1001/223865410201",
    "감동식당": "https://m.blog.naver.com/parasa_924/224039798489",
    "백합칼국수": "https://m.blog.naver.com/parasa_924/223814989777",
    "바다수다": "https://m.blog.naver.com/parasa_924/223810745255"
  };

  // 메뉴 데이터 로드
  useEffect(() => {
    const basePath = import.meta.env.BASE_URL;
    fetch(`${basePath}menu-data.json`)
      .then(response => response.json())
      .then(data => {
        setMenuData(data.categories);

        // 초기 로드 시 "종웅 추천"과 "숑숑 추천"만 선택되도록 설정
        if (!isInitialized) {
          const otherCategories = data.categories.filter(
            cat => cat.name !== "종웅 추천" && cat.name !== "숑숑 추천"
          );
          setExcludedCategories(otherCategories.map(cat => cat.id));
          setIsInitialized(true);
        }
      })
      .catch(error => {
        console.error('메뉴 데이터 로드 실패:', error);
      });
  }, [isInitialized]);

  // 싫어하는 음식 필터링 후 메뉴 추천
  const getAvailableMenus = () => {
    return menuData.filter(menu => {
      // 제외된 카테고리는 제외
      if (excludedCategories.includes(menu.id)) {
        return false;
      }
      // 카테고리나 식당명이 싫어하는 음식에 포함되지 않은 메뉴만 반환
      const isDisliked = dislikedFoods.some(disliked =>
        menu.name.includes(disliked) ||
        menu.restaurants.some(restaurant => restaurant.includes(disliked))
      );
      return !isDisliked;
    });
  };

  // 카테고리 제외/포함 토글
  const toggleCategoryExclusion = (categoryId) => {
    if (excludedCategories.includes(categoryId)) {
      setExcludedCategories(excludedCategories.filter(id => id !== categoryId));
    } else {
      setExcludedCategories([...excludedCategories, categoryId]);
    }
  };

  // 전체 선택
  const selectAllCategories = () => {
    setExcludedCategories([]);
  };

  // 전체 선택 해제
  const deselectAllCategories = () => {
    setExcludedCategories(menuData.map(menu => menu.id));
  };

  // 랜덤 메뉴 추천
  const recommendRandomMenu = () => {
    const availableMenus = getAvailableMenus();
    if (availableMenus.length === 0) {
      alert('추천할 메뉴가 없습니다. 싫어하는 음식을 줄여보세요!');
      return;
    }
    const randomIndex = Math.floor(Math.random() * availableMenus.length);
    setSelectedMenu(availableMenus[randomIndex]);
    setSelectedRestaurant(null); // 추천받을 때마다 선택 초기화
  };

  // 싫어하는 음식 추가
  const addDislikedFood = () => {
    if (inputFood.trim() && !dislikedFoods.includes(inputFood.trim())) {
      setDislikedFoods([...dislikedFoods, inputFood.trim()]);
      setInputFood('');
    }
  };

  // 싫어하는 음식 제거
  const removeDislikedFood = (food) => {
    setDislikedFoods(dislikedFoods.filter(f => f !== food));
  };

  // 좋아하는 음식 추가
  const addLikedFood = () => {
    if (inputLikedFood.trim() && !likedFoods.includes(inputLikedFood.trim())) {
      setLikedFoods([...likedFoods, inputLikedFood.trim()]);
      setInputLikedFood('');
    }
  };

  // 좋아하는 음식 제거
  const removeLikedFood = (food) => {
    setLikedFoods(likedFoods.filter(f => f !== food));
  };

  // 추천 가능한 메뉴의 모든 식당 가져오기
  const getAvailableRestaurants = () => {
    const availableMenus = getAvailableMenus();
    const restaurants = [];
    availableMenus.forEach(menu => {
      menu.restaurants.forEach(restaurant => {
        if (!restaurants.includes(restaurant)) {
          restaurants.push(restaurant);
        }
      });
    });
    return restaurants.sort();
  };

  // 네이버 지도로 검색 (식당명 직접 검색)
  const searchOnNaverMap = (restaurantName) => {
    const query = encodeURIComponent(restaurantName);
    window.open(`https://map.naver.com/v5/search/${query}`, '_blank');
  };

  // 후기 링크 열기
  const openReview = (restaurantName) => {
    const reviewLink = reviewLinks[restaurantName];
    if (reviewLink) {
      window.open(reviewLink, '_blank');
    }
  };

  // 식당 태그 클릭 핸들러
  const handleRestaurantClick = (e, restaurant) => {
    e.stopPropagation();
    if (selectedRestaurant === restaurant) {
      // 같은 식당을 다시 클릭하면 선택 해제
      setSelectedRestaurant(null);
    } else {
      // 새로운 식당 선택
      setSelectedRestaurant(restaurant);
    }
  };

  // 카테고리에 식당 추가
  const addRestaurantToCategory = (categoryId) => {
    if (!newRestaurantInput.trim()) return;

    setMenuData(menuData.map(category => {
      if (category.id === categoryId) {
        if (!category.restaurants.includes(newRestaurantInput.trim())) {
          return {
            ...category,
            restaurants: [...category.restaurants, newRestaurantInput.trim()]
          };
        }
      }
      return category;
    }));
    setNewRestaurantInput('');
  };

  // 카테고리에서 식당 삭제
  const removeRestaurantFromCategory = (categoryId, restaurant) => {
    setMenuData(menuData.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          restaurants: category.restaurants.filter(r => r !== restaurant)
        };
      }
      return category;
    }));
  };

  // 카테고리 삭제
  const deleteCategory = (categoryId) => {
    if (window.confirm('이 카테고리를 삭제하시겠습니까?')) {
      setMenuData(menuData.filter(category => category.id !== categoryId));
    }
  };

  // 새 카테고리 추가
  const addNewCategory = () => {
    if (!newCategoryName.trim()) {
      alert('카테고리 이름을 입력해주세요');
      return;
    }

    const newId = menuData.length > 0 ? Math.max(...menuData.map(c => c.id)) + 1 : 1;
    const newCategory = {
      id: newId,
      name: newCategoryName.trim(),
      image: newCategoryIcon,
      restaurants: []
    };

    setMenuData([...menuData, newCategory]);
    setNewCategoryName('');
    setNewCategoryIcon('🍴');
    setShowAddCategory(false);
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

        <div className="momok-tabs">
          <button
            className={`tab-btn ${activeTab === 'recommend' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommend')}
          >
            메뉴 추천
          </button>
          <button
            className={`tab-btn ${activeTab === 'liked' ? 'active' : ''}`}
            onClick={() => setActiveTab('liked')}
          >
            추가할 음식
          </button>
        </div>

        <div className="momok-content">
          {activeTab === 'recommend' && (
            <div className="recommend-section">
              <button className="recommend-btn" onClick={recommendRandomMenu}>
                🎲 오늘 점심 메뉴 추천받기
              </button>

              {selectedMenu && (
                <div className="menu-result" onClick={() => setSelectedRestaurant(null)}>
                  <div className="menu-card" onClick={(e) => e.stopPropagation()}>
                    <div className="menu-image">{selectedMenu.image}</div>
                    <h2>{selectedMenu.name}</h2>
                    <div className="menu-keywords">
                      {selectedMenu.restaurants.map((restaurant, idx) => (
                        <div key={idx} className="restaurant-item-wrapper">
                          <span
                            className={`keyword-tag ${selectedRestaurant === restaurant ? 'selected' : ''}`}
                            onClick={(e) => handleRestaurantClick(e, restaurant)}
                          >
                            {`#${restaurant}`}
                          </span>
                          {selectedRestaurant === restaurant && (
                            <div className="action-buttons">
                              <button
                                className="map-action-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  searchOnNaverMap(restaurant);
                                }}
                              >
                                📍 지도
                              </button>
                              {reviewLinks[restaurant] && (
                                <button
                                  className="review-action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openReview(restaurant);
                                  }}
                                >
                                  ✍️ 후기
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="available-menus">
                <div className="available-menus-header">
                  <h3>추천 가능한 카테고리 ({getAvailableMenus().length}개)</h3>
                  <div className="category-select-buttons">
                    <button onClick={selectAllCategories} className="select-all-btn">
                      전체 선택
                    </button>
                    <button onClick={deselectAllCategories} className="deselect-all-btn">
                      전체 해제
                    </button>
                  </div>
                </div>
                <div className="menu-grid">
                  {menuData.map(menu => {
                    const isExcluded = excludedCategories.includes(menu.id);
                    return (
                      <div
                        key={menu.id}
                        className={`menu-item ${isExcluded ? 'excluded' : ''}`}
                        onClick={() => toggleCategoryExclusion(menu.id)}
                        title={menu.restaurants.join(', ')}
                      >
                        <span className="menu-icon">{menu.image}</span>
                        <span className="menu-name">{menu.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'liked' && (
            <div className="liked-section">
              <div className="category-management-header">
                <h3 className="section-main-title">카테고리 관리</h3>
                <button
                  className="add-category-btn"
                  onClick={() => setShowAddCategory(!showAddCategory)}
                >
                  {showAddCategory ? '✕ 취소' : '+ 카테고리 추가'}
                </button>
              </div>

              {showAddCategory && (
                <div className="add-category-form">
                  <input
                    type="text"
                    value={newCategoryIcon}
                    onChange={(e) => setNewCategoryIcon(e.target.value)}
                    placeholder="🍴"
                    className="category-icon-input"
                    maxLength="2"
                  />
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addNewCategory()}
                    placeholder="카테고리 이름 (예: 한식, 중식)"
                    className="category-name-input"
                  />
                  <button onClick={addNewCategory} className="submit-category-btn">
                    추가
                  </button>
                </div>
              )}

              <div className="categories-container">
                {menuData.map((category) => (
                  <div key={category.id} className="category-card">
                    <div className="category-header">
                      <div className="category-info">
                        <span className="category-icon">{category.image}</span>
                        <h4 className="category-name">{category.name}</h4>
                        <span className="restaurant-count">({category.restaurants.length}개)</span>
                      </div>
                      <div className="category-actions">
                        <button
                          className="edit-category-btn"
                          onClick={() => setEditingCategoryId(
                            editingCategoryId === category.id ? null : category.id
                          )}
                        >
                          {editingCategoryId === category.id ? '완료' : '편집'}
                        </button>
                        <button
                          className="delete-category-btn"
                          onClick={() => deleteCategory(category.id)}
                        >
                          삭제
                        </button>
                      </div>
                    </div>

                    {editingCategoryId === category.id && (
                      <div className="add-restaurant-form">
                        <input
                          type="text"
                          value={newRestaurantInput}
                          onChange={(e) => setNewRestaurantInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addRestaurantToCategory(category.id)}
                          placeholder="식당명 입력"
                          className="restaurant-input"
                        />
                        <button
                          onClick={() => addRestaurantToCategory(category.id)}
                          className="add-restaurant-btn"
                        >
                          추가
                        </button>
                      </div>
                    )}

                    <div className="category-restaurants">
                      {category.restaurants.map((restaurant, idx) => (
                        <div key={idx} className="restaurant-tag">
                          <span>{restaurant}</span>
                          {editingCategoryId === category.id && (
                            <button
                              className="remove-restaurant-btn"
                              onClick={() => removeRestaurantFromCategory(category.id, restaurant)}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="info-box">
                <h4>💡 팁</h4>
                <ul>
                  <li>편집 버튼을 클릭하면 식당을 추가하거나 삭제할 수 있습니다</li>
                  <li>카테고리 삭제 시 해당 카테고리의 모든 식당도 삭제됩니다</li>
                  <li>변경사항은 브라우저를 새로고침하면 초기화됩니다</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="navigation">
          <Link to="/" className="back-btn">
            ← 홈으로 돌아가기
          </Link>
        </div>

        <div className="momok-footer">
          <p>made by jwkim1001</p>
        </div>
      </div>
    </div>
  );
};

export default Momok;
