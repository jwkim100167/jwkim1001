import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PIECES, COLOR_HEX, getTransforms } from '../../../data/games/blokusPieces';
import { placePiece, passTurn, autoPass } from '../../../services/games/supabaseBlokus';
import './BlokusPlay.css';

const BOARD_SIZE = 20;

// ── Sound (Web Audio API) ──────────────────────────────────
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function playTone(freq, duration, type = 'sine', gain = 0.15) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch { /* ignore */ }
}
function playTick() { playTone(880, 0.05, 'square', 0.08); }
function playUrgentTick() { playTone(1200, 0.07, 'square', 0.12); }
function playPlace() {
  playTone(440, 0.08, 'sine', 0.15);
  setTimeout(() => playTone(660, 0.12, 'sine', 0.1), 60);
}
function playEnd() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.3, 'sine', 0.18), i * 120));
}

// ── Helpers ───────────────────────────────────────────────
function applyCells(baseCells, rotation, flipped) {
  let cells = baseCells.map(([r, c]) => [r, c]);
  if (flipped) {
    cells = cells.map(([r, c]) => [r, -c]);
    const minC = Math.min(...cells.map(([, c]) => c));
    cells = cells.map(([r, c]) => [r, c - minC]);
  }
  for (let i = 0; i < rotation; i++) {
    cells = cells.map(([r, c]) => [c, -r]);
    const minR = Math.min(...cells.map(([rr]) => rr));
    const minC = Math.min(...cells.map(([, cc]) => cc));
    cells = cells.map(([r, c]) => [r - minR, c - minC]);
  }
  return cells;
}

function isValidPlacement(board, cells, color, isFirstMove, cornerCell, remaining) {
  for (const [r, c] of cells) {
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
    if (board[r][c] !== null) return false;
  }

  if (isFirstMove) {
    const [cr, cc] = cornerCell;
    return cells.some(([r, c]) => r === cr && c === cc);
  }

  const cellSet = new Set(cells.map(([r, c]) => `${r},${c}`));
  let hasDiagonal = false;
  for (const [r, c] of cells) {
    // Edge adjacency (same color) — not allowed
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        if (board[nr][nc] === color && !cellSet.has(`${nr},${nc}`)) return false;
      }
    }
    // Diagonal adjacency (same color) — required
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        if (board[nr][nc] === color && !cellSet.has(`${nr},${nc}`)) hasDiagonal = true;
      }
    }
  }
  return hasDiagonal;
}

function colorName(color) {
  const map = { blue: '파랑', yellow: '노랑', red: '빨강', green: '초록' };
  return map[color] || color;
}

