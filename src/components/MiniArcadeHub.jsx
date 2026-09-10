import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './MiniArcadeHub.css';

const GAMES = [
  {
    id: 'typing',
    icon: '⌨️',
    title: '한컴타자연습',
    desc: '친구와 타이핑 대결',
    path: '/mini-arcade/typing',
    active: true,
    color: '#00d2ff',
  },
  {
    id: 'math-odd',
    icon: '➕',
    title: '산수홀짝',
    desc: '계산 결과 홀수? 짝수?',
    path: '/mini-arcade/math-odd',
    active: false,
    color: '#f7971e',
  },
  {
    id: 'gugu',
    icon: '✖️',
    title: '구구단을 하자',
    desc: '빈칸을 채워라',
    path: '/mini-arcade/gugu',
    active: false,
    color: '#a18cd1',
  },
  {
    id: 'counting',
    icon: '🔢',
    title: '순서대로',
    desc: '숫자를 빠르게 클릭',
    path: '/mini-arcade/counting',
    active: false,
    color: '#43e97b',
  },
  {
    id: 'apple',
    icon: '🍎',
    title: '사과게임',
    desc: '드래그해서 합 10 만들기',
    path: '/mini-arcade/apple',
    active: false,
    color: '#f44369',
  },
  {
    id: 'memory',
    icon: '🧩',
    title: '기억력 게임',
    desc: '카드 짝 맞추기',
    path: '/mini-arcade/memory',
    active: false,
    color: '#4facfe',
  },
  {
    id: 'updown',
    icon: '🔐',
    title: '비번을 맞혀라',
    desc: '업앤다운으로 추리',
    path: '/mini-arcade/updown',
    active: false,
    color: '#f093fb',
  },
  {
    id: 'balloon',
    icon: '🎈',
    title: '풍선터뜨리기',
    desc: '색깔 함정 주의!',
    path: '/mini-arcade/balloon',
    active: false,
    color: '#ff6b6b',
  },
  {
    id: 'leftright',
    icon: '↔️',
    title: '좌로우로',
    desc: '빠른 방향 반응',
    path: '/mini-arcade/leftright',
    active: false,
    color: '#43e97b',
  },
];

export default function MiniArcadeHub() {
  const navigate = useNavigate();

  return (
    <div className="hub-wrap">
      <button className="hub-back-btn" onClick={() => navigate('/')}>← 홈으로</button>

      <div className="hub-container">
        <div className="hub-header">
          <div className="hub-logo-icon">🧠</div>
          <h1 className="hub-title">두뇌 미니게임</h1>
          <p className="hub-subtitle">타이핑 · 계산 · 반응속도 9종</p>
        </div>

        <div className="hub-grid">
          {GAMES.map((game) =>
            game.active ? (
              <Link
                key={game.id}
                to={game.path}
                className="hub-card hub-card-active"
                style={{ '--card-color': game.color }}
              >
                <div className="hub-card-icon">{game.icon}</div>
                <div className="hub-card-title">{game.title}</div>
                <div className="hub-card-desc">{game.desc}</div>
              </Link>
            ) : (
              <div
                key={game.id}
                className="hub-card hub-card-disabled"
                style={{ '--card-color': game.color }}
              >
                <div className="hub-card-icon">{game.icon}</div>
                <div className="hub-card-title">{game.title}</div>
                <div className="hub-card-desc">{game.desc}</div>
                <div className="hub-coming-soon">준비 중</div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
