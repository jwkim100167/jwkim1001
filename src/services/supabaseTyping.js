/**
 * 타자연습 게임 Supabase 서비스
 *
 * 필요한 SQL (SQL Editor에서 실행):
 *
 * CREATE TABLE typing_rooms (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   code TEXT UNIQUE NOT NULL,
 *   status TEXT DEFAULT 'waiting',
 *   game_state JSONB DEFAULT NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE TABLE typing_players (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   room_id uuid REFERENCES typing_rooms(id) ON DELETE CASCADE,
 *   player_name TEXT NOT NULL,
 *   user_id uuid DEFAULT NULL,
 *   is_host BOOLEAN DEFAULT FALSE,
 *   joined_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * ALTER TABLE typing_rooms DISABLE ROW LEVEL SECURITY;
 * ALTER TABLE typing_players DISABLE ROW LEVEL SECURITY;
 *
 * ALTER PUBLICATION supabase_realtime ADD TABLE typing_players;
 * ALTER PUBLICATION supabase_realtime ADD TABLE typing_rooms;
 */

import { supabase } from '../supabaseClient';
import { PIECES, COLOR_CORNERS, TWO_PLAYER_PAIRS } from '../data/blokusPieces';
import { generatePersonWithHints, buildNamePattern } from './turneyKiaAI';
import { initGame } from '../utils/cobraGameLogic';
import * as cobraService from './supabaseCobra';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 6;

