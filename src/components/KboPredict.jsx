import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActualRank, getPredictions } from '../services/supabaseKbo';
import './KboPredict.css';

const BASE = 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/KBOHome/resources/images/emblem/regular';
const TEAMS = {
  1:  { name: 'KIA',  color: '#e60012', logo: `${BASE}/2022/HT.png` },
  2:  { name: '삼성', color: '#074ca1', logo: `${BASE}/2022/SS.png` },
  3:  { name: 'LG',   color: '#c30452', logo: `${BASE}/2022/LG.png` },
  4:  { name: '두산', color: '#131230', logo: `${BASE}/2025/OB.png` },
  5:  { name: 'KT',   color: '#e60012', logo: `${BASE}/2022/KT.png` },
  6:  { name: '한화', color: '#f37021', logo: `${BASE}/2025/HH.png` },
  7:  { name: '롯데', color: '#e31837', logo: `${BASE}/2022/LT.png` },
  8:  { name: 'SSG',  color: '#ce0e2d', logo: `${BASE}/2024/SK.png` },
  9:  { name: 'NC',   color: '#065ead', logo: `${BASE}/2022/NC.png` },
  10: { name: '키움', color: '#820024', logo: `${BASE}/2022/WO.png` },
};

const MOCK_ACTUAL_RANK = [3, 1, 8, 5, 6, 2, 7, 9, 4, 10];
const MOCK_USERS = [
  { name: '김종웅1', data: '12345', myTeam: '1' },
  { name: '김종웅2', data: '54321', myTeam: '2' },
  { name: '이민준',  data: '31865', myTeam: '3' },
  { name: '박서연',  data: '38516', myTeam: '8' },
  { name: '최지훈',  data: '35186', myTeam: '5' },
  { name: '한유나',  data: '13856', myTeam: '6' },
];

const PODIUM_MEDALS = ['🥇', '🥈', '🥉'];

function calcScore(userData, actualRank) {
  const predicted = userData.data.split('').map(Number);
  const top5Actual = actualRank.slice(0, 5);
  const myTeam = parseInt(userData.myTeam, 10);

  let entryScore = 0;
  let exactScore = 0;
  const fanBonus = top5Actual[0] === myTeam ? 1 : 0;

  const detail = predicted.map((teamId, idx) => {
    const inTop5 = top5Actual.includes(teamId);
    const exactMatch = inTop5 && top5Actual[idx] === teamId;
    if (inTop5) entryScore += 1;
    if (exactMatch) exactScore += 1;
    return { teamId, predictedRank: idx + 1, inTop5, exactMatch };
  });

  return { name: userData.name, myTeam, entryScore, exactScore, fanBonus, total: entryScore + exactScore + fanBonus, detail };
}

