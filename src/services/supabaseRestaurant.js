import { supabase } from '../supabaseClient';

// 레스토랑 카테고리 데이터 조회
export const getRestaurantCategories = async () => {
  const { data, error } = await supabase
    .from('restaurantCategoryTable')
    .select('*');

  if (error) {
    console.error('Error fetching restaurant categories:', error);
    throw error;
  }

  return data || [];
};

// 레스토랑 상세 데이터 조회
export const getRestaurantData = async () => {
  const { data, error } = await supabase
    .from('restaurantDataTable')
    .select('*');

  if (error) {
    console.error('Error fetching restaurant data:', error);
    throw error;
  }

  return data || [];
};

// 특정 r_id의 레스토랑 상세 정보 조회
export const getRestaurantById = async (rId) => {
  console.log('🔎 레스토랑 ID로 조회 시도:', rId);

  // 먼저 r_id로 시도
  let { data, error } = await supabase
    .from('restaurantDataTable')
    .select('*')
    .eq('r_id', rId);

  // 결과가 없거나 에러가 있으면 id로 시도
  if (error || !data || data.length === 0) {
    console.log('⚠️ r_id로 조회 실패, id로 재시도');
    const result = await supabase
      .from('restaurantDataTable')
      .select('*')
      .eq('id', rId);

    data = result.data;
    error = result.error;
  }

  if (error) {
    console.error('❌ Error fetching restaurant by id:', error);
    throw error;
  }

  const restaurant = Array.isArray(data) ? data[0] : data;
  console.log('✅ 조회된 레스토랑 상세:', restaurant);

  // address가 없으면 null 반환
  if (!restaurant || !restaurant.address) {
    console.log('⚠️ address가 없는 레스토랑:', restaurant);
    return null;
  }

  return restaurant;
};

// 필터링된 레스토랑 카테고리 조회
export const getFilteredCategories = async (filters) => {
  let query = supabase.from('restaurantCategoryTable').select('*');

  if (filters.location) {
    query = query.eq('location', filters.location);
  }

  if (filters.location2) {
    query = query.eq('location2', filters.location2);
  }

  if (filters.drinkYN !== null && filters.drinkYN !== undefined) {
    query = query.eq('drinkYN', filters.drinkYN);
  }

  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  if (filters.signature) {
    query = query.eq('signature', filters.signature);
  }

  if (filters.partyNum) {
    query = query
      .lte('partyNumMin', filters.partyNum)
      .gte('partyNumMax', filters.partyNum);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching filtered categories:', error);
    throw error;
  }

  return data || [];
};

// 커스텀 정렬 순서 정의
const LOCATION_ORDER = ['서울', '분당', '인천', '경기'];
const LOCATION2_ORDER = ['봉천', '종각', '종로', '건대', '역삼'];

// 고유 값 추출 유틸리티
export const getUniqueValues = (data, key) => {
  // filter(Boolean)은 false 값을 제거하므로, null/undefined만 제거
  const uniqueValues = [...new Set(data.map(item => item[key]))]
    .filter(v => v !== null && v !== undefined);

  // 정렬 로직
  return uniqueValues.sort((a, b) => {
    // boolean 값은 false < true 순으로 정렬
    if (typeof a === 'boolean' && typeof b === 'boolean') {
      return a === b ? 0 : a ? 1 : -1;
    }

    // location 필드는 커스텀 순서로 정렬
    if (key === 'location') {
      const indexA = LOCATION_ORDER.indexOf(a);
      const indexB = LOCATION_ORDER.indexOf(b);

      // 둘 다 정의된 순서에 있으면 순서대로
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      // A만 정의된 순서에 있으면 A가 앞으로
      if (indexA !== -1) return -1;
      // B만 정의된 순서에 있으면 B가 앞으로
      if (indexB !== -1) return 1;
      // 둘 다 없으면 기본 정렬
      return a > b ? 1 : -1;
    }

    // location2 필드는 커스텀 순서로 정렬
    if (key === 'location2') {
      const indexA = LOCATION2_ORDER.indexOf(a);
      const indexB = LOCATION2_ORDER.indexOf(b);

      // 둘 다 정의된 순서에 있으면 순서대로
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      // A만 정의된 순서에 있으면 A가 앞으로
      if (indexA !== -1) return -1;
      // B만 정의된 순서에 있으면 B가 앞으로
      if (indexB !== -1) return 1;
      // 둘 다 없으면 기본 정렬
      return a > b ? 1 : -1;
    }

    // 기본 정렬
    return a > b ? 1 : -1;
  });
};

// 위치 목록 가져오기
export const getLocations = async () => {
  const data = await getRestaurantCategories();
  return getUniqueValues(data, 'location');
};

// location2 목록 가져오기
export const getLocation2s = async (location = null) => {
  let data = await getRestaurantCategories();
  if (location) {
    data = data.filter(item => item.location === location);
  }
  return getUniqueValues(data, 'location2');
};

// drinkYN 목록 가져오기
export const getDrinkYNs = async () => {
  const data = await getRestaurantCategories();
  return getUniqueValues(data, 'drinkYN');
};

// category 목록 가져오기
export const getCategories = async () => {
  const data = await getRestaurantCategories();
  return getUniqueValues(data, 'category');
};

// signature 목록 가져오기
export const getSignatures = async () => {
  const data = await getRestaurantCategories();
  return getUniqueValues(data, 'signature');
};
