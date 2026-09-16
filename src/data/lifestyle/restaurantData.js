// 레스토랑 상세 정보 테이블
export const restaurantDataTable = [
  { r_id: 1, name: '봉천 한정식', address: '서울시 관악구 봉천동 123-45', latitude: 37.4820, longitude: 126.9520, link: 'https://example.com/review1' },
  { r_id: 3, name: '봉천 차이나', address: '서울시 관악구 봉천동 345-67', latitude: 37.4830, longitude: 126.9530, link: '' },
  { r_id: 4, name: '군자 이탈리안', address: '서울시 광진구 군자동 456-78', latitude: 37.5565, longitude: 127.0735, link: 'https://example.com/review4' },
  { r_id: 5, name: '군자 갈비집', address: '서울시 광진구 군자동 567-89', latitude: 37.5570, longitude: 127.0740, link: '' },
  { r_id: 6, name: '연수 오마카세', address: '인천시 연수구 송도동 678-90', latitude: 37.3895, longitude: 126.6420, link: 'https://example.com/review6' },
  { r_id: 7, name: '연수 중화요리', address: '인천시 연수구 송도동 789-01', latitude: 37.3900, longitude: 126.6425, link: '' },
  { r_id: 8, name: '연수 브런치카페', address: '인천시 연수구 송도동 890-12', latitude: 37.3905, longitude: 126.6430, link: 'https://example.com/review8' },
  { r_id: 9, name: '청라 스테이크', address: '인천시 서구 청라동 901-23', latitude: 37.5390, longitude: 126.6465, link: '' },
  { r_id: 10, name: '정자 한식뷔페', address: '경기도 성남시 분당구 정자동 012-34', latitude: 37.3595, longitude: 127.1050, link: 'https://example.com/review10' },
  { r_id: 11, name: '정자 이자카야', address: '경기도 성남시 분당구 정자동 123-45', latitude: 37.3600, longitude: 127.1055, link: '' },
  { r_id: 12, name: '정자 딤섬', address: '경기도 성남시 분당구 정자동 234-56', latitude: 37.3605, longitude: 127.1060, link: 'https://example.com/review12' },
  { r_id: 13, name: '양재 디저트카페', address: '경기도 안성시 양재동 345-67', latitude: 37.0085, longitude: 127.2795, link: '' },
  { r_id: 14, name: '가락 파스타집', address: '경기도 안성시 가락동 456-78', latitude: 37.0090, longitude: 127.2800, link: 'https://example.com/review14' },
];

// 레스토랑 카테고리 정보 테이블
export const restaurantCategoryTable = [
  { r_id: 1, location: '서울', location2: '봉천', drinkYN: 'Y', category: '한식', signature: '불고기', partyNumMin: 2, partyNumMax: 6 },
  { r_id: 3, location: '서울', location2: '봉천', drinkYN: 'Y', category: '중식', signature: '짜장면', partyNumMin: 3, partyNumMax: 10 },
  { r_id: 4, location: '서울', location2: '군자', drinkYN: 'N', category: '양식', signature: '파스타', partyNumMin: 2, partyNumMax: 4 },
  { r_id: 5, location: '서울', location2: '군자', drinkYN: 'Y', category: '한식', signature: '갈비', partyNumMin: 2, partyNumMax: 8 },
  { r_id: 6, location: '인천', location2: '연수', drinkYN: 'N', category: '일식', signature: '초밥', partyNumMin: 1, partyNumMax: 3 },
  { r_id: 7, location: '인천', location2: '연수', drinkYN: 'Y', category: '중식', signature: '탕수육', partyNumMin: 4, partyNumMax: 10 },
  { r_id: 8, location: '인천', location2: '연수', drinkYN: 'N', category: '카페', signature: '샌드위치', partyNumMin: 1, partyNumMax: 6 },
  { r_id: 9, location: '인천', location2: '청라', drinkYN: 'Y', category: '양식', signature: '스테이크', partyNumMin: 2, partyNumMax: 4 },
  { r_id: 10, location: '분당', location2: '정자동', drinkYN: 'N', category: '한식', signature: '비빔밥', partyNumMin: 2, partyNumMax: 6 },
  { r_id: 11, location: '분당', location2: '정자동', drinkYN: 'Y', category: '일식', signature: '라멘', partyNumMin: 2, partyNumMax: 8 },
  { r_id: 12, location: '분당', location2: '정자동', drinkYN: 'N', category: '중식', signature: '딤섬', partyNumMin: 3, partyNumMax: 6 },
  { r_id: 13, location: '안성', location2: '양재동', drinkYN: 'Y', category: '카페', signature: '케이크', partyNumMin: 1, partyNumMax: 4 },
  { r_id: 14, location: '안성', location2: '가락동', drinkYN: 'N', category: '양식', signature: '파스타', partyNumMin: 2, partyNumMax: 4 },
];

// 하위 호환성을 위한 기존 데이터 (deprecated)
export const restaurantData = restaurantCategoryTable.map(cat => {
  const data = restaurantDataTable.find(d => d.r_id === cat.r_id);
  return { ...cat, name: data?.name || '' };
});

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
