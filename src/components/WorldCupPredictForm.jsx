import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addPrediction } from '../services/supabaseWorldCup';
import { WC_TEAMS, WC_GROUPS, WC_TEAMS_BY_GROUP } from '../data/worldCupTeamData';
import './WorldCupPredictForm.css';

const RANK_LABELS = ['🥇 1위', '🥈 2위', '🥉 3위'];
const RANK_SHORT  = ['1위', '2위', '3위'];

function formatPhone(raw) {
  let f = raw.slice(0, 3);
  if (raw.length > 3) f += '-' + raw.slice(3, 7);
  if (raw.length > 7) f += '-' + raw.slice(7, 11);
  return f;
}

export default function WorldCupPredictForm() {
  const navigate = useNavigate();

  const [name, setName]           = useState('');
  const [studentId, setStudentId] = useState('');
  const [phone, setPhone]         = useState('010');
  const [consent, setConsent]     = useState(false);
  const [isAlumni, setIsAlumni]   = useState(null);
  const [picks, setPicks]         = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep]           = useState('pick');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (!digits.startsWith('010')) { setPhone('010'); return; }
    let formatted = digits.slice(0, 3);
    if (digits.length > 3) formatted += '-' + digits.slice(3, 7);
    if (digits.length > 7) formatted += '-' + digits.slice(7, 11);
    setPhone(formatted);
  };

  const handlePickTeam = (teamId) => {
    if (picks.includes(teamId)) {
      setPicks(picks.filter((id) => id !== teamId));
    } else if (picks.length < 3) {
      setPicks([...picks, teamId]);
    }
  };

  const handleRemovePick = (idx) => {
    setPicks(picks.filter((_, i) => i !== idx));
  };

  const handleSubmitClick = () => {
    if (!name.trim())       { setError('이름을 입력해주세요.'); return; }
    if (!studentId.trim())  { setError('학번을 입력해주세요.'); return; }
    const rawPhone = phone.replace(/-/g, '');
    if (!/^010\d{8}$/.test(rawPhone)) { setError('전화번호를 올바르게 입력해주세요. (010-XXXX-XXXX)'); return; }
    if (!consent)           { setError('개인정보 수집·이용에 동의해주세요.'); return; }
    if (isAlumni === null)  { setError('동문회 가입여부를 선택해주세요.'); return; }
    if (picks.length < 3)  { setError('1위, 2위, 3위를 모두 선택해주세요.'); return; }
    setError('');
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    const rawPhone = phone.replace(/-/g, '');
    const ok = await addPrediction({
      name: name.trim(),
      studentId: studentId.trim(),
      phone: rawPhone,
      picks: picks.join(','),
      isAlumni,
      season: 2026,
    });
    setSubmitting(false);
    if (ok === true) {
      setStep('done');
    } else if (ok === 'duplicate_phone') {
      setError('이미 등록된 전화번호입니다.');
    } else {
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // ─── 완료 화면 ───
  if (step === 'done') {
    return (
      <div className="wc-form-page">
        <div className="wc-form-container">
          <div className="wc-done-card">
            <div className="wc-done-icon">🎉</div>
            <h2>예측 완료!</h2>
            <p><b>{name}</b><span className="wc-done-studentid">({studentId})</span>님의 예측이 저장됐습니다.</p>
            <div className="wc-done-picks">
              {picks.map((id, idx) => {
                const t = WC_TEAMS[id];
                return (
                  <div key={id} className="wc-done-pick-row">
                    <span className="wc-done-rank">{RANK_SHORT[idx]}</span>
                    <span className="wc-done-team">
                      <img src={t.flagUrl} alt={t.name} className="wc-flag-img" /> {t.name}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="wc-done-notice">⚠️ 한 번 제출한 순위는 변경할 수 없습니다.</p>
            <button className="wc-submit-btn" onClick={() => navigate('/world-cup-predict/result')}>
              참가자 목록 보기 →
            </button>
            <button className="wc-secondary-btn" onClick={() => navigate('/')}>홈으로</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 입력 폼 화면 ───
  return (
    <div className="wc-form-page">
      <div className="wc-form-container">
        <button className="wc-back-btn" onClick={() => navigate('/')}>← 홈</button>

        <div className="wc-form-header">
          <h1>⚽ 2026 월드컵 순위 예측</h1>
          <p>1위 · 2위 · 3위를 순서대로 클릭하세요</p>
        </div>

        {/* ── 선택된 순위 (sticky) ── */}
        <div className="wc-pick-slots-sticky">
          <div className="wc-pick-slots">
            {[0, 1, 2].map((idx) => {
              const teamId = picks[idx];
              const team = teamId ? WC_TEAMS[teamId] : null;
              return (
                <div
                  key={idx}
                  className={`wc-pick-slot ${team ? 'filled' : 'empty'}`}
                  onClick={() => team && handleRemovePick(idx)}
                >
                  <span className="wc-slot-rank">{RANK_LABELS[idx]}</span>
                  {team ? (
                    <span className="wc-slot-team">
                      <img src={team.flagUrl} alt={team.name} className="wc-flag-img" /> {team.name}
                    </span>
                  ) : (
                    <span className="wc-slot-placeholder">클릭하여 선택</span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="wc-slot-hint">선택된 항목을 클릭하면 해제됩니다</p>
        </div>

        {/* ── 이름 ── */}
        <section className="wc-form-section">
          <label className="wc-form-label">이름</label>
          <input className="wc-form-input" type="text" placeholder="예) 홍길동"
            value={name} onChange={(e) => setName(e.target.value)} maxLength={10} />
        </section>

        {/* ── 학번 ── */}
        <section className="wc-form-section">
          <label className="wc-form-label">학번</label>
          <input className="wc-form-input" type="text" placeholder="예) 20201234"
            value={studentId} onChange={(e) => setStudentId(e.target.value)} maxLength={20} />
        </section>

        {/* ── 전화번호 + 개인정보 동의 ── */}
        <section className="wc-form-section">
          <label className="wc-form-label">전화번호</label>
          <input className="wc-form-input" type="tel"
            value={phone} onChange={handlePhoneChange}
            placeholder="010-0000-0000" maxLength={13} />
          <p className="wc-field-notice">📌 상금 수령 번호를 입력해주세요.</p>
          <label className="wc-consent-label">
            <input
              type="checkbox"
              className="wc-consent-checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>개인정보 수집·이용에 동의합니다. <span className="wc-consent-detail">(이름, 학번, 전화번호)</span></span>
          </label>
        </section>

        {/* ── 동문회 가입여부 ── */}
        <section className="wc-form-section">
          <label className="wc-form-label">동문회 가입여부</label>
          <div className="wc-alumni-btns">
            <button className={`wc-alumni-btn ${isAlumni === true ? 'selected' : ''}`}
              onClick={() => setIsAlumni(true)}>✅ 가입</button>
            <button className={`wc-alumni-btn ${isAlumni === false ? 'selected' : ''}`}
              onClick={() => setIsAlumni(false)}>미가입</button>
          </div>
          <p className="wc-field-notice">미가입 시에도 게임에 참여하실 수 있습니다.</p>
        </section>

        {/* ── 참가국 선택 (그룹별) ── */}
        <section className="wc-form-section">
          <label className="wc-form-label">
            참가국 선택
            <span className="wc-form-hint"> 순서대로 클릭 → 1위, 2위, 3위</span>
          </label>
          {WC_GROUPS.map((group) => (
            <div key={group} className="wc-group-block">
              <div className="wc-group-label">그룹 {group}</div>
              <div className="wc-team-row">
                {WC_TEAMS_BY_GROUP[group].map((t) => {
                  const pickIdx = picks.indexOf(t.id);
                  const selected = pickIdx !== -1;
                  const isMaxed = picks.length >= 3 && !selected;
                  return (
                    <button key={t.id}
                      className={`wc-team-btn ${selected ? 'selected' : ''} ${isMaxed ? 'maxed' : ''}`}
                      onClick={() => handlePickTeam(t.id)} disabled={isMaxed}>
                      <img src={t.flagUrl} alt={t.name} className="wc-team-flag-img" />
                      <span className="wc-team-name">{t.name}</span>
                      {selected && <span className="wc-team-rank-badge">{RANK_SHORT[pickIdx]}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {error && <p className="wc-form-error">{error}</p>}

        <button className="wc-submit-btn" onClick={handleSubmitClick} disabled={submitting}>
          {submitting ? '저장 중...' : '예측 제출하기'}
        </button>
      </div>

      {/* ── 확인 모달 ── */}
      {showConfirm && (
        <div className="wc-modal-overlay">
          <div className="wc-modal-box">
            <div className="wc-modal-icon">⚠️</div>
            <h3>예측을 확정하시겠습니까?</h3>
            <p>한 번 제출한 순위는 <b>변경할 수 없습니다.</b></p>
            <div className="wc-modal-picks">
              {picks.map((id, idx) => (
                <div key={id} className="wc-modal-pick-row">
                  <span className="wc-modal-rank">{RANK_SHORT[idx]}</span>
                  <span className="wc-modal-team">
                    <img src={WC_TEAMS[id].flagUrl} alt={WC_TEAMS[id].name} className="wc-flag-img" />
                    {WC_TEAMS[id].name}
                  </span>
                </div>
              ))}
            </div>
            <div className="wc-modal-btns">
              <button className="wc-modal-confirm-btn" onClick={handleConfirm}>확인</button>
              <button className="wc-modal-cancel-btn" onClick={() => setShowConfirm(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
