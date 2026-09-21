import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import Home from './components/common/Home';
import Dashboard from './components/Dashboard';
import Lotto from './components/lotto/Lotto';
import LottoMembership from './components/lotto/LottoMembership';
import JobBoard from './components/JobBoard';
import Momok from './components/lifestyle/food/Momok';
import WhatToEat from './components/lifestyle/food/WhatToEat';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Verify from './components/auth/Verify';
import ChangePassword from './components/auth/ChangePassword';
import MomokBest from './components/lifestyle/food/MomokBest';
import LottoBasic from './components/lotto/LottoBasic';
import MyPage from './components/common/MyPage';
import Admin from './components/common/Admin';
import LottoAdmin from './components/lotto/LottoAdmin';
import TasteMatch from './components/lifestyle/tasteMatch/TasteMatch';
import KboLanding from './components/prediction/kbo/KboLanding';
import KboPredict from './components/prediction/kbo/KboPredict';
import KboPredictForm from './components/prediction/kbo/KboPredictForm';
import WorldCupLanding from './components/WorldCupLanding';
import WorldCupPredict from './components/WorldCupPredict';
import WorldCupPredictForm from './components/WorldCupPredictForm';
import CobraGame from './components/games/cobra/CobraGame';
import Mandalart from './components/lifestyle/mandalart/Mandalart';
import PrivacyPolicy from './components/common/PrivacyPolicy';
import TurneyKiaGame from './components/games/turneyKia/TurneyKiaGame';
import TypingGame from './components/games/brain/BrainHub';
import AkinatorGame from './components/games/akinator/AkinatorGame';
import BlokusGame from './components/games/blokus/BlokusGame';
import MovieRecommend from './components/lifestyle/movieRecommend/MovieRecommend';
import TasteHub from './components/lifestyle/TasteHub';
import BonusHub from './components/lifestyle/BonusHub';
import GatsaengHub from './components/lifestyle/GatsaengHub';

function App() {
  // GitHub Pages의 경우 basename 설정
  const basename = import.meta.env.MODE === 'production' ? '/jwkim1001' : '/';

  return (
    <AuthProvider>
      <Router basename={basename}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/lottoadmin" element={<LottoAdmin />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/lotto" element={<LottoMembership />} />
          <Route path="/lotto-membership" element={<Lotto />} />
          <Route path="/lotto-basic" element={<LottoBasic />} />
          <Route path="/whattoeat" element={<WhatToEat />} />
          <Route path="/momok" element={<Momok />} />
          <Route path="/momok-best" element={<MomokBest />} />
          <Route path="/jobs" element={<JobBoard />} />
          <Route path="/taste-match" element={<TasteMatch />} />
          <Route path="/kbo-predict" element={<KboLanding />} />
          <Route path="/kbo-predict/result" element={<KboPredict />} />
          <Route path="/kbo-predict/form" element={<KboPredictForm />} />
          <Route path="/world-cup-predict" element={<WorldCupLanding />} />
          <Route path="/world-cup-predict/result" element={<WorldCupPredict />} />
          <Route path="/world-cup-predict/form" element={<WorldCupPredictForm />} />
          <Route path="/cobra" element={<CobraGame />} />
          <Route path="/mandalart" element={<Mandalart />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/turneyia" element={<TurneyKiaGame />} />
          <Route path="/mini-arcade" element={<TypingGame />} />
          <Route path="/mini-arcade/akinator" element={<AkinatorGame />} />
          <Route path="/blokus" element={<BlokusGame />} />
          <Route path="/movie-recommend" element={<MovieRecommend />} />
          <Route path="/taste-lab" element={<TasteHub />} />
          <Route path="/bonus" element={<BonusHub />} />
          <Route path="/gatsaeng" element={<GatsaengHub />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
