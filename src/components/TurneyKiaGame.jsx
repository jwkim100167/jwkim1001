import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdBanner from './AdBanner';
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
  resetGame,
} from '../services/supabaseTurneyKia';
import TurneyKiaPlay from './TurneyKiaPlay';
import './TurneyKiaGame.css';

const CATEGORY_OPTIONS = [
  { value: 'celebrity', label: '연예인', emoji: '🎬' },
  { value: 'athlete',   label: '운동선수', emoji: '🏅' },
  { value: 'politician', label: '정치인', emoji: '🏛️' },
];

export default function TurneyKiaGame() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [view, setView] = useState('lobby'); // 'lobby' | 'create' | 'join' | 'waiting'
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [players, setPlayers] = useState([]);
  const [roomData, setRoomData] = useState(null);
  const [category, setCategory] = useState('celebrity');
  const [totalRounds, setTotalRounds] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [startAdCountdown, setStartAdCountdown] = useState(0); // 0 = no ad

  const channelRef = useRef(null);
  const startAdRef = useRef(null);

  // 실시간 구독
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
      unsubscribeFromRoom(channelRef.current);
      channelRef.current = null;
    };
  }, [currentRoom]);

  // 페이지 이탈 시 정리
  useEffect(() => {
    if (!currentPlayer) return;
    const handleBeforeUnload = () => leaveRoom(currentPlayer.id);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentPlayer]);

  const handleCreateRoom = async () => {
    if (!isAuthenticated) { setError('방 만들기는 로그인이 필요합니다.'); return; }
    if (!playerName.trim()) { setError('닉네임을 입력해주세요.'); return; }
    if (playerName.trim().length > 8) { setError('닉네임은 8자 이하로 입력해주세요.'); return; }
    setLoading(true); setError('');
    try {
      const { room, player } = await createRoom(playerName.trim());
      setCurrentRoom(room);
      setCurrentPlayer(player);
      setView('waiting');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) { setError('방 코드를 입력해주세요.'); return; }
    if (!playerName.trim()) { setError('닉네임을 입력해주세요.'); return; }
    if (playerName.trim().length > 8) { setError('닉네임은 8자 이하로 입력해주세요.'); return; }
    setLoading(true); setError('');
    try {
      const { room, player } = await joinRoom(joinCode.trim(), playerName.trim());
      setCurrentRoom(room);
      setCurrentPlayer(player);
      setView('waiting');
    } catch (e) {
      setError(e.message);
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
    setCurrentPlayer(null);
    setPlayers([]);
    setRoomData(null);
    setView('lobby');
  };

  const doStartGame = useCallback(async () => {
    setGenerating(true); setError('');
    const mode = ['admin', 'jwkim1001'].includes(user?.loginId) ? 'ai' : 'static';
    try {
      await startGame(currentRoom.id, players, category, totalRounds, mode);
    } catch (e) {
      console.error('startGame error:', e);
      setError('인물 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setGenerating(false);
    }
  }, [currentRoom, players, category, totalRounds, user]);

  const handleStartGame = () => {
    if (players.length < 2) { setError('2명 이상이어야 게임을 시작할 수 있습니다.'); return; }
    setStartAdCountdown(10);
  };

  useEffect(() => {
    if (startAdCountdown <= 0) return;
    if (startAdCountdown === 1) {
      startAdRef.current = setTimeout(() => {
        setStartAdCountdown(0);
        doStartGame();
      }, 1000);
      return;
    }
    startAdRef.current = setTimeout(() => setStartAdCountdown((n) => n - 1), 1000);
    return () => clearTimeout(startAdRef.current);
  }, [startAdCountdown, doStartGame]);

  const handleCopyCode = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleResetGame = async () => {
    if (!currentRoom) return;
    await resetGame(currentRoom.id);
  };

  // 게임 진행 중이면 TurneyKiaPlay 렌더링
  const gameState = roomData?.game_state;
  if (gameState && currentPlayer && currentRoom) {
    return (
      <TurneyKiaPlay
        gameState={gameState}
        currentPlayer={currentPlayer}
        players={players}
        roomId={currentRoom.id}
        onResetGame={currentPlayer.is_host ? handleResetGame : null}
        onLeave={handleLeave}
      />
    );
  }

  // ─── LOBBY ───
  if (view === 'lobby') {
    return (
      <div className="tkg-page">
        <div className="tkg-container">
          <button className="tkg-back-btn" onClick={() => navigate('/')}>← 홈</button>
          <div className="tkg-header">
            <div className="tkg-icon">🏆</div>
            <h1>터이네키아</h1>
            <p className="tkg-subtitle">힌트를 보고 인물을 맞춰보세요!</p>
          </div>
          <div className="tkg-lobby-actions">
            <button className="tkg-btn tkg-btn-primary" onClick={() => { setView('create'); setError(''); }}>
              방 만들기
            </button>
            <button className="tkg-btn tkg-btn-secondary" onClick={() => { setView('join'); setError(''); }}>
              방 입장하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── CREATE / JOIN ───
  if (view === 'create' || view === 'join') {
    return (
      <div className="tkg-page">
        <div className="tkg-container">
          <button className="tkg-back-btn" onClick={() => { setView('lobby'); setError(''); }}>← 뒤로</button>
          <div className="tkg-header">
            <div className="tkg-icon">{view === 'create' ? '🏠' : '🚪'}</div>
            <h1>{view === 'create' ? '방 만들기' : '방 입장하기'}</h1>
          </div>

          <div className="tkg-form">
            {view === 'join' && (
              <input
                className="tkg-input"
                placeholder="방 코드 6자리"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
            )}
            <input
              className="tkg-input"
              placeholder="닉네임 (최대 8자)"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={8}
              onKeyDown={(e) => e.key === 'Enter' && (view === 'create' ? handleCreateRoom() : handleJoinRoom())}
            />
            {error && <p className="tkg-error">{error}</p>}
            <button
              className="tkg-btn tkg-btn-primary"
              onClick={view === 'create' ? handleCreateRoom : handleJoinRoom}
              disabled={loading}
            >
              {loading ? '처리 중...' : view === 'create' ? '방 만들기' : '입장하기'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── WAITING ROOM ───
  return (
    <div className="tkg-page">
      {startAdCountdown > 0 && (
        <div className="tkg-ad-overlay">
          <AdBanner slot={import.meta.env.VITE_ADSENSE_SLOT_COBRA} className="tkg-ad-banner" />
          <div className="tkg-ad-countdown">
            <div className="tkg-ad-countdown-num">{startAdCountdown}</div>
            <p className="tkg-ad-countdown-msg">잠시 후 게임이 시작됩니다...</p>
          </div>
        </div>
      )}
      <div className="tkg-container tkg-container--wide">
        <button className="tkg-back-btn" onClick={handleLeave}>← 나가기</button>

        <div className="tkg-room-code-row">
          <span className="tkg-room-code-label">방 코드</span>
          <span className="tkg-room-code">{currentRoom?.code}</span>
          <button className="tkg-copy-btn" onClick={handleCopyCode}>
            {copied ? '✓ 복사됨' : '복사'}
          </button>
        </div>

        <div className="tkg-players-section">
          <h3 className="tkg-section-title">플레이어 ({players.length}/8)</h3>
          <div className="tkg-player-list">
            {players.map((p) => (
              <div key={p.id} className={`tkg-player-slot ${p.id === currentPlayer?.id ? 'tkg-player-me' : ''}`}>
                <span className="tkg-player-icon">{p.is_host ? '👑' : '🙂'}</span>
                <span className="tkg-player-name">{p.player_name}</span>
                {p.id === currentPlayer?.id && <span className="tkg-me-badge">나</span>}
              </div>
            ))}
          </div>
        </div>

        {currentPlayer?.is_host && (
          <>
            <div className="tkg-category-section">
              <h3 className="tkg-section-title">카테고리 선택</h3>
              <div className="tkg-category-options">
                {CATEGORY_OPTIONS.map((opt) => (
                  <label key={opt.value} className={`tkg-category-label ${category === opt.value ? 'tkg-category-selected' : ''}`}>
                    <input
                      type="radio"
                      name="category"
                      value={opt.value}
                      checked={category === opt.value}
                      onChange={() => setCategory(opt.value)}
                    />
                    <span className="tkg-category-emoji">{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="tkg-rounds-section">
              <h3 className="tkg-section-title">라운드 수</h3>
              <div className="tkg-rounds-options">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    className={`tkg-round-btn ${totalRounds === n ? 'tkg-round-selected' : ''}`}
                    onClick={() => setTotalRounds(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="tkg-error">{error}</p>}

            <button
              className="tkg-btn tkg-btn-start"
              onClick={handleStartGame}
              disabled={players.length < 2 || generating}
            >
              {generating ? '인물 생성 중...' : `게임 시작 🏆`}
            </button>
            {players.length < 2 && (
              <p className="tkg-hint-text">2명 이상이어야 시작할 수 있습니다</p>
            )}
          </>
        )}

        {!currentPlayer?.is_host && (
          <p className="tkg-waiting-text">방장이 게임을 시작하길 기다리는 중...</p>
        )}

        <AdBanner slot={import.meta.env.VITE_ADSENSE_SLOT_COBRA} className="tkg-ad-bottom" />
      </div>
    </div>
  );
}