function generateCode() {
  let code = '';
  for (let i = 0; i < 6; i++)
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

async function getUniqueCode() {
  for (let attempts = 0; attempts < 10; attempts++) {
    const code = generateCode();
    const { data } = await supabase.from('typing_rooms').select('id').eq('code', code).single();
    if (!data) return code;
  }
  throw new Error('코드 생성에 실패했습니다. 다시 시도해주세요.');
}

async function fetchLatestState(roomId) {
  const { data, error } = await supabase
    .from('typing_rooms')
    .select('game_state')
    .eq('id', roomId)
    .single();
  if (error) throw error;
  return data.game_state;
}

async function updateGameState(roomId, gameState) {
  const { error } = await supabase
    .from('typing_rooms')
    .update({ game_state: gameState })
    .eq('id', roomId);
  if (error) throw error;
}

// ─────────────────────────────────────────
// 방 관리
// ─────────────────────────────────────────

export async function createRoom(hostName, userId = null) {
  const code = await getUniqueCode();

  const { data: room, error: roomError } = await supabase
    .from('typing_rooms')
    .insert({ code, status: 'waiting' })
    .select()
    .single();
  if (roomError) throw new Error('방 생성에 실패했습니다.');

  const playerRow = { room_id: room.id, player_name: hostName, is_host: true };
  if (userId) playerRow.user_id = userId;

  const { data: player, error: playerError } = await supabase
    .from('typing_players')
    .insert(playerRow)
    .select()
    .single();
  if (playerError) throw new Error('플레이어 등록에 실패했습니다.');

  return { room, player };
}

export async function joinRoom(code, playerName, userId = null) {
  const { data: room, error: roomError } = await supabase
    .from('typing_rooms')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('status', 'waiting')
    .single();
  if (roomError || !room) throw new Error('방을 찾을 수 없습니다. 코드를 확인해주세요.');

  const { count } = await supabase
    .from('typing_players')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', room.id);
  if (count >= MAX_PLAYERS) throw new Error(`방이 가득 찼습니다. (최대 ${MAX_PLAYERS}명)`);

  const joinRow = { room_id: room.id, player_name: playerName, is_host: false };
  if (userId) joinRow.user_id = userId;

  const { data: player, error: playerError } = await supabase
    .from('typing_players')
    .insert(joinRow)
    .select()
    .single();
  if (playerError) throw new Error('입장에 실패했습니다.');

  return { room, player };
}

export async function getRoomPlayers(roomId) {
  const { data, error } = await supabase
    .from('typing_players')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getRoomData(roomId) {
  const { data, error } = await supabase
    .from('typing_rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  if (error) throw error;
  return data;
}

export async function leaveRoom(playerId) {
  const { error } = await supabase.from('typing_players').delete().eq('id', playerId);
  if (error) console.error('leaveRoom error:', error);
}

export async function deleteRoom(roomId) {
  await supabase.from('typing_rooms').delete().eq('id', roomId);
}

// ─────────────────────────────────────────
// 게임 상태 관리
// ─────────────────────────────────────────

/** 게임 시작 - 단어 목록과 옵션을 받아 game_state 저장 */
export async function startGame(roomId, words, options = {}) {
  const { error } = await supabase
    .from('typing_rooms')
    .update({
      status: 'playing',
      game_state: {
        phase: 'playing',
        started_at: Date.now(),
        words,
        scores: {},
        options,
      },
    })
    .eq('id', roomId);
  if (error) throw new Error('게임 시작에 실패했습니다.');
}

/** 단어 획득 - 레이스 컨디션 방지: 최신 state fetch 후 업데이트 */
export async function captureWord(roomId, wordId, playerId, playerName) {
  const gameState = await fetchLatestState(roomId);
  if (!gameState || gameState.phase !== 'playing') return;

  const word = gameState.words[wordId];
  if (!word || word.capturedBy !== null) {
    // 이미 다른 플레이어가 획득
    throw new Error('already_captured');
  }

  const newWords = gameState.words.map((w, i) =>
    i === wordId ? { ...w, capturedBy: playerId, capturedBy_name: playerName } : w
  );

  const newScores = { ...gameState.scores };
  newScores[playerId] = (newScores[playerId] || 0) + word.points;

  const allCaptured = newWords.every(w => w.capturedBy !== null);

  await updateGameState(roomId, {
    ...gameState,
    words: newWords,
    scores: newScores,
    phase: allCaptured ? 'ended' : 'playing',
  });
}

/** 다시 하기 - 대기실로 리셋 */
export async function resetToWaiting(roomId) {
  const { error } = await supabase
    .from('typing_rooms')
    .update({ status: 'waiting', game_state: null })
    .eq('id', roomId);
  if (error) throw error;
}

// ─────────────────────────────────────────
// 실시간 구독
// ─────────────────────────────────────────

export function subscribeToRoom(roomId, onUpdate, onRoomDeleted) {
  return supabase
    .channel(`typing-room-${roomId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'typing_players', filter: `room_id=eq.${roomId}` },
      onUpdate
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'typing_rooms', filter: `id=eq.${roomId}` },
      onUpdate
    )
    .on('postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'typing_rooms', filter: `id=eq.${roomId}` },
      () => onRoomDeleted?.()
    )
    .subscribe();
}

export function unsubscribeFromRoom(channel) {
  if (channel) supabase.removeChannel(channel);
}

export { MAX_PLAYERS };

// ─────────────────────────────────────────
// 내부 헬퍼 (블로커스)
// ─────────────────────────────────────────

function _shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function _blokusAdvanceTurn(state) {
  const order = state.turn_order;
  const passed = [...state.passed];
  let idx = state.turn_index;
  if (passed.length >= order.length) return { nextIndex: idx, nextPassed: passed };
  let next = (idx + 1) % order.length;
  let loops = 0;
  while (passed.includes(order[next]) && loops < order.length) {
    next = (next + 1) % order.length;
    loops++;
  }
  return { nextIndex: next, nextPassed: passed };
}

function _blokusCalcScores(state) {
  const scores = {};
  for (const color of state.turn_order) {
    const remaining = state.remaining[color];
    let penalty = 0;
    let usedAll = true;
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i]) { penalty += PIECES[i].cells.length; usedAll = false; }
    }
    let score = -penalty;
    if (usedAll) {
      score += 15;
      const lastUsed = [...remaining].reverse().findIndex((u) => !u);
      if (remaining.length - 1 - lastUsed === 0) score += 5;
    }
    scores[color] = score;
  }
  return scores;
}

// ─────────────────────────────────────────
// 통합 게임 시작
// ─────────────────────────────────────────

export async function startUnifiedGame(roomId, selectedGame, players, options = {}) {
  let gameState;

  if (selectedGame === 'blokus') {
    const timerSeconds = options.timerSeconds || 30;
    const n = players.length;
    const allColors = ['blue', 'yellow', 'red', 'green'];
    let assignedColors;
    if (n === 2) {
      assignedColors = _shuffle(TWO_PLAYER_PAIRS[Math.floor(Math.random() * TWO_PLAYER_PAIRS.length)]);
    } else if (n === 3) {
      const ex = allColors[Math.floor(Math.random() * allColors.length)];
      assignedColors = _shuffle(allColors.filter((c) => c !== ex));
    } else {
      assignedColors = _shuffle(allColors);
    }
    const playerColors = {};
    players.forEach((p, i) => { playerColors[p.id] = assignedColors[i]; });
    const turnOrder = _shuffle([...assignedColors]);
    const board = Array.from({ length: 20 }, () => Array(20).fill(null));
    const remaining = {};
    assignedColors.forEach((c) => { remaining[c] = Array(PIECES.length).fill(true); });
    const scores = {};
    assignedColors.forEach((c) => { scores[c] = 0; });
    const corners = {};
    assignedColors.forEach((c) => { corners[c] = COLOR_CORNERS[c]; });
    gameState = {
      selected_game: 'blokus',
      phase: 'playing',
      board, turn_order: turnOrder, turn_index: 0, passed: [],
      timer_seconds: timerSeconds, turn_started_at: new Date().toISOString(),
      corners, remaining, scores, player_colors: playerColors,
    };
  } else if (selectedGame === 'turneyia') {
    const category = options.category || 'celebrity';
    const totalRounds = options.totalRounds || 3;
    const mode = options.mode || 'static';
    const person = await generatePersonWithHints(category, [], mode);
    const namePattern = buildNamePattern(person.name);
    const scores = {};
    players.forEach((p) => { scores[p.id] = 0; });
    gameState = {
      selected_game: 'turneyia',
      phase: 'hinting', category, mode,
      current_person: person, name_pattern: namePattern,
      hints_revealed: 1, hint_started_at: Date.now(),
      answers: {}, current_hint_submissions: {}, correct_player_id: null,
      scores, round: 1, total_rounds: totalRounds, used_persons: [person.name],
    };
  } else if (selectedGame === 'cobra') {
    const cobraOptions = { specialCards: options.specialCards ?? true };
    const rawState = initGame(players, cobraOptions);
    const userIdMap = {};
    players.forEach((p) => { if (p.user_id) userIdMap[p.id] = p.user_id; });
    gameState = { selected_game: 'cobra', ...rawState, user_id_map: userIdMap };
  } else {
    throw new Error('알 수 없는 게임입니다.');
  }

  const { error } = await supabase
    .from('typing_rooms')
    .update({ game_state: gameState, status: 'playing' })
    .eq('id', roomId);
  if (error) throw error;
}

// ─────────────────────────────────────────
// 블로커스 액션 (typing_rooms)
// ─────────────────────────────────────────

export async function blokusPlacePiece(roomId, color, pieceId, cells) {
  const state = JSON.parse(JSON.stringify(await fetchLatestState(roomId)));
  if (state.phase !== 'playing') return;
  if (state.turn_order[state.turn_index] !== color) throw new Error('지금 내 차례가 아닙니다.');
  cells.forEach(([r, c]) => { state.board[r][c] = color; });
  state.remaining[color][pieceId] = false;
  const { nextIndex, nextPassed } = _blokusAdvanceTurn(state);
  state.turn_index = nextIndex;
  state.passed = nextPassed;
  state.turn_started_at = new Date().toISOString();
  if (state.passed.length >= state.turn_order.length) {
    state.phase = 'ended';
    state.scores = _blokusCalcScores(state);
  }
  await updateGameState(roomId, state);
}

export async function blokusPassTurn(roomId, color) {
  const state = JSON.parse(JSON.stringify(await fetchLatestState(roomId)));
  if (state.phase !== 'playing') return;
  if (state.turn_order[state.turn_index] !== color) return;
  if (!state.passed.includes(color)) state.passed.push(color);
  const { nextIndex, nextPassed } = _blokusAdvanceTurn(state);
  state.turn_index = nextIndex;
  state.passed = nextPassed;
  state.turn_started_at = new Date().toISOString();
  if (state.passed.length >= state.turn_order.length) {
    state.phase = 'ended';
    state.scores = _blokusCalcScores(state);
  }
  await updateGameState(roomId, state);
}

export async function blokusAutoPass(roomId, color, expectedTurnStartedAt) {
  const state = await fetchLatestState(roomId);
  if (!state || state.phase !== 'playing') return;
  if (state.turn_started_at !== expectedTurnStartedAt) return;
  if (state.turn_order[state.turn_index] !== color) return;
  await blokusPassTurn(roomId, color);
}

// ─────────────────────────────────────────
// 터이네키아 액션 (typing_rooms)
// ─────────────────────────────────────────

export async function turneyiaRevealNextHint(roomId, gameState) {
  const next = gameState.hints_revealed + 1;
  const maxHints = gameState.current_person.hints.length;
  if (next > maxHints) {
    await updateGameState(roomId, { ...gameState, phase: 'reveal', correct_player_id: null });
  } else {
    await updateGameState(roomId, {
      ...gameState, hints_revealed: next,
      hint_started_at: Date.now(), current_hint_submissions: {},
    });
  }
}

export async function turneyiaSubmitAnswer(roomId, playerId, answer) {
  const gameState = await fetchLatestState(roomId);
  if (!gameState || gameState.phase !== 'hinting') return;
  if (gameState.current_hint_submissions?.[playerId]) return;

  const personName = gameState.current_person?.name || '';
  const isPass = answer === '__PASS__';
  const correct = !isPass && answer.toLowerCase().replace(/\s/g, '').includes(
    personName.toLowerCase().replace(/\s/g, '')
  );

  const newSubmissions = { ...(gameState.current_hint_submissions || {}), [playerId]: correct ? 'correct' : 'wrong' };
  const newAnswers = { ...(gameState.answers || {}), [playerId]: answer };
  let newCorrectId = gameState.correct_player_id;
  let newScores = { ...(gameState.scores || {}) };
  let newPhase = gameState.phase;

  if (correct && !newCorrectId) {
    newCorrectId = playerId;
    const maxHints = gameState.current_person.hints.length;
    const scoreGain = Math.max(1, maxHints - gameState.hints_revealed + 1);
    newScores[playerId] = (newScores[playerId] || 0) + scoreGain;
    newPhase = 'reveal';
  }

  await updateGameState(roomId, {
    ...gameState, phase: newPhase,
    answers: newAnswers, current_hint_submissions: newSubmissions,
    correct_player_id: newCorrectId, scores: newScores,
  });
}

export async function turneyiaRevealAnswer(roomId, gameState) {
  await updateGameState(roomId, { ...gameState, phase: 'reveal', correct_player_id: null });
}

export async function turneyiaNextRound(roomId, gameState) {
  const usedPersons = gameState.used_persons || [];
  const person = await generatePersonWithHints(gameState.category, usedPersons, gameState.mode || 'static');
  const namePattern = buildNamePattern(person.name);
  await updateGameState(roomId, {
    ...gameState, phase: 'hinting',
    current_person: person, name_pattern: namePattern,
    hints_revealed: 1, hint_started_at: Date.now(),
    current_hint_submissions: {}, answers: {}, correct_player_id: null,
    round: gameState.round + 1, used_persons: [...usedPersons, person.name],
  });
}

export async function turneyiaEndGame(roomId, gameState) {
  await updateGameState(roomId, { ...gameState, phase: 'ended' });
}

// ─────────────────────────────────────────
// 코브라 액션 래퍼 (typing_rooms)
// ─────────────────────────────────────────

export const cobraPeekCard = (roomId, playerId, cardIndex) =>
  cobraService.peekCard(roomId, playerId, cardIndex, 'typing_rooms');
export const cobraDrawFromDeck = (roomId, playerId, gameState) =>
  cobraService.drawFromDeck(roomId, playerId, gameState, 'typing_rooms');
export const cobraDiscardDrawn = (roomId, playerId, gameState) =>
  cobraService.discardDrawn(roomId, playerId, gameState, 'typing_rooms');
export const cobraSwapWithHand = (roomId, playerId, handIndex, gameState) =>
  cobraService.swapWithHand(roomId, playerId, handIndex, gameState, 'typing_rooms');
export const cobraMatchAndDiscard = (roomId, playerId, handIndex, gameState) =>
  cobraService.matchAndDiscard(roomId, playerId, handIndex, gameState, 'typing_rooms');
export const cobraTakeFromDiscard = (roomId, playerId, handIndex, gameState) =>
  cobraService.takeFromDiscard(roomId, playerId, handIndex, gameState, 'typing_rooms');
export const cobraSeonjeomInterrupt = (roomId, playerId, handIndex, gameState) =>
  cobraService.seonjeomInterrupt(roomId, playerId, handIndex, gameState, 'typing_rooms');
export const cobraResolveSpecialPeek = (roomId, initiatorId, targetPlayerId, cardIdx, gameState) =>
  cobraService.resolveSpecialPeek(roomId, initiatorId, targetPlayerId, cardIdx, gameState, 'typing_rooms');
export const cobraResolveSpecialSwap = (roomId, initiatorId, p1Id, p1Idx, p2Id, p2Idx, gameState) =>
  cobraService.resolveSpecialSwap(roomId, initiatorId, p1Id, p1Idx, p2Id, p2Idx, gameState, 'typing_rooms');
export const cobraSkipSpecialAbility = (roomId, playerId, gameState) =>
  cobraService.skipSpecialAbility(roomId, playerId, gameState, 'typing_rooms');
export const cobraCallCobra = (roomId, playerId, gameState) =>
  cobraService.callCobra(roomId, playerId, gameState, 'typing_rooms');
