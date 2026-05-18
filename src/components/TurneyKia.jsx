import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TurneyKia.css';

const CATEGORIES = [
  {
    id: 'celebrity',
    emoji: '🎬',
    title: '연예인',
    desc: '좋아하는 연예인을 골라보세요',
    colorClass: 'category-celebrity',
  },
  {
    id: 'athlete',
    emoji: '🏅',
    title: '운동선수',
    desc: '최고의 운동선수는 누구?',
    colorClass: 'category-athlete',
  },
  {
    id: 'politician',
    emoji: '🏛️',
    title: '정치인',
    desc: '영향력 있는 정치인 선택',
    colorClass: 'category-politician',
  },
];

export default function TurneyKia() {
  const navigate = useNavigate();

  return (
    <div className="turneyia-page">
      <div className="turneyia-container">
        <button className="turneyia-back-btn" onClick={() => navigate('/')}>← 홈</button>

        <div className="turneyia-header">
          <div className="turneyia-icon">🏆</div>
          <h1>터이네키아</h1>
          <p className="turneyia-subtitle">카테고리를 선택하세요</p>
        </div>

        <div className="turneyia-categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`turneyia-card ${cat.colorClass}`}
              onClick={() => navigate(`/turneyia/${cat.id}`)}
            >
              <span className="turneyia-card-emoji">{cat.emoji}</span>
              <span className="turneyia-card-title">{cat.title}</span>
              <span className="turneyia-card-desc">{cat.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
