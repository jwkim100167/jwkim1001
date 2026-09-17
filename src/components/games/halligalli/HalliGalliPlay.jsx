import React, { useState, useEffect, useRef } from 'react';
import { FRUIT_EMOJI, FRUIT_LABEL, FRUITS, getFruitCounts, checkBellCondition } from '../../../utils/games/halliGalliGameLogic';
import { halligalliFlipCard, halligalliRingBell, halligalliResolveBell, halligalliDiscardTopCards } from '../../../services/games/supabaseTyping';
import './HalliGalliPlay.css';

const DISCARD_TIMEOUT = 10000;

export default function HalliGalliPlay({
  gameState,
  currentPlayer,
  players,
  roomId,
  onResetGame,
  onLeave,
  actions = {},
}) {
  const doFlipCard = actions.flipCard ?? halligalliFlipCard;
  const doRingBell = actions.ringBell ?? halligalliRingBell;
  const doResolveBell = actions.resolveBell ?? halligalliResolveBell;
  const doDiscardTopCards = actions.discardTopCards ?? halligalliDiscardTopCards;

  const [bellFeedback, setBellFeedback] = useState(null); // 'late' | 'second'
  const [overlay, setOverlay] = useState(null); // { correct, firstName, secondName, cardCount }
  const [discardOverlay, setDiscardOverlay] = useState(false);
  const [windowPct, setWindowPct] = useState(100);
  const [timeLeft, setTimeLeft] = useState(null);
  const [autoFlipLeft, setAutoFlipLeft] = useState(null);
  const [busy, setBusy] = useState(false);

  const resolveCalledRef = useRef(false);
  const overlayTimerRef = useRef(null);
  const windowTimerRef = useRef(null);
  const autoFlipCalledRef = useRef(false);
  const autoFlipFiredRef = useRef(false);

  const myId = currentPlayer?.id;
  const isHost = currentPlayer?.is_host;

  const {
    phase, turn_order, turn_index, top_cards, card_counts,
    eliminated, bell_winner, second_bell_winner, bell_window_closes_at,
    bell_correct, options, winner_id, last_flip_at, turn_started_at,
    last_bell_winner_id, last_bell_second_winner_id,
  } = gameState;

  const autoFlipSec = options?.autoFlipSeconds ?? 5;

  const currentTurnId = turn_order?.[turn_index];
  const isMyTurn = currentTurnId === myId;
  const isBellResolving = phase === 'bell_resolving';
  const fruitCounts = getFruitCounts(top_cards || {});
  const bellValid = checkBellCondition(top_cards || {});

  // Bug 1 fix: 내 차례인데 덱이 비어 flip 버튼이 비활성 → 자동 턴 패스
  useEffect(() => {
    if (phase !== 'playing' || !isMyTurn) { autoFlipCalledRef.current = false; return; }
    const deckEmpty = (gameState.decks?.[myId]?.length ?? 0) === 0;
    if (deckEmpty && !autoFlipCalledRef.current) {
      autoFlipCalledRef.current = true;
      doFlipCard(roomId, myId);
    }
  }, [phase, isMyTurn, gameState.decks]);

  // 자동 뒤집기 카운트다운
  useEffect(() => {
    if (!options?.autoFlip || phase !== 'playing' || !isMyTurn || !turn_started_at) {
      setAutoFlipLeft(null);
      autoFlipFiredRef.current = false;
      return;
    }
    const totalMs = autoFlipSec * 1000;
    const tick = () => {
      const elapsed = Date.now() - turn_started_at;
      const left = Math.max(0, totalMs - elapsed);
      setAutoFlipLeft(Math.ceil(left / 1000));
      if (left === 0 && !autoFlipFiredRef.current && !busy) {
        autoFlipFiredRef.current = true;
        doFlipCard(roomId, myId);
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [options?.autoFlip, phase, isMyTurn, turn_started_at]);

  // 10초 카운트다운 타이머
  useEffect(() => {
    if (phase !== 'playing' || !last_flip_at) { setTimeLeft(null); return; }
    const tick = () => {
      const elapsed = Date.now() - last_flip_at;
      const left = Math.max(0, Math.ceil((DISCARD_TIMEOUT - elapsed) / 1000));
      setTimeLeft(left);
      if (left === 0 && isHost) {
        doDiscardTopCards(roomId);
        setDiscardOverlay(true);
        setTimeout(() => setDiscardOverlay(false), 1200);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [last_flip_at, phase]);

  // bell_resolving: 결과 처리 (bell_winner만)
  useEffect(() => {
    if (phase !== 'bell_resolving') { resolveCalledRef.current = false; return; }
    if (resolveCalledRef.current) return;

    const isBellWinner = myId === bell_winner;
    if (!isBellWinner) return;

    const tryResolve = () => {
      if (resolveCalledRef.current) return;
      resolveCalledRef.current = true;
      doResolveBell(roomId);
    };

    const secondPlaceOn = options?.secondPlace;
    if (!secondPlaceOn || !bell_window_closes_at) {
      // 2등 옵션 없음 → bell_winner가 즉시 처리
      if (isBellWinner) tryResolve();
      return;
    }

    if (second_bell_winner) {
      // 2등 등록됨 → 창 닫기
      tryResolve();
      return;
    }

    const remaining = bell_window_closes_at - Date.now();
    if (remaining <= 0) { tryResolve(); return; }

    const timer = setTimeout(tryResolve, remaining + 100);
    clearTimeout(windowTimerRef.current);
    windowTimerRef.current = timer;
    return () => clearTimeout(timer);
  }, [phase, second_bell_winner, bell_window_closes_at, bell_winner]);

  // 2등 창 진행률 애니메이션
  useEffect(() => {
    if (phase !== 'bell_resolving' || !bell_window_closes_at) { setWindowPct(100); return; }
    const total = 1500;
    const tick = () => {
      const remaining = bell_window_closes_at - Date.now();
      setWindowPct(Math.max(0, (remaining / total) * 100));
    };
    tick();
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, [phase, bell_window_closes_at]);

  // bell_correct 변경 시 오버레이 표시 (resolve 후 last_bell_winner_id 사용)
  useEffect(() => {
    if (bell_correct === null || bell_correct === undefined) return;
    if (phase === 'bell_resolving') return; // 아직 결과 처리 중
    const firstName = players.find((p) => p.id === last_bell_winner_id)?.player_name ?? '?';
    const secondName = players.find((p) => p.id === last_bell_second_winner_id)?.player_name;
    setOverlay({ correct: bell_correct, firstName, secondName, secondPlace: options?.secondPlace });
    clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => setOverlay(null), 2500);
  }, [last_bell_winner_id, bell_correct, phase]);

  const handleBell = async () => {
    if (busy || isBellResolving) return;
    setBusy(true);
    try {
      const result = await doRingBell(roomId, myId);
      if (result === 'late') {
        setBellFeedback('late');
        setTimeout(() => setBellFeedback(null), 1200);
      } else if (result === 'second') {
        setBellFeedback('second');
        setTimeout(() => setBellFeedback(null), 1200);
      } else if (result === 'first') {
        // Realtime에 의존하지 않고 직접 resolve 스케줄 (Realtime 유실 방어)
        const secondPlaceOn = options?.secondPlace;
        if (secondPlaceOn) {
          setTimeout(() => doResolveBell(roomId), 1650);
        } else {
          doResolveBell(roomId);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleFlip = async () => {
    if (!isMyTurn || busy || isBellResolving) return;
    if ((gameState.decks?.[myId]?.length ?? 0) === 0) return;
    setBusy(true);
    try {
      await doFlipCard(roomId, myId);
    } finally {
      setBusy(false);
    }
  };

  // ── 결과 화면 ──
  if (phase === 'ended') {
    const sorted = [...(turn_order || [])].sort((a, b) => {
      const aElim = eliminated.indexOf(a);
      const bElim = eliminated.indexOf(b);
      if (aElim === -1 && bElim === -1) return (card_counts[b] ?? 0) - (card_counts[a] ?? 0);
      if (aElim === -1) return -1;
      if (bElim === -1) return 1;
      return bElim - aElim; // 나중에 탈락한 사람이 상위
    });
    const medals = ['🥇', '🥈', '🥉', '🏅', '🏅', '🏅'];
    return (
      <div className="hg-result-page">
        <div className="hg-result-box">
          <div className="hg-result-title">게임 종료!</div>
          <div className="hg-result-rows">
            {sorted.map((id, i) => {
              const p = players.find((pl) => pl.id === id);
              return (
                <div key={id} className="hg-result-row">
                  <span className="hg-result-rank">{medals[i]}</span>
                  <span className="hg-result-name">{p?.player_name ?? id}</span>
                  <span className="hg-result-cards">{card_counts[id] ?? 0}장</span>
                </div>
              );
            })}
          </div>
          <div className="hg-result-btns">
            {onResetGame && (
              <button className="hg-btn hg-btn-primary" onClick={onResetGame}>다시 하기</button>
            )}
            <button className="hg-btn hg-btn-secondary" onClick={onLeave}>나가기</button>
          </div>
        </div>
      </div>
    );
  }

  const gridClass = `hg-players-grid n${Math.min(turn_order?.length ?? 2, 4)}`;
  const canFlip = isMyTurn && !isBellResolving && (gameState.decks?.[myId]?.length ?? 0) > 0;

  return (
    <div className="hg-page">
      {/* 벨 결과 오버레이 */}
      {overlay && (
        <div className="hg-overlay">
          <div className="hg-overlay-box">
            <div className="hg-overlay-icon">{overlay.correct ? '🔔' : '❌'}</div>
            {overlay.correct ? (
              overlay.secondPlace && overlay.secondName ? (
                <>
                  <div className="hg-overlay-title correct">2등 역전!</div>
                  <div className="hg-overlay-sub">{overlay.firstName}님 1등... 아쉽!</div>
                  <div className="hg-second-line">🎉 {overlay.secondName}님 카드 획득!</div>
                </>
              ) : (
                <>
                  <div className="hg-overlay-title correct">정답!</div>
                  <div className="hg-overlay-sub">{overlay.firstName}님이 카드를 가져갑니다</div>
                </>
              )
            ) : (
              <>
                <div className="hg-overlay-title wrong">오답 벨!</div>
                <div className="hg-overlay-sub">{overlay.firstName}님이 각 플레이어에게 1장씩 줍니다</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 버림 오버레이 */}
      {discardOverlay && (
        <div className="hg-overlay">
          <div className="hg-overlay-box">
            <div className="hg-overlay-icon">🗑️</div>
            <div className="hg-overlay-title discard">10초 경과</div>
            <div className="hg-overlay-sub">공개 카드를 버립니다</div>
          </div>
        </div>
      )}

      <div className="hg-container">
        {/* 상단 바 */}
        <div className="hg-topbar">
          <span className="hg-title-badge">🔔 할리갈리</span>
          {last_flip_at && timeLeft !== null && (
            <span className={`hg-timer ${timeLeft <= 4 ? 'hg-timer-danger' : ''}`}>
              ⏱ {timeLeft}s
            </span>
          )}
        </div>

        {/* 플레이어 카드 현황 */}
        <div className={gridClass}>
          {(turn_order || []).map((id) => {
            const p = players.find((pl) => pl.id === id);
            const isMe = id === myId;
            const isTurn = id === currentTurnId;
            const isElim = eliminated.includes(id);
            const topCard = top_cards?.[id];
            const deckSize = gameState.decks?.[id]?.length ?? 0;

            return (
              <div
                key={id}
                className={`hg-player-slot${isTurn && !isElim ? ' is-turn' : ''}${isMe ? ' is-me' : ''}${isElim ? ' eliminated' : ''}`}
              >
                <div className={`hg-player-name${isMe ? ' is-me' : ''}`}>
                  {isTurn && !isElim && <span>▶ </span>}
                  {p?.player_name ?? id}
                </div>

                <div
                  className={`hg-top-card${topCard?.fruit === 'joker' ? ' hg-top-card-joker' : ''}`}
                  style={{ background: topCard && topCard.fruit !== 'joker' ? '#3d2000' : undefined }}
                >
                  {topCard ? (
                    topCard.fruit === 'joker' ? (
                      <>
                        <span>🃏</span>
                        <span className="hg-top-card-count" style={{ color: '#a78bfa' }}>ALL</span>
                      </>
                    ) : (
                      <>
                        <span>{FRUIT_EMOJI[topCard.fruit]}</span>
                        <span className="hg-top-card-count">
                          {'●'.repeat(topCard.count)}
                        </span>
                      </>
                    )
                  ) : (
                    <span style={{ opacity: 0.3, fontSize: '1rem' }}>—</span>
                  )}
                </div>

                <div className="hg-deck-icon">
                  {isElim ? '✕' : deckSize}
                </div>
                <div className="hg-card-count">
                  {isElim ? '탈락' : `총 ${card_counts?.[id] ?? 0}장`}
                </div>
              </div>
            );
          })}
        </div>

        {/* 과일 합계 현황 */}
        <div className="hg-fruit-bar">
          {FRUITS.map((fruit) => (
            <div key={fruit} className="hg-fruit-item">
              <span className="hg-fruit-emoji">{FRUIT_EMOJI[fruit]}</span>
              <span className={`hg-fruit-count${fruitCounts[fruit] === 5 ? ' is-five' : ''}`}>
                {fruitCounts[fruit] || 0}
              </span>
              <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>{FRUIT_LABEL[fruit]}</span>
            </div>
          ))}
        </div>

        {/* 2등 창 진행률 */}
        {isBellResolving && options?.secondPlace && bell_window_closes_at && (
          <div className="hg-window-bar">
            <div className="hg-window-fill" style={{ width: `${windowPct}%` }} />
          </div>
        )}

        {/* 내 차례 예고 배너 */}
        {isMyTurn && phase === 'playing' && !isBellResolving && (
          <div className="hg-turn-banner">
            ⚡ 내 차례!
            {options?.autoFlip && autoFlipLeft !== null && (
              <span className="hg-turn-banner-timer"> ({autoFlipLeft}초 후 자동)</span>
            )}
          </div>
        )}

        {/* 자동 뒤집기 진행 바 */}
        {options?.autoFlip && isMyTurn && phase === 'playing' && autoFlipLeft !== null && (
          <div className="hg-autofill-bar">
            <div
              className="hg-autofill-fill"
              style={{ width: `${(autoFlipLeft / autoFlipSec) * 100}%` }}
            />
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="hg-action-row">
          <button
            className="hg-bell-btn"
            onClick={handleBell}
            disabled={busy}
          >
            🔔 <span className="hg-bell-btn-text">벨!</span>
          </button>
          <button
            className={`hg-flip-btn${isMyTurn && !isBellResolving ? ' hg-flip-btn-active' : ''}`}
            onClick={handleFlip}
            disabled={!canFlip || busy}
          >
            {isMyTurn ? '카드 뒤집기 ▶' : `${players.find((p) => p.id === currentTurnId)?.player_name ?? '?'} 차례`}
          </button>
        </div>

        {/* 피드백 */}
        <div className={`hg-feedback ${bellFeedback ?? ''}`}>
          {bellFeedback === 'late' && '늦었어요!'}
          {bellFeedback === 'second' && '2등 등록!'}
          {!bellFeedback && isBellResolving && bell_winner && (
            <span className="hg-feedback waiting">
              {players.find((p) => p.id === bell_winner)?.player_name}님이 벨을 쳤습니다...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
