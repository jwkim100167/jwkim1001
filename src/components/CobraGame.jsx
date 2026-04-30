import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  createRoom,
  joinRoom,
  getRoomPlayers,
  getRoomData,
  leaveRoom,
  deleteRoom,
  subscribeToRoom,
  unsubscribeFromRoom,
  startGame,
} from '../services/supabaseCobra';
import CobraGamePlay, { RulesModal } from './CobraGamePlay';
import './CobraGame.css';
import './CobraGamePlay.css';

const MAX_PLAYERS = 5;
const PLAYER_COLORS = ['#e94560', '#f5a623', '#4ecdc4', '#a29bfe', '#55efc4'];

export default function CobraGame() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState('lobby'); // lobby | create | join | waiting
  const [playerName, setPlayerName] = useState('');
  const [options, setOptions] = useState({ specialCards: false });
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomData, setRoomData] = useState(null);   // full room row (game_state 포함)
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const channelRef = useRef(null);

  // 방에 입장하면 데이터 로드 + 실시간 구독
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
      } catch {
        // ignore
      }
    };

    loadAll();

    channelRef.current = subscribeToRoom(currentRoom.id, loadAll);

    return () => {
      if (channelRef.current) {
        unsubscribeFromRoom(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentRoom]);

  // 페이지 나갈 때 플레이어 정리
  useEffect(() => {
    if (!currentPlayer) return;
    const handleBeforeUnload = () => leaveRoom(currentPlayer.id);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentPlayer]);

  const handleCreateRoom = async () => {
    if (!isAuthenticated) { setShowLoginPrompt(true); return; }
    if (!playerName.trim()) return setError('이름을 입력해주세요.');
    if (playerName.trim().length > 8) return setError('이름은 8자 이하로 입력해주세요.');
    setLoading(true); setError('');
    try {
      const { room, player } = await createRoom(playerName.trim());
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
      const { room, player } = await joinRoom(joinCode.trim(), playerName.trim());
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
    setError('');
    setView('lobby');
  };

  const handleStartGame = async () => {
    if (players.length < 2) return;
    setLoading(true); setError('');
    try {
      await startGame(currentRoom.id, players, options);
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

  // ────── 게임 진행 중 ──────
  const gameState = roomData?.game_state;
  if (view === 'waiting' && gameState && gameState.phase !== null) {
    return (
      <CobraGamePlay
        gameState={gameState}
        currentPlayer={currentPlayer}
        players={players}
        roomId={currentRoom.id}
      />
    );
  }

  // ────── LOGIN PROMPT ──────
  const loginPromptDialog = showLoginPrompt && (
    <div className="cobra-modal-overlay">
      <div className="cobra-modal-dialog">
        <p className="cobra-modal-msg">방 만들기는 로그인이 필요합니다.{'\n'}로그인하시겠습니까?</p>
        <div className="cobra-modal-btns">
          <button className="cobra-btn cobra-btn-secondary" onClick={() => setShowLoginPrompt(false)}>취소</button>
          <button className="cobra-btn cobra-btn-primary" onClick={() => navigate('/login')}>로그인</button>
        </div>
      </div>
    </div>
  );

  const rulesBtn = <button className="cgp-rules-btn" onClick={() => setShowRules(true)}>📖</button>;
  const rulesModal = showRules && <RulesModal onClose={() => setShowRules(false)} options={options} />;

  // ────── LOBBY ──────
  if (view === 'lobby') {
    return (
      <div className="cobra-wrap">
        {loginPromptDialog}
        {rulesModal}
        {rulesBtn}
        <button className="cobra-back-btn" onClick={() => navigate('/')}>← 홈으로</button>
        <div className="cobra-container">
          <div className="cobra-logo">
            <div className="cobra-logo-icon">🐍</div>
            <h1 className="cobra-title">COBRA</h1>
            <p className="cobra-subtitle">최대 5인 카드 게임</p>
          </div>
          <div className="cobra-lobby-actions">
            <button className="cobra-btn cobra-btn-primary" onClick={() => isAuthenticated ? setView('create') : setShowLoginPrompt(true)}>
              <span className="cobra-btn-icon">+</span>방 만들기
            </button>
            <button className="cobra-btn cobra-btn-secondary" onClick={() => setView('join')}>
              <span className="cobra-btn-icon">→</span>방 입장하기
            </button>
          </div>
          <div className="cobra-info">
            <div className="cobra-info-item">
              <span className="cobra-info-num">2~5</span>
              <span className="cobra-info-label">인원</span>
            </div>
            <div className="cobra-info-divider" />
            <div className="cobra-info-item">
              <span className="cobra-info-num">6자리</span>
              <span className="cobra-info-label">입장 코드</span>
            </div>
            <div className="cobra-info-divider" />
            <div className="cobra-info-item">
              <span className="cobra-info-num">실시간</span>
              <span className="cobra-info-label">멀티플레이</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ────── CREATE ──────
  if (view === 'create') {
    return (
      <div className="cobra-wrap">
        {loginPromptDialog}
        {rulesModal}
        {rulesBtn}
        <button className="cobra-back-btn" onClick={goToLobby}>← 뒤로</button>
        <div className="cobra-container cobra-container-sm">
          <div className="cobra-form-header">
            <div className="cobra-form-icon">🏠</div>
            <h2>방 만들기</h2>
            <p>이름을 입력하면 방이 생성됩니다.</p>
          </div>
          <div className="cobra-form">
            <label className="cobra-label">닉네임</label>
            <input
              className="cobra-input"
              type="text"
              placeholder="이름 입력 (최대 8자)"
              value={playerName}
              onChange={(e) => { setPlayerName(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
              maxLength={8}
              autoFocus
            />

            {error && <div className="cobra-error">{error}</div>}
            <button className="cobra-btn cobra-btn-primary cobra-btn-full" onClick={handleCreateRoom} disabled={loading}>
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
      <div className="cobra-wrap">
        {rulesModal}
        {rulesBtn}
        <button className="cobra-back-btn" onClick={goToLobby}>← 뒤로</button>
        <div className="cobra-container cobra-container-sm">
          <div className="cobra-form-header">
            <div className="cobra-form-icon">🔑</div>
            <h2>방 입장하기</h2>
            <p>공유받은 방 코드를 입력하세요.</p>
          </div>
          <div className="cobra-form">
            <label className="cobra-label">방 코드</label>
            <input
              className="cobra-input cobra-input-code"
              type="text"
              placeholder="XXXXXX"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setError(''); }}
              maxLength={6}
              autoFocus
            />
            <label className="cobra-label">닉네임</label>
            <input
              className="cobra-input"
              type="text"
              placeholder="이름 입력 (최대 8자)"
              value={playerName}
              onChange={(e) => { setPlayerName(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              maxLength={8}
            />
            {error && <div className="cobra-error">{error}</div>}
            <button className="cobra-btn cobra-btn-secondary cobra-btn-full" onClick={handleJoinRoom} disabled={loading}>
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
    const isFull = players.length >= MAX_PLAYERS;

    return (
      <div className="cobra-wrap">
        {rulesModal}
        {rulesBtn}
        <div className="cobra-container">
          <div className="cobra-room-header">
            <p className="cobra-room-label">방 코드</p>
            <div className="cobra-room-code-row">
              <span className="cobra-room-code">{currentRoom.code}</span>
              <button className="cobra-copy-btn" onClick={handleCopyCode}>
                {copied ? '복사됨!' : '복사'}
              </button>
            </div>
            <p className="cobra-room-hint">이 코드를 친구에게 공유하세요</p>
          </div>

          <div className="cobra-players-section">
            <div className="cobra-players-header">
              <span>플레이어</span>
              <span className="cobra-player-count">{players.length} / {MAX_PLAYERS}</span>
            </div>
            <div className="cobra-player-slots">
              {Array.from({ length: MAX_PLAYERS }).map((_, idx) => {
                const p = players[idx];
                return (
                  <div
                    key={idx}
                    className={`cobra-player-slot ${p ? 'occupied' : 'empty'} ${p?.id === currentPlayer.id ? 'me' : ''}`}
                    style={p ? { borderLeftColor: PLAYER_COLORS[idx] } : {}}
                  >
                    {p ? (
                      <>
                        <span className="cobra-player-avatar" style={{ background: PLAYER_COLORS[idx] }}>
                          {p.player_name[0].toUpperCase()}
                        </span>
                        <span className="cobra-player-name">
                          {p.player_name}
                          {p.id === currentPlayer.id && <span className="cobra-me-badge">나</span>}
                        </span>
                        {p.is_host && <span className="cobra-host-badge">방장</span>}
                      </>
                    ) : (
                      <>
                        <span className="cobra-player-avatar empty-avatar">?</span>
                        <span className="cobra-player-name empty-name">
                          {isFull ? '만원' : '대기 중...'}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 게임 옵션 (방장만) ── */}
          {isHost && (
            <div className="cobra-options-section">
              <div className="cobra-options-title">게임 옵션</div>
              <div className="cobra-option-row">
                <div className="cobra-option-info">
                  <div className="cobra-option-name">🃏 특수 카드 능력</div>
                  <div className="cobra-option-desc">J · Q · K 버릴 때 특수 능력 발동</div>
                </div>
                <button
                  className={`cobra-toggle ${options.specialCards ? 'cobra-toggle-on' : ''}`}
                  onClick={() => setOptions(o => ({ ...o, specialCards: !o.specialCards }))}
                >
                  {options.specialCards ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          )}

          {error && <div className="cobra-error">{error}</div>}

          <div className="cobra-waiting-actions">
            {isHost && (
              <button
                className="cobra-btn cobra-btn-start"
                onClick={handleStartGame}
                disabled={players.length < 2 || loading}
                title={players.length < 2 ? '2명 이상이어야 시작할 수 있습니다' : ''}
              >
                {loading ? '시작 중...' : players.length < 2 ? '2명 이상 필요' : '게임 시작 🐍'}
              </button>
            )}
            {!isHost && (
              <div className="cobra-waiting-msg">
                <span className="cobra-spinner" />
                방장이 게임을 시작할 때까지 기다려주세요
              </div>
            )}
            <button className="cobra-btn cobra-btn-leave" onClick={handleLeave}>
              {isHost ? '방 삭제하고 나가기' : '방 나가기'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
