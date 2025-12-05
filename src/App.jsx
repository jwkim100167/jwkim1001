import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import Lotto from './components/Lotto';
import JobBoard from './components/JobBoard';
import Komom from './components/Komom';
import Momok from './components/Momok';
import WhatToEat from './components/WhatToEat';
import Login from './components/Login';
import MyPage from './components/MyPage';
import Admin from './components/Admin';
import LottoAdmin from './components/LottoAdmin';

function App() {
  // GitHub Pages의 경우 basename 설정
  const basename = import.meta.env.MODE === 'production' ? '/jwkim1001' : '/';

  return (
    <AuthProvider>
      <Router basename={basename}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/lottoadmin" element={<LottoAdmin />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/lotto" element={<Lotto />} />
          <Route path="/whattoeat" element={<WhatToEat />} />
          <Route path="/komom" element={<Komom />} />
          <Route path="/momok" element={<Momok />} />
          <Route path="/jobs" element={<JobBoard />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
