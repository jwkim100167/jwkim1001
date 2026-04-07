import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { addPrediction, updatePrediction } from '../services/supabaseKbo';
import './KboPredictForm.css';

const BASE = 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/KBOHome/resources/images/emblem/regular';
const TEAMS = [
  { id: 1,  name: 'KIA',  logo: `${BASE}/2022/HT.png` },
  { id: 2,  name: '삼성', logo: `${BASE}/2022/SS.png` },
  { id: 3,  name: 'LG',   logo: `${BASE}/2022/LG.png` },
  { id: 4,  name: '두산', logo: `${BASE}/2025/OB.png` },
  { id: 5,  name: 'KT',   logo: `${BASE}/2022/KT.png` },
  { id: 6,  name: '한화', logo: `${BASE}/2025/HH.png` },
  { id: 7,  name: '롯데', logo: `${BASE}/2022/LT.png` },
  { id: 8,  name: 'SSG',  logo: `${BASE}/2024/SK.png` },
  { id: 9,  name: 'NC',   logo: `${BASE}/2022/NC.png` },
  { id: 10, name: '키움', logo: `${BASE}/2022/WO.png` },
];

const RANK_LABELS = ['1위', '2위', '3위', '4위', '5위'];

function formatPhone(raw) {
  let f = raw.slice(0, 3);
  if (raw.length > 3) f += '-' + raw.slice(3, 7);
  if (raw.length > 7) f += '-' + raw.slice(7, 11);
  return f;
}

