import { useState, useEffect, useRef } from 'react';
import {
  getCardDisplayValue,
  getCardSuit,
  getHandScore,
  cardsMatch,
} from '../utils/cobraGameLogic';
import {
  peekCard,
  drawFromDeck,
  discardDrawn,
  swapWithHand,
  matchAndDiscard,
  takeFromDiscard,
  callCobra,
  resetGame,
  resolveSpecialPeek,
  resolveSpecialSwap,
} from '../services/supabaseCobra';
import './CobraGamePlay.css';

const SUIT_SYMBOLS = { H: '♥', D: '♦', C: '♣', S: '♠' };
const PLAYER_COLORS = ['#e94560', '#f5a623', '#4ecdc4', '#a29bfe', '#55efc4'];
const TURN_SECONDS = 20;

// ─── 카드 컴포넌트 ────────────────────────────────────
function GameCard({ card, faceUp, onClick, highlight, selected, small, animReveal, badge, knownDot }) {
  if (!card) return null;
  const isJoker = card === 'JKR' || card === 'JKB';
  const suit = faceUp && !isJoker ? getCardSuit(card) : null;
  const val = faceUp ? getCardDisplayValue(card) : null;
  const isRed = suit === 'H' || suit === 'D';

  const cls = [
    'cgp-card',
    small ? 'cgp-sm' : '',
    faceUp ? 'cgp-front' : 'cgp-back',
    isJoker && faceUp ? 'cgp-joker' : '',
    isRed && faceUp && !isJoker ? 'cgp-red' : '',
    highlight ? 'cgp-highlight' : '',
    selected ? 'cgp-selected' : '',
    onClick ? 'cgp-clickable' : '',
    animReveal ? 'cgp-reveal-anim' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="cgp-card-wrap-inner">
      <div className={cls} onClick={onClick}>
        {faceUp ? (
          isJoker ? (
            <>
              <div className="cgp-card-top cgp-joker-top">😈</div>
              <div className="cgp-card-center cgp-joker-center">👿</div>
              <div className="cgp-card-score">-1</div>
            </>
          ) : (
            <>
              <div className="cgp-card-top">
                {val}<br /><span>{SUIT_SYMBOLS[suit]}</span>
              </div>
              <div className="cgp-card-center">{SUIT_SYMBOLS[suit]}</div>
            </>
          )
        ) : (
          <div className="cgp-card-back-icon">🐍</div>
        )}
      </div>
      {badge && <div className={`cgp-card-badge cgp-badge-${badge.type}`}>{badge.text}</div>}
      {knownDot && <div className="cgp-known-dot">secret</div>}
    </div>
  );
}

// ─── 확인 다이얼로그 ────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="cgp-overlay">
      <div className="cgp-dialog">
        <p className="cgp-dialog-msg">{message}</p>
        <div className="cgp-dialog-btns">
          <button className="cgp-btn cgp-btn-secondary" onClick={onCancel}>취소 (매칭)</button>
          <button className="cgp-btn cgp-btn-danger" onClick={onConfirm}>그냥 버리기</button>
        </div>
      </div>
    </div>
  );
}