// ── Component ─────────────────────────────────────────────
export default function BlokusPlay({ gameState, currentPlayer, players, roomId, onResetGame, onLeave, actions = {} }) {
  const doPlacePiece = actions.placePiece ?? placePiece;
  const doPassTurn = actions.passTurn ?? passTurn;
  const doAutoPass = actions.autoPass ?? autoPass;
  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [hoverCell, setHoverCell] = useState(null); // [r, c]
  const [soundOn, setSoundOn] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);

  const timerRef = useRef(null);
  const autoPassFiredRef = useRef(null);
  const prevTurnStartedAt = useRef(null);
  const endPlayedRef = useRef(false);
  const boardRef = useRef(null);
  const selectedPieceIdRef = useRef(null);

  const myColor = players.find((p) => p.id === currentPlayer?.id)?.color;
  const currentColor = gameState.turn_order[gameState.turn_index];
  const isMyTurn = myColor === currentColor;
  const isHost = currentPlayer?.is_host;
  const isEnded = gameState.phase === 'ended';

  // ── Timer ─────────────────────────────────────────────
  useEffect(() => {
    if (isEnded) {
      clearInterval(timerRef.current);
      if (!endPlayedRef.current) {
        endPlayedRef.current = true;
        if (soundOn) playEnd();
      }
      return;
    }

    const updateTimer = () => {
      const started = new Date(gameState.turn_started_at).getTime();
      const elapsed = (Date.now() - started) / 1000;
      const left = Math.max(0, Math.ceil(gameState.timer_seconds - elapsed));
      setTimeLeft(left);

      if (soundOn) {
        if (left <= 10 && left > 0) playUrgentTick();
        else if (left > 10) playTick();
      }

      // Auto-pass (host only, once per turn)
      if (left === 0 && isHost && autoPassFiredRef.current !== gameState.turn_started_at) {
        autoPassFiredRef.current = gameState.turn_started_at;
        doAutoPass(roomId, currentColor, gameState.turn_started_at);
      }
    };

    // Reset auto-pass guard when turn changes
    if (prevTurnStartedAt.current !== gameState.turn_started_at) {
      prevTurnStartedAt.current = gameState.turn_started_at;
    }

    clearInterval(timerRef.current);
    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameState.turn_started_at, gameState.timer_seconds, isEnded, isHost, currentColor, roomId, soundOn]);

  // Reset piece selection on turn change
  useEffect(() => {
    setSelectedPieceId(null);
    setRotation(0);
    setFlipped(false);
    setHoverCell(null);
  }, [gameState.turn_index, gameState.turn_started_at]);

  // Keep ref in sync for passive touch handler
  useEffect(() => { selectedPieceIdRef.current = selectedPieceId; }, [selectedPieceId]);

  // Prevent page scroll when dragging piece over board (requires passive: false)
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const prevent = (e) => { if (selectedPieceIdRef.current !== null) e.preventDefault(); };
    board.addEventListener('touchmove', prevent, { passive: false });
    return () => board.removeEventListener('touchmove', prevent);
  }, []);

  const selectedPiece = selectedPieceId !== null ? PIECES[selectedPieceId] : null;
  const currentCells = selectedPiece
    ? applyCells(selectedPiece.cells, rotation, flipped)
    : [];

  // Cells to highlight on board when hovering
  const hoveredBoardCells = hoverCell && selectedPiece
    ? currentCells.map(([r, c]) => [r + hoverCell[0], c + hoverCell[1]])
    : [];

  const isFirstMove = myColor ? !gameState.board.flat().includes(myColor) : false;
  const cornerCell = myColor ? gameState.corners[myColor] : null;

  const hoverValid = hoveredBoardCells.length > 0 && myColor
    ? isValidPlacement(gameState.board, hoveredBoardCells, myColor, isFirstMove, cornerCell, gameState.remaining[myColor])
    : false;

  // ── Place piece ────────────────────────────────────────
  const handlePlace = useCallback(async () => {
    if (!isMyTurn || !selectedPiece || hoveredBoardCells.length === 0 || !hoverValid) return;
    try {
      if (soundOn) playPlace();
      await doPlacePiece(roomId, myColor, selectedPieceId, hoveredBoardCells);
      setSelectedPieceId(null);
      setRotation(0);
      setFlipped(false);
      setHoverCell(null);
    } catch (e) {
      console.error('placePiece error:', e);
    }
  }, [isMyTurn, selectedPiece, hoveredBoardCells, hoverValid, roomId, myColor, selectedPieceId, soundOn]);

  // ── Pass ───────────────────────────────────────────────
  const handlePass = useCallback(async () => {
    if (!isMyTurn) return;
    if (!window.confirm('정말 기권하시겠습니까?')) return;
    await doPassTurn(roomId, myColor);
  }, [isMyTurn, roomId, myColor]);

  // ── Board cell click ────────────────────────────────────
  const handleBoardCellClick = (r, c) => {
    if (!isMyTurn || !selectedPiece) return;
    setHoverCell([r, c]);
    // Compute cells fresh from click position (avoids stale hoverCell state)
    const clickedCells = currentCells.map(([dr, dc]) => [dr + r, dc + c]);
    const clickValid = isValidPlacement(gameState.board, clickedCells, myColor, isFirstMove, cornerCell, gameState.remaining[myColor]);
    if (clickValid) {
      if (soundOn) playPlace();
      doPlacePiece(roomId, myColor, selectedPieceId, clickedCells)
        .then(() => {
          setSelectedPieceId(null);
          setRotation(0);
          setFlipped(false);
          setHoverCell(null);
        })
        .catch((e) => console.error('placePiece error:', e));
    }
  };

  // ── Touch handlers (mobile piece preview + placement) ──
  const getCellFromTouch = (touch) => {
    const board = boardRef.current;
    if (!board) return null;
    const rect = board.getBoundingClientRect();
    const c = Math.floor(((touch.clientX - rect.left) / rect.width) * BOARD_SIZE);
    const r = Math.floor(((touch.clientY - rect.top) / rect.height) * BOARD_SIZE);
    return (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) ? [r, c] : null;
  };

  const handleBoardTouchStart = (e) => {
    if (!isMyTurn || !selectedPiece) return;
    const cell = getCellFromTouch(e.touches[0]);
    if (cell) setHoverCell(cell);
  };

  const handleBoardTouchMove = (e) => {
    if (!isMyTurn || !selectedPiece) return;
    const cell = getCellFromTouch(e.touches[0]);
    if (cell) setHoverCell(cell);
  };

  const handleBoardTouchEnd = (e) => {
    if (!isMyTurn || !selectedPiece) return;
    e.preventDefault(); // prevent subsequent click event
    const touch = e.changedTouches[0];
    if (!touch) return;
    const cell = getCellFromTouch(touch);
    if (!cell) return;
    const clickedCells = currentCells.map(([dr, dc]) => [dr + cell[0], dc + cell[1]]);
    const valid = isValidPlacement(gameState.board, clickedCells, myColor, isFirstMove, cornerCell, gameState.remaining[myColor]);
    if (valid) {
      if (soundOn) playPlace();
      doPlacePiece(roomId, myColor, selectedPieceId, clickedCells)
        .then(() => {
          setSelectedPieceId(null);
          setRotation(0);
          setFlipped(false);
          setHoverCell(null);
        })
        .catch((err) => console.error('placePiece error:', err));
    }
  };

  // ── Render board ───────────────────────────────────────
  const board = gameState.board;
  const hoveredSet = new Set(hoveredBoardCells.map(([r, c]) => `${r},${c}`));

  const boardCells = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const key = `${r},${c}`;
      const placed = board[r][c];
      const isHovered = hoveredSet.has(key);
      let cellClass = 'blk-board-cell';
      let style = {};

      if (placed) {
        cellClass += ' blk-board-placed';
        style.background = COLOR_HEX[placed];
      } else if (isHovered) {
        cellClass += hoverValid ? ' blk-board-hover-valid' : ' blk-board-hover-invalid';
        style.background = hoverValid
          ? `${COLOR_HEX[myColor]}99`
          : '#ef444499';
      }

      // Corner indicators
      const corners = gameState.corners;
      for (const [col, [cr, cc]] of Object.entries(corners)) {
        if (r === cr && c === cc && !placed) {
          style.boxShadow = `inset 0 0 0 2px ${COLOR_HEX[col]}88`;
        }
      }

      boardCells.push(
        <div
          key={key}
          className={cellClass}
          style={style}
          onMouseEnter={() => isMyTurn && selectedPiece && setHoverCell([r, c])}
          onMouseLeave={() => isMyTurn && selectedPiece && setHoverCell(null)}
          onClick={() => handleBoardCellClick(r, c)}
        />
      );
    }
  }

  // ── Remaining pieces ───────────────────────────────────
  const myRemaining = myColor ? gameState.remaining[myColor] : Array(21).fill(true);

  // ── Result ─────────────────────────────────────────────
  if (isEnded) {
    const scores = gameState.scores || {};
    const sortedColors = [...gameState.turn_order].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
    const medals = ['🥇', '🥈', '🥉', '🏅'];

    return (
      <div className="blk-play-page blk-result-page">
        <div className="blk-result-container">
          <h2 className="blk-result-title">게임 종료!</h2>
          <div className="blk-result-list">
            {sortedColors.map((color, i) => {
              const p = players.find((pl) => pl.color === color);
              return (
                <div key={color} className="blk-result-row" style={{ borderLeftColor: COLOR_HEX[color] }}>
                  <span className="blk-result-medal">{medals[i]}</span>
                  <span className="blk-result-color" style={{ color: COLOR_HEX[color] }}>{colorName(color)}</span>
                  <span className="blk-result-name">{p?.player_name || '?'}</span>
                  <span className="blk-result-score">{scores[color] >= 0 ? `+${scores[color]}` : scores[color]}점</span>
                </div>
              );
            })}
          </div>
          <div className="blk-result-actions">
            {onResetGame && (
              <button className="blk-btn blk-btn-primary" onClick={onResetGame}>
                다시 하기
              </button>
            )}
            <button className="blk-btn blk-btn-secondary" onClick={onLeave}>
              나가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Game UI ────────────────────────────────────────────
  const timerUrgent = timeLeft !== null && timeLeft <= 10;

  return (
    <div className="blk-play-page">
      {/* Top bar */}
      <div className="blk-topbar">
        <div className={`blk-turn-badge ${isMyTurn ? 'blk-turn-mine' : ''}`} style={{ '--color': COLOR_HEX[currentColor] }}>
          {isMyTurn ? '내 차례!' : `${colorName(currentColor)} 차례`}
        </div>
        <div className={`blk-timer ${timerUrgent ? 'blk-timer-urgent' : ''}`}>
          {timeLeft !== null ? timeLeft : '--'}s
        </div>
        <div className="blk-topbar-players">
          {gameState.turn_order.map((color) => {
            const p = players.find((pl) => pl.color === color);
            const hasPassed = gameState.passed.includes(color);
            const remainingCount = gameState.remaining[color]?.filter(Boolean).length ?? 0;
            return (
              <span
                key={color}
                className="blk-topbar-player-dot"
                style={{ background: COLOR_HEX[color], opacity: hasPassed ? 0.3 : 1 }}
                title={`${p?.player_name || colorName(color)}: ${remainingCount}개`}
              />
            );
          })}
        </div>
        <button
          className="blk-sound-btn"
          onClick={() => setSoundOn((v) => !v)}
          title="사운드 토글"
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>

      <div className="blk-play-layout">
        {/* Board */}
        <div
          className={`blk-board-wrap ${isMyTurn ? 'blk-board-my-turn' : ''}`}
          style={{ '--my-color': myColor ? COLOR_HEX[myColor] : '#6366f1' }}
        >
          <div
            className="blk-board"
            ref={boardRef}
            onTouchStart={handleBoardTouchStart}
            onTouchMove={handleBoardTouchMove}
            onTouchEnd={handleBoardTouchEnd}
          >
            {boardCells}
          </div>
        </div>

        {/* Right Panel */}
        <div className="blk-panel">
          {/* Players */}
          <div className="blk-panel-section blk-players-section">
            <div className="blk-panel-label">플레이어</div>
            {gameState.turn_order.map((color) => {
              const p = players.find((pl) => pl.color === color);
              const isCur = color === currentColor;
              const hasPassed = gameState.passed.includes(color);
              const remainingCount = gameState.remaining[color]?.filter(Boolean).length ?? 0;
              return (
                <div
                  key={color}
                  className={`blk-panel-player ${isCur && !hasPassed ? 'blk-panel-player-cur' : ''} ${hasPassed ? 'blk-panel-player-passed' : ''}`}
                  style={{ '--pc': COLOR_HEX[color] }}
                >
                  <span className="blk-panel-player-dot" style={{ background: COLOR_HEX[color] }} />
                  <span className="blk-panel-player-name">{p?.player_name || colorName(color)}</span>
                  {hasPassed
                    ? <span className="blk-panel-player-passed-badge">기권</span>
                    : <span className="blk-panel-player-remaining">{remainingCount}개</span>
                  }
                </div>
              );
            })}
          </div>

          {/* Controls */}
          {isMyTurn && (
            <div className="blk-panel-section">
              <div className="blk-panel-label">조작</div>
              <div className="blk-controls">
                <button className="blk-ctrl-btn" onClick={() => setRotation((r) => (r + 1) % 4)} disabled={!selectedPiece}>
                  ↻ 회전
                </button>
                <button className="blk-ctrl-btn" onClick={() => setFlipped((f) => !f)} disabled={!selectedPiece}>
                  ↔ 뒤집기
                </button>
                <button className="blk-ctrl-btn blk-ctrl-cancel" onClick={() => { setSelectedPieceId(null); setRotation(0); setFlipped(false); setHoverCell(null); }} disabled={!selectedPiece}>
                  ✕ 취소
                </button>
              </div>
              <button
                className="blk-place-btn"
                disabled={!hoverValid || !selectedPiece}
                onClick={handlePlace}
              >
                여기에 놓기
              </button>
            </div>
          )}

          {/* Piece Grid */}
          {isMyTurn && (
            <div className="blk-panel-section blk-pieces-section">
              <div className="blk-panel-label">내 피스 ({myRemaining.filter(Boolean).length}/21)</div>
              <div className="blk-pieces-grid">
                {PIECES.map((piece) => {
                  const used = !myRemaining[piece.id];
                  const selected = selectedPieceId === piece.id;
                  return (
                    <button
                      key={piece.id}
                      className={`blk-piece-btn ${selected ? 'blk-piece-selected' : ''} ${used ? 'blk-piece-used' : ''}`}
                      onClick={() => {
                        if (used) return;
                        setSelectedPieceId(piece.id);
                        setRotation(0);
                        setFlipped(false);
                        setHoverCell(null);
                      }}
                      title={piece.name}
                    >
                      <PieceMini cells={piece.cells} color={used ? '#555' : COLOR_HEX[myColor]} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pass button */}
          {isMyTurn && (
            <button className="blk-pass-btn" onClick={handlePass}>
              기권하기
            </button>
          )}

          {!isMyTurn && (
            <div className="blk-waiting-msg">
              <span style={{ color: COLOR_HEX[currentColor] }}>{colorName(currentColor)}</span> 차례를 기다리는 중...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Piece Mini Renderer ────────────────────────────────────
function PieceMini({ cells, color }) {
  const maxR = Math.max(...cells.map(([r]) => r));
  const maxC = Math.max(...cells.map(([, c]) => c));
  const rows = maxR + 1;
  const cols = maxC + 1;
  const cellSet = new Set(cells.map(([r, c]) => `${r},${c}`));

  return (
    <div
      className="blk-piece-mini"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {Array.from({ length: rows * cols }).map((_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const filled = cellSet.has(`${r},${c}`);
        return (
          <div
            key={i}
            className="blk-piece-mini-cell"
            style={{ background: filled ? color : 'transparent' }}
          />
        );
      })}
    </div>
  );
}
