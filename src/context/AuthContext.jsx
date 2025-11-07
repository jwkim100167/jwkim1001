import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, login as loginService, logout as logoutService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 컴포넌트 마운트 시 localStorage에서 사용자 정보 로드
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setLoading(false);

    // 1분마다 로그인 시간 체크
    const intervalId = setInterval(() => {
      const user = getCurrentUser();
      if (!user && currentUser) {
        // 세션 만료로 로그아웃된 경우
        setUser(null);
      }
    }, 60000); // 1분마다 체크

    return () => clearInterval(intervalId);
  }, []);

  const login = async (loginId, password) => {
    const result = await loginService(loginId, password);
    if (result.success) {
      setUser(result.user);
    }
    return result;
  };

  const logout = () => {
    logoutService();
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: user !== null,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
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
