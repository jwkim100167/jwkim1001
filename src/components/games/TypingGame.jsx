import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabaseClient';
import {
  createRoom,
  joinRoom,
  getRoomPlayers,
  getRoomData,
  leaveRoom,
  deleteRoom,
  promoteToHost,
  startGame,
  startUnifiedGame,
  resetToWaiting,
  subscribeToRoom,
  unsubscribeFromRoom,
  MAX_PLAYERS,
  blokusPlacePiece, blokusPassTurn, blokusAutoPass,
  turneyiaRevealNextHint, turneyiaSubmitAnswer, turneyiaRevealAnswer, turneyiaNextRound, turneyiaEndGame,
  cobraPeekCard, cobraDrawFromDeck, cobraDiscardDrawn, cobraSwapWithHand, cobraMatchAndDiscard,
  cobraTakeFromDiscard, cobraSeonjeomInterrupt, cobraResolveSpecialPeek, cobraResolveSpecialSwap,
  cobraSkipSpecialAbility, cobraCallCobra,
  halligalliFlipCard, halligalliRingBell, halligalliResolveBell, halligalliDiscardTopCards,
} from '../../services/supabaseTyping';
import TypingGamePlay from './TypingGamePlay';
import BlokusPlay from '../BlokusPlay';
import TurneyKiaPlay from '../TurneyKiaPlay';
import CobraGamePlay from '../CobraGamePlay';
import HalliGalliPlay from '../HalliGalliPlay';
import menuData from '../../data/menuDatabase.json';
import './TypingGame.css';

const PLAYER_COLORS = ['#00d2ff', '#f7971e', '#a18cd1', '#43e97b', '#f44369', '#f093fb'];

const GAMES = [
  { id: 'typing',    icon: '⌨️', title: '한컴타자연습',   desc: '타이핑 대결',          active: true,  color: '#00d2ff' },
  { id: 'turneyia',  icon: '🏆', title: '터이네키아',      desc: '아키네이터를 거꾸로!',  active: true,  color: '#f7971e' },
  { id: 'cobra',     icon: '🐍', title: '코브라 게임',     desc: '카드 게임 대결',        active: true,  color: '#43e97b' },
  { id: 'blokus',    icon: '🟦', title: '블로커스',        desc: '전략 타일 배치 대결',   active: true,  color: '#3b82f6' },
  { id: 'halligalli', icon: '🔔', title: '할리갈리',       desc: '과일 5개면 벨!',        active: true,  color: '#d97706' },
  { id: 'math-odd',  icon: '➕', title: '산수홀짝',        desc: '홀수? 짝수?',          active: false, color: '#f7971e' },
  { id: 'gugu',      icon: '✖️', title: '구구단을 하자',   desc: '빈칸을 채워라',        active: false, color: '#a18cd1' },
  { id: 'counting',  icon: '🔢', title: '순서대로',        desc: '숫자 순서 클릭',       active: false, color: '#43e97b' },
  { id: 'apple',     icon: '🍎', title: '사과게임',        desc: '합 10 만들기',         active: false, color: '#f44369' },
  { id: 'memory',    icon: '🧩', title: '기억력 게임',     desc: '카드 짝 맞추기',       active: false, color: '#4facfe' },
  { id: 'updown',    icon: '🔐', title: '비번을 맞혀라',   desc: '업앤다운 추리',        active: false, color: '#f093fb' },
  { id: 'balloon',   icon: '🎈', title: '풍선터뜨리기',    desc: '색깔 함정 주의',       active: false, color: '#ff6b6b' },
  { id: 'leftright', icon: '↔️', title: '좌로우로',        desc: '빠른 방향 반응',       active: false, color: '#43e97b' },
];

