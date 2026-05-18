import React, { useState, useEffect, useRef } from 'react';
import AdBanner from './AdBanner';
import {
  revealNextHint,
  submitAnswer,
  revealAnswer,
  nextRound,
  endGame,
} from '../services/supabaseTurneyKia';
import './TurneyKiaPlay.css';

const HINT_DURATION = 20;

const CATEGORY_LABEL = {
  celebrity: '연예인',
  athlete: '운동선수',
  politician: '정치인',
};

export default function TurneyKiaPlay({
  gameState,
  currentPlayer,
  players,
  roomId,
  onResetGame,
  onLeave,
}) {
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [timeLeft, setTimeLeft] = useState(HINT_DURATION);
  const [wrongFeedback, setWrongFeedback] = useState(false);
  const [revealAdCountdown, setRevealAdCountdown] = useState(0);
  const autoAdvancedRef = useRef(false);
  const inputRef = useRef(null);
  const prevPhaseRef = useRef(null);
  const revealAdRef = useRef(null);

  const isHost = currentPlayer?.is_host;
  const myId = currentPlayer?.id;
  const {
    phase, current_person, name_pattern, hints_revealed,
    current_hint_submissions, correct_player_id, scores,
    round, total_rounds, category,
  } = gameState;

  const hints = current_person?.hints || [];
  const visibleHints = hints.slice(0, hints_revealed);
  const hiddenCount = hints.length - hints_revealed;
  const isLastRound = round >= total_rounds;

  // 이번 힌트에 내가 제출했는지
  const mySubmission = current_hint_submissions?.[myId]; // 'correct' | 'wrong' | undefined
  const hasSubmittedThisHint = !!mySubmission;

  // 모든 플레이어가 이번 힌트에 제출 완료했는지
  const allTriedThisHint = players.length > 0 &&
    players.every((p) => !!current_hint_submissions?.[p.id]);

  const correctPlayer = players.find((p) => p.id === correct_player_id);
  const sortedPlayers = [...players].sort((a, b) => (scores?.[b.id] ?? 0) - (scores?.[a.id] ?? 0));

  // reveal 진입 시 5초 광고 카운트다운
  useEffect(() => {
    if (phase === 'reveal' && prevPhaseRef.current !== 'reveal') {
      setRevealAdCountdown(5);
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (revealAdCountdown <= 0) return;
    revealAdRef.current = setTimeout(() => setRevealAdCountdown((n) => n - 1), 1000);
    return () => clearTimeout(revealAdRef.current);
  }, [revealAdCountdown]);

  // 힌트 바뀔 때마다 피드백 초기화 + 입력창 포커스
  useEffect(() => {
    setWrongFeedback(false);
    setAnswer('');
    autoAdvancedRef.current = false;
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [hints_revealed]);

  // 20초 타이머
  useEffect(() => {
    if (phase !== 'hinting') return;
    autoAdvancedRef.current = false;

    const calc = () =>
      Math.max(0, HINT_DURATION - Math.floor((Date.now() - (gameState.hint_started_at || Date.now())) / 1000));
    setTimeLeft(calc());

    const interval = setInterval(() => {
      const remaining = calc();
      setTimeLeft(remaining);

      if (remaining <= 0 && isHost && !autoAdvancedRef.current) {
        autoAdvancedRef.current = true;
        clearInterval(interval);
        if (hints_revealed < hints.length) {
          revealNextHint(roomId, gameState);
        } else {
          revealAnswer(roomId, gameState);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [gameState.hint_started_at, phase]);

  // 전원 제출 시 자동 진행 (호스트)
  useEffect(() => {
    if (phase !== 'hinting' || !isHost || !allTriedThisHint || autoAdvancedRef.current) return;
    autoAdvancedRef.current = true;
    if (hints_revealed < hints.length) {
      revealNextHint(roomId, gameState);
    } else {
      revealAnswer(roomId, gameState);
    }
  }, [allTriedThisHint, phase]);

  const handleSubmit = async () => {
    if (!answer.trim() || hasSubmittedThisHint || busy) return;
    setBusy(true);
    try {
      const result = await submitAnswer(roomId, myId, answer.trim());
      if (result === 'wrong') {
        setWrongFeedback(true);
        setAnswer('');
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      // 'correct'이면 RPC가 phase를 'reveal'로 변경 → 자동으로 reveal 화면으로
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const handlePass = async () => {
    if (hasSubmittedThisHint || busy) return;
    setBusy(true);
    try {
      await submitAnswer(roomId, myId, '__PASS__');
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const handleNextRound = async () => {
    if (busy) return;
    setBusy(true);
    try { await nextRound(roomId, gameState); }
    catch (e) { console.error(e); }
    finally { setBusy(false); }
  };

  const handleEndGame = async () => {
    if (busy) return;
    setBusy(true);
    try { await endGame(roomId, gameState); }
    catch (e) { console.error(e); }
    finally { setBusy(false); }
  };

  // ─── ENDED ───
  if (phase === 'ended') {
    return (
      <div className="tkp-page">
        <div className="tkp-container">
          <div className="tkp-round-badge">게임 종료!</div>
          <div className="tkp-final-icon">🏆</div>
          <h2 className="tkp-final-title">최종 순위</h2>
          <div className="tkp-final-board">
            {sortedPlayers.map((p, idx) => (
              <div key={p.id} className={`tkp-score-row ${p.id === myId ? 'tkp-score-me' : ''} ${idx === 0 ? 'tkp-score-first' : ''}`}>
                <span className="tkp-rank">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}위`}</span>
                <span className="tkp-score-name">{p.player_name}</span>
                <span className="tkp-score-pts">{scores?.[p.id] ?? 0}점</span>
              </div>
            ))}
          </div>
          <div className="tkp-actions">
            {onResetGame && (
              <button className="tkp-btn tkp-btn-primary" onClick={onResetGame} disabled={busy}>
                다시 하기
              </button>
            )}
            <button className="tkp-btn tkp-btn-secondary" onClick={onLeave}>나가기</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── REVEAL 광고 오버레이 ───
  if (phase === 'reveal' && revealAdCountdown > 0) {
    return (
      <div className="tkp-page">
        <div className="tkp-ad-overlay">
          <AdBanner slot={import.meta.env.VITE_ADSENSE_SLOT_COBRA} className="tkp-ad-banner" />
          <div className="tkp-ad-countdown">
            <div className="tkp-ad-countdown-num">{revealAdCountdown}</div>
            <p className="tkp-ad-countdown-msg">잠시 후 결과가 공개됩니다...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── REVEAL ───
  if (phase === 'reveal') {
    const gained = correct_player_id ? Math.max(1, 7 - hints_revealed) : 0;
    return (
      <div className="tkp-page">
        <div className="tkp-container">
          <div className="tkp-round-badge">{round} / {total_rounds} 라운드</div>
          <div className="tkp-reveal-label">정답은...</div>
          <div className="tkp-reveal-name">{current_person?.name}</div>
          <div className="tkp-reveal-category">{CATEGORY_LABEL[category]}</div>

          {correct_player_id ? (
            <div className="tkp-correct-banner">
              🎉 <strong>{correctPlayer?.player_name}</strong>님 정답! +{gained}점
            </div>
          ) : (
            <div className="tkp-no-correct">아무도 맞추지 못했습니다 😅</div>
          )}

          <div className="tkp-score-board">
            {sortedPlayers.map((p, idx) => (
              <div key={p.id} className={`tkp-score-row ${p.id === myId ? 'tkp-score-me' : ''}`}>
                <span className="tkp-rank-sm">{idx + 1}</span>
                <span className="tkp-score-name">{p.player_name}</span>
                <span className="tkp-score-pts">{scores?.[p.id] ?? 0}점</span>
              </div>
            ))}
          </div>

          {isHost && (
            <div className="tkp-actions">
              {!isLastRound ? (
                <button className="tkp-btn tkp-btn-primary" onClick={handleNextRound} disabled={busy}>
                  {busy ? '준비 중...' : '다음 라운드 →'}
                </button>
              ) : (
                <button className="tkp-btn tkp-btn-primary" onClick={handleEndGame} disabled={busy}>
                  결과 보기 🏆
                </button>
              )}
            </div>
          )}
          {!isHost && <p className="tkp-waiting-msg">방장이 다음 단계를 진행 중...</p>}

          <AdBanner slot={import.meta.env.VITE_ADSENSE_SLOT_COBRA} className="tkp-ad-bottom" />
        </div>
      </div>
    );
  }

  // ─── HINTING ───
  return (
    <div className="tkp-page">
      <div className="tkp-container">
        <div className="tkp-header-row">
          <div className="tkp-round-badge">{round} / {total_rounds} 라운드</div>
          <div className="tkp-category-badge">{CATEGORY_LABEL[category]}</div>
          <div className="tkp-score-mini">내 점수: {scores?.[myId] ?? 0}점</div>
        </div>

        {/* 타이머 */}
        <div className="tkp-timer-wrap">
          <div className="tkp-timer-bar-bg">
            <div
              className={`tkp-timer-bar ${timeLeft <= 5 ? 'tkp-timer-danger' : ''}`}
              style={{ width: `${(timeLeft / HINT_DURATION) * 100}%` }}
            />
          </div>
          <span className={`tkp-timer-text ${timeLeft <= 5 ? 'tkp-timer-danger-text' : ''}`}>
            ⏱ {timeLeft}초
          </span>
        </div>

        {/* 글자 패턴 */}
        <div className="tkp-name-pattern">{name_pattern}</div>

        {/* 힌트 목록 */}
        <div className="tkp-hints">
          {visibleHints.map((hint, i) => (
            <div key={i} className="tkp-hint-card">
              <span className="tkp-hint-num">힌트 {i + 1}</span>
              <span className="tkp-hint-text">{hint}</span>
            </div>
          ))}
          {Array.from({ length: hiddenCount }).map((_, i) => (
            <div key={`hidden-${i}`} className="tkp-hint-hidden">
              <span className="tkp-hint-num">힌트 {hints_revealed + i + 1}</span>
              <span className="tkp-hint-question">???</span>
            </div>
          ))}
        </div>

        {/* 답변 입력 영역 */}
        {!hasSubmittedThisHint ? (
          <>
            {wrongFeedback && (
              <div className="tkp-wrong-feedback">
                ❌ 틀렸습니다! 다음 힌트를 기다리세요.
              </div>
            )}
            <div className="tkp-answer-form">
              <input
                ref={inputRef}
                className="tkp-answer-input"
                placeholder="정답을 입력하세요"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                disabled={busy}
              />
              <button className="tkp-submit-btn" onClick={handleSubmit} disabled={!answer.trim() || busy}>
                제출
              </button>
            </div>
            <button className="tkp-pass-btn" onClick={handlePass} disabled={busy}>
              모르겠어요 (패스)
            </button>
          </>
        ) : (
          <div className={`tkp-submitted-badge ${mySubmission === 'wrong' ? 'tkp-passed-badge' : ''}`}>
            {mySubmission === 'wrong'
              ? '❌ 틀렸습니다 — 다음 힌트를 기다리세요'
              : '— 패스했습니다'}
          </div>
        )}

        {/* 제출 현황 */}
        <div className="tkp-submit-status">
          {players.map((p) => {
            const sub = current_hint_submissions?.[p.id];
            return (
              <span
                key={p.id}
                className={`tkp-submit-dot ${sub === 'correct' ? 'tkp-dot-correct' : sub === 'wrong' ? 'tkp-dot-wrong' : sub ? 'tkp-dot-pass' : 'tkp-dot-pending'}`}
                title={p.player_name}
              />
            );
          })}
          <span className="tkp-submit-count">
            {Object.keys(current_hint_submissions || {}).length}/{players.length} 완료
          </span>
        </div>

        <AdBanner slot={import.meta.env.VITE_ADSENSE_SLOT_COBRA} className="tkp-ad-bottom" />
      </div>
    </div>
  );
}
