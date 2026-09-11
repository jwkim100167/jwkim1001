import React, { useState, useEffect, useRef } from 'react';
import { captureWord } from '../../services/supabaseTyping';
import './TypingGamePlay.css';

const PLAYER_COLORS = ['#00d2ff', '#f7971e', '#a18cd1', '#43e97b', '#f44369', '#f093fb'];

export default function TypingGamePlay({
  gameState,
  currentPlayer,
  players,
  roomId,
  isHost,
  onLeave,
  onRestart,
}) {
  const [input, setInput] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [flashWord, setFlashWord] = useState(null);
  const [wrongMsg, setWrongMsg] = useState(false); // 틀렸을 때 shake
  const inputRef = useRef(null);
  const wrongTimer = useRef(null);

  const words = gameState?.words || [];
  const scores = gameState?.scores || {};
  const phase = gameState?.phase;
  const mode = gameState?.options?.mode || 'all'; // 'all' | 'oneByOne'

  // 게임 시작 시 입력창 포커스
  useEffect(() => {
    if (phase === 'playing') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [phase]);

  // 클린업
  useEffect(() => () => clearTimeout(wrongTimer.current), []);

  const colorMap = {};
  players.forEach((p, i) => { colorMap[p.id] = PLAYER_COLORS[i % PLAYER_COLORS.length]; });

  const rankedPlayers = [...players].sort(
    (a, b) => (scores[b.id] || 0) - (scores[a.id] || 0)
  );

  // oneByOne 모드에서 현재 보여줄 단어 (첫 번째 미획득)
  const activeWord = mode === 'oneByOne'
    ? words.find(w => w.capturedBy === null) ?? null
    : null;

  const tryCapture = async (val) => {
    if (capturing || phase !== 'playing') return;
    const trimmed = val.trim();
    if (!trimmed) return;

    const targetWords = mode === 'oneByOne'
      ? (activeWord ? [activeWord] : [])
      : words.filter(w => w.capturedBy === null);

    const matched = targetWords.find(w => w.text === trimmed);

    if (!matched) {
      // 틀렸을 때: 입력 클리어 + 흔들기
      setInput('');
      setWrongMsg(true);
      clearTimeout(wrongTimer.current);
      wrongTimer.current = setTimeout(() => setWrongMsg(false), 700);
      return;
    }

    setCapturing(true);
    setInput('');
    try {
      await captureWord(roomId, matched.id, currentPlayer.id, currentPlayer.player_name);
      setFlashWord({ id: matched.id });
      setTimeout(() => setFlashWord(null), 600);
    } catch (err) {
      // already_captured: 조용히 무시
    } finally {
      setCapturing(false);
      inputRef.current?.focus();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      tryCapture(input);
    }
  };

  const capturedCount = words.filter(w => w.capturedBy !== null).length;

  return (
    <div className="tgp-wrap" onClick={() => inputRef.current?.focus()}>

      {/* 점수판 */}
      <div className="tgp-scoreboard">
        <div className="tgp-scoreboard-title">점수판</div>
        {rankedPlayers.map((p, rank) => (
          <div key={p.id} className={`tgp-score-row ${p.id === currentPlayer.id ? 'tgp-score-me' : ''}`}>
            <span className="tgp-score-rank">#{rank + 1}</span>
            <span className="tgp-score-dot" style={{ background: colorMap[p.id] || '#fff' }} />
            <span className="tgp-score-name">{p.player_name}</span>
            <span className="tgp-score-pts" style={{ color: colorMap[p.id] || '#fff' }}>
              {scores[p.id] || 0}점
            </span>
          </div>
        ))}
        <div className="tgp-progress">{capturedCount} / {words.length} 획득</div>
      </div>

      {/* ── ALL 모드: 단어 필드 ── */}
      {mode === 'all' && (
        <div className="tgp-field">
          {words.map((word) => {
            const isCaptured = word.capturedBy !== null;
            const isFlashing = flashWord?.id === word.id;
            const captureColor = isCaptured ? (colorMap[word.capturedBy] || '#aaa') : null;

            return (
              <div
                key={word.id}
                className={`tgp-word ${isCaptured ? 'tgp-word-captured' : ''} ${isFlashing ? 'tgp-word-flash' : ''}`}
                style={{
                  left: `${word.x}%`,
                  top: `${word.y}%`,
                  fontSize: `${word.fontSize}px`,
                  fontWeight: word.fontWeight || 400,
                  transform: `rotate(${word.rotation}deg)`,
                  '--capture-color': captureColor,
                }}
              >
                <span className="tgp-word-text">{word.text}</span>
                {isCaptured && <span className="tgp-word-pts">+{word.points}</span>}
                {isCaptured && word.capturedBy_name && (
                  <span className="tgp-word-owner" style={{ color: captureColor }}>
                    {word.capturedBy_name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── ONEBYONE 모드: 현재 단어 중앙 표시 ── */}
      {mode === 'oneByOne' && (
        <div className="tgp-onebyone-field">
          {/* 진행 상황 */}
          <div className="tgp-ob-progress">
            {words.map((w, i) => (
              <div
                key={i}
                className={`tgp-ob-dot ${w.capturedBy !== null ? 'done' : i === words.findIndex(x => x.capturedBy === null) ? 'active' : ''}`}
                style={w.capturedBy !== null ? { background: colorMap[w.capturedBy] || '#aaa' } : {}}
              />
            ))}
          </div>

          {/* 현재 단어 */}
          {activeWord && (
            <div
              key={activeWord.id}
              className={`tgp-ob-word ${flashWord?.id === activeWord.id ? 'tgp-ob-flash' : ''}`}
              style={{ transform: `rotate(${activeWord.rotation}deg)` }}
            >
              <div
                className="tgp-ob-text"
                style={{ fontSize: `${activeWord.fontSize * 2.2}px`, fontWeight: activeWord.fontWeight || 400 }}
              >
                {activeWord.text}
              </div>
              <div className="tgp-ob-points">{activeWord.points}점</div>
            </div>
          )}

          {/* 획득된 단어들 */}
          <div className="tgp-ob-captured-list">
            {words.filter(w => w.capturedBy !== null).map(w => (
              <span
                key={w.id}
                className="tgp-ob-captured-item"
                style={{ color: colorMap[w.capturedBy] || '#aaa' }}
              >
                {w.text} <span>+{w.points}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 입력창 */}
      {phase === 'playing' && (
        <div className="tgp-input-bar">
          <input
            ref={inputRef}
            className={`tgp-input ${wrongMsg ? 'tgp-input-wrong' : ''}`}
            type="text"
            placeholder="음식 이름 입력 후 Enter"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <div className={`tgp-input-hint ${wrongMsg ? 'tgp-hint-wrong' : ''}`}>
            {wrongMsg ? '❌ 틀렸습니다! 다시 시도하세요' : 'Enter를 눌러 제출'}
          </div>
        </div>
      )}

      {/* 게임 종료 오버레이 */}
      {phase === 'ended' && (
        <div className="tgp-end-overlay">
          <div className="tgp-end-dialog">
            <div className="tgp-end-icon">🎉</div>
            <h2 className="tgp-end-title">게임 종료!</h2>
            <div className="tgp-end-scores">
              {rankedPlayers.map((p, rank) => (
                <div key={p.id} className={`tgp-end-row ${rank === 0 ? 'tgp-end-winner' : ''}`}>
                  <span className="tgp-end-rank">
                    {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}
                  </span>
                  <span className="tgp-end-name" style={{ color: colorMap[p.id] }}>
                    {p.player_name}{p.id === currentPlayer.id && ' (나)'}
                  </span>
                  <span className="tgp-end-pts">{scores[p.id] || 0}점</span>
                </div>
              ))}
            </div>
            <div className="tgp-end-actions">
              {isHost
                ? <button className="tgp-btn tgp-btn-primary" onClick={onRestart}>다시 하기</button>
                : <p className="tgp-waiting-host">방장이 다시 시작하기를 누를 때까지 기다려주세요</p>
              }
              <button className="tgp-btn tgp-btn-leave" onClick={onLeave}>나가기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
