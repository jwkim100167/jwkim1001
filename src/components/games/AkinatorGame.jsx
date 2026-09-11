import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  createRoom,
  joinRoom,
  getRoomPlayers,
  getRoomData,
  leaveRoom,
  deleteRoom,
  startGame,
  resetToWaiting,
  subscribeToRoom,
  unsubscribeFromRoom,
  MAX_PLAYERS,
} from '../../services/supabaseAkinator';
import AkinatorGamePlay from './AkinatorGamePlay';
import akinatorData from '../../data/akinatorData.json';
import './AkinatorGame.css';

const PLAYER_COLORS = ['#a78bfa', '#f472b6', '#34d399', '#fb923c', '#60a5fa', '#facc15', '#f87171', '#a3e635'];

function pickRandomCharacter() {
  const list = akinatorData.characters;
  return list[Math.floor(Math.random() * list.length)];
}

export default function AkinatorGame() {
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
  const [showSoloConfirm, setShowSoloConfirm] = useState(false);
  const [options, setOptions] = useState({ maxQuestions: 20 });

  const channelRef = useRef(null);

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
    setError('');
    setView('lobby');
  };

  const handleStartClick = () => {
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
      const character = pickRandomCharacter();
      await startGame(currentRoom.id, character, options);
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

  // ── 게임 진행 중 ──────────────────────────────────────
  const gameState = roomData?.game_state;
  const phase = gameState?.phase;
  if (view === 'waiting' && (phase === 'playing' || phase === 'guessing' || phase === 'ended')) {
    return (
      <AkinatorGamePlay
        gameState={gameState}
        currentPlayer={currentPlayer}
        players={players}
        roomId={currentRoom.id}
        isHost={currentPlayer?.is_host}
        onLeave={handleLeave}
        onRestart={async () => {
          try { await resetToWaiting(currentRoom.id); } catch { /* ignore */ }
        }}
      />
    );
  }

  // ── 로그인 유도 모달 ──────────────────────────────────
  const loginPromptDialog = showLoginPrompt && (
    <div className="ak-modal-overlay">
      <div className="ak-modal-dialog">
        <p className="ak-modal-msg">방 만들기는 로그인이 필요합니다.{'\n'}로그인하시겠습니까?</p>
        <div className="ak-modal-btns">
          <button className="ak-btn ak-btn-secondary" onClick={() => setShowLoginPrompt(false)}>취소</button>
          <button className="ak-btn ak-btn-primary" onClick={() => navigate('/login')}>로그인</button>
        </div>
      </div>
    </div>
  );

  // ── 솔로 확인 모달 ────────────────────────────────────
  const soloConfirmDialog = showSoloConfirm && (
    <div className="ak-modal-overlay">
      <div className="ak-modal-dialog">
        <div className="ak-modal-icon">🎭</div>
        <p className="ak-modal-title">혼자서 플레이합니다</p>
        <p className="ak-modal-msg">현재 방에 혼자 있습니다.{'\n'}혼자서 플레이를 시작하시겠습니까?</p>
        <div className="ak-modal-btns">
          <button className="ak-btn ak-btn-secondary" onClick={() => setShowSoloConfirm(false)}>취소</button>
          <button className="ak-btn ak-btn-primary" onClick={doStartGame}>시작하기</button>
        </div>
      </div>
    </div>
  );

  // ── LOBBY ─────────────────────────────────────────────
  if (view === 'lobby') {
    return (
      <div className="ak-wrap">
        {loginPromptDialog}
        <button className="ak-back-btn" onClick={() => navigate('/')}>← 홈으로</button>
        <div className="ak-container">
          <div className="ak-logo">
            <div className="ak-logo-icon">🎭</div>
            <h1 className="ak-title">아키네이터</h1>
            <p className="ak-subtitle">Yes / No 질문으로 인물을 맞혀보세요</p>
          </div>
          <div className="ak-desc-box">
            <div className="ak-desc-item">🎯 방장이 비밀 인물을 확인합니다</div>
            <div className="ak-desc-item">❓ 나머지 플레이어가 Yes/No 질문을 던집니다</div>
            <div className="ak-desc-item">💡 최대 {options.maxQuestions}번의 질문 후 정답을 맞힙니다</div>
            <div className="ak-desc-item">🏆 정답을 맞히면 점수 획득! 첫 번째 정답은 보너스!</div>
          </div>
          <div className="ak-lobby-actions">
            <button className="ak-btn ak-btn-primary" onClick={() => isAuthenticated ? setView('create') : setShowLoginPrompt(true)}>
              <span className="ak-btn-icon">+</span>방 만들기
            </button>
            <button className="ak-btn ak-btn-secondary" onClick={() => setView('join')}>
              <span className="ak-btn-icon">→</span>방 입장하기
            </button>
          </div>
          <div className="ak-info">
            <div className="ak-info-item">
              <span className="ak-info-num">1~{MAX_PLAYERS}</span>
              <span className="ak-info-label">인원</span>
            </div>
            <div className="ak-info-divider" />
            <div className="ak-info-item">
              <span className="ak-info-num">100명</span>
              <span className="ak-info-label">인물 풀</span>
            </div>
            <div className="ak-info-divider" />
            <div className="ak-info-item">
              <span className="ak-info-num">20Q</span>
              <span className="ak-info-label">최대 질문</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── CREATE ────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div className="ak-wrap">
        {loginPromptDialog}
        <button className="ak-back-btn" onClick={goToLobby}>← 뒤로</button>
        <div className="ak-container ak-container-sm">
          <div className="ak-form-header">
            <div className="ak-form-icon">🏠</div>
            <h2>방 만들기</h2>
            <p>이름을 입력하면 방이 생성됩니다.</p>
          </div>
          <div className="ak-form">
            <label className="ak-label">닉네임</label>
            <input
              className="ak-input"
              type="text"
              placeholder="이름 입력 (최대 8자)"
              value={playerName}
              onChange={(e) => { setPlayerName(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
              maxLength={8}
              autoFocus
            />
            {error && <div className="ak-error">{error}</div>}
            <button className="ak-btn ak-btn-primary ak-btn-full" onClick={handleCreateRoom} disabled={loading}>
              {loading ? '생성 중...' : '방 만들기'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── JOIN ──────────────────────────────────────────────
  if (view === 'join') {
    return (
      <div className="ak-wrap">
        <button className="ak-back-btn" onClick={goToLobby}>← 뒤로</button>
        <div className="ak-container ak-container-sm">
          <div className="ak-form-header">
            <div className="ak-form-icon">🔑</div>
            <h2>방 입장하기</h2>
            <p>공유받은 방 코드를 입력하세요.</p>
          </div>
          <div className="ak-form">
            <label className="ak-label">방 코드</label>
            <input
              className="ak-input ak-input-code"
              type="text"
              placeholder="XXXXXX"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setError(''); }}
              maxLength={6}
              autoFocus
            />
            <label className="ak-label">닉네임</label>
            <input
              className="ak-input"
              type="text"
              placeholder="이름 입력 (최대 8자)"
              value={playerName}
              onChange={(e) => { setPlayerName(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              maxLength={8}
            />
            {error && <div className="ak-error">{error}</div>}
            <button className="ak-btn ak-btn-secondary ak-btn-full" onClick={handleJoinRoom} disabled={loading}>
              {loading ? '입장 중...' : '입장하기'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── WAITING ───────────────────────────────────────────
  if (view === 'waiting' && currentRoom && currentPlayer) {
    const isHost = currentPlayer.is_host;

    return (
      <div className="ak-wrap ak-wrap-waiting">
        {soloConfirmDialog}
        <div className="ak-waiting-layout">

          {/* 왼쪽: 방 정보 + 플레이어 */}
          <div className="ak-waiting-left">
            <div className="ak-room-header">
              <p className="ak-room-label">방 코드</p>
              <div className="ak-room-code-row">
                <span className="ak-room-code">{currentRoom.code}</span>
                <button className="ak-copy-btn" onClick={handleCopyCode}>
                  {copied ? '복사됨!' : '복사'}
                </button>
              </div>
              <p className="ak-room-hint">이 코드를 친구에게 공유하세요</p>
            </div>

            <div className="ak-players-section">
              <div className="ak-players-header">
                <span>플레이어</span>
                <span className="ak-player-count">{players.length} / {MAX_PLAYERS}</span>
              </div>
              <div className="ak-player-slots">
                {Array.from({ length: MAX_PLAYERS }).map((_, idx) => {
                  const p = players[idx];
                  return (
                    <div
                      key={idx}
                      className={`ak-player-slot ${p ? 'occupied' : 'empty'} ${p?.id === currentPlayer.id ? 'me' : ''}`}
                      style={p ? { borderLeftColor: PLAYER_COLORS[idx] } : {}}
                    >
                      {p ? (
                        <>
                          <span className="ak-player-avatar" style={{ background: PLAYER_COLORS[idx] }}>
                            {p.player_name[0].toUpperCase()}
                          </span>
                          <span className="ak-player-name">
                            {p.player_name}
                            {p.id === currentPlayer.id && <span className="ak-me-badge">나</span>}
                          </span>
                          {p.is_host && <span className="ak-host-badge">방장</span>}
                        </>
                      ) : (
                        <>
                          <span className="ak-player-avatar empty-avatar">?</span>
                          <span className="ak-player-name empty-name">대기 중...</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 게임 옵션 (방장만) */}
            {isHost && (
              <div className="ak-options-section">
                <div className="ak-options-title">게임 옵션</div>
                <div className="ak-option-row">
                  <div className="ak-option-info">
                    <div className="ak-option-name">❓ 최대 질문 수</div>
                    <div className="ak-option-desc">{options.maxQuestions}번 질문 후 정답 맞히기</div>
                  </div>
                  <div className="ak-count-btns">
                    {[10, 15, 20].map(n => (
                      <button
                        key={n}
                        className={`ak-count-btn ${options.maxQuestions === n ? 'ak-count-btn-on' : ''}`}
                        onClick={() => setOptions(o => ({ ...o, maxQuestions: n }))}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && <div className="ak-error">{error}</div>}

            <div className="ak-waiting-actions">
              {isHost && (
                <button className="ak-btn ak-btn-start" onClick={handleStartClick} disabled={loading}>
                  {loading ? '시작 중...' : '🎭 게임 시작!'}
                </button>
              )}
              {!isHost && (
                <div className="ak-waiting-msg">
                  <span className="ak-spinner" />
                  방장이 게임을 시작할 예정입니다...
                </div>
              )}
              <button className="ak-btn ak-btn-leave" onClick={handleLeave}>
                {isHost ? '방 삭제하고 나가기' : '방 나가기'}
              </button>
            </div>
          </div>

          {/* 오른쪽: 게임 소개 */}
          <div className="ak-waiting-right">
            <div className="ak-how-to">
              <div className="ak-how-title">🎭 아키네이터 방법</div>
              <div className="ak-how-step">
                <span className="ak-step-num">1</span>
                <div>
                  <strong>방장</strong>이 비밀 인물 카드를 받습니다.<br />
                  <small>인물 이름과 설명을 확인하세요.</small>
                </div>
              </div>
              <div className="ak-how-step">
                <span className="ak-step-num">2</span>
                <div>
                  <strong>다른 플레이어</strong>가 Yes/No 질문을 던집니다.<br />
                  <small>예) "이 사람은 한국인인가요?"</small>
                </div>
              </div>
              <div className="ak-how-step">
                <span className="ak-step-num">3</span>
                <div>
                  <strong>방장</strong>이 각 질문에 답합니다.<br />
                  <small>예, 아니오, 모름 중 하나를 선택하세요.</small>
                </div>
              </div>
              <div className="ak-how-step">
                <span className="ak-step-num">4</span>
                <div>
                  질문이 끝나면 <strong>정답을 맞힙니다!</strong><br />
                  <small>정확한 인물 이름을 입력하세요. 첫 번째 정답자 보너스 있음!</small>
                </div>
              </div>
              <div className="ak-score-info">
                <span>🥇 첫 번째 정답</span><span className="ak-score-pts">15점</span>
                <span>✅ 정답</span><span className="ak-score-pts">10점</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return null;
}
