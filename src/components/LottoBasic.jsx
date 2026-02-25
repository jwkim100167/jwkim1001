import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LottoBasic.css';

const NUMBER_COLORS = [
  { range: [1, 10], bg: '#fbc400', color: '#000' },
  { range: [11, 20], bg: '#69c8f2', color: '#000' },
  { range: [21, 30], bg: '#ff7272', color: '#fff' },
  { range: [31, 40], bg: '#aaa', color: '#fff' },
  { range: [41, 45], bg: '#b0d840', color: '#000' },
];

function getNumberStyle(num) {
  const match = NUMBER_COLORS.find(({ range }) => num >= range[0] && num <= range[1]);
  return match ? { background: match.bg, color: match.color } : {};
}

function generateGame() {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1);
  const picked = [];
  while (picked.length < 6) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked.sort((a, b) => a - b);
}

const LottoBasic = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState(null);

  const handleGenerate = () => {
    setGames(Array.from({ length: 5 }, generateGame));
  };

  return (
    <div className="lb-wrap">
      <div className="lb-header">
        <button className="lb-back" onClick={() => navigate('/')}>← 홈</button>
        <h1 className="lb-title">🎰 로또 서비스</h1>
      </div>

      <div className="lb-body">
        <button className="lb-gen-btn" onClick={handleGenerate}>
          번호 생성
        </button>

        {games && (
          <div className="lb-games">
            {games.map((nums, idx) => (
              <div key={idx} className="lb-game">
                <span className="lb-game-label">게임 {idx + 1}</span>
                <div className="lb-balls">
                  {nums.map((num) => (
                    <span key={num} className="lb-ball" style={getNumberStyle(num)}>
                      {num}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LottoBasic;