// ─── 규칙 모달 ────────────────────────────────────────
export function RulesModal({ onClose, options }) {
  const sections = [
    {
      title: '기본',
      items: [
        ['🎯', '목표', '손패 합계를 가장 낮게!'],
        ['🃏', '점수', 'A=1 · 2~10=숫자 · J/Q/K=10 · 😈조커=−1'],
      ],
    },
    {
      title: '진행',
      items: [
        ['👀', '시작', '4장 받고 2장 확인 — 확인한 카드만 내가 인식'],
        ['🔄', '내 차례', '덱에서 1장 뽑기 → 교체 · 매칭 · 버리기 선택'],
        ['⏱️', '제한', '1턴 최대 20초 (초과 시 자동 버리기)'],
      ],
    },
    {
      title: '행동',
      items: [
        ['✂️', '매칭', '뽑은 카드 = 내 오픈 카드 → 둘 다 버리기'],
        ['🔀', '교체', '손패 클릭 → 뽑은 카드로 교체 (비공개도 가능)'],
        ['⚡', '선점', '버린 패 top = 내 오픈 카드 → 뽑기 전에 선점 매칭'],
      ],
    },
    {
      title: '종료',
      items: [
        ['🐍', '코브라 선언', '내 카드 즉시 공개 → 나머지 한 바퀴 → 전체 오픈'],
        ['💥', '자동 코브라', '카드 0장이 되면 자동 발동'],
      ],
    },
    ...(options?.specialCards ? [{
      title: '특수 카드 (버릴 때 발동)',
      items: [
        ['J', '내 카드 확인', '비공개 카드 1장 선택해 확인 (나만 앎)'],
        ['Q', '상대 카드 확인', '상대 카드 1장 선택해 확인 (나만 앎, 교체 시 무효)'],
        ['K', '카드 교환', '내 카드 1장 ↔ 상대 카드 1장 교환'],
      ],
    }] : []),
  ];

  return (
    <div className="cgp-overlay" onClick={onClose}>
      <div className="cgp-rules-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cgp-rules-header">
          <span>📖 게임 방법</span>
          <button className="cgp-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="cgp-rules-body">
          {sections.map((sec) => (
            <div key={sec.title} className="cgp-rules-section">
              <div className="cgp-rules-section-title">{sec.title}</div>
              {sec.items.map(([icon, title, desc]) => (
                <div key={title} className="cgp-rule-item">
                  <span className="cgp-rule-icon">{icon}</span>
                  <span><b>{title}</b> — {desc}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────
export default function CobraGamePlay({ gameState, currentPlayer, players, roomId }) {
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const [seonjeomMode, setSeonjeomMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TURN_SECONDS);
  // K 교환 특수 능력: 1단계 선택 저장
  const [swapSelection, setSwapSelection] = useState(null); // { playerId, cardIdx } | null
  // 종료 애니메이션
  const [revealedCount, setRevealedCount] = useState(0);
  const [showWinner, setShowWinner] = useState(false);

  const timerRef = useRef(null);
  const gameStateRef = useRef(gameState);

  const myId = currentPlayer.id;
  const myHand = gameState.hands?.[myId] || [];
  const myFaceUp = gameState.face_up?.[myId] || [];
  const isMyTurn = gameState.current_player_id === myId;

  const playerMap = {};
  players.forEach((p, i) => {
    playerMap[p.id] = { ...p, color: PLAYER_COLORS[i % PLAYER_COLORS.length] };
  });

  // 나만 아는 사적 지식 (J/Q 능력으로 확인한 카드)
  const myPrivate = gameState.private_knowledge?.[myId] || {};
  // J 능력으로 확인한 내 카드 (private, face_up 아님)
  const myJKnown = myPrivate[myId] || {};
  const otherPlayers = players.filter((p) => p.id !== myId);
  const cobraCaller = gameState.cobra_caller_id ? playerMap[gameState.cobra_caller_id] : null;

  // 버린 패 top
  const discardTop = gameState.discard_pile?.length > 0
    ? gameState.discard_pile[gameState.discard_pile.length - 1]
    : null;

  // 선점 가능한 내 손패 인덱스들 (face-up인 카드만)
  const seonjeomMatchIndices = discardTop && isMyTurn && gameState.turn_phase === 'draw'
    ? myHand.reduce((acc, card, idx) => {
        const iKnowThisCard = myFaceUp[idx] || !!myJKnown[idx];
        if (iKnowThisCard && cardsMatch(card, discardTop)) acc.push(idx);
        return acc;
      }, [])
    : [];
  const canSeonjeom = seonjeomMatchIndices.length > 0;

  // ── gameStateRef 최신 유지 ──
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // ── 턴 타이머 ──
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSeonjeomMode(false);

    const activePhase = gameState.phase === 'playing' || gameState.phase === 'cobra';
    if (!isMyTurn || !activePhase) {
      setTimeLeft(TURN_SECONDS);
      return;
    }

    setTimeLeft(TURN_SECONDS);
    let count = TURN_SECONDS;

    timerRef.current = setInterval(() => {
      count--;
      setTimeLeft(count);
      if (count <= 0) {
        clearInterval(timerRef.current);
        const gs = gameStateRef.current;
        if (gs.turn_phase === 'special') return; // 특수 능력 중 자동 처리 없음
        if (gs.turn_phase === 'draw') {
          act(() => drawFromDeck(roomId, myId, gs));
        } else if (gs.turn_phase === 'action' && gs.drawn_card) {
          act(() => discardDrawn(roomId, myId, gs));
        }
      }
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState.current_player_id]); // eslint-disable-line

  // 선점 모드 리셋 (덱 뽑으면), 특수 페이즈 시 타이머 정지
  useEffect(() => {
    if (gameState.turn_phase === 'action') setSeonjeomMode(false);
    if (gameState.turn_phase === 'special') {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setSwapSelection(null);
    }
  }, [gameState.turn_phase]);

  // ── 종료 카드별 순차 공개 ──
  const flatRevealTotal = gameState.phase === 'ended'
    ? gameState.player_order.reduce((s, pid) => s + (gameState.hands[pid]?.length || 0), 0)
    : 0;

  const revealIndexMap = {};
  if (gameState.phase === 'ended') {
    let fi = 0;
    for (const pid of gameState.player_order) {
      revealIndexMap[pid] = {};
      (gameState.hands[pid] || []).forEach((_, idx) => { revealIndexMap[pid][idx] = fi++; });
    }
  }

  useEffect(() => {
    if (gameState.phase !== 'ended') { setRevealedCount(0); setShowWinner(false); return; }
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setRevealedCount(count);
      if (count >= flatRevealTotal) {
        clearInterval(interval);
        setTimeout(() => setShowWinner(true), 700);
      }
    }, 380);
    return () => clearInterval(interval);
  }, [gameState.phase]); // eslint-disable-line

  // ── 액션 래퍼 ──
  async function act(fn) {
    if (busy) return;
    setBusy(true);
    setErrMsg('');
    try { await fn(); } catch (e) { setErrMsg(e.message || '오류가 발생했습니다.'); }
    finally { setBusy(false); }
  }

  // ── 손패 카드 클릭 ──
  const handleHandCardClick = (idx) => {
    const drawnCard = gameStateRef.current.drawn_card;

    // 선점 모드: 버린 패 top과 face-up 매칭
    if (seonjeomMode) {
      if (seonjeomMatchIndices.includes(idx)) {
        act(() => takeFromDiscard(roomId, myId, idx, gameState));
        setSeonjeomMode(false);
      }
      return;
    }

    if (!isMyTurn || gameState.turn_phase !== 'action' || !drawnCard) return;

    // face-up 카드만 매칭 가능, 나머지는 교체
    const iKnow = myFaceUp[idx] || !!myJKnown[idx];
    if (iKnow && cardsMatch(drawnCard, myHand[idx])) {
      act(() => matchAndDiscard(roomId, myId, idx, gameState));
    } else {
      act(() => swapWithHand(roomId, myId, idx, gameState));
    }
  };

  // ── 뽑은 카드 버리기 (face-up 매칭 경고) ──
  const handleDiscardDrawn = () => {
    const drawnCard = gameState.drawn_card;
    if (!drawnCard) return;
    const faceUpMatchIdx = myHand.findIndex((card, idx) => myFaceUp[idx] && cardsMatch(card, drawnCard));
    if (faceUpMatchIdx >= 0) {
      setConfirmDialog({
        message: `오픈된 '${getCardDisplayValue(myHand[faceUpMatchIdx])}'와 매칭 가능합니다.\n정말 그냥 버리시겠습니까?`,
        onConfirm: () => { setConfirmDialog(null); act(() => discardDrawn(roomId, myId, gameState)); },
        onCancel: () => setConfirmDialog(null),
      });
    } else {
      act(() => discardDrawn(roomId, myId, gameState));
    }
  };

  // ── 버린 패 클릭 (선점 모드 진입) ──
  const handleDiscardPileClick = () => {
    if (!canSeonjeom) return;
    if (seonjeomMatchIndices.length === 1) {
      // 매칭 카드가 하나면 바로 실행
      act(() => takeFromDiscard(roomId, myId, seonjeomMatchIndices[0], gameState));
    } else {
      // 여러 개면 선택 모드
      setSeonjeomMode(true);
    }
  };

  // ══════════════════════════════════════════
  // 뷰잉 페이즈
  // ══════════════════════════════════════════
  if (gameState.phase === 'viewing') {
    const myPeekedCount = myFaceUp.filter(Boolean).length;
    const myReady = gameState.viewing_ready?.[myId] ?? false;
    const waitingPlayers = players.filter((p) => !gameState.viewing_ready?.[p.id]);

    return (
      <div className="cgp-wrap">
        <button className="cgp-rules-btn" onClick={() => setShowRules(true)}>📖</button>
        {showRules && <RulesModal onClose={() => setShowRules(false)} options={gameState.options} />}
        <div className="cgp-container">
          <div className="cgp-phase-banner"><span>👀</span><span>카드 확인하기</span></div>
          <p className="cgp-hint">내 카드 2장을 선택해서 확인하세요</p>
          <div className="cgp-my-hand-row">
            {myHand.map((card, idx) => {
              const alreadyPeeked = myFaceUp[idx];
              const canPeek = !alreadyPeeked && myPeekedCount < 2 && !myReady;
              return (
                <GameCard
                  key={idx} card={card} faceUp={alreadyPeeked}
                  onClick={canPeek ? () => act(() => peekCard(roomId, myId, idx, gameState)) : undefined}
                  highlight={canPeek}
                />
              );
            })}
          </div>
          <p className="cgp-peek-count">{myReady ? '✅ 준비 완료!' : `${myPeekedCount} / 2 확인함`}</p>
          {waitingPlayers.length > 0 && (
            <div className="cgp-waiting-list">
              <span>대기 중: </span>
              {waitingPlayers.map((p) => <span key={p.id} className="cgp-waiting-name">{p.player_name}</span>)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // 종료 페이즈
  // ══════════════════════════════════════════
  if (gameState.phase === 'ended') {
    const scores = gameState.scores || {};
    const sorted = [...gameState.player_order].sort((a, b) => (scores[a] ?? 99) - (scores[b] ?? 99));
    const winnerId = sorted[0];

    return (
      <div className="cgp-wrap">
        <button className="cgp-rules-btn" onClick={() => setShowRules(true)}>📖</button>
        {showRules && <RulesModal onClose={() => setShowRules(false)} options={gameState.options} />}
        <div className="cgp-container">
          <div className="cgp-phase-banner cgp-open-banner"><span>🃏</span><span>카드 오픈!</span></div>
          <div className="cgp-reveal-list">
            {gameState.player_order.map((pid) => {
              const p = playerMap[pid];
              const hand = gameState.hands[pid] || [];
              const score = scores[pid] ?? getHandScore(hand);
              const isWinner = pid === winnerId;
              const isMe = pid === myId;
              const lastCardFi = revealIndexMap[pid]?.[hand.length - 1] ?? -1;
              const playerRevealed = revealedCount > lastCardFi;

              return (
                <div key={pid} className={`cgp-reveal-row ${isWinner && showWinner ? 'cgp-winner-row' : ''}`}>
                  <div className="cgp-reveal-player-info">
                    <span className="cgp-reveal-name" style={{ color: p?.color }}>
                      {p?.player_name}{isMe ? ' (나)' : ''}{pid === gameState.cobra_caller_id ? ' 🐍' : ''}
                    </span>
                    {isWinner && showWinner && <span className="cgp-winner-badge">🏆 우승!</span>}
                    {playerRevealed && <span className="cgp-reveal-score">{score}점</span>}
                  </div>
                  <div className="cgp-reveal-hand">
                    {hand.map((card, idx) => {
                      const fi = revealIndexMap[pid]?.[idx] ?? 999;
                      const isRevealed = fi < revealedCount;
                      const isJustNow = fi === revealedCount - 1;
                      return <GameCard key={idx} card={card} faceUp={isRevealed} animReveal={isJustNow} />;
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {showWinner && (
            <div className="cgp-winner-announcement">🏆 {playerMap[winnerId]?.player_name} 우승!</div>
          )}

          {showWinner && (
            currentPlayer.is_host
              ? <button className="cgp-btn cgp-btn-primary" onClick={() => act(() => resetGame(roomId))} disabled={busy}>다시 하기</button>
              : <p className="cgp-hint">방장이 다시 시작하기를 기다리세요</p>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // 플레이 / 코브라 페이즈
  // ══════════════════════════════════════════
  const currentTurnPlayer = playerMap[gameState.current_player_id];
  const drawnCard = gameState.drawn_card;

  return (
    <div className="cgp-wrap">
      <button className="cgp-rules-btn" onClick={() => setShowRules(true)}>📖</button>
      {showRules && <RulesModal onClose={() => setShowRules(false)} options={gameState.options} />}
      {confirmDialog && <ConfirmDialog message={confirmDialog.message} onConfirm={confirmDialog.onConfirm} onCancel={confirmDialog.onCancel} />}

      <div className="cgp-container">
        {/* 코브라 배너 */}
        {gameState.phase === 'cobra' && (
          <div className="cgp-cobra-banner">
            🐍 {cobraCaller?.player_name}이(가) 코브라 선언! — 마지막 한 바퀴
          </div>
        )}

        {/* 턴 + 타이머 */}
        <div className="cgp-turn-row">
          <div className="cgp-turn-info">
            <span className="cgp-turn-dot" style={{ background: playerMap[gameState.current_player_id]?.color }} />
            <span>{isMyTurn ? '내 차례' : `${currentTurnPlayer?.player_name}의 차례`}</span>
          </div>
          {isMyTurn && (
            <div className="cgp-timer-wrap">
              <div
                className="cgp-timer-bar"
                style={{
                  width: `${(timeLeft / TURN_SECONDS) * 100}%`,
                  background: timeLeft <= 5 ? '#e94560' : timeLeft <= 10 ? '#f5a623' : '#4ecdc4',
                }}
              />
              <span className="cgp-timer-text">{timeLeft}s</span>
            </div>
          )}
        </div>

        {/* 선점 모드 안내 */}
        {seonjeomMode && (
          <div className="cgp-seonjeom-hint">
            선점할 손패 카드를 선택하세요
            <button className="cgp-cancel-sm" onClick={() => setSeonjeomMode(false)}>취소</button>
          </div>
        )}

        {/* 특수 능력 대기 배너 */}
        {gameState.turn_phase === 'special' && gameState.special_pending && (() => {
          const sp = gameState.special_pending;
          const isInitiator = sp.initiator_id === myId;
          const initiatorName = playerMap[sp.initiator_id]?.player_name ?? '';
          const typeLabel = sp.type === 'peek_own' ? 'J — 카드 확인'
            : sp.type === 'peek_opp' ? 'Q — 상대 카드 확인'
            : 'K — 카드 교환';

          if (!isInitiator) {
            return (
              <div className="cgp-special-banner cgp-special-wait">
                🃏 {initiatorName}이(가) {typeLabel} 중...
              </div>
            );
          }

          if (sp.type === 'peek_own') {
            return (
              <div className="cgp-special-banner cgp-special-active">
                🃏 J 능력: 내 비공개 카드 1장을 선택하세요
              </div>
            );
          }
          if (sp.type === 'peek_opp') {
            return (
              <div className="cgp-special-banner cgp-special-active">
                🃏 Q 능력: 상대 카드 1장을 선택하세요
              </div>
            );
          }
          if (sp.type === 'swap') {
            return (
              <div className="cgp-special-banner cgp-special-active">
                {swapSelection
                  ? '🃏 K 능력: 교환할 상대(또는 내) 카드를 선택하세요'
                  : '🃏 K 능력: 교환할 내 카드를 먼저 선택하세요'}
                {swapSelection && (
                  <button className="cgp-cancel-sm" onClick={() => setSwapSelection(null)}>다시 선택</button>
                )}
              </div>
            );
          }
          return null;
        })()}

        {/* 상대 플레이어 */}
        {otherPlayers.length > 0 && (
          <div className="cgp-opponents">
            {otherPlayers.map((p) => {
              const hand = gameState.hands[p.id] || [];
              const isActive = gameState.current_player_id === p.id;
              const isCobra = gameState.cobra_caller_id === p.id;
              const sp = gameState.special_pending;
              // Q: 상대 카드 선택 가능 여부
              const canPeekOpp = sp?.type === 'peek_opp' && sp.initiator_id === myId;
              // K: 2단계 - 상대(또는 자신 외) 카드 선택
              const canSwapTarget = sp?.type === 'swap' && sp.initiator_id === myId && swapSelection !== null;

              return (
                <div key={p.id} className={`cgp-opponent ${isActive ? 'cgp-active-player' : ''}`}>
                  <div className="cgp-opp-name" style={{ color: playerMap[p.id]?.color }}>
                    {p.player_name}
                    {isActive && <span className="cgp-turn-badge">▶</span>}
                    {isCobra && <span className="cgp-cobra-tag">🐍</span>}
                  </div>
                  <div className="cgp-opp-hand">
                    {hand.map((card, idx) => {
                      const isSelectable = canPeekOpp || canSwapTarget;
                      // 처음 확인한 카드(public face_up) + Q 능력으로 확인한 카드(private, 내 화면만)
                      const isPublicFaceUp = gameState.face_up?.[p.id]?.[idx] ?? false;
                      const peekedByMe = myPrivate[p.id]?.[idx] ?? false;
                      return (
                        <GameCard
                          key={idx}
                          card={card}
                          faceUp={isPublicFaceUp || peekedByMe}
                          small
                          highlight={isSelectable}
                          onClick={isSelectable ? () => {
                            if (canPeekOpp) {
                              act(() => resolveSpecialPeek(roomId, myId, p.id, idx, gameState));
                            } else if (canSwapTarget) {
                              act(() => resolveSpecialSwap(roomId, myId, swapSelection.playerId, swapSelection.cardIdx, p.id, idx, gameState));
                              setSwapSelection(null);
                            }
                          } : undefined}
                        />
                      );
                    })}
                    {hand.length === 0 && <span className="cgp-no-cards">-</span>}
                  </div>
                  <span className="cgp-opp-count">{hand.length}장</span>
                </div>
              );
            })}
          </div>
        )}

        {/* 덱 + 버린 패 */}
        <div className="cgp-game-center">
          <div className="cgp-deck-area">
            <div className="cgp-pile-label">덱 ({gameState.deck?.length ?? 0}장)</div>
            <div
              className={`cgp-deck-card ${isMyTurn && gameState.turn_phase === 'draw' && !seonjeomMode ? 'cgp-clickable cgp-highlight' : ''}`}
              onClick={isMyTurn && gameState.turn_phase === 'draw' && !seonjeomMode
                ? () => act(() => drawFromDeck(roomId, myId, gameState))
                : undefined}
            >🐍</div>
          </div>

          <div className="cgp-discard-area">
            <div className="cgp-pile-label">
              버린 패
              {canSeonjeom && !seonjeomMode && <span className="cgp-seonjeom-label"> · 선점 가능!</span>}
            </div>
            {discardTop ? (
              <div className="cgp-discard-card-wrap">
                <GameCard
                  card={discardTop}
                  faceUp
                  onClick={canSeonjeom && !seonjeomMode ? handleDiscardPileClick : undefined}
                  highlight={canSeonjeom && !seonjeomMode}
                />
                {canSeonjeom && !seonjeomMode && (
                  <div className="cgp-seonjeom-badge">선점!</div>
                )}
              </div>
            ) : (
              <div className="cgp-empty-pile">-</div>
            )}
          </div>
        </div>

        {/* 뽑은 카드 (나만 표시) */}
        {isMyTurn && drawnCard && (
          <div className="cgp-drawn-area">
            <div className="cgp-pile-label">뽑은 카드 — 손패 클릭으로 교체/매칭</div>
            <GameCard card={drawnCard} faceUp />
          </div>
        )}

        {/* 내 손패 */}
        <div className="cgp-my-section">
          <div className="cgp-pile-label">내 패 ({myHand.length}장) — {getHandScore(myHand)}점</div>
          <div className="cgp-my-hand-row">
            {myHand.map((card, idx) => {
              // face_up(초기 공개) 또는 J/교체로 나만 아는 카드 → 내 화면에서 앞면
              const faceUp = (myFaceUp[idx] || !!myJKnown[idx]) ?? false;
              // 나만 아는 카드만 청록 점 표시 (공개 카드는 표시 없음)
              const isKnown = !!myJKnown[idx];
              const isAction = isMyTurn && gameState.turn_phase === 'action' && !!drawnCard;
              const sp = gameState.special_pending;

              // 특수 능력 선택 상태
              const isSpecialActive = sp && sp.initiator_id === myId;
              const isPeekOwn = isSpecialActive && sp.type === 'peek_own' && !faceUp; // J: 비공개 카드만
              const isSwapStep1 = isSpecialActive && sp.type === 'swap' && swapSelection === null; // K 1단계
              const isSwapStep2Own = isSpecialActive && sp.type === 'swap' && swapSelection !== null
                && !(swapSelection.playerId === myId && swapSelection.cardIdx === idx); // K 2단계 자기 다른 카드
              const isSwapSelected = swapSelection?.playerId === myId && swapSelection?.cardIdx === idx;

              // face-up 카드만 매칭 표시
              const isMatchable = isAction && faceUp && cardsMatch(card, drawnCard);
              const isSeonjeomTarget = seonjeomMode && seonjeomMatchIndices.includes(idx);

              let badge = null;
              if (isPeekOwn) badge = { type: 'seonjeom', text: '확인' };
              else if (isSwapStep1) badge = { type: 'swap', text: '선택' };
              else if (isSwapStep2Own) badge = { type: 'swap', text: '교환' };
              else if (isMatchable) badge = { type: 'match', text: '매칭!' };
              else if (isAction && !isMatchable) badge = { type: 'swap', text: '교체' };
              else if (isSeonjeomTarget) badge = { type: 'seonjeom', text: '선점!' };

              const isClickable = isAction || seonjeomMode || isPeekOwn || isSwapStep1 || isSwapStep2Own;

              return (
                <GameCard
                  key={idx} card={card} faceUp={faceUp}
                  knownDot={isKnown && !badge}
                  onClick={isClickable ? () => {
                    if (isPeekOwn) {
                      act(() => resolveSpecialPeek(roomId, myId, myId, idx, gameState));
                    } else if (isSwapStep1) {
                      setSwapSelection({ playerId: myId, cardIdx: idx });
                    } else if (isSwapStep2Own) {
                      act(() => resolveSpecialSwap(roomId, myId, swapSelection.playerId, swapSelection.cardIdx, myId, idx, gameState));
                      setSwapSelection(null);
                    } else {
                      handleHandCardClick(idx);
                    }
                  } : undefined}
                  highlight={isMatchable || isSeonjeomTarget || isPeekOwn || isSwapStep1 || isSwapStep2Own}
                  selected={isSwapSelected || (isAction && !isMatchable && !isSeonjeomTarget && !isSpecialActive)}
                  badge={badge}
                />
              );
            })}
          </div>
        </div>

        {/* 액션 버튼 */}
        {isMyTurn && !seonjeomMode && gameState.turn_phase !== 'special' && (
          <div className="cgp-action-bar">
            {gameState.turn_phase === 'draw' && (
              <>
                <button className="cgp-btn cgp-btn-draw" onClick={() => act(() => drawFromDeck(roomId, myId, gameState))} disabled={busy}>
                  덱에서 뽑기
                </button>
                <button className="cgp-btn cgp-btn-cobra" onClick={() => act(() => callCobra(roomId, myId, gameState))} disabled={busy || gameState.phase === 'cobra'}>
                  🐍 코브라!
                </button>
              </>
            )}
            {gameState.turn_phase === 'action' && (
              <button className="cgp-btn cgp-btn-discard" onClick={handleDiscardDrawn} disabled={busy}>
                뽑은 카드 버리기
              </button>
            )}
          </div>
        )}

        {errMsg && <div className="cgp-error">{errMsg}</div>}
      </div>
    </div>
  );
}