export default function KboPredictForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const editState = location.state; // { editMode, name, phone (raw), data, myTeam }
  const isEditMode = editState?.editMode === true;

  const [name, setName] = useState(editState?.name || '');
  const [phone, setPhone] = useState(editState?.phone ? formatPhone(editState.phone) : '010');
  const [picks, setPicks] = useState(
    editState?.data ? editState.data.split('').map(Number) : []
  );
  const [myTeam, setMyTeam] = useState(
    editState?.myTeam ? parseInt(editState.myTeam, 10) : null
  );
  const [step, setStep] = useState('pick'); // 'pick' | 'done'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 전화번호 입력 핸들러 — 010 고정, 자동 하이픈
  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (!digits.startsWith('010')) {
      setPhone('010');
      return;
    }
    let formatted = digits.slice(0, 3);
    if (digits.length > 3) formatted += '-' + digits.slice(3, 7);
    if (digits.length > 7) formatted += '-' + digits.slice(7, 11);
    setPhone(formatted);
  };

  // 팀 선택 토글
  const handlePickTeam = (teamId) => {
    if (picks.includes(teamId)) {
      // 선택 해제
      setPicks(picks.filter((id) => id !== teamId));
    } else if (picks.length < 5) {
      setPicks([...picks, teamId]);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('이름을 입력해주세요.'); return; }
    const rawPhone = phone.replace(/-/g, '');
    if (!/^010\d{8}$/.test(rawPhone)) { setError('전화번호를 올바르게 입력해주세요. (010-XXXX-XXXX)'); return; }
    if (picks.length < 5) { setError('5강 팀을 모두 선택해주세요.'); return; }
    if (!myTeam) { setError('응원팀을 선택해주세요.'); return; }

    setSubmitting(true);
    setError('');
    const data = picks.join(''); // e.g. "31856"
    const ok = isEditMode
      ? await updatePrediction({ name: name.trim(), phone: rawPhone, data, myTeam, season: 2026 })
      : await addPrediction({ name: name.trim(), phone: rawPhone, data, myTeam, season: 2026 });
    setSubmitting(false);

    if (ok === true) {
      setStep('done');
    } else if (ok === 'duplicate_phone') {
      setError('이미 등록된 전화번호입니다. 수정을 원하시면 점수 확인에서 조회 후 수정해주세요.');
    } else {
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  if (step === 'done') {
    return (
      <div className="form-page">
        <div className="form-container">
          <div className="done-card">
            <div className="done-icon">{isEditMode ? '✅' : '🎉'}</div>
            <h2>{isEditMode ? '수정 완료!' : '예측 완료!'}</h2>
            <p><b>{name}</b>님의 예측이 {isEditMode ? '수정됐습니다.' : '저장됐습니다.'}</p>
            <div className="done-picks">
              {picks.map((id, idx) => {
                const t = TEAMS.find((t) => t.id === id);
                return (
                  <div key={id} className="done-pick-row">
                    <span className="done-rank">{RANK_LABELS[idx]}</span>
                    <span><img src={t.logo} alt={t.name} className="team-logo-xs" /> {t.name}</span>
                  </div>
                );
              })}
            </div>
            <button className="submit-btn" onClick={() => navigate('/kbo-predict/result')}>
              점수판 보기 →
            </button>
            <button className="secondary-btn" onClick={() => navigate('/')}>홈으로</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="form-page">
      <div className="form-container">
        <button className="form-back-btn" onClick={() => navigate('/kbo-predict')}>← 뒤로</button>

        <div className="form-header">
          <h1>{isEditMode ? '✏️ 예측 수정' : '✏️ 2026 KBO 순위 예측'}</h1>
          <p>5강에 들 팀을 순서대로 선택하세요</p>
        </div>

        {/* 이름 입력 */}
        <section className="form-section">
          <label className="form-label">이름</label>
          <input
            className={`form-input ${isEditMode ? 'form-input-readonly' : ''}`}
            type="text"
            placeholder="예) 홍길동"
            value={name}
            onChange={(e) => !isEditMode && setName(e.target.value)}
            maxLength={10}
            readOnly={isEditMode}
          />
        </section>

        {/* 전화번호 입력 */}
        <section className="form-section">
          <label className="form-label">전화번호</label>
          <input
            className={`form-input ${isEditMode ? 'form-input-readonly' : ''}`}
            type="tel"
            value={phone}
            onChange={isEditMode ? undefined : handlePhoneChange}
            placeholder="010-0000-0000"
            maxLength={13}
            readOnly={isEditMode}
          />
          {!isEditMode && <p className="phone-notice">📌 선물 받을 번호를 입력해주세요.</p>}
        </section>

        {/* 5강 예측 선택 */}
        <section className="form-section">
          <label className="form-label">5강 예측 <span className="form-hint">순서대로 클릭</span></label>

          {/* 선택된 슬롯 */}
          <div className="pick-slots">
            {RANK_LABELS.map((label, idx) => {
              const teamId = picks[idx];
              const team = teamId ? TEAMS.find((t) => t.id === teamId) : null;
              return (
                <div
                  key={label}
                  className={`pick-slot ${team ? 'filled' : 'empty'}`}
                  onClick={() => team && setPicks(picks.filter((_, i) => i !== idx))}
                >
                  <span className="slot-rank">{label}</span>
                  {team ? (
                    <span className="slot-team"><img src={team.logo} alt={team.name} className="team-logo-xs" /> {team.name}</span>
                  ) : (
                    <span className="slot-placeholder">—</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 팀 선택 버튼들 */}
          <div className="team-grid">
            {TEAMS.map((t) => {
              const pickIdx = picks.indexOf(t.id);
              const selected = pickIdx !== -1;
              return (
                <button
                  key={t.id}
                  className={`team-btn ${selected ? 'selected' : ''}`}
                  onClick={() => handlePickTeam(t.id)}
                >
                  <img src={t.logo} alt={t.name} className="team-logo-btn" />
                  <span className="team-btn-name">{t.name}</span>
                  {selected && <span className="team-btn-rank">{RANK_LABELS[pickIdx]}</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* 응원팀 선택 */}
        <section className="form-section">
          <label className="form-label">응원팀</label>
          <div className="team-grid">
            {TEAMS.map((t) => (
              <button
                key={t.id}
                className={`team-btn ${myTeam === t.id ? 'my-team-selected' : ''}`}
                onClick={() => setMyTeam(t.id)}
              >
                <img src={t.logo} alt={t.name} className="team-logo-btn" />
                <span className="team-btn-name">{t.name}</span>
                {myTeam === t.id && <span className="team-btn-rank">❤️</span>}
              </button>
            ))}
          </div>
        </section>

        {error && <p className="form-error">{error}</p>}

        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? '저장 중...' : isEditMode ? '예측 수정하기' : '예측 제출하기'}
        </button>
      </div>
    </div>
  );
}
