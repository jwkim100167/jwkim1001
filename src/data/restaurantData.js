// 샘플 레스토랑 데이터
export const restaurantData = [
  { r_id: 1, name: '봉천 한정식', location: '서울', location2: '봉천', drinkYN: 'Y', category: '한식', signature: '불고기', partyNumMin: 2, partyNumMax: 6 },
  { r_id: 2, name: '봉천 스시바', location: '서울', location2: '봉천', drinkYN: 'N', category: '일식', signature: '초밥', partyNumMin: 1, partyNumMax: 4 },
  { r_id: 3, name: '봉천 차이나', location: '서울', location2: '봉천', drinkYN: 'Y', category: '중식', signature: '짜장면', partyNumMin: 3, partyNumMax: 10 },
  { r_id: 4, name: '군자 이탈리안', location: '서울', location2: '군자', drinkYN: 'N', category: '양식', signature: '파스타', partyNumMin: 2, partyNumMax: 4 },
  { r_id: 5, name: '군자 갈비집', location: '서울', location2: '군자', drinkYN: 'Y', category: '한식', signature: '갈비', partyNumMin: 2, partyNumMax: 8 },
  { r_id: 6, name: '연수 오마카세', location: '인천', location2: '연수', drinkYN: 'N', category: '일식', signature: '초밥', partyNumMin: 1, partyNumMax: 3 },
  { r_id: 7, name: '연수 중화요리', location: '인천', location2: '연수', drinkYN: 'Y', category: '중식', signature: '탕수육', partyNumMin: 4, partyNumMax: 10 },
  { r_id: 8, name: '연수 브런치카페', location: '인천', location2: '연수', drinkYN: 'N', category: '카페', signature: '샌드위치', partyNumMin: 1, partyNumMax: 6 },
  { r_id: 9, name: '청라 스테이크', location: '인천', location2: '청라', drinkYN: 'Y', category: '양식', signature: '스테이크', partyNumMin: 2, partyNumMax: 4 },
  { r_id: 10, name: '정자 한식뷔페', location: '분당', location2: '정자동', drinkYN: 'N', category: '한식', signature: '비빔밥', partyNumMin: 2, partyNumMax: 6 },
  { r_id: 11, name: '정자 이자카야', location: '분당', location2: '정자동', drinkYN: 'Y', category: '일식', signature: '라멘', partyNumMin: 2, partyNumMax: 8 },
  { r_id: 12, name: '정자 딤섬', location: '분당', location2: '정자동', drinkYN: 'N', category: '중식', signature: '딤섬', partyNumMin: 3, partyNumMax: 6 },
  { r_id: 13, name: '양재 디저트카페', location: '안성', location2: '양재동', drinkYN: 'Y', category: '카페', signature: '케이크', partyNumMin: 1, partyNumMax: 4 },
  { r_id: 14, name: '가락 파스타집', location: '안성', location2: '가락동', drinkYN: 'N', category: '양식', signature: '파스타', partyNumMin: 2, partyNumMax: 4 },
  { r_id: 15, name: '기장 프리미엄한우', location: '부산', location2: '기장동', drinkYN: 'Y', category: '한식', signature: '한우', partyNumMin: 4, partyNumMax: 10 },
];

// 중복 제거 유틸리티 함수
export const getUniqueValues = (data, key) => {
  return [...new Set(data.map(item => item[key]))].sort();
};

// location 목록 가져오기
export const getLocations = () => {
  return getUniqueValues(restaurantData, 'location');
};

// location2 목록 가져오기 (location 필터링 옵션)
export const getLocation2s = (location = null) => {
  if (location) {
    const filtered = restaurantData.filter(item => item.location === location);
    return getUniqueValues(filtered, 'location2');
  }
  return getUniqueValues(restaurantData, 'location2');
};

// drinkYN 목록 가져오기
export const getDrinkYNs = () => {
  return getUniqueValues(restaurantData, 'drinkYN');
};

// category 목록 가져오기
export const getCategories = () => {
  return getUniqueValues(restaurantData, 'category');
};

// signature 목록 가져오기
export const getSignatures = () => {
  return getUniqueValues(restaurantData, 'signature');
};

// 필터링된 레스토랑 가져오기
export const getFilteredRestaurants = (filters) => {
  let filtered = [...restaurantData];

  if (filters.location) {
    filtered = filtered.filter(item => item.location === filters.location);
  }

  if (filters.location2) {
    filtered = filtered.filter(item => item.location2 === filters.location2);
  }

  if (filters.drinkYN) {
    filtered = filtered.filter(item => item.drinkYN === filters.drinkYN);
  }

  if (filters.category) {
    filtered = filtered.filter(item => item.category === filters.category);
  }

  if (filters.partyNum) {
    filtered = filtered.filter(item =>
      item.partyNumMin <= filters.partyNum &&
      item.partyNumMax >= filters.partyNum
    );
  }

  if (filters.signature) {
    filtered = filtered.filter(item => item.signature === filters.signature);
  }

  return filtered;
};

// 필터링된 레스토랑 수 가져오기
export const getFilteredCount = (filters) => {
  return getFilteredRestaurants(filters).length;
};

// 필터링 기반 select 옵션 가져오기
export const getFilteredLocations = (filters) => {
  const filtered = getFilteredRestaurants(filters);
  return getUniqueValues(filtered, 'location');
};

export const getFilteredLocation2s = (filters) => {
  const filtered = getFilteredRestaurants(filters);
  return getUniqueValues(filtered, 'location2');
};

export const getFilteredDrinkYNs = (filters) => {
  const filtered = getFilteredRestaurants(filters);
  return getUniqueValues(filtered, 'drinkYN');
};

export const getFilteredCategories = (filters) => {
  const filtered = getFilteredRestaurants(filters);
  return getUniqueValues(filtered, 'category');
};

export const getFilteredSignatures = (filters) => {
  const filtered = getFilteredRestaurants(filters);
  return getUniqueValues(filtered, 'signature');
};
