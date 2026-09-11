import React, { useState, useEffect, useRef } from 'react';
import {
  submitQuestion,
  answerQuestion,
  triggerGuessing,
  submitGuess,
  revealAnswer,
} from '../../services/supabaseAkinator';
import './AkinatorGamePlay.css';

const PLAYER_COLORS = ['#a78bfa', '#f472b6', '#34d399', '#fb923c', '#60a5fa', '#facc15', '#f87171', '#a3e635'];
const ANSWER_LABELS = { yes: '예', no: '아니오', maybe: '모름' };
const ANSWER_COLORS = { yes: '#34d399', no: '#f87171', maybe: '#facc15' };

export default function AkinatorGamePlay({
  gameState,
  currentPlayer,
  players,
  roomId,
  isHost,
  onLeave,
  onRestart,
}) {
  const [questionInput, setQuestionInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [guessResult, setGuessResult] = useState(null); // 'correct' | 'wrong'
  const inputRef = useRef(null);

  const phase = gameState?.phase;
  const character = gameState?.character;
  const questions = gameState?.questions || [];
  const guesses = gameState?.guesses || {};
  const scores = gameState?.scores || {};
  const maxQuestions = gameState?.maxQuestions || 20;
  const answeredCount = questions.filter(q => q.answer !== null).length;
  const unansweredQuestions = questions.filter(q => q.answer === null);
  const myGuess = guesses[currentPlayer?.id];

  const colorMap = {};
  players.forEach((p, i) => { colorMap[p.id] = PLAYER_COLORS[i % PLAYER_COLORS.length]; });

  const rankedPlayers = [...players]
    .filter(p => !p.is_host)
    .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

  useEffect(() => {
    if (phase === 'guessing' && !myGuess && !isHost) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [phase, myGuess, isHost]);

  const handleSubmitQuestion = async () => {
    if (!questionInput.trim() || submitting) return;
    setSubmitting(true);
    try {
      await submitQuestion(roomId, currentPlayer.id, currentPlayer.player_name, questionInput.trim());
      setQuestionInput('');
    } catch { /* ignore */ } finally {
      setSubmitting(false);
    }
  };

  const handleAnswer = async (questionId, answer) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await answerQuestion(roomId, questionId, answer);
    } catch { /* ignore */ } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerGuessing = async () => {
    if (submitting) return;
    setSubmitting(true);
    try { await triggerGuessing(roomId); }
    catch { /* ignore */ } finally { setSubmitting(false); }
  };

  const handleSubmitGuess = async () => {
    if (!guessInput.trim() || submitting || myGuess) return;
    setSubmitting(true);
    try {
      await submitGuess(roomId, currentPlayer.id, currentPlayer.player_name, guessInput.trim(), players.length);
      const correct = guessInput.trim().toLowerCase() === character.name.toLowerCase() ||
        guessInput.trim() === character.name;
      setGuessResult(correct ? 'correct' : 'wrong');
    } catch { /* ignore */ } finally {
      setSubmitting(false);
    }
  };

  const handleReveal = async () => {
    if (submitting) return;
    setSubmitting(true);
    try { await revealAnswer(roomId); }
    catch { /* ignore */ } finally { setSubmitting(false); }
  };

  // ── 공통: 질문/답변 로그 ─────────────────────────────
  const QALog = () => (
    <div className="akp-qa-log">
      {questions.length === 0 && (
        <div className="akp-qa-empty">아직 질문이 없습니다. 질문을 던져보세요!</div>
      )}
      {questions.map((q, i) => (
        <div key={q.id} className="akp-qa-item">
          <div className="akp-qa-question">
            <span className="akp-qa-num">Q{i + 1}.</span>
            <span className="akp-qa-asker" style={{ color: colorMap[q.asker_id] || '#fff' }}>
              {q.asker_name}:
            </span>
            <span className="akp-qa-text">{q.text}</span>
          </div>
          {q.answer ? (
            <div className="akp-qa-answer" style={{ color: ANSWER_COLORS[q.answer] }}>
              → {ANSWER_LABELS[q.answer]}
            </div>
          ) : (
            <div className="akp-qa-pending">→ 답변 대기 중...</div>
          )}
        </div>
      ))}
    </div>
  );

  // ── PLAYING 단계 ─────────────────────────────────────
  if (phase === 'playing') {
    return (
      <div className="akp-wrap">
        {/* 진행 상황 바 */}
        <div className="akp-progress-bar-wrap">
          <div className="akp-progress-bar-label">
            질문 {answeredCount} / {maxQuestions}
          </div>
          <div className="akp-progress-bar">
            <div
              className="akp-progress-fill"
              style={{ width: `${(answeredCount / maxQuestions) * 100}%` }}
            />
          </div>
        </div>

        <div className="akp-layout">
          {/* 왼쪽 패널 */}
          <div className="akp-left">

            {/* 방장: 인물 카드 */}
            {isHost && character && (
              <div className="akp-character-card">
                <div className="akp-char-badge">당신의 인물</div>
                <div className="akp-char-category">{character.category} · {character.nationality}</div>
                <div className="akp-char-name">{character.name}</div>
                <div className="akp-char-desc">{character.description}</div>
              </div>
            )}

            {/* 방장이 아닌 경우: 질문 입력 */}
            {!isHost && (
              <div className="akp-question-box">
                <div className="akp-qbox-title">❓ 질문하기</div>
                <div className="akp-qbox-hint">Yes / No 로 답할 수 있는 질문을 해보세요</div>
                <div className="akp-qbox-row">
                  <input
                    className="akp-q-input"
                    type="text"
                    placeholder="예) 이 사람은 한국인인가요?"
                    value={questionInput}
                    onChange={e => setQuestionInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmitQuestion()}
                    maxLength={60}
                    autoComplete="off"
                  />
                  <button
                    className="akp-btn akp-btn-question"
                    onClick={handleSubmitQuestion}
                    disabled={submitting || !questionInput.trim()}
                  >
                    전송
                  </button>
                </div>
              </div>
            )}

            {/* 방장: 미답변 질문 처리 */}
            {isHost && unansweredQuestions.length > 0 && (
              <div className="akp-answer-box">
                <div className="akp-abox-title">📨 답변 대기 질문</div>
                {unansweredQuestions.map(q => (
                  <div key={q.id} className="akp-answer-item">
                    <div className="akp-answer-text">
                      <span style={{ color: colorMap[q.asker_id] || '#fff' }}>{q.asker_name}</span>: {q.text}
                    </div>
                    <div className="akp-answer-btns">
                      <button className="akp-ans-btn akp-ans-yes" onClick={() => handleAnswer(q.id, 'yes')}>예</button>
                      <button className="akp-ans-btn akp-ans-no" onClick={() => handleAnswer(q.id, 'no')}>아니오</button>
                      <button className="akp-ans-btn akp-ans-maybe" onClick={() => handleAnswer(q.id, 'maybe')}>모름</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 방장: 맞히기 단계로 넘기기 */}
            {isHost && (
              <button
                className="akp-btn akp-btn-trigger"
                onClick={handleTriggerGuessing}
                disabled={submitting}
              >
                💡 이제 맞혀보세요
              </button>
            )}

            {!isHost && (
              <div className="akp-waiting-host">
                <span className="akp-spinner" />
                방장이 질문에 답변하고 있습니다...
              </div>
            )}
          </div>

          {/* 오른쪽: Q&A 로그 */}
          <div className="akp-right">
            <div className="akp-qa-title">💬 Q&A 기록</div>
            <QALog />
          </div>
        </div>

        <button className="akp-leave-btn" onClick={onLeave}>나가기</button>
      </div>
    );
  }

  // ── GUESSING 단계 ────────────────────────────────────
  if (phase === 'guessing') {
    return (
      <div className="akp-wrap">
        <div className="akp-phase-banner akp-phase-guessing">🤔 이제 정답을 맞혀보세요!</div>

        <div className="akp-layout">
          <div className="akp-left">
            {/* 방장: 인물 카드 + 정답 공개 버튼 */}
            {isHost && character && (
              <>
                <div className="akp-character-card">
                  <div className="akp-char-badge">정답 인물</div>
                  <div className="akp-char-category">{character.category} · {character.nationality}</div>
                  <div className="akp-char-name">{character.name}</div>
                  <div className="akp-char-desc">{character.description}</div>
                </div>
                <button className="akp-btn akp-btn-trigger" onClick={handleReveal} disabled={submitting}>
                  📢 정답 공개하기
                </button>
              </>
            )}

            {/* 플레이어: 정답 입력 */}
            {!isHost && !myGuess && (
              <div className="akp-guess-box">
                <div className="akp-gbox-title">💡 정답을 맞혀보세요!</div>
                <div className="akp-gbox-hint">인물의 정확한 이름을 입력하세요</div>
                <div className="akp-qbox-row">
                  <input
                    ref={inputRef}
                    className={`akp-q-input ${guessResult === 'wrong' ? 'akp-input-wrong' : ''}`}
                    type="text"
                    placeholder="인물 이름 입력 후 Enter"
                    value={guessInput}
                    onChange={e => { setGuessInput(e.target.value); setGuessResult(null); }}
                    onKeyDown={e => e.key === 'Enter' && handleSubmitGuess()}
                    maxLength={30}
                    autoComplete="off"
                  />
                  <button
                    className="akp-btn akp-btn-question"
                    onClick={handleSubmitGuess}
                    disabled={submitting || !guessInput.trim()}
                  >
                    제출
                  </button>
                </div>
                {guessResult === 'wrong' && (
                  <div className="akp-guess-wrong">❌ 틀렸습니다! 다시 시도해보세요.</div>
                )}
              </div>
            )}

            {/* 이미 제출한 경우 */}
            {!isHost && myGuess && (
              <div className="akp-submitted-box">
                {myGuess.correct
                  ? <div className="akp-submit-correct">✅ 정답! 다른 플레이어를 기다리는 중...</div>
                  : <div className="akp-submit-wrong">❌ 틀렸습니다. 방장이 정답을 공개할 때까지 기다려주세요.</div>
                }
              </div>
            )}

            {/* 제출 현황 */}
            <div className="akp-guess-status">
              <div className="akp-status-title">제출 현황</div>
              {players.filter(p => !p.is_host).map(p => (
                <div key={p.id} className="akp-status-row">
                  <span className="akp-status-dot" style={{ background: colorMap[p.id] || '#aaa' }} />
                  <span className="akp-status-name">{p.player_name}</span>
                  <span className="akp-status-state">
                    {guesses[p.id] ? (guesses[p.id].correct ? '✅ 정답!' : '❌ 제출') : '⏳ 대기 중'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="akp-right">
            <div className="akp-qa-title">💬 Q&A 기록</div>
            <QALog />
          </div>
        </div>

        <button className="akp-leave-btn" onClick={onLeave}>나가기</button>
      </div>
    );
  }

  // ── ENDED 단계 ───────────────────────────────────────
  if (phase === 'ended') {
    return (
      <div className="akp-wrap">
        <div className="akp-end-overlay">
          <div className="akp-end-dialog">
            <div className="akp-end-icon">🎭</div>
            <h2 className="akp-end-title">정답은...</h2>

            {character && (
              <div className="akp-end-character">
                <div className="akp-end-char-category">{character.category} · {character.nationality}</div>
                <div className="akp-end-char-name">{character.name}</div>
                <div className="akp-end-char-desc">{character.description}</div>
              </div>
            )}

            <div className="akp-end-scores">
              <div className="akp-end-scores-title">최종 점수</div>
              {rankedPlayers.length === 0 && (
                <div className="akp-end-no-scores">점수 없음</div>
              )}
              {rankedPlayers.map((p, rank) => (
                <div key={p.id} className={`akp-end-row ${rank === 0 && (scores[p.id] || 0) > 0 ? 'akp-end-winner' : ''}`}>
                  <span className="akp-end-rank">
                    {rank === 0 && (scores[p.id] || 0) > 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}
                  </span>
                  <span className="akp-end-name" style={{ color: colorMap[p.id] }}>
                    {p.player_name}
                    {p.id === currentPlayer?.id && ' (나)'}
                  </span>
                  <span className="akp-end-pts">{scores[p.id] || 0}점</span>
                  {guesses[p.id] && (
                    <span className={`akp-end-guess ${guesses[p.id].correct ? 'correct' : 'wrong'}`}>
                      {guesses[p.id].correct ? '✅' : `"${guesses[p.id].guess}"`}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="akp-end-actions">
              {isHost
                ? <button className="akp-btn akp-btn-primary" onClick={onRestart}>다시 하기</button>
                : <p className="akp-waiting-host">방장이 다시 시작하기를 누를 때까지 기다려주세요</p>
              }
              <button className="akp-btn akp-btn-leave" onClick={onLeave}>나가기</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
