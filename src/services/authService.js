import { supabase } from '../supabaseClient';

/**
 * 비밀번호 강도 검사: 3종 8자 이상 또는 2종 10자 이상
 * 종류: 영문 대문자, 영문 소문자, 숫자, 특수문자
 */
export function isValidPassword(password) {
  const types = [
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  return types >= 3 && password.length >= 8;
}

/**
 * 비밀번호 변경
 */
export async function changePassword(userId, newPassword) {
  try {
    const { error } = await supabase
      .from('userTable')
      .update({ password: newPassword })
      .eq('id', userId);

    if (error) {
      console.error('비밀번호 변경 에러:', error);
      return { success: false, error: '비밀번호 변경 중 오류가 발생했습니다.' };
    }
    return { success: true };
  } catch (err) {
    console.error('비밀번호 변경 예외:', err);
    return { success: false, error: '비밀번호 변경 중 오류가 발생했습니다.' };
  }
}

/**
 * 로그인 마무리 처리 (localStorage 저장 + last_login_at 업데이트 + 히스토리 기록)
 */
export async function finishLogin(userId, loginId, createdAt, userName) {
  const user = { id: userId, loginId, userName: userName || loginId, createdAt, loginTime: Date.now() };
  localStorage.setItem('user', JSON.stringify(user));

  if (loginId !== 'admin' && loginId !== 'test') {
    try {
      await supabase
        .from('userTable')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);
      await supabase.from('loginHistoryTable').insert({ u_id: userId, ip: null });
    } catch {}
  }
  return user;
}

/**
 * 로그인 함수
 * @param {string} loginId
 * @param {string} password
 * @returns {Promise<{success: boolean, user?: object, needsVerification?: boolean, needsPasswordChange?: boolean, error?: string}>}
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

    // 비밀번호 강도 확인 (admin, test 제외)
    if (loginId !== 'admin' && loginId !== 'test' && !isValidPassword(password)) {
      return {
        success: false,
        needsPasswordChange: true,
        userId: data.id,
        loginId: data.login_id,
        userName: data.userName || data.login_id,
        createdAt: data.created_at,
        status: data.status,
      };
    }

    // status 가 ONLINE 이 아니면 인증 페이지로
    if (data.status !== 'ONLINE') {
      return {
        success: false,
        needsVerification: true,
        userId: data.id,
        loginId: data.login_id,
        userName: data.userName || data.login_id,
        createdAt: data.created_at,
      };
    }

    // 로그인 성공 - localStorage에 저장 (1시간 만료 시간 포함)
    const user = buildUser(data);
    localStorage.setItem('user', JSON.stringify(user));

    // last_login_at 업데이트 + 로그인 히스토리 저장 (admin, test 제외)
    if (loginId !== 'admin' && loginId !== 'test') {
      try {
        await supabase
          .from('userTable')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.id);
        await supabase.from('loginHistoryTable').insert({ u_id: data.id, ip: null });
      } catch (historyError) {
        console.error('로그인 히스토리 저장 실패:', historyError);
      }
    }

    return { success: true, user };
  } catch (err) {
    console.error('로그인 예외:', err);
    return { success: false, error: '로그인 중 오류가 발생했습니다.' };
  }
}

function buildUser(data) {
  return {
    id: data.id,
    loginId: data.login_id,
    userName: data.userName || data.login_id,
    createdAt: data.created_at,
    loginTime: Date.now(),
  };
}

/**
 * 인증 질문 목록 조회
 */
export async function getVerificationQuestions() {
  const { data, error } = await supabase
    .from('userQuestion')
    .select('id, question');

  if (error) {
    console.error('질문 조회 에러:', error);
    return [];
  }
  return data;
}

/**
 * 답변 검증 후 status ONLINE 으로 변경, 로그인 처리
 */
export async function verifyAndActivate(userId, loginId, createdAt, questionId, answer, recommendPerson = '', userName = '') {
  try {
    // 답변 확인
    const { data: qData, error: qError } = await supabase
      .from('userQuestion')
      .select('answer')
      .eq('id', questionId)
      .single();

    if (qError || !qData) {
      return { success: false, error: '질문을 찾을 수 없습니다.' };
    }

    if (qData.answer.trim().toLowerCase() !== answer.trim().toLowerCase()) {
      return { success: false, error: '답변이 일치하지 않습니다.' };
    }

    // status ONLINE 으로 업데이트 + 추천인 저장 + last_login_at
    const updateData = { status: 'ONLINE', last_login_at: new Date().toISOString() };
    if (recommendPerson.trim()) {
      updateData.recommendPerson = recommendPerson.trim();
    }

    const { error: updateError } = await supabase
      .from('userTable')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      console.error('status 업데이트 에러:', updateError);
      return { success: false, error: '인증 처리 중 오류가 발생했습니다.' };
    }

    // 로그인 처리
    const user = { id: userId, loginId, userName: userName || loginId, createdAt, loginTime: Date.now() };
    localStorage.setItem('user', JSON.stringify(user));

    if (loginId !== 'admin' && loginId !== 'test') {
      try {
        await supabase.from('loginHistoryTable').insert({ u_id: userId, ip: null });
      } catch {}
    }

    return { success: true, user };
  } catch (err) {
    console.error('인증 예외:', err);
    return { success: false, error: '인증 중 오류가 발생했습니다.' };
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
 * 회원가입 함수
 */
export async function register(loginId, password, userName) {
  try {
    const { data: existing, error: checkError } = await supabase
      .from('userTable')
      .select('id')
      .eq('login_id', loginId)
      .maybeSingle();

    if (checkError) {
      console.error('중복 체크 에러:', checkError);
      return { success: false, error: '회원가입 중 오류가 발생했습니다.' };
    }

    if (existing) {
      return { success: false, error: '이미 사용 중인 아이디입니다.' };
    }

    const { data, error } = await supabase
      .from('userTable')
      .insert({ login_id: loginId, password, userName })
      .select();

    console.log('insert 결과:', data, error);

    if (error) {
      console.error('회원가입 에러:', error);
      return { success: false, error: '회원가입 중 오류가 발생했습니다.' };
    }

    const newUser = data[0];
    return {
      success: true,
      userId: newUser.id,
      loginId: newUser.login_id,
      userName: newUser.userName || userName,
      createdAt: newUser.created_at,
    };
  } catch (err) {
    console.error('회원가입 예외:', err);
    return { success: false, error: '회원가입 중 오류가 발생했습니다.' };
  }
}

/**
 * 로그인 여부 확인
 */
export function isAuthenticated() {
  return getCurrentUser() !== null;
}