export default function KboPredict() {
  const navigate = useNavigate();
  const [actualRank, setActualRank] = useState(null);
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const [openIdx, setOpenIdx] = useState(null); // 열린 카드 인덱스

  useEffect(() => {
    async function loadData() {
      const [rankData, predData] = await Promise.all([getActualRank(2026), getPredictions(2026)]);
      setActualRank(rankData ?? MOCK_ACTUAL_RANK);
      setUsers(predData ?? MOCK_USERS);
      setIsMock(!rankData || !predData);
      setLoading(false);
    }
    loadData();
  }, []);

  const results = useMemo(() => {
    if (!actualRank || !users) return [];
    return users.map((u) => calcScore(u, actualRank)).sort((a, b) => b.total - a.total);
  }, [actualRank, users]);

  const top3 = results.slice(0, 3);

  const handleToggle = (idx) => setOpenIdx(openIdx === idx ? null : idx);

  if (loading) {
    return (
      <div className="kbo-page">
        <div className="kbo-container">
          <div className="kbo-loading">⚾ 데이터 불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="kbo-page">
      <div className="kbo-container">

        {/* 헤더 */}
        <div className="kbo-header">
          <button className="back-btn" onClick={() => navigate('/')}>← 홈</button>
          <h1>⚾ 2026 KBO 순위 예측</h1>
          <p className="kbo-subtitle">현재는 2026 시범경기 순위입니다.<br/>순위와 예측을 비교해 점수를 확인하세요.</p>
          {isMock && <div className="mock-badge">📋 MOCK DATA</div>}
        </div>

        {/* 예측 점수판 — TOP 3 */}
        <section className="section-card">
          <h2 className="section-title">🎯 예측 점수판</h2>
          <div className="score-legend">
            <span className="legend-item exact">■ 순위 완벽 적중</span>
            <span className="legend-item entry">■ 5강 진입 적중</span>
            <span className="legend-item miss">■ 미적중</span>
          </div>
          <div className="podium-cards">
            {top3.map((r, rank) => (
              <div key={r.name} className={`podium-card rank-${rank + 1} ${openIdx === rank ? 'open' : ''}`}>
                {/* 클릭 가능한 헤더 */}
                <button className="podium-header" onClick={() => handleToggle(rank)}>
                  <span className="podium-medal">{PODIUM_MEDALS[rank]}</span>
                  <div className="podium-info">
                    <span className="user-name">{r.name}</span>
                    <span className="user-myteam">
                      <img src={TEAMS[r.myTeam].logo} alt={TEAMS[r.myTeam].name} className="team-logo-xs" /> {TEAMS[r.myTeam].name} 팬
                    </span>
                  </div>
                  <div className="podium-score">
                    <span className="score-num">{r.total}</span>
                    <span className="score-label">점</span>
                  </div>
                  <span className={`chevron ${openIdx === rank ? 'up' : ''}`}>›</span>
                </button>

                {/* 펼쳐지는 예측 내용 */}
                {openIdx === rank && (
                  <div className="podium-detail">
                    <div className="prediction-list">
                      {r.detail.map((d) => (
                        <div
                          key={d.teamId}
                          className={`prediction-item ${d.exactMatch ? 'exact' : d.inTop5 ? 'entry' : 'miss'}`}
                        >
                          <span className="pred-rank">{d.predictedRank}위 예측</span>
                          <span className="pred-team"><img src={TEAMS[d.teamId].logo} alt={TEAMS[d.teamId].name} className="team-logo-xs" /> {TEAMS[d.teamId].name}</span>
                          <span className="pred-result">
                            {d.exactMatch ? '✅ +2' : d.inTop5 ? '🟡 +1' : '❌ 0'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="score-breakdown">
                      <span>5강진입 <b>{r.entryScore}</b>점</span>
                      <span>순위적중 <b>{r.exactScore}</b>점</span>
                      <span>팬심보너스 <b>{r.fanBonus}</b>점</span>
                      <span className="total-label">합계 <b>{r.total}</b>점</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 실제 순위표 */}
        <section className="section-card">
          <h2 className="section-title">🏆 실제 순위표</h2>
          <div className="rank-table">
            {actualRank.map((teamId, idx) => (
              <div
                key={teamId}
                className={`rank-row ${idx < 5 ? 'top5' : ''} ${idx === 0 ? 'first-place' : ''}`}
              >
                <span className="rank-num">{idx + 1}</span>
                <img src={TEAMS[teamId].logo} alt={TEAMS[teamId].name} className="team-logo-sm" />
                <span className="rank-name">{TEAMS[teamId].name}</span>
                {idx < 5 && <span className="top5-badge">5강</span>}
              </div>
            ))}
          </div>
        </section>

        {/* 채점 기준 */}
        <section className="section-card rules-card">
          <h2 className="section-title">📌 채점 기준</h2>
          <ul className="rules-list">
            <li>예측한 팀이 실제 1~5위 안에 있으면 <b>+1점</b> (최대 5점)</li>
            <li>5강 팀의 순위까지 정확히 일치하면 <b>추가 +1점</b> (최대 5점)</li>
            <li>응원팀이 실제 1위라면 <b>팬심 보너스 +1점</b></li>
          </ul>
        </section>

      </div>
    </div>
  );
}
