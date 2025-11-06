import { supabase } from '../supabaseClient';

/**
 * 로그인 함수
 * @param {string} loginId
 * @param {string} password
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function login(loginId, password) {
  try {
    const { data, error } = await supabase
      .from('userTable')
      .select('*')
      .eq('login_id', loginId)
      .eq('password', password)
      .single();

    if (error) {
      console.error('로그인 에러:', error);
      return { success: false, error: '아이디 또는 비밀번호가 일치하지 않습니다.' };
    }

    if (!data) {
      return { success: false, error: '아이디 또는 비밀번호가 일치하지 않습니다.' };
    }

    // 로그인 성공 - localStorage에 저장
    const user = {
      id: data.id,
      loginId: data.login_id,
      createdAt: data.created_at
    };

    localStorage.setItem('user', JSON.stringify(user));

    return { success: true, user };
  } catch (err) {
    console.error('로그인 예외:', err);
    return { success: false, error: '로그인 중 오류가 발생했습니다.' };
  }
}

/**
 * 로그아웃 함수
 */
export function logout() {
  localStorage.removeItem('user');
}

/**
 * 현재 로그인된 사용자 가져오기
 * @returns {object|null}
 */
export function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * 로그인 여부 확인
 * @returns {boolean}
 */
export function isAuthenticated() {
  return getCurrentUser() !== null;
}
