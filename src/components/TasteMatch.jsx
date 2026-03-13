import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import './TasteMatch.css';

const CIRCUMFERENCE = 2 * Math.PI * 52;

const CATEGORY_LABEL = {
  food:     '🍔 입맛 월드컵',
  life:     '🏠 라이프스타일',
  relation: '👥 인간관계',
  dilemma:  '🔥 극강의 딜레마',
};

export default function TasteMatch() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [loadingQ, setLoadingQ] = useState(true);

  const [phase, setPhase] = useState('start');
  const [nickname, setNickname] = useState('');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState('');
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarUsers, setSimilarUsers] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── DB에서 문항 로드 ──────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('taste_match_questions')
        .select('*')
        .order('sort_order', { ascending: true });
      if (!error && data) setQuestions(data);
      setLoadingQ(false);
    };
    load();
  }, []);

  // ── 로그인 시 닉네임 자동 설정 ────────────────────────────────
  useEffect(() => {
    if (user) {
      setNickname(user.userName || user.loginId || '');
    }
  }, [user]);

  // ── 시작하기 ──────────────────────────────────────────────────
  const handleStart = () => {
    if (!nickname.trim() || questions.length === 0) return;
    setCurrentQ(0);
    setAnswers('');
    setSelected(null);
    if (!user) {
      setPhase('guest-check');
    } else {
      setPhase('quiz');
    }
  };

  // ── 답변 선택 ─────────────────────────────────────────────────
  const handleAnswer = (choice) => {
    if (selected) return;
    setSelected(choice);

    setTimeout(() => {
      const newAnswers = answers + choice;
      setSelected(null);

      if (currentQ < questions.length - 1) {
        setAnswers(newAnswers);
        setCurrentQ(prev => prev + 1);
      } else {
        calculateResult(newAnswers);
      }
    }, 350);
  };

  // ── 결과 계산 + DB 저장 + 랭킹 로드 ─────────────────────────
  const calculateResult = async (finalAnswers) => {
    const activeCount = questions.filter(q => q.is_active !== false).length || questions.length;
    const matchCount = finalAnswers.split('').filter(
      (ans, i) => questions[i]?.is_active !== false && ans === questions[i].jw_answer
    ).length;
    const scoreNum = Math.round((matchCount / activeCount) * 100);
    const scoreStr = `${scoreNum}%`;
    const gradeInfo = getGrade(scoreNum);

    setResult({ scoreNum, scoreStr, matchCount, activeCount, ...gradeInfo });
    setAnswers(finalAnswers);
    setPhase('result');
    setIsSaving(true);

    try {
      if (user?.id != null) {
        // 로그인 유저: u_id 기준으로 기존 행 UPDATE, 없으면 INSERT
        const { data: existing } = await supabase
          .from('taste_match_results')
          .select('id')
          .eq('u_id', String(user.id))
          .limit(1);
        if (existing && existing.length > 0) {
          await supabase
            .from('taste_match_results')
            .update({ nickname: nickname.trim(), answers: finalAnswers, score: scoreStr })
            .eq('id', existing[0].id);
        } else {
          await supabase
            .from('taste_match_results')
            .insert([{ u_id: String(user.id), nickname: nickname.trim(), answers: finalAnswers, score: scoreStr }]);
        }
      } else {
        // 게스트: nickname + null u_id 기준으로 기존 행 UPDATE, 없으면 INSERT
        const { data: existing } = await supabase
          .from('taste_match_results')
          .select('id')
          .eq('nickname', nickname.trim())
          .is('u_id', null)
          .limit(1);
        if (existing && existing.length > 0) {
          await supabase
            .from('taste_match_results')
            .update({ answers: finalAnswers, score: scoreStr })
            .eq('id', existing[0].id);
        } else {
          await supabase
            .from('taste_match_results')
            .insert([{ u_id: null, nickname: nickname.trim(), answers: finalAnswers, score: scoreStr }]);
        }
      }
    } catch (err) {
      console.error('결과 저장 실패:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // ── 취향 유사 사용자 탐색 ────────────────────────────────────
  const handleFindSimilar = async () => {
    setShowSimilar(true);
    setLoadingSimilar(true);
    try {
      const { data: allResults } = await supabase
        .from('taste_match_results')
        .select('nickname, answers');

      const myNickname = nickname.trim();
      const nicknameMaxSim = {};

      (allResults || []).forEach(r => {
        if (r.nickname === myNickname || !r.answers) return;
        const len = Math.min(answers.length, r.answers.length);
        if (len === 0) return;
        let matchCount = 0;
        for (let i = 0; i < len; i++) {
          if (answers[i] === r.answers[i]) matchCount++;
        }
        const simPct = Math.round((matchCount / len) * 100);
        if (!nicknameMaxSim[r.nickname] || simPct > nicknameMaxSim[r.nickname]) {
          nicknameMaxSim[r.nickname] = simPct;
        }
      });

      const top3 = Object.entries(nicknameMaxSim)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([nick, sim]) => ({ nickname: nick, similarity: `${sim}%` }));

      setSimilarUsers(top3);
    } catch (err) {
      console.error('유사 취향 검색 실패:', err);
    } finally {
      setLoadingSimilar(false);
    }
  };

  // ── 등급 판정 ─────────────────────────────────────────────────
  const getGrade = (score) => {
    if (score >= 90) return {
      grade: '영혼의 단짝 💞',
      gradeMsg: '우리 전생에 부부였나?',
      gradeColor: '#ff6b9d',
    };
    if (score >= 70) return {
      grade: '꽤 잘 맞는 사이 😊',
      gradeMsg: '말하지 않아도 알아요~',
      gradeColor: '#6bcaff',
    };
    if (score >= 40) return {
      grade: '매력적인 거리감 🤔',
      gradeMsg: '맞는 듯 안 맞는 듯',
      gradeColor: '#a78bfa',
    };
    return {
      grade: '서로 다른 우주 🌌',
      gradeMsg: '우리는 서로 다른 행성에서 왔나봐',
      gradeColor: '#94a3b8',
    };
  };

  // ── 다시 하기 ─────────────────────────────────────────────────
  const handleRestart = () => {
    setPhase('start');
    setNickname('');
    setCurrentQ(0);
    setAnswers('');
    setSelected(null);
    setResult(null);
    setShowSimilar(false);
    setSimilarUsers([]);
  };

  // ═════════════════════════════════════════════════════════════
  // RENDER — 로딩
  // ═════════════════════════════════════════════════════════════
  if (loadingQ) {
    return (
      <div className="tm-wrap">
        <div className="tm-container">
          <div className="tm-loading">⏳ 문항 불러오는 중...</div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // RENDER — 게스트 안내 화면
  // ═════════════════════════════════════════════════════════════
  if (phase === 'guest-check') {
    return (
      <div className="tm-wrap">
        <div className="tm-container">
          <button className="tm-back-btn" onClick={() => setPhase('start')}>← 뒤로</button>

          <div className="tm-guest-notice">
            <div className="tm-guest-icon">🔒</div>
            <h2 className="tm-guest-title">비회원으로 진행할 경우</h2>
            <ul className="tm-guest-list">
              <li>결과가 <strong>익명</strong>으로 저장돼요</li>
              <li>내 결과 기록을 나중에 <strong>확인할 수 없어요</strong></li>
              <li>랭킹에 닉네임으로만 표시돼요</li>
            </ul>
            <div className="tm-guest-actions">
              <button className="tm-guest-login-btn" onClick={() => navigate('/login')}>
                🔑 로그인하기
              </button>
              <button className="tm-guest-register-btn" onClick={() => navigate('/register')}>
                ✏️ 회원가입하기
              </button>
              <button className="tm-guest-continue-btn" onClick={() => setPhase('quiz')}>
                👤 게스트로 계속하기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // RENDER — 시작 화면
  // ═════════════════════════════════════════════════════════════
  if (phase === 'start') {
    return (
      <div className="tm-wrap">
        <div className="tm-container">
          <button className="tm-back-btn" onClick={() => navigate('/')}>← 홈으로</button>

          <div className="tm-start">
            <div className="tm-logo">💫</div>
            <h1 className="tm-title">취향 알기</h1>
            <p className="tm-subtitle">Taste Match</p>
            <p className="tm-desc">
              내 취향을 알아보자!<br />
              <span className="tm-desc-count">{questions.filter(q => q.is_active !== false).length || questions.length}가지 질문</span>
            </p>

            {user ? (
              <div className="tm-user-greeting">
                👋 <strong>{user.userName || user.loginId}</strong>님으로 시작합니다
              </div>
            ) : (
              <input
                className="tm-nickname-input"
                type="text"
                placeholder="닉네임을 입력해줘"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                maxLength={20}
              />
            )}

            <button
              className="tm-start-btn"
              onClick={handleStart}
              disabled={!nickname.trim()}
            >
              🎮 테스트 시작하기
            </button>

            {!user && (
              <div className="tm-auth-links">
                <span className="tm-auth-divider">결과를 저장하려면</span>
                <div className="tm-auth-btns">
                  <button className="tm-auth-btn" onClick={() => navigate('/login')}>로그인</button>
                  <span className="tm-auth-sep">·</span>
                  <button className="tm-auth-btn" onClick={() => navigate('/register')}>회원가입</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // RENDER — 퀴즈 화면
  // ═════════════════════════════════════════════════════════════
  if (phase === 'quiz') {
    const q = questions[currentQ];
    const progress = (currentQ / questions.length) * 100;

    return (
      <div className="tm-wrap">
        <div className="tm-container quiz">
          {/* 진행 바 */}
          <div className="tm-progress-wrap">
            <div className="tm-progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="tm-progress-label">
            <span>{currentQ + 1}</span> / {questions.length}
          </div>

          {/* 카테고리 + 질문 제목 */}
          <div className="tm-category-label">
            {CATEGORY_LABEL[q.category] || '💭 취향 질문'}
          </div>
          {q.title && (
            <div className="tm-question-title">{q.title}</div>
          )}

          {/* 선택 카드 */}
          <div className="tm-cards" key={currentQ}>
            <button
              className={`tm-card ${selected === '1' ? 'selected' : ''} ${selected && selected !== '1' ? 'dimmed' : ''}`}
              onClick={() => handleAnswer('1')}
              disabled={!!selected}
            >
              <span className="tm-card-emoji">{q.emoji_a}</span>
              <span className="tm-card-text">{q.text_a}</span>
            </button>

            <div className="tm-vs">VS</div>

            <button
              className={`tm-card ${selected === '2' ? 'selected' : ''} ${selected && selected !== '2' ? 'dimmed' : ''}`}
              onClick={() => handleAnswer('2')}
              disabled={!!selected}
            >
              <span className="tm-card-emoji">{q.emoji_b}</span>
              <span className="tm-card-text">{q.text_b}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // RENDER — 결과 화면
  // ═════════════════════════════════════════════════════════════
  if (phase === 'result' && result) {
    const dashOffset = CIRCUMFERENCE * (1 - result.scoreNum / 100);

    return (
      <div className="tm-wrap">
        <div className="tm-container result">
          <div className="tm-result-title">{nickname}님과 JW의 싱크로율</div>

          <div className="tm-score-wrap">
            <svg viewBox="0 0 120 120" className="tm-ring-svg">
              <circle cx="60" cy="60" r="52" className="tm-ring-bg" />
              <circle
                cx="60" cy="60" r="52"
                className="tm-ring-fill"
                style={{ stroke: result.gradeColor }}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="tm-score-text" style={{ color: result.gradeColor }}>
              {result.scoreStr}
            </div>
          </div>

          <div className="tm-grade" style={{ color: result.gradeColor }}>
            {result.grade}
          </div>
          <div className="tm-grade-msg">"{result.gradeMsg}"</div>
          <div className="tm-match-count">{result.activeCount || questions.length}문항 중 {result.matchCount}개 일치</div>

          <div className="tm-similar-section">
            {!showSimilar ? (
              <button
                className="tm-find-similar-btn"
                onClick={handleFindSimilar}
                disabled={isSaving}
              >
                👫 취향이 같은 사람을 찾고 싶나요?
              </button>
            ) : loadingSimilar ? (
              <div className="tm-similar-loading">🔍 취향 친구 찾는 중...</div>
            ) : (
              <div className="tm-similar-result">
                <div className="tm-similar-title">✨ 취향이 비슷한 사람 TOP 3</div>
                {similarUsers.length === 0 ? (
                  <div className="tm-ranking-empty">아직 비교할 사람이 없어요</div>
                ) : (
                  <div className="tm-ranking-list">
                    {similarUsers.map((u, i) => (
                      <div key={i} className={`tm-rank-row ${i === 0 ? 'first' : ''}`}>
                        <span className="tm-rank-num">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                        </span>
                        <span className="tm-rank-name">{u.nickname}</span>
                        <span className="tm-rank-score">{u.similarity}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button className="tm-restart-btn" onClick={handleRestart}>
            🔄 다시 하기
          </button>
          <button className="tm-home-btn" onClick={() => navigate('/')}>
            🏠 홈으로 가기
          </button>
        </div>
      </div>
    );
  }

  return null;
}
