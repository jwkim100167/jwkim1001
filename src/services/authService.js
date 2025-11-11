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

    // 로그인 성공 - localStorage에 저장 (1시간 만료 시간 포함)
    const loginTime = Date.now();
    const user = {
      id: data.id,
      loginId: data.login_id,
      createdAt: data.created_at,
      loginTime: loginTime
    };

    localStorage.setItem('user', JSON.stringify(user));

    // 로그인 히스토리 저장 (admin, test 제외)
    if (loginId !== 'admin' && loginId !== 'test') {
      try {
        await supabase.from('loginHistoryTable').insert({
          u_id: data.id,
          ip: null
        });
      } catch (historyError) {
        console.error('로그인 히스토리 저장 실패:', historyError);
        // 히스토리 저장 실패해도 로그인은 성공으로 처리
      }
    }

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
    const user = JSON.parse(userStr);

    // 로그인 시간 체크 (1시간 = 3600000ms)
    if (user.loginTime) {
      const currentTime = Date.now();
      const elapsedTime = currentTime - user.loginTime;

      if (elapsedTime > 3600000) {
        // 1시간 경과 시 자동 로그아웃
        logout();
        return null;
      }
    }

    return user;
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
