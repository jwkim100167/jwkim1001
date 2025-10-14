import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Momok.css';

const Momok = () => {
  const [activeTab, setActiveTab] = useState('recommend');
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [dislikedFoods, setDislikedFoods] = useState([]);
  const [inputFood, setInputFood] = useState('');

  // 메뉴 데이터 (사진 URL과 함께)
  const menuData = [
    { id: 1, name: '한식', category: '한식', keywords: ['밥', '국', '김치', '찌개'], image: '🍚' },
    { id: 2, name: '중식', category: '중식', keywords: ['짜장면', '짬뽕', '탕수육'], image: '🍜' },
    { id: 3, name: '일식', category: '일식', keywords: ['초밥', '라멘', '돈까스'], image: '🍱' },
    { id: 4, name: '양식', category: '양식', keywords: ['파스타', '스테이크', '피자'], image: '🍝' },
    { id: 5, name: '치킨', category: '치킨', keywords: ['프라이드', '양념', '간장'], image: '🍗' },
    { id: 6, name: '분식', category: '분식', keywords: ['떡볶이', '김밥', '라면'], image: '🍢' },
    { id: 7, name: '피자', category: '피자', keywords: ['콤비네이션', '페퍼로니', '치즈'], image: '🍕' },
    { id: 8, name: '햄버거', category: '햄버거', keywords: ['버거', '감자튀김', '콜라'], image: '🍔' },
    { id: 9, name: '샐러드', category: '샐러드', keywords: ['야채', '닭가슴살', '드레싱'], image: '🥗' },
    { id: 10, name: '국밥', category: '한식', keywords: ['돼지국밥', '선지국', '순대국'], image: '🍲' },
  ];

  // 싫어하는 음식 필터링 후 메뉴 추천
  const getAvailableMenus = () => {
    return menuData.filter(menu => {
      // 카테고리나 키워드가 싫어하는 음식에 포함되지 않은 메뉴만 반환
      const isDisliked = dislikedFoods.some(disliked =>
        menu.category.includes(disliked) ||
        menu.keywords.some(keyword => keyword.includes(disliked)) ||
        menu.name.includes(disliked)
      );
      return !isDisliked;
    });
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

  // 네이버 지도로 검색
  const searchOnNaverMap = () => {
    if (selectedMenu) {
      const query = encodeURIComponent(selectedMenu.name + ' 맛집');
      window.open(`https://map.naver.com/v5/search/${query}`, '_blank');
    }
  };

  return (
    <div className="momok">
      <div className="momok-container">
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
            className={`tab-btn ${activeTab === 'dislike' ? 'active' : ''}`}
            onClick={() => setActiveTab('dislike')}
          >
            싫어하는 음식
          </button>
        </div>

        <div className="momok-content">
          {activeTab === 'recommend' && (
            <div className="recommend-section">
              <button className="recommend-btn" onClick={recommendRandomMenu}>
                🎲 오늘 점심 메뉴 추천받기
              </button>

              {selectedMenu && (
                <div className="menu-result">
                  <div className="menu-card">
                    <div className="menu-image">{selectedMenu.image}</div>
                    <h2>{selectedMenu.name}</h2>
                    <p className="menu-category">{selectedMenu.category}</p>
                    <div className="menu-keywords">
                      {selectedMenu.keywords.map((keyword, idx) => (
                        <span key={idx} className="keyword-tag">#{keyword}</span>
                      ))}
                    </div>
                    <button className="map-btn" onClick={searchOnNaverMap}>
                      📍 네이버 지도에서 찾기
                    </button>
                  </div>
                </div>
              )}

              <div className="available-menus">
                <h3>추천 가능한 메뉴 ({getAvailableMenus().length}개)</h3>
                <div className="menu-grid">
                  {getAvailableMenus().map(menu => (
                    <div key={menu.id} className="menu-item">
                      <span className="menu-icon">{menu.image}</span>
                      <span className="menu-name">{menu.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dislike' && (
            <div className="dislike-section">
              <div className="dislike-input-wrapper">
                <input
                  type="text"
                  value={inputFood}
                  onChange={(e) => setInputFood(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addDislikedFood()}
                  placeholder="싫어하는 음식 입력 (예: 짜장면, 중식, 매운맛)"
                  className="dislike-input"
                />
                <button onClick={addDislikedFood} className="add-dislike-btn">
                  추가
                </button>
              </div>

              <div className="dislike-list">
                <h3>싫어하는 음식 목록 ({dislikedFoods.length}개)</h3>
                {dislikedFoods.length > 0 ? (
                  <div className="dislike-items">
                    {dislikedFoods.map((food, idx) => (
                      <div key={idx} className="dislike-item">
                        <span>{food}</span>
                        <button onClick={() => removeDislikedFood(food)} className="remove-btn">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-dislike">싫어하는 음식을 등록해보세요</p>
                )}
              </div>

              <div className="info-box">
                <h4>💡 팁</h4>
                <ul>
                  <li>카테고리 이름을 입력하면 해당 카테고리 전체가 제외됩니다</li>
                  <li>특정 메뉴나 키워드를 입력하면 관련 메뉴만 제외됩니다</li>
                  <li>예시: "중식" 입력 → 중식 카테고리 전체 제외</li>
                  <li>예시: "짜장면" 입력 → 짜장면 포함 메뉴만 제외</li>
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