/** 존 기반 랜덤 단어 배치 생성 (count에 따라 그리드 자동 조정) */
function generateWords(count = 10) {
  // count에 맞게 행/열 결정 (최소 count개 존 확보)
  const cols = count <= 5 ? 3 : count <= 10 ? 4 : 5;
  const rows = Math.ceil(count / cols) + 1;
  const zones = [];
  const xStep = 90 / cols;
  const yStep = 70 / rows;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      zones.push({
        xBase: col * xStep + 2,
        yBase: row * yStep + 8,
      });
    }
  }
  // 존 섞어서 앞 count개 사용
  const shuffled = [...zones].sort(() => Math.random() - 0.5).slice(0, count);

  // 메뉴 풀에서 랜덤 count개 선택
  const pool = [...menuData.menus].sort(() => Math.random() - 0.5).slice(0, count);

  const weights = [300, 400, 500, 600, 700, 800, 900];

  return pool.map((item, i) => ({
    id: i,
    text: item.name,
    x: shuffled[i].xBase + Math.random() * 18,
    y: shuffled[i].yBase + Math.random() * 18,
    fontSize: 16 + Math.random() * 30,                   // 16~46px
    rotation: -180 + Math.random() * 360,                 // -180~+180도
    fontWeight: weights[Math.floor(Math.random() * weights.length)],
    points: item.name.length,
    capturedBy: null,
    capturedBy_name: null,
  }));
}

