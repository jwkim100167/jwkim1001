import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getCurrentUser, login as loginService, logout as logoutService, extendSession } from '../services/core/authService';

const SESSION_MS = 30 * 60 * 1000;   // 30분
const WARN_BEFORE_MS = 60 * 1000;    // 만료 1분 전 경고

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const warnTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const logoutRef = useRef(null);

  const clearSessionTimers = () => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    warnTimerRef.current = null;
    countdownRef.current = null;
  };

  const performLogout = useCallback(() => {
    clearSessionTimers();
    logoutService();
    setUser(null);
    setShowExtendModal(false);
  }, []);

  logoutRef.current = performLogout;

  const startCountdown = useCallback(() => {
    setShowExtendModal(true);
    setCountdown(60);
    let secs = 60;
    countdownRef.current = setInterval(() => {
      secs -= 1;
      setCountdown(secs);
      if (secs <= 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        logoutRef.current();
      }
    }, 1000);
  }, []);

  const startSessionTimer = useCallback((loginTime) => {
    clearSessionTimers();
    const elapsed = Date.now() - loginTime;
    const timeUntilWarn = SESSION_MS - WARN_BEFORE_MS - elapsed;

    if (timeUntilWarn <= 0) {
      const timeLeft = SESSION_MS - elapsed;
      if (timeLeft <= 0) {
        logoutRef.current();
      } else {
        startCountdown();
      }
      return;
    }

    warnTimerRef.current = setTimeout(() => {
      startCountdown();
    }, timeUntilWarn);
  }, [startCountdown]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setLoading(false);
    // 로그인 상태 유지 중이면 30분 세션 타이머를 쓰지 않음
    if (currentUser?.loginTime && !currentUser.keepLogin) {
      startSessionTimer(currentUser.loginTime);
    }
    return () => clearSessionTimers();
  }, []);

  // 로그인 상태 유지면 진행 중이던 30분 타이머·팝업을 정리, 아니면 30분 타이머 시작
  const applySessionTimer = (user) => {
    if (user?.keepLogin) {
      clearSessionTimers();
      setShowExtendModal(false);
    } else if (user?.loginTime) {
      startSessionTimer(user.loginTime);
    }
  };

  const login = async (loginId, password, keepLogin = false) => {
    const result = await loginService(loginId, password, keepLogin);
    if (result.success) {
      setUser(result.user);
      applySessionTimer(result.user);
    }
    return result;
  };

  const logout = () => {
    performLogout();
  };

  const loginDirect = (user) => {
    setUser(user);
    applySessionTimer(user);
  };

  const handleExtend = () => {
    const ok = extendSession();
    if (ok) {
      clearSessionTimers();
      setShowExtendModal(false);
      setCountdown(60);
      startSessionTimer(Date.now());
    }
  };

  const value = {
    user,
    login,
    logout,
    loginDirect,
    isAuthenticated: user !== null,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showExtendModal && (
        <div className="session-overlay">
          <div className="session-modal">
            <h3 className="session-title">세션 만료 안내</h3>
            <p className="session-msg">
              <span className="session-countdown">{countdown}</span>초 후 자동 로그아웃됩니다.
            </p>
            <p className="session-sub">로그인을 연장하시겠습니까?</p>
            <div className="session-buttons">
              <button className="session-btn-extend" onClick={handleExtend}>연장하기</button>
              <button className="session-btn-logout" onClick={performLogout}>로그아웃</button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
