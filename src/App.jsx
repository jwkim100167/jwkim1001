import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import Lotto from './components/Lotto';
import JobBoard from './components/JobBoard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/lotto" element={<Lotto />} />
        <Route path="/jobs" element={<JobBoard />} />
      </Routes>
    </Router>
  );
}

export default App;
