import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActualRank, getPredictions, findMyPrediction } from '../services/supabaseKbo';
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

  return { name: userData.name, myTeam, entryScore, exactScore, fanBonus, total: entryScore + exactScore + fanBonus, detail, submittedAt: userData.submittedAt ?? null };
}

export default function KboPredict() {
  const navigate = useNavigate();
  const [actualRank, setActualRank] = useState(null);
  const [rankStats, setRankStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const [openIdx, setOpenIdx] = useState(null); // 열린 카드 인덱스
  const [showMore, setShowMore] = useState(false); // 4~5위 더보기

  // 내 점수판
  const [myScoreOpen, setMyScoreOpen] = useState(false);
  const [myName, setMyName] = useState('');
  const [myPhone, setMyPhone] = useState('010');
  const [myResult, setMyResult] = useState(null); // 조회 결과
  const [myError, setMyError] = useState('');
  const [mySearching, setMySearching] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [rankData, predData] = await Promise.all([getActualRank(2026), getPredictions(2026)]);
      setActualRank(rankData?.rankOrder ?? MOCK_ACTUAL_RANK);
      setRankStats(rankData?.rankStats ?? null);
      setUsers(predData ?? MOCK_USERS);
      setIsMock(!rankData || !predData);
      setLoading(false);
    }
    loadData();
  }, []);

  const results = useMemo(() => {
    if (!actualRank || !users) return [];
    return users.map((u) => calcScore(u, actualRank)).sort((a, b) => {
      // 1순위: 총점
      if (b.total !== a.total) return b.total - a.total;
      // 동률 시: 1위 순서 > 1위 진입 > 2위 순서 > 2위 진입 > ...
      for (let i = 0; i < 5; i++) {
        const da = a.detail[i];
        const db = b.detail[i];
        if (db.exactMatch !== da.exactMatch) return (db.exactMatch ? 1 : 0) - (da.exactMatch ? 1 : 0);
        if (db.inTop5 !== da.inTop5)         return (db.inTop5 ? 1 : 0) - (da.inTop5 ? 1 : 0);
      }
      // 최종: 제출/수정 시간이 이른 순 (updated_at 우선, 없으면 created_at)
      const tA = a.submittedAt ? new Date(a.submittedAt).getTime() : Infinity;
      const tB = b.submittedAt ? new Date(b.submittedAt).getTime() : Infinity;
      return tA - tB;
    });
  }, [actualRank, users]);

  const top3 = results.slice(0, 3);
  const rest = results.slice(3, 5);

  // 현황판: 팀별 가을야구 예측 선택률
  const teamPickCount = useMemo(() => {
    if (!users) return {};
    const count = {};
    for (let i = 1; i <= 10; i++) count[i] = 0;
    users.forEach((u) => {
      u.data.split('').map(Number).forEach((tid) => { count[tid] = (count[tid] || 0) + 1; });
    });
    return count;
  }, [users]);

  const handleToggle = (idx) => setOpenIdx(openIdx === idx ? null : idx);

  const handleMyPhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (!digits.startsWith('010')) { setMyPhone('010'); return; }
    let formatted = digits.slice(0, 3);
    if (digits.length > 3) formatted += '-' + digits.slice(3, 7);
    if (digits.length > 7) formatted += '-' + digits.slice(7, 11);
    setMyPhone(formatted);
  };

  const handleMySearch = async () => {
    if (!myName.trim()) { setMyError('이름을 입력해주세요.'); return; }
    const rawPhone = myPhone.replace(/-/g, '');
    if (!/^010\d{8}$/.test(rawPhone)) { setMyError('전화번호를 올바르게 입력해주세요.'); return; }
    setMySearching(true);
    setMyError('');
    setMyResult(null);
    const found = await findMyPrediction({ name: myName.trim(), phone: rawPhone });
    setMySearching(false);
    if (!found) {
      setMyError('일치하는 정보가 없습니다. 이름과 전화번호를 확인해주세요.');
    } else {
      setMyResult(calcScore(found, actualRank));
    }
  };

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

        {/* 내 점수판 */}
        <section className="section-card my-score-section">
          <button className="my-score-toggle" onClick={() => { setMyScoreOpen(!myScoreOpen); setMyResult(null); setMyError(''); }}>
            <span>🙋 내 점수판</span>
            <span className={`chevron ${myScoreOpen ? 'up' : ''}`}>›</span>
          </button>

          {myScoreOpen && (
            <div className="my-score-body">
              <div className="my-score-inputs">
                <input
                  className="my-score-input"
                  type="text"
                  placeholder="이름"
                  value={myName}
                  onChange={(e) => { setMyName(e.target.value); setMyResult(null); setMyError(''); }}
                  maxLength={10}
                />
                <input
                  className="my-score-input"
                  type="tel"
                  placeholder="010-0000-0000"
                  value={myPhone}
                  onChange={handleMyPhoneChange}
                  maxLength={13}
                />
                <button className="my-score-btn" onClick={handleMySearch} disabled={mySearching}>
                  {mySearching ? '조회 중...' : '조회'}
                </button>
              </div>

              {myError && <p className="my-score-error">{myError}</p>}

              {myResult && (
                <div className="my-score-result">
                  <div className="my-score-result-header">
                    <span className="my-score-name">{myResult.name}</span>
                    <span className="my-score-total"><b>{myResult.total}</b>점</span>
                  </div>
                  <div className="prediction-list">
                    {myResult.detail.map((d) => (
                      <div key={d.teamId} className={`prediction-item ${d.exactMatch ? 'exact' : d.inTop5 ? 'entry' : 'miss'}`}>
                        <span className="pred-rank">{d.predictedRank}위 예측</span>
                        <span className="pred-team">
                          <img src={TEAMS[d.teamId].logo} alt={TEAMS[d.teamId].name} className="team-logo-xs" /> {TEAMS[d.teamId].name}
                        </span>
                        <span className="pred-result">
                          {d.exactMatch ? '✅ +2' : d.inTop5 ? '🟡 +1' : '❌ 0'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="score-breakdown">
                    <span>가을야구 진입 <b>{myResult.entryScore}</b>점</span>
                    <span>순위적중 <b>{myResult.exactScore}</b>점</span>
                    <span>팬심보너스 <b>{myResult.fanBonus}</b>점</span>
                    <span className="total-label">합계 <b>{myResult.total}</b>점</span>
                  </div>
                  <button
                    className="my-score-edit-btn"
                    onClick={() => navigate('/kbo-predict/form', {
                      state: {
                        editMode: true,
                        name: myResult.name,
                        phone: myPhone.replace(/-/g, ''),
                        data: myResult.detail.map((d) => d.teamId).join(''),
                        myTeam: String(myResult.myTeam),
                      },
                    })}
                  >
                    ✏️ 예측 수정하기
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 예측 점수판 — TOP 3 */}
        <section className="section-card">
          <h2 className="section-title">🎯 예측 점수판</h2>
          <div className="score-legend">
            <span className="legend-item exact">■ 순위 완벽 적중</span>
            <span className="legend-item entry">■ 가을야구 진입 적중</span>
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
                      <span>가을야구 진입 <b>{r.entryScore}</b>점</span>
                      <span>순위적중 <b>{r.exactScore}</b>점</span>
                      <span>팬심보너스 <b>{r.fanBonus}</b>점</span>
                      <span className="total-label">합계 <b>{r.total}</b>점</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 더보기 (4~5위) */}
          {rest.length > 0 && (
            <>
              {showMore && rest.map((r, i) => {
                const rank = 3 + i;
                return (
                  <div key={r.name} className={`podium-card rank-rest ${openIdx === rank ? 'open' : ''}`}>
                    <button className="podium-header" onClick={() => handleToggle(rank)}>
                      <span className="podium-medal" style={{ fontSize: '1.1rem', opacity: 0.7 }}>#{rank + 1}</span>
                      <div className="podium-info">
                        <span className="user-name">{r.name}</span>
                        <span className="user-myteam">
                          <img src={TEAMS[r.myTeam].logo} alt={TEAMS[r.myTeam].name} className="team-logo-xs" /> {TEAMS[r.myTeam].name} 팬
                        </span>
                      </div>
                      <div className="podium-score">
                        <span className="score-num" style={{ fontSize: '1.4rem' }}>{r.total}</span>
                        <span className="score-label">점</span>
                      </div>
                      <span className={`chevron ${openIdx === rank ? 'up' : ''}`}>›</span>
                    </button>
                    {openIdx === rank && (
                      <div className="podium-detail">
                        <div className="prediction-list">
                          {r.detail.map((d) => (
                            <div key={d.teamId} className={`prediction-item ${d.exactMatch ? 'exact' : d.inTop5 ? 'entry' : 'miss'}`}>
                              <span className="pred-rank">{d.predictedRank}위 예측</span>
                              <span className="pred-team"><img src={TEAMS[d.teamId].logo} alt={TEAMS[d.teamId].name} className="team-logo-xs" /> {TEAMS[d.teamId].name}</span>
                              <span className="pred-result">{d.exactMatch ? '✅ +2' : d.inTop5 ? '🟡 +1' : '❌ 0'}</span>
                            </div>
                          ))}
                        </div>
                        <div className="score-breakdown">
                          <span>가을야구 진입 <b>{r.entryScore}</b>점</span>
                          <span>순위적중 <b>{r.exactScore}</b>점</span>
                          <span>팬심보너스 <b>{r.fanBonus}</b>점</span>
                          <span className="total-label">합계 <b>{r.total}</b>점</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button className="show-more-btn" onClick={() => setShowMore(!showMore)}>
                {showMore ? '접기 ▲' : '더보기 ▼'}
              </button>
            </>
          )}
        </section>

        {/* 현황판 */}
        <section className="section-card">
          <h2 className="section-title">📊 가을야구 예측 현황판</h2>
          <div className="pick-grid">
            {Object.entries(teamPickCount)
              .sort((a, b) => b[1] - a[1])
              .map(([teamId, count]) => {
                const pct = users ? Math.round((count / users.length) * 100) : 0;
                const tid = parseInt(teamId, 10);
                return (
                  <div key={teamId} className={`pick-cell ${pct >= 50 ? 'top5' : ''}`}>
                    <img src={TEAMS[tid].logo} alt={TEAMS[tid].name} className="team-logo-sm" />
                    <span className="pick-cell-name">{TEAMS[tid].name}</span>
                    <span className="pick-pct">{pct}%</span>
                  </div>
                );
              })}
          </div>
        </section>

        {/* 실제 순위표 */}
        <section className="section-card">
          <h2 className="section-title">🏆 실제 순위표</h2>
          <div className="rank-table">
            {actualRank.map((teamId, idx) => {
              const stats = rankStats?.[idx] ?? null;
              return (
                <div
                  key={teamId}
                  className={`rank-row ${idx < 5 ? 'top5' : ''} ${idx === 0 ? 'first-place' : ''}`}
                >
                  <span className="rank-num">{idx + 1}</span>
                  <img src={TEAMS[teamId].logo} alt={TEAMS[teamId].name} className="team-logo-sm" />
                  <span className="rank-name">{TEAMS[teamId].name}</span>
                  {stats && (
                    <span className="rank-stats">
                      <span className="stat-w">{stats.w}승</span>
                      {stats.d > 0 && <span className="stat-d">{stats.d}무</span>}
                      <span className="stat-l">{stats.l}패</span>
                    </span>
                  )}
                  {idx < 5 && <span className="top5-badge">가을야구</span>}
                </div>
              );
            })}
          </div>
        </section>

        {/* 채점 기준 */}
        <section className="section-card rules-card">
          <h2 className="section-title">📌 채점 기준</h2>
          <ul className="rules-list">
            <li>예측한 팀이 실제 가을야구(1~5위) 안에 있으면 <b>+1점</b> (최대 5점)</li>
            <li>가을야구 팀의 순위까지 정확히 일치하면 <b>추가 +1점</b> (최대 5점)</li>
            <li>응원팀이 실제 1위라면 <b>팬심 보너스 +1점</b></li>
          </ul>
        </section>

      </div>
    </div>
  );
}
