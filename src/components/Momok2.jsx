import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getLocations,
  getLocation2s,
  getDrinkYNs,
  getCategories,
  getSignatures,
  getFilteredCount,
  getFilteredRestaurants,
  getFilteredLocations,
  getFilteredLocation2s,
  getFilteredDrinkYNs,
  getFilteredCategories,
  getFilteredSignatures
} from '../data/restaurantData';
import './Momok2.css';

const Momok2 = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  // 각 칸의 상태 관리
  const [grid, setGrid] = useState({
    1: '음주 여부',
    2: '카테고리',
    3: '파티원',
    4: '대표메뉴',
    5: '위치',
    6: '',
    7: '',
    8: '',
    9: ''
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

  // 필터 변경 시 개수 업데이트
  useEffect(() => {
    const restaurants = getFilteredRestaurants(filters);
    setFilteredRestaurants(restaurants);
    setFilteredCount(restaurants.length);
    setRandomSelected(null); // 필터 변경 시 랜덤 선택 초기화

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
    }
  }, [filters, lastFilter]);

  const handleLogout = () => {
    logout();
  };

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
    } else if (num === 1) {
      setActiveSelect(activeSelect === 'drinkYN' ? null : 'drinkYN');
    } else if (num === 2) {
      setActiveSelect(activeSelect === 'category' ? null : 'category');
    } else if (num === 3) {
      setActiveSelect(activeSelect === 'partyNum' ? null : 'partyNum');
    } else if (num === 4) {
      setActiveSelect(activeSelect === 'signature' ? null : 'signature');
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
  const handleRandomSelect = () => {
    if (filteredRestaurants.length === 0) {
      alert('선택 가능한 레스토랑이 없습니다.');
      return;
    }
    const randomIndex = Math.floor(Math.random() * filteredRestaurants.length);
    const selected = filteredRestaurants[randomIndex];
    setRandomSelected(selected);
  };

  return (
    <div className="momok2">
      <div className="momok2-container">
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

        <div className="momok2-header">
          <h1>🍽️ MOMOK2</h1>
          <p>오늘 점심 뭐 먹지? 고민 끝!</p>
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
            {filteredCount === 1 && filteredRestaurants.length > 0 && !randomSelected && (
              <div className="single-restaurant">
                <p>🎉 선택된 레스토랑:</p>
                <p className="restaurant-name">{filteredRestaurants[0].name}</p>
                <p className="restaurant-id">ID: {filteredRestaurants[0].r_id}</p>
              </div>
            )}
            {randomSelected && (
              <div className="single-restaurant random">
                <p>🎲 랜덤 선택된 레스토랑:</p>
                <p className="restaurant-name">{randomSelected.name}</p>
                <p className="restaurant-id">ID: {randomSelected.r_id}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid-container">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <div
              key={num}
              className={`grid-item grid-item-${num} ${
                [1, 2, 3, 4, 5].includes(num) ? 'clickable' : ''
              }`}
              onClick={(e) => handleGridClick(num, e)}
            >
              <div className="grid-number">{num}</div>
              <div className="grid-content">
                {num === 1 && (filters.drinkYN || grid[num])}
                {num === 2 && (filters.category || grid[num])}
                {num === 3 && (filters.partyNum ? `${filters.partyNum}명` : grid[num])}
                {num === 4 && (filters.signature || grid[num])}
                {num === 5 && (filters.location2 || filters.location || grid[num])}
                {![1, 2, 3, 4, 5].includes(num) && grid[num]}
              </div>

            </div>
          ))}
        </div>

        {/* 위치 select box - 필터링된 데이터 사용 */}
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
            {(filters.location || filters.drinkYN || filters.category || filters.partyNum
              ? getFilteredLocations({ ...filters, location: null })
              : getLocations()
            ).map((loc) => (
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

        {/* location2 select box - 필터링된 데이터 사용 */}
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
            {(filters.drinkYN || filters.category || filters.partyNum
              ? getFilteredLocation2s({ ...filters, location2: null })
              : getLocation2s(filters.location)
            ).map((loc2) => (
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

        {/* 음주 여부 select box - 필터링된 데이터 사용 */}
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
            {(filters.location || filters.category || filters.partyNum
              ? getFilteredDrinkYNs({ ...filters, drinkYN: null })
              : getDrinkYNs()
            ).map((drink) => (
              <div
                key={drink}
                className="select-option"
                onClick={() => handleDrinkYNSelect(drink)}
              >
                {drink === 'Y' ? '주류 가능' : '주류 불가'}
              </div>
            ))}
          </div>
        )}

        {/* 카테고리 select box - 필터링된 데이터 사용 */}
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
            {(filters.location || filters.drinkYN || filters.partyNum
              ? getFilteredCategories({ ...filters, category: null })
              : getCategories()
            ).map((cat) => (
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

        {/* 대표메뉴 select box - 필터링된 데이터 사용 */}
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
            {(filters.location || filters.drinkYN || filters.category || filters.partyNum
              ? getFilteredSignatures({ ...filters, signature: null })
              : getSignatures()
            ).map((sig) => (
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

        <div className="momok2-footer">
          <p>made by jwkim1001</p>
        </div>
      </div>
    </div>
  );
};

export default Momok2;