export default function TypingGame() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [view, setView] = useState('lobby');
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [showSoloConfirm, setShowSoloConfirm] = useState(false);
  const [options, setOptions] = useState({ mode: 'oneByOne', count: 10 }); // typing options
  const [gameOptions, setGameOptions] = useState({}); // per-game options (blokus/turneyia/cobra)
  const [onlinePlayerIds, setOnlinePlayerIds] = useState(null);

  const channelRef = useRef(null);
  const presenceChannelRef = useRef(null);
  const currentPlayerRef = useRef(null);
  useEffect(() => { currentPlayerRef.current = currentPlayer; }, [currentPlayer]);

  useEffect(() => {
    if (!currentRoom) return;

    const loadAll = async () => {
      try {
        const [playersData, roomFull] = await Promise.all([
          getRoomPlayers(currentRoom.id),
          getRoomData(currentRoom.id),
        ]);
        setPlayers(playersData);
        setRoomData(roomFull);

        // currentPlayer 최신 상태 동기화 (is_host 변경 반영)
        const self = currentPlayerRef.current;
        if (self) {
          const freshSelf = playersData.find((p) => p.id === self.id);
          if (freshSelf && freshSelf.is_host !== self.is_host) {
            setCurrentPlayer(freshSelf);
            currentPlayerRef.current = freshSelf;
          }

          // 호스트 이탈 시 첫 번째 플레이어가 자동 승계
          const hasHost = playersData.some((p) => p.is_host);
          if (!hasHost && playersData.length > 0 && freshSelf) {
            if (playersData[0].id === freshSelf.id) {
              await promoteToHost(freshSelf.id);
            }
          }
        }
      } catch { /* ignore */ }
    };

    loadAll();

    channelRef.current = subscribeToRoom(currentRoom.id, loadAll, () => {
      setCurrentRoom(null);
      setRoomData(null);
      setCurrentPlayer(null);
      setPlayers([]);
      setView('lobby');
    });

    return () => {
      if (channelRef.current) {
        unsubscribeFromRoom(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentRoom]);

  // Presence 추적: 온라인 플레이어 ID 목록 관리
  useEffect(() => {
    if (!currentRoom || !currentPlayer) {
      setOnlinePlayerIds(null);
      return;
    }
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
    }
    const channel = supabase.channel(`presence:${currentRoom.id}`, {
      config: { presence: { key: currentPlayer.id } },
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        const ids = Object.keys(channel.presenceState());
        setOnlinePlayerIds(ids.length > 0 ? ids : null);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online: true });
        }
      });
    presenceChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [currentRoom?.id, currentPlayer?.id]);

  useEffect(() => {
    if (!currentPlayer) return;
    const handleBeforeUnload = () => leaveRoom(currentPlayer.id);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentPlayer]);

  useEffect(() => {
    if (view !== 'waiting' || !currentRoom) return;
    const timer = setInterval(async () => {
      try {
        const roomFull = await getRoomData(currentRoom.id);
        setRoomData(roomFull);
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(timer);
  }, [view, currentRoom]);

  const handleCreateRoom = async () => {
    if (!isAuthenticated) { setShowLoginPrompt(true); return; }
    if (!playerName.trim()) return setError('이름을 입력해주세요.');
    if (playerName.trim().length > 8) return setError('이름은 8자 이하로 입력해주세요.');
    setLoading(true); setError('');
    try {
      const { room, player } = await createRoom(playerName.trim(), user?.uuid ?? null);
      setCurrentRoom(room);
      setCurrentPlayer(player);
      setView('waiting');
    } catch (e) {
      setError(e.message || '방 만들기에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) return setError('방 코드를 입력해주세요.');
    if (!playerName.trim()) return setError('이름을 입력해주세요.');
    if (playerName.trim().length > 8) return setError('이름은 8자 이하로 입력해주세요.');
    setLoading(true); setError('');
    try {
      const { room, player } = await joinRoom(joinCode.trim(), playerName.trim(), user?.uuid ?? null);
      setCurrentRoom(room);
      setCurrentPlayer(player);
      setView('waiting');
    } catch (e) {
      setError(e.message || '방 입장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (currentPlayer) {
      try {
        await leaveRoom(currentPlayer.id);
        if (currentPlayer.is_host && currentRoom) await deleteRoom(currentRoom.id);
      } catch { /* ignore */ }
    }
    setCurrentRoom(null);
    setRoomData(null);
    setCurrentPlayer(null);
    setPlayers([]);
    setSelectedGame(null);
    setError('');
    setView('lobby');
  };

  const handleStartClick = () => {
    if (!selectedGame) return setError('게임을 먼저 선택해주세요.');
    if (players.length < 2) {
      setShowSoloConfirm(true);
    } else {
      doStartGame();
    }
  };

  const doStartGame = async () => {
    setShowSoloConfirm(false);
    setLoading(true); setError('');
    try {
      if (!selectedGame || selectedGame.id === 'typing') {
        const words = generateWords(options.count);
        await startGame(currentRoom.id, words, options);
      } else {
        await startUnifiedGame(currentRoom.id, selectedGame.id, players, gameOptions);
      }
    } catch (e) {
      setError(e.message || '게임 시작에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentRoom.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const goToLobby = () => { setError(''); setView('lobby'); };

  // ────── 게임 진행 중 → 각 게임 컴포넌트 ──────
  const gameState = roomData?.game_state;
  if (view === 'waiting' && gameState) {
    const sel = gameState.selected_game;
    const phase = gameState.phase;
    const isActive = phase === 'playing' || phase === 'ended' || phase === 'viewing' || phase === 'hinting' || phase === 'reveal' || phase === 'cobra' || phase === 'bell_resolving';

    if (isActive) {
      const handleResetToWaiting = async () => {
        try { await resetToWaiting(currentRoom.id); } catch { /* ignore */ }
      };

      if (sel === 'blokus') {
        const playerColors = gameState.player_colors || {};
        const enrichedPlayers = players.map((p) => ({ ...p, color: playerColors[p.id] ?? p.color }));
        return (
          <BlokusPlay
            gameState={gameState}
            currentPlayer={currentPlayer}
            players={enrichedPlayers}
            roomId={currentRoom.id}
            onResetGame={currentPlayer?.is_host ? handleResetToWaiting : null}
            onLeave={handleLeave}
            actions={{ placePiece: blokusPlacePiece, passTurn: blokusPassTurn, autoPass: blokusAutoPass }}
          />
        );
      }

      if (sel === 'turneyia') {
        return (
          <TurneyKiaPlay
            gameState={gameState}
            currentPlayer={currentPlayer}
            players={players}
            roomId={currentRoom.id}
            onResetGame={currentPlayer?.is_host ? handleResetToWaiting : null}
            onLeave={handleLeave}
            onlinePlayerIds={onlinePlayerIds}
            actions={{
              revealNextHint: turneyiaRevealNextHint,
              submitAnswer: turneyiaSubmitAnswer,
              revealAnswer: turneyiaRevealAnswer,
              nextRound: turneyiaNextRound,
              endGame: turneyiaEndGame,
            }}
          />
        );
      }

      if (sel === 'cobra') {
        return (
          <CobraGamePlay
            gameState={gameState}
            currentPlayer={currentPlayer}
            players={players}
            roomId={currentRoom.id}
            actions={{
              peekCard: cobraPeekCard,
              drawFromDeck: cobraDrawFromDeck,
              discardDrawn: cobraDiscardDrawn,
              swapWithHand: cobraSwapWithHand,
              matchAndDiscard: cobraMatchAndDiscard,
              takeFromDiscard: cobraTakeFromDiscard,
              seonjeomInterrupt: cobraSeonjeomInterrupt,
              resolveSpecialPeek: cobraResolveSpecialPeek,
              resolveSpecialSwap: cobraResolveSpecialSwap,
              skipSpecialAbility: cobraSkipSpecialAbility,
              callCobra: cobraCallCobra,
              resetGame: currentPlayer?.is_host ? handleResetToWaiting : () => Promise.resolve(),
            }}
          />
        );
      }

      if (sel === 'halligalli') {
        return (
          <HalliGalliPlay
            gameState={gameState}
            currentPlayer={currentPlayer}
            players={players}
            roomId={currentRoom.id}
            onResetGame={currentPlayer?.is_host ? handleResetToWaiting : null}
            onLeave={handleLeave}
            actions={{
              flipCard: halligalliFlipCard,
              ringBell: halligalliRingBell,
              resolveBell: halligalliResolveBell,
              discardTopCards: halligalliDiscardTopCards,
            }}
          />
        );
      }

      // 기본: 타자연습 (selected_game 없거나 'typing')
      if (!sel || sel === 'typing') {
        return (
          <TypingGamePlay
            gameState={gameState}
            currentPlayer={currentPlayer}
            players={players}
            roomId={currentRoom.id}
            isHost={currentPlayer?.is_host}
            onLeave={handleLeave}
            onRestart={handleResetToWaiting}
          />
        );
      }
    }
  }

  // ────── LOGIN PROMPT ──────
  const loginPromptDialog = showLoginPrompt && (
    <div className="tg-modal-overlay">
      <div className="tg-modal-dialog">
        <p className="tg-modal-msg">방 만들기는 로그인이 필요합니다.{'\n'}로그인하시겠습니까?</p>
        <div className="tg-modal-btns">
          <button className="tg-btn tg-btn-secondary" onClick={() => setShowLoginPrompt(false)}>취소</button>
          <button className="tg-btn tg-btn-primary" onClick={() => navigate('/login')}>로그인</button>
        </div>
      </div>
    </div>
  );

  // ────── SOLO CONFIRM ──────
  const soloConfirmDialog = showSoloConfirm && (
    <div className="tg-modal-overlay">
      <div className="tg-modal-dialog">
        <div className="tg-modal-icon">🎮</div>
        <p className="tg-modal-title">혼자서 플레이합니다</p>
        <p className="tg-modal-msg">현재 방에 혼자 있습니다.{'\n'}혼자서 플레이를 시작하시겠습니까?</p>
        <div className="tg-modal-btns">
          <button className="tg-btn tg-btn-secondary" onClick={() => setShowSoloConfirm(false)}>취소</button>
          <button className="tg-btn tg-btn-primary" onClick={doStartGame}>시작하기</button>
        </div>
      </div>
    </div>
  );

  // ────── LOBBY ──────
  if (view === 'lobby') {
    return (
      <div className="tg-wrap">
        {loginPromptDialog}
        <button className="tg-back-btn" onClick={() => navigate('/')}>← 홈으로</button>
        <div className="tg-container">
          <div className="tg-logo">
            <div className="tg-logo-icon">🧠</div>
            <h1 className="tg-title">두뇌 미니게임</h1>
            <p className="tg-subtitle">방을 만들고 함께 즐기세요</p>
          </div>
          <div className="tg-lobby-actions">
            <button className="tg-btn tg-btn-primary" onClick={() => isAuthenticated ? setView('create') : setShowLoginPrompt(true)}>
              <span className="tg-btn-icon">+</span>방 만들기
            </button>
            <button className="tg-btn tg-btn-secondary" onClick={() => setView('join')}>
              <span className="tg-btn-icon">→</span>방 입장하기
            </button>
          </div>
          <div className="tg-info">
            <div className="tg-info-item">
              <span className="tg-info-num">1~{MAX_PLAYERS}</span>
              <span className="tg-info-label">인원</span>
            </div>
            <div className="tg-info-divider" />
            <div className="tg-info-item">
              <span className="tg-info-num">6자리</span>
              <span className="tg-info-label">입장 코드</span>
            </div>
            <div className="tg-info-divider" />
            <div className="tg-info-item">
              <span className="tg-info-num">9종</span>
              <span className="tg-info-label">미니게임</span>
            </div>
          </div>

          <div className="tg-direct-games">
            <p className="tg-direct-label">미니게임 목록</p>
            <div className="tg-direct-grid">
              {GAMES.filter((g) => g.active).map((game) => (
                <div
                  key={game.id}
                  className="tg-direct-card"
                  style={{ '--gc': game.color }}
                >
                  <span className="tg-direct-icon">{game.icon}</span>
                  <span className="tg-direct-title">{game.title}</span>
                  <span className="tg-direct-desc">{game.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ────── CREATE ──────
  if (view === 'create') {
    return (
      <div className="tg-wrap">
        {loginPromptDialog}
        <button className="tg-back-btn" onClick={goToLobby}>← 뒤로</button>
        <div className="tg-container tg-container-sm">
          <div className="tg-form-header">
            <div className="tg-form-icon">🏠</div>
            <h2>방 만들기</h2>
            <p>이름을 입력하면 방이 생성됩니다.</p>
          </div>
          <div className="tg-form">
            <label className="tg-label">닉네임</label>
            <input
              className="tg-input"
              type="text"
              placeholder="이름 입력 (최대 8자)"
              value={playerName}
              onChange={(e) => { setPlayerName(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
              maxLength={8}
              autoFocus
            />
            {error && <div className="tg-error">{error}</div>}
            <button className="tg-btn tg-btn-primary tg-btn-full" onClick={handleCreateRoom} disabled={loading}>
              {loading ? '생성 중...' : '방 만들기'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────── JOIN ──────
  if (view === 'join') {
    return (
      <div className="tg-wrap">
        <button className="tg-back-btn" onClick={goToLobby}>← 뒤로</button>
        <div className="tg-container tg-container-sm">
          <div className="tg-form-header">
            <div className="tg-form-icon">🔑</div>
            <h2>방 입장하기</h2>
            <p>공유받은 방 코드를 입력하세요.</p>
          </div>
          <div className="tg-form">
            <label className="tg-label">방 코드</label>
            <input
              className="tg-input tg-input-code"
              type="text"
              placeholder="XXXXXX"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setError(''); }}
              maxLength={6}
              autoFocus
            />
            <label className="tg-label">닉네임</label>
            <input
              className="tg-input"
              type="text"
              placeholder="이름 입력 (최대 8자)"
              value={playerName}
              onChange={(e) => { setPlayerName(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              maxLength={8}
            />
            {error && <div className="tg-error">{error}</div>}
            <button className="tg-btn tg-btn-secondary tg-btn-full" onClick={handleJoinRoom} disabled={loading}>
              {loading ? '입장 중...' : '입장하기'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────── WAITING ──────
  if (view === 'waiting' && currentRoom && currentPlayer) {
    const isHost = currentPlayer.is_host;

    const startBtnLabel = () => {
      if (loading) return '시작 중...';
      if (!selectedGame) return '게임을 선택하세요';
      if (players.length < 2) return `${selectedGame.icon} 혼자서 시작하기`;
      return `${selectedGame.icon} ${selectedGame.title} 시작!`;
    };

    return (
      <div className="tg-wrap tg-wrap-waiting">
        {soloConfirmDialog}
        <div className="tg-waiting-layout">

          {/* 왼쪽: 방 코드 + 플레이어 목록 */}
          <div className="tg-waiting-left">
            <div className="tg-room-header">
              <p className="tg-room-label">방 코드</p>
              <div className="tg-room-code-row">
                <span className="tg-room-code">{currentRoom.code}</span>
                <button className="tg-copy-btn" onClick={handleCopyCode}>
                  {copied ? '복사됨!' : '복사'}
                </button>
              </div>
              <p className="tg-room-hint">이 코드를 친구에게 공유하세요</p>
            </div>

            <div className="tg-players-section">
              <div className="tg-players-header">
                <span>플레이어</span>
                <span className="tg-player-count">{players.length} / {MAX_PLAYERS}</span>
              </div>
              <div className="tg-player-slots">
                {Array.from({ length: MAX_PLAYERS }).map((_, idx) => {
                  const p = players[idx];
                  return (
                    <div
                      key={idx}
                      className={`tg-player-slot ${p ? 'occupied' : 'empty'} ${p?.id === currentPlayer.id ? 'me' : ''}`}
                      style={p ? { borderLeftColor: PLAYER_COLORS[idx] } : {}}
                    >
                      {p ? (
                        <>
                          <span className="tg-player-avatar" style={{ background: PLAYER_COLORS[idx] }}>
                            {p.player_name[0].toUpperCase()}
                          </span>
                          <span className="tg-player-name">
                            {p.player_name}
                            {p.id === currentPlayer.id && <span className="tg-me-badge">나</span>}
                          </span>
                          {p.is_host && <span className="tg-host-badge">방장</span>}
                        </>
                      ) : (
                        <>
                          <span className="tg-player-avatar empty-avatar">?</span>
                          <span className="tg-player-name empty-name">대기 중...</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 게임 옵션 (방장만) */}
            {isHost && selectedGame && (
              <div className="tg-options-section">
                <div className="tg-options-title">게임 옵션</div>

                {/* 타자연습 옵션 */}
                {selectedGame.id === 'typing' && (<>
                  <div className="tg-option-row">
                    <div className="tg-option-info">
                      <div className="tg-option-name">🃏 출제 방식</div>
                      <div className="tg-option-desc">
                        {options.mode === 'all' ? '단어를 한번에 표시' : '단어를 하나씩 순서대로 표시'}
                      </div>
                    </div>
                    <button
                      className={`tg-toggle ${options.mode === 'all' ? 'tg-toggle-on' : ''}`}
                      onClick={() => setOptions(o => ({ ...o, mode: o.mode === 'oneByOne' ? 'all' : 'oneByOne' }))}
                    >
                      {options.mode === 'all' ? '한번에' : '순서대로'}
                    </button>
                  </div>
                  <div className="tg-option-row">
                    <div className="tg-option-info">
                      <div className="tg-option-name">🔢 문제 수</div>
                      <div className="tg-option-desc">{options.count}개 출제</div>
                    </div>
                    <div className="tg-count-btns">
                      {[5, 10, 20].map(n => (
                        <button key={n}
                          className={`tg-count-btn ${options.count === n ? 'tg-count-btn-on' : ''}`}
                          onClick={() => setOptions(o => ({ ...o, count: n }))}
                        >{n}</button>
                      ))}
                    </div>
                  </div>
                </>)}

                {/* 블로커스 옵션 */}
                {selectedGame.id === 'blokus' && (
                  <div className="tg-option-row">
                    <div className="tg-option-info">
                      <div className="tg-option-name">⏱️ 턴 타이머</div>
                      <div className="tg-option-desc">{gameOptions.timerSeconds || 30}초</div>
                    </div>
                    <div className="tg-count-btns">
                      {[20, 30, 60].map(n => (
                        <button key={n}
                          className={`tg-count-btn ${(gameOptions.timerSeconds || 30) === n ? 'tg-count-btn-on' : ''}`}
                          onClick={() => setGameOptions(o => ({ ...o, timerSeconds: n }))}
                        >{n}s</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 터이네키아 옵션 */}
                {selectedGame.id === 'turneyia' && (<>
                  <div className="tg-option-row">
                    <div className="tg-option-info">
                      <div className="tg-option-name">🎭 카테고리</div>
                      <div className="tg-option-desc">
                        {{ celebrity: '연예인', athlete: '운동선수', character: '만화캐릭터', random: '랜덤' }[gameOptions.category || 'celebrity']}
                      </div>
                    </div>
                    <div className="tg-count-btns">
                      {[['celebrity','연예인'],['athlete','운동선수'],['character','만화캐릭터'],['random','랜덤']].map(([v,l]) => (
                        <button key={v}
                          className={`tg-count-btn ${(gameOptions.category || 'celebrity') === v ? 'tg-count-btn-on' : ''}`}
                          onClick={() => setGameOptions(o => ({ ...o, category: v }))}
                        >{l}</button>
                      ))}
                    </div>
                  </div>
                  <div className="tg-option-row">
                    <div className="tg-option-info">
                      <div className="tg-option-name">🔢 라운드 수</div>
                      <div className="tg-option-desc">{gameOptions.totalRounds || 3}라운드</div>
                    </div>
                    <div className="tg-count-btns">
                      {[1, 3, 5].map(n => (
                        <button key={n}
                          className={`tg-count-btn ${(gameOptions.totalRounds || 3) === n ? 'tg-count-btn-on' : ''}`}
                          onClick={() => setGameOptions(o => ({ ...o, totalRounds: n }))}
                        >{n}</button>
                      ))}
                    </div>
                  </div>
                </>)}

                {/* 할리갈리 옵션 */}
                {selectedGame.id === 'halligalli' && (
                  <div className="tg-option-row">
                    <div className="tg-option-info">
                      <div className="tg-option-name">⚡ 2등 역전</div>
                      <div className="tg-option-desc">
                        {gameOptions.secondPlace ? '2등이 카드 전부 가져감' : '1등이 카드 가져감 (기본)'}
                      </div>
                    </div>
                    <button
                      className={`tg-toggle ${gameOptions.secondPlace ? 'tg-toggle-on' : ''}`}
                      onClick={() => setGameOptions(o => ({ ...o, secondPlace: !o.secondPlace }))}
                    >
                      {gameOptions.secondPlace ? 'ON' : 'OFF'}
                    </button>
                  </div>
                )}

                {/* 코브라 옵션 */}
                {selectedGame.id === 'cobra' && (
                  <div className="tg-option-row">
                    <div className="tg-option-info">
                      <div className="tg-option-name">🃏 스페셜 카드</div>
                      <div className="tg-option-desc">J/Q/K 특수 능력 {gameOptions.specialCards === false ? 'OFF' : 'ON'}</div>
                    </div>
                    <button
                      className={`tg-toggle ${gameOptions.specialCards !== false ? 'tg-toggle-on' : ''}`}
                      onClick={() => setGameOptions(o => ({ ...o, specialCards: o.specialCards === false ? true : false }))}
                    >
                      {gameOptions.specialCards === false ? 'OFF' : 'ON'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && <div className="tg-error">{error}</div>}

            <div className="tg-waiting-actions">
              {isHost && (
                <button
                  className="tg-btn tg-btn-start"
                  onClick={handleStartClick}
                  disabled={!selectedGame || loading}
                >
                  {startBtnLabel()}
                </button>
              )}
              {!isHost && (
                <div className="tg-waiting-msg">
                  <span className="tg-spinner" />
                  {selectedGame
                    ? `방장이 ${selectedGame.title} 게임을 시작할 예정입니다`
                    : '방장이 게임을 선택 중입니다...'}
                </div>
              )}
              <button className="tg-btn tg-btn-leave" onClick={handleLeave}>
                {isHost ? '방 삭제하고 나가기' : '방 나가기'}
              </button>
            </div>
          </div>

          {/* 오른쪽: 게임 선택 */}
          <div className="tg-waiting-right">
            <div className="tg-game-select-header">
              {isHost ? '게임 선택' : '게임 목록'}
            </div>
            <div className="tg-game-grid">
              {GAMES.map((game) => (
                <div
                  key={game.id}
                  className={`tg-game-card
                    ${game.active ? 'tg-game-card-active' : 'tg-game-card-disabled'}
                    ${selectedGame?.id === game.id ? 'tg-game-card-selected' : ''}
                    ${!isHost ? 'tg-game-card-readonly' : ''}
                  `}
                  style={{ '--gc': game.color }}
                  onClick={() => isHost && game.active && setSelectedGame(game)}
                >
                  <div className="tg-game-card-icon">{game.icon}</div>
                  <div className="tg-game-card-title">{game.title}</div>
                  {!game.active && <div className="tg-game-badge">준비 중</div>}
                  {selectedGame?.id === game.id && <div className="tg-game-badge tg-badge-selected">선택됨</div>}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    );
  }

  return null;
}
