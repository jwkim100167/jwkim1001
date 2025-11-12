import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getRestaurantCategories,
  getRestaurantById,
  getFilteredCategories,
  getUniqueValues
} from '../services/supabaseRestaurant';
import './WhatToEat.css';

const WhatToEat = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  // 각 칸의 상태 관리
  const [grid, setGrid] = useState({
    1: '음주 여부',
    2: '카테고리',
    3: '대표메뉴',
    4: '파티원'
  });

  // 선택된 필터 상태
  const [filters, setFilters] = useState({
    location: null,
    location2: null,
    drinkYN: null,
    category: null,
    partyNum: null,
    signature: null
  });

  // 현재 활성화된 select box
  const [activeSelect, setActiveSelect] = useState(null);

  // 필터링된 레스토랑 개수 및 데이터
  const [filteredCount, setFilteredCount] = useState(0);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);

  // select box 위치
  const [selectPosition, setSelectPosition] = useState({ top: 0, left: 0 });

  // 마지막 선택한 필터 추적
  const [lastFilter, setLastFilter] = useState(null);

  // 랜덤 선택된 레스토랑
  const [randomSelected, setRandomSelected] = useState(null);

  // 전체 레스토랑 카테고리 데이터
  const [allCategories, setAllCategories] = useState([]);

  // 선택 가능한 옵션들
  const [availableOptions, setAvailableOptions] = useState({
    locations: [],
    location2s: [],
    drinkYNs: [],
    categories: [],
    signatures: []
  });

  // 선택된 레스토랑 상세 정보
  const [selectedRestaurantDetail, setSelectedRestaurantDetail] = useState(null);

  // 팝업 모달 표시 여부
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);

  // 초기 데이터 로드
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const categories = await getRestaurantCategories();
        console.log('📊 전체 카테고리 데이터:', categories);
        setAllCategories(categories);

        // 초기 옵션 설정 (모든 가능한 값 포함)
        const uniqueDrinkYNs = getUniqueValues(categories, 'drinkYN');
        // drinkYN에 true와 false 모두 포함되도록 보장
        const allDrinkYNs = [...new Set([...uniqueDrinkYNs, true, false])];

        setAvailableOptions({
          locations: getUniqueValues(categories, 'location'),
          location2s: getUniqueValues(categories, 'location2'),
          drinkYNs: allDrinkYNs,
          categories: getUniqueValues(categories, 'category'),
          signatures: getUniqueValues(categories, 'signature')
        });
      } catch (error) {
        console.error('Error loading initial data:', error);
        alert('데이터를 불러오는데 실패했습니다.');
      }
    };

    loadInitialData();
  }, []);

  // 필터 변경 시 개수 업데이트 및 옵션 업데이트
  useEffect(() => {
    const fetchFilteredRestaurants = async () => {
      try {
        console.log('🔍 현재 필터:', filters);
        const restaurants = await getFilteredCategories(filters);
        console.log('✅ 필터링된 레스토랑:', restaurants);
        setFilteredRestaurants(restaurants);
        setFilteredCount(restaurants.length);
        setRandomSelected(null); // 필터 변경 시 랜덤 선택 초기화
        setSelectedRestaurantDetail(null); // 상세 정보 초기화

        // 현재 필터에 맞는 선택 가능한 옵션 업데이트
        // 각 옵션 추출 시 해당 필터는 제외하고 적용

        // drinkYN 옵션: drinkYN 필터 제외하고 나머지만 적용
        const dataForDrinkYN = allCategories.filter(cat => {
          if (filters.location && cat.location !== filters.location) return false;
          if (filters.location2 && cat.location2 !== filters.location2) return false;
          if (filters.category && cat.category !== filters.category) return false;
          return true;
        });

        // category 옵션: category 필터 제외하고 나머지만 적용
        const dataForCategory = allCategories.filter(cat => {
          if (filters.location && cat.location !== filters.location) return false;
          if (filters.location2 && cat.location2 !== filters.location2) return false;
          if (filters.drinkYN !== null && filters.drinkYN !== undefined && cat.drinkYN !== filters.drinkYN) return false;
          return true;
        });

        // signature 옵션: signature 필터 제외하고 나머지만 적용
        const dataForSignature = allCategories.filter(cat => {
          if (filters.location && cat.location !== filters.location) return false;
          if (filters.location2 && cat.location2 !== filters.location2) return false;
          if (filters.drinkYN !== null && filters.drinkYN !== undefined && cat.drinkYN !== filters.drinkYN) return false;
          if (filters.category && cat.category !== filters.category) return false;
          return true;
        });

        console.log('🔍 drinkYN용 데이터:', dataForDrinkYN);
        console.log('🔍 category용 데이터:', dataForCategory);
        console.log('🔍 signature용 데이터:', dataForSignature);

        const newOptions = {
          locations: getUniqueValues(allCategories, 'location'),
          location2s: getUniqueValues(
            allCategories.filter(cat => !filters.location || cat.location === filters.location),
            'location2'
          ),
          drinkYNs: getUniqueValues(dataForDrinkYN, 'drinkYN'),
          categories: getUniqueValues(dataForCategory, 'category'),
          signatures: getUniqueValues(dataForSignature, 'signature')
        };
        console.log('📋 업데이트된 옵션:', newOptions);
        setAvailableOptions(newOptions);

        // 필터링 결과가 0개인 경우 알림 및 해당 필터만 취소
        if (restaurants.length === 0 && lastFilter) {
          alert('해당 조건의 레스토랑이 없습니다.');
          // 마지막 선택한 필터만 초기화
          setFilters(prev => ({
            ...prev,
            [lastFilter]: null,
            ...(lastFilter === 'location' && { location2: null }) // location 초기화 시 location2도 초기화
          }));
          setActiveSelect(null);
          setLastFilter(null);
        } else if (restaurants.length === 1) {
          // 레스토랑이 1개일 때 상세 정보 자동 로드
          const detail = await getRestaurantById(restaurants[0].r_id);
          setSelectedRestaurantDetail(detail);
          setShowRestaurantModal(true);
        }
      } catch (error) {
        console.error('Error fetching filtered restaurants:', error);
      }
    };

    if (allCategories.length > 0) {
      fetchFilteredRestaurants();
    }
  }, [filters, lastFilter, allCategories]);

  // 로그인 체크 (한 번만 실행)
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    if (!hasCheckedAuth && !isAuthenticated) {
      setHasCheckedAuth(true);
      const confirmLogin = window.confirm('로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?');
      if (confirmLogin) {
        navigate('/login');
      } else {
        navigate('/');
      }
    }
  }, [isAuthenticated, hasCheckedAuth, navigate]);

  // 그리드 클릭 핸들러
  const handleGridClick = (num, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setSelectPosition({
      top: rect.top,
      left: rect.left,
      width: rect.width
    });

    if (num === 5) {
      setActiveSelect(activeSelect === 'location' ? null : 'location');
    } else if (num === 1 || num === 2 || num === 3) {
      // 위치가 선택되지 않았으면 경고
      if (!filters.location) {
        alert('위치를 먼저 선택해주세요!');
        return;
      }

      if (num === 1) {
        setActiveSelect(activeSelect === 'drinkYN' ? null : 'drinkYN');
      } else if (num === 2) {
        setActiveSelect(activeSelect === 'category' ? null : 'category');
      } else if (num === 3) {
        setActiveSelect(activeSelect === 'signature' ? null : 'signature');
      }
    }
  };

  // location 선택 핸들러 - 위치 변경 시 모든 필터 초기화
  const handleLocationSelect = (location) => {
    setFilters({
      location,
      location2: null,
      drinkYN: null,
      category: null,
      partyNum: null,
      signature: null
    });
    setLastFilter('location');
    setActiveSelect('location2');
  };

  // location2 선택 핸들러
  const handleLocation2Select = (location2) => {
    setFilters(prev => ({ ...prev, location2 }));
    setLastFilter('location2');
    setActiveSelect(null);
  };

  // drinkYN 선택 핸들러
  const handleDrinkYNSelect = (drinkYN) => {
    setFilters(prev => ({ ...prev, drinkYN }));
    setLastFilter('drinkYN');
    setActiveSelect(null);
  };

  // category 선택 핸들러
  const handleCategorySelect = (category) => {
    setFilters(prev => ({ ...prev, category }));
    setLastFilter('category');
    setActiveSelect(null);
  };

  // partyNum 선택 핸들러
  const handlePartyNumSelect = (partyNum) => {
    setFilters(prev => ({ ...prev, partyNum }));
    setLastFilter('partyNum');
    setActiveSelect(null);
  };

  // signature 선택 핸들러
  const handleSignatureSelect = (signature) => {
    setFilters(prev => ({ ...prev, signature }));
    setLastFilter('signature');
    setActiveSelect(null);
  };

  // 전체 초기화 핸들러
  const handleResetAll = () => {
    setFilters({
      location: null,
      location2: null,
      drinkYN: null,
      category: null,
      partyNum: null,
      signature: null
    });
    setLastFilter(null);
    setActiveSelect(null);
  };

  // 개별 초기화 핸들러
  const handleResetLocation = () => {
    setFilters({
      location: null,
      location2: null,
      drinkYN: null,
      category: null,
      partyNum: null,
      signature: null
    });
    setActiveSelect(null);
  };

  const handleResetDrinkYN = () => {
    setFilters(prev => ({ ...prev, drinkYN: null }));
    setActiveSelect(null);
  };

  const handleResetCategory = () => {
    setFilters(prev => ({ ...prev, category: null }));
    setActiveSelect(null);
  };

  const handleResetPartyNum = () => {
    setFilters(prev => ({ ...prev, partyNum: null }));
    setActiveSelect(null);
  };

  const handleResetSignature = () => {
    setFilters(prev => ({ ...prev, signature: null }));
    setActiveSelect(null);
  };

  // 랜덤 선택 핸들러
  const handleRandomSelect = async () => {
    if (filteredRestaurants.length === 0) {
      alert('선택 가능한 레스토랑이 없습니다.');
      return;
    }
    const randomIndex = Math.floor(Math.random() * filteredRestaurants.length);
    const selected = filteredRestaurants[randomIndex];
    setRandomSelected(selected);

    // 랜덤 선택된 레스토랑의 상세 정보 로드
    try {
      const detail = await getRestaurantById(selected.r_id);
      setSelectedRestaurantDetail(detail);
      setShowRestaurantModal(true);
    } catch (error) {
      console.error('Error fetching restaurant detail:', error);
    }
  };

  // 네이버 지도로 위치 보기
  const handleViewMap = () => {
    if (selectedRestaurantDetail) {
      const { name } = selectedRestaurantDetail;
      // 네이버 지도 검색 URL로 이동
      const naverMapUrl = `https://map.naver.com/v5/search/${encodeURIComponent(name)}`;
      window.open(naverMapUrl, '_blank');
    }
  };

  // 후기 보기
  const handleViewReview = () => {
    if (selectedRestaurantDetail && selectedRestaurantDetail.link) {
      window.open(selectedRestaurantDetail.link, '_blank');
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowRestaurantModal(false);
  };

  const handleLogout = () => {
    logout();
  };

  // 로그인 안 되어 있으면 아무것도 렌더링하지 않음
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="whattoeat">
      <div className="whattoeat-container">
        <div className="auth-buttons">
          <span className="user-greeting">👋 {user.loginId}님</span>
          <button className="auth-btn mypage-btn" onClick={() => navigate('/mypage')}>
            마이페이지
          </button>
          <button className="auth-btn logout-btn" onClick={handleLogout}>
            로그아웃
          </button>
        </div>

        <div className="whattoeat-header">
          <h1>🍽️ 오늘 뭐 먹지?</h1>
          <p>맛있는 선택, 고민 끝!</p>
          {filters.location2 && (
            <div className="filter-result">
              <div className="result-header">
                <div>필터링된 레스토랑: <span className="count">{filteredCount}</span>개</div>
                <div className="action-buttons">
                  {filteredCount > 0 && filteredCount <= 3 && (
                    <button className="random-btn" onClick={handleRandomSelect}>
                      🎲 랜덤 선택
                    </button>
                  )}
                  {(filters.location || filters.drinkYN || filters.category || filters.partyNum || filters.signature) && (
                    <button className="reset-all-btn" onClick={handleResetAll}>
                      🔄 전체 초기화
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 레스토랑 모달 팝업 */}
        {showRestaurantModal && selectedRestaurantDetail && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={handleCloseModal}>×</button>
              <div className={`modal-restaurant ${randomSelected ? 'random' : ''}`}>
                <p className="modal-title">{randomSelected ? '🎲 랜덤 선택된 레스토랑' : '🎉 선택된 레스토랑'}</p>
                <p className="restaurant-name">{selectedRestaurantDetail.name}</p>
                <p className="restaurant-address">📍 {selectedRestaurantDetail.address}</p>
                <div className={`restaurant-actions ${!selectedRestaurantDetail.link ? 'single-button' : ''}`}>
                  <button className="map-btn" onClick={handleViewMap}>
                    🗺️ 네이버 지도 검색
                  </button>
                  {selectedRestaurantDetail.link && (
                    <button className="review-btn" onClick={handleViewReview}>
                      ⭐ 후기 보기
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid-container">
          {/* 위치 선택 박스 - 최상단에 큰 박스로 */}
          <div
            className="location-box"
            onClick={(e) => handleGridClick(5, e)}
          >
            <div className="location-icon">📍</div>
            <div className="location-label">위치를 선택하세요</div>
            <div className="location-value">
              {filters.location2 || filters.location || '위치 선택'}
            </div>
            {!filters.location && (
              <div className="location-hint">👆 여기를 클릭하여 시작하세요!</div>
            )}
          </div>

          {/* 필터 선택 박스들 */}
          <div className="filters-grid">
            <div
              className={`filter-item ${!filters.location ? 'disabled' : 'clickable'}`}
              onClick={(e) => !filters.location ? null : handleGridClick(1, e)}
            >
              <div className="grid-number">1</div>
              <div className="grid-content">
                {filters.drinkYN !== null ? (filters.drinkYN ? '주류 가능' : '주류 불가') : grid[1]}
              </div>
            </div>

            <div
              className={`filter-item ${!filters.location ? 'disabled' : 'clickable'}`}
              onClick={(e) => !filters.location ? null : handleGridClick(2, e)}
            >
              <div className="grid-number">2</div>
              <div className="grid-content">
                {filters.category || grid[2]}
              </div>
            </div>

            <div
              className={`filter-item ${!filters.location ? 'disabled' : 'clickable'}`}
              onClick={(e) => !filters.location ? null : handleGridClick(3, e)}
            >
              <div className="grid-number">3</div>
              <div className="grid-content">
                {filters.signature || grid[3]}
              </div>
            </div>
          </div>

          {/* 파티원 비활성화 영역 */}
          <div className="party-disabled">
            <div className="filter-item disabled">
              <div className="grid-number">4</div>
              <div className="grid-content">
                {grid[4]} (준비중)
              </div>
            </div>
          </div>
        </div>

        {/* 위치 select box */}
        {activeSelect === 'location' && (
          <div
            className="select-dropdown"
            style={{
              top: `${selectPosition.top}px`,
              left: `${selectPosition.left}px`,
              width: `${selectPosition.width}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="select-title">
              위치 선택
              <button className="reset-btn" onClick={handleResetLocation}>🔄 초기화</button>
            </div>
            {availableOptions.locations.map((loc) => (
              <div
                key={loc}
                className="select-option"
                onClick={() => handleLocationSelect(loc)}
              >
                {loc}
              </div>
            ))}
          </div>
        )}

        {/* location2 select box */}
        {activeSelect === 'location2' && filters.location && (
          <div
            className="select-dropdown"
            style={{
              top: `${selectPosition.top}px`,
              left: `${selectPosition.left}px`,
              width: `${selectPosition.width}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="select-title">
              상세 위치 선택
              <button className="reset-btn" onClick={handleResetLocation}>🔄 초기화</button>
            </div>
            {availableOptions.location2s.map((loc2) => (
              <div
                key={loc2}
                className="select-option"
                onClick={() => handleLocation2Select(loc2)}
              >
                {loc2}
              </div>
            ))}
          </div>
        )}

        {/* 음주 여부 select box */}
        {activeSelect === 'drinkYN' && (
          <div
            className="select-dropdown"
            style={{
              top: `${selectPosition.top}px`,
              left: `${selectPosition.left}px`,
              width: `${selectPosition.width}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="select-title">
              음주 여부 선택
              <button className="reset-btn" onClick={handleResetDrinkYN}>🔄 초기화</button>
            </div>
            {availableOptions.drinkYNs.includes(true) && (
              <div
                className="select-option"
                onClick={() => handleDrinkYNSelect(true)}
              >
                주류 가능
              </div>
            )}
            {availableOptions.drinkYNs.includes(false) && (
              <div
                className="select-option"
                onClick={() => handleDrinkYNSelect(false)}
              >
                주류 불가
              </div>
            )}
          </div>
        )}

        {/* 카테고리 select box */}
        {activeSelect === 'category' && (
          <div
            className="select-dropdown"
            style={{
              top: `${selectPosition.top}px`,
              left: `${selectPosition.left}px`,
              width: `${selectPosition.width}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="select-title">
              카테고리 선택
              <button className="reset-btn" onClick={handleResetCategory}>🔄 초기화</button>
            </div>
            {availableOptions.categories.map((cat) => (
              <div
                key={cat}
                className="select-option"
                onClick={() => handleCategorySelect(cat)}
              >
                {cat}
              </div>
            ))}
          </div>
        )}

        {/* 파티원 숫자 select box */}
        {activeSelect === 'partyNum' && (
          <div
            className="select-dropdown"
            style={{
              top: `${selectPosition.top}px`,
              left: `${selectPosition.left}px`,
              width: `${selectPosition.width}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="select-title">
              파티원 수 선택
              <button className="reset-btn" onClick={handleResetPartyNum}>🔄 초기화</button>
            </div>
            {[1, 2, 3, 4, 6, 10].map((pNum) => (
              <div
                key={pNum}
                className="select-option"
                onClick={() => handlePartyNumSelect(pNum)}
              >
                {pNum}명
              </div>
            ))}
          </div>
        )}

        {/* 대표메뉴 select box */}
        {activeSelect === 'signature' && (
          <div
            className="select-dropdown"
            style={{
              top: `${selectPosition.top}px`,
              left: `${selectPosition.left}px`,
              width: `${selectPosition.width}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="select-title">
              대표메뉴 선택
              <button className="reset-btn" onClick={handleResetSignature}>🔄 초기화</button>
            </div>
            {availableOptions.signatures.map((sig) => (
              <div
                key={sig}
                className="select-option"
                onClick={() => handleSignatureSelect(sig)}
              >
                {sig}
              </div>
            ))}
          </div>
        )}

        <button className="back-btn" onClick={() => navigate('/')}>
          ← 홈으로 돌아가기
        </button>

        <div className="whattoeat-footer">
          <p>made by jwkim1001</p>
        </div>
      </div>
    </div>
  );
};

export default WhatToEat;
