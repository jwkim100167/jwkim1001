import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import Lotto from './components/Lotto';
import JobBoard from './components/JobBoard';
import Momok from './components/Momok';

function App() {
  // GitHub Pages의 경우 basename 설정
  const basename = import.meta.env.MODE === 'production' ? '/jwkim1001' : '/';

  return (
    <Router basename={basename}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/lotto" element={<Lotto />} />
        <Route path="/momok" element={<Momok />} />
        <Route path="/jobs" element={<JobBoard />} />
      </Routes>
    </Router>
  );
}

export default App;
