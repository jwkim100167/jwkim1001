import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../supabaseClient';
import {
  createRoom,
  joinRoom,
  getRoomPlayers,
  getRoomData,
  leaveRoom,
  deleteRoom,
  promoteToHost,
  startGame,
  resetGame,
  subscribeToRoom,
  unsubscribeFromRoom,
} from '../../../services/games/supabaseBlokus';
import BlokusPlay from './BlokusPlay';
import './BlokusGame.css';

const TIMER_OPTIONS = [20, 30, 60];

export default function BlokusGame() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [view, setView] = useState('lobby'); // 'lobby' | 'waiting'
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [players, setPlayers] = useState([]);
  const [roomData, setRoomData] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [onlinePlayerIds, setOnlinePlayerIds] = useState(null);
  const channelRef = useRef(null);
  const presenceChannelRef = useRef(null);
  const currentPlayerRef = useRef(null);
  useEffect(() => { currentPlayerRef.current = currentPlayer; }, [currentPlayer]);

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

        // 호스트 이탈 시 첫 번째 플레이어가 자동 승계
        const self = currentPlayerRef.current;
        if (self) {
          const freshSelf = playersData.find((p) => p.id === self.id);
          if (freshSelf && freshSelf.is_host !== self.is_host) {
            setCurrentPlayer(freshSelf);
            currentPlayerRef.current = freshSelf;
          }
          const hasHost = playersData.some((p) => p.is_host);
          if (!hasHost && playersData.length > 0 && freshSelf && playersData[0].id === freshSelf.id) {
            await promoteToHost(freshSelf.id);
          }
        }
      } catch { /* ignore */ }
    };
    loadAll();
    channelRef.current = subscribeToRoom(currentRoom.id, loadAll, handleRoomDeleted);
    return () => {
      unsubscribeFromRoom(channelRef.current);
      channelRef.current = null;
    };
  }, [currentRoom]);

  // Presence 추적
  useEffect(() => {
    if (!currentRoom || !currentPlayer) { setOnlinePlayerIds(null); return; }
    if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current);
    const channel = supabase.channel(`presence:blokus:${currentRoom.id}`, {
      config: { presence: { key: currentPlayer.id } },
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        const ids = Object.keys(channel.presenceState());
        setOnlinePlayerIds(ids.length > 0 ? ids : null);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ online: true });
      });
    presenceChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); presenceChannelRef.current = null; };
  }, [currentRoom?.id, currentPlayer?.id]);

  function handleRoomDeleted() {
    setCurrentRoom(null);
    setCurrentPlayer(null);
    setPlayers([]);
    setRoomData(null);
    setView('lobby');
    setShowJoinInput(false);
    setError('방이 삭제되었습니다.');
  }

  // 페이지 이탈 시 정리
  useEffect(() => {
    if (!currentPlayer) return;
    const handleBeforeUnload = () => leaveRoom(currentPlayer.id);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentPlayer]);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) { setError('닉네임을 입력해주세요.'); return; }
    if (playerName.trim().length > 8) { setError('닉네임은 8자 이하로 입력해주세요.'); return; }
    setLoading(true); setError('');
    try {
      const { room, player } = await createRoom(playerName.trim(), user?.loginId || null);
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
      const { room, player } = await joinRoom(joinCode.trim(), playerName.trim(), user?.loginId || null);
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
    setShowJoinInput(false);
  };

  const handleLeaveToHome = async () => {
    if (currentPlayer) {
      try {
        await leaveRoom(currentPlayer.id);
        if (currentPlayer.is_host && currentRoom) await deleteRoom(currentRoom.id);
      } catch { /* ignore */ }
    }
    navigate('/');
  };

  const handleStartGame = async () => {
    if (players.length < 2) { setError('2명 이상이어야 게임을 시작할 수 있습니다.'); return; }
    setLoading(true); setError('');
    try {
      await startGame(currentRoom.id, players, timerSeconds);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleResetGame = async () => {
    if (!currentRoom) return;
    try {
      await resetGame(currentRoom.id);
    } catch (e) {
      setError(e.message);
    }
  };

  // 게임 진행 중이면 BlokusPlay 렌더링
  const gameState = roomData?.game_state;
  if (gameState?.phase === 'playing' || gameState?.phase === 'ended') {
    // Fetch updated player colors from players state
    const playersWithColors = players;
    return (
      <BlokusPlay
        gameState={gameState}
        currentPlayer={currentPlayer}
        players={playersWithColors}
        roomId={currentRoom.id}
        onResetGame={currentPlayer?.is_host ? handleResetGame : null}
        onlinePlayerIds={onlinePlayerIds}
        onLeaveToRoom={handleLeave}
        onLeaveToHome={handleLeaveToHome}
      />
    );
  }

  // ─── LOBBY ───
  if (view === 'lobby') {
    return (
      <div className="blk-page">
        <div className="blk-container">
          <button className="blk-back-btn" onClick={() => navigate('/mini-arcade')}>← 뒤로</button>
          <div className="blk-header">
            <div className="blk-icon">🟦</div>
            <h1>블로커스</h1>
            <p className="blk-subtitle">전략 타일 배치 대결 (2~4인)</p>
          </div>
          <div className="blk-form">
            <input
              className="blk-input"
              placeholder="닉네임 (최대 8자)"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={8}
              onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleCreateRoom()}
            />
            {showJoinInput && (
              <input
                className="blk-input"
                placeholder="방 코드 6자리"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleJoinRoom()}
                autoFocus
              />
            )}
            {error && <p className="blk-error">{error}</p>}
            <div className="blk-lobby-actions">
              <button
                className="blk-btn blk-btn-primary"
                onClick={handleCreateRoom}
                disabled={loading}
              >
                {loading ? '처리 중...' : '방 만들기'}
              </button>
              <button
                className="blk-btn blk-btn-secondary"
                onClick={showJoinInput ? handleJoinRoom : () => { setShowJoinInput(true); setError(''); }}
                disabled={loading}
              >
                {loading ? '처리 중...' : showJoinInput ? '입장하기' : '방 입장하기'}
              </button>
            </div>
          </div>

          <div className="blk-rules">
            <h3>게임 소개</h3>
            <ul>
              <li>20×20 보드에 타일을 번갈아 배치합니다.</li>
              <li>자신의 타일과 <strong>꼭짓점(대각선)</strong>으로만 이어야 합니다.</li>
              <li>자신의 타일과 <strong>변(상하좌우)</strong>으로는 맞닿으면 안 됩니다.</li>
              <li>더 이상 배치할 수 없으면 기권. 남은 칸 수만큼 감점!</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ─── WAITING ROOM ───
  return (
    <div className="blk-page">
      <div className="blk-container blk-container--wide">
        <button className="blk-back-btn" onClick={handleLeave}>← 나가기</button>

        <div className="blk-room-code-row">
          <span className="blk-room-code-label">방 코드</span>
          <span className="blk-room-code">{currentRoom?.code}</span>
          <button className="blk-copy-btn" onClick={handleCopyCode}>
            {copied ? '✓ 복사됨' : '복사'}
          </button>
        </div>

        <div className="blk-players-section">
          <h3 className="blk-section-title">플레이어 ({players.length}/4)</h3>
          <div className="blk-player-list">
            {players.map((p) => (
              <div key={p.id} className={`blk-player-slot ${p.id === currentPlayer?.id ? 'blk-player-me' : ''}`}>
                <span className="blk-player-icon">{p.is_host ? '👑' : '🙂'}</span>
                <span className="blk-player-name">{p.player_name}</span>
                {p.id === currentPlayer?.id && <span className="blk-me-badge">나</span>}
              </div>
            ))}
            {Array.from({ length: Math.max(0, 2 - players.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="blk-player-slot blk-player-empty">
                <span className="blk-player-icon">⬜</span>
                <span className="blk-player-name blk-waiting-dots">대기 중...</span>
              </div>
            ))}
          </div>
        </div>

        {currentPlayer?.is_host && (
          <>
            <div className="blk-timer-section">
              <h3 className="blk-section-title">턴 타이머</h3>
              <div className="blk-timer-options">
                {TIMER_OPTIONS.map((sec) => (
                  <button
                    key={sec}
                    className={`blk-timer-btn ${timerSeconds === sec ? 'blk-timer-selected' : ''}`}
                    onClick={() => setTimerSeconds(sec)}
                  >
                    {sec}초
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="blk-error">{error}</p>}

            <button
              className="blk-btn blk-btn-start"
              onClick={handleStartGame}
              disabled={players.length < 2 || loading}
            >
              {loading ? '시작 중...' : '게임 시작 🟦'}
            </button>
            {players.length < 2 && (
              <p className="blk-hint-text">2명 이상이어야 시작할 수 있습니다</p>
            )}
          </>
        )}

        {!currentPlayer?.is_host && (
          <p className="blk-waiting-text">방장이 게임을 시작하길 기다리는 중...</p>
        )}
      </div>
    </div>
  );
}
