import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPredictions } from '../services/supabaseWorldCup';
import { WC_TEAMS } from '../data/worldCupTeamData';
import './WorldCupPredict.css';

const RANK_LABELS = ['🥇 1위', '🥈 2위', '🥉 3위'];

const MOCK_USERS = [
  { name: '홍길동', picks: '9,37,33' },
  { name: '김철수', picks: '37,9,33' },
  { name: '이영희', picks: '9,33,37' },
  { name: '박민준', picks: '33,9,37' },
  { name: '최지우', picks: '17,9,37' },
];

export default function WorldCupPredict() {
  const navigate = useNavigate();

  const [users, setUsers]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [isMock, setIsMock]     = useState(false);
  const [openIdx, setOpenIdx]   = useState(null);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    async function loadData() {
      const predData = await getPredictions(2026);
      setUsers(predData ?? MOCK_USERS);
      setIsMock(!predData);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="wc-result-page">
        <div className="wc-result-container">
          <div className="wc-loading">⚽ 데이터 불러오는 중...</div>
        </div>
      </div>
    );
  }

  const visible = showMore ? users : users.slice(0, 10);

  return (
    <div className="wc-result-page">
      <div className="wc-result-container">

        {/* 헤더 */}
        <div className="wc-result-header">
          <button className="wc-result-back-btn" onClick={() => navigate('/')}>← 홈</button>
          <h1>⚽ 2026 FIFA 월드컵 순위 예측</h1>
          {isMock && <div className="wc-mock-badge">📋 MOCK DATA</div>}
        </div>

        {/* 참가자 목록 */}
        <section className="wc-section-card">
          <h2 className="wc-section-title">
            🎯 참가자 목록
            <span className="wc-participant-count">{users?.length ?? 0}명</span>
          </h2>

          <div className="wc-list-cards">
            {visible.map((u, idx) => (
              <div key={idx} className="wc-list-item">
                <button
                  className="wc-list-header"
                  onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                >
                  <span className="wc-list-num">{idx + 1}</span>
                  <span className="wc-list-name">{u.name}<span className="wc-list-student">({u.studentId})</span></span>
                  <span className={`wc-chevron ${openIdx === idx ? 'up' : ''}`}>›</span>
                </button>

                {openIdx === idx && (
                  <div className="wc-list-detail">
                    {u.picks.split(',').map(Number).map((teamId, rankIdx) => (
                      <div key={rankIdx} className="wc-pick-row">
                        <span className="wc-pick-label">{RANK_LABELS[rankIdx]}</span>
                        <img
                          src={WC_TEAMS[teamId].flagUrl}
                          alt={WC_TEAMS[teamId].name}
                          className="wc-pick-flag"
                        />
                        <span className="wc-pick-name">{WC_TEAMS[teamId].name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {users.length > 10 && (
            <button className="wc-show-more-btn" onClick={() => setShowMore(!showMore)}>
              {showMore ? '접기 ▲' : `더보기 ▼ (${users.length - 10}명 더)`}
            </button>
          )}
        </section>

        {/* 채점 기준 */}
        <section className="wc-section-card wc-rules-card">
          <h2 className="wc-section-title">📌 채점 기준</h2>
          <ul className="wc-rules-list">
            <li>🥇 1위 팀을 정확히 맞춤 <b>50점</b></li>
            <li>🥈 2위 팀을 정확히 맞춤 <b>30점</b></li>
            <li>🥉 3위 팀을 정확히 맞춤 <b>20점</b></li>
            <li>🟡 팀은 맞고 순위가 틀림 <b>10점</b></li>
          </ul>
        </section>

      </div>
    </div>
  );
}
