/**
 * Supabase service for Akinator multiplayer game
 *
 * Required SQL (run in Supabase SQL editor):
 *
 * CREATE TABLE IF NOT EXISTS akinator_rooms (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   code TEXT UNIQUE NOT NULL,
 *   host_user_id TEXT,
 *   game_state JSONB DEFAULT '{"phase":"waiting","character":null,"questions":[],"guesses":{},"scores":{},"maxQuestions":20}'::jsonb,
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * CREATE TABLE IF NOT EXISTS akinator_players (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   room_id UUID REFERENCES akinator_rooms(id) ON DELETE CASCADE,
 *   player_name TEXT NOT NULL,
 *   user_id TEXT,
 *   is_host BOOLEAN DEFAULT false,
 *   joined_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * ALTER PUBLICATION supabase_realtime ADD TABLE akinator_rooms;
 * ALTER PUBLICATION supabase_realtime ADD TABLE akinator_players;
 */

import { supabase } from '../supabaseClient';

export const MAX_PLAYERS = 8;

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ── 방 생성 ──────────────────────────────────────────────
export async function createRoom(hostName, userId) {
  let code, attempt = 0;
  while (attempt++ < 10) {
    code = genCode();
    const { data: existing } = await supabase
      .from('akinator_rooms')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (!existing) break;
  }

  const { data: room, error: roomErr } = await supabase
    .from('akinator_rooms')
    .insert({ code, host_user_id: userId || null })
    .select()
    .single();
  if (roomErr) throw roomErr;

  const { data: player, error: playerErr } = await supabase
    .from('akinator_players')
    .insert({ room_id: room.id, player_name: hostName, user_id: userId || null, is_host: true })
    .select()
    .single();
  if (playerErr) throw playerErr;

  return { room, player };
}

// ── 방 입장 ──────────────────────────────────────────────
export async function joinRoom(code, playerName, userId) {
  const { data: room, error: findErr } = await supabase
    .from('akinator_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();
  if (findErr) throw findErr;
  if (!room) throw new Error('존재하지 않는 방 코드입니다.');

  const { data: existingPlayers } = await supabase
    .from('akinator_players')
    .select('id')
    .eq('room_id', room.id);
  if (existingPlayers?.length >= MAX_PLAYERS) throw new Error('방이 가득 찼습니다.');

  const state = room.game_state;
  if (state?.phase === 'playing' || state?.phase === 'guessing') {
    throw new Error('이미 게임이 진행 중입니다.');
  }

  const { data: player, error: joinErr } = await supabase
    .from('akinator_players')
    .insert({ room_id: room.id, player_name: playerName, user_id: userId || null, is_host: false })
    .select()
    .single();
  if (joinErr) throw joinErr;

  return { room, player };
}

// ── 조회 ──────────────────────────────────────────────────
export async function getRoomData(roomId) {
  const { data, error } = await supabase
    .from('akinator_rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  if (error) throw error;
  return data;
}

export async function getRoomPlayers(roomId) {
  const { data, error } = await supabase
    .from('akinator_players')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

// ── 나가기 / 삭제 ─────────────────────────────────────────
export async function leaveRoom(playerId) {
  await supabase.from('akinator_players').delete().eq('id', playerId);
}

export async function deleteRoom(roomId) {
  await supabase.from('akinator_rooms').delete().eq('id', roomId);
}

// ── 게임 시작 ──────────────────────────────────────────────
export async function startGame(roomId, character, options = { maxQuestions: 20 }) {
  const newState = {
    phase: 'playing',
    character,
    questions: [],
    guesses: {},
    scores: {},
    maxQuestions: options.maxQuestions || 20,
  };
  const { error } = await supabase
    .from('akinator_rooms')
    .update({ game_state: newState })
    .eq('id', roomId);
  if (error) throw error;
}

// ── 질문 제출 ──────────────────────────────────────────────
export async function submitQuestion(roomId, askerId, askerName, text) {
  const { data, error } = await supabase
    .from('akinator_rooms')
    .select('game_state')
    .eq('id', roomId)
    .single();
  if (error) throw error;

  const state = data.game_state;
  if (state.phase !== 'playing') return;

  const newQuestion = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    asker_id: askerId,
    asker_name: askerName,
    text: text.trim(),
    answer: null,
  };

  const { error: updateErr } = await supabase
    .from('akinator_rooms')
    .update({ game_state: { ...state, questions: [...state.questions, newQuestion] } })
    .eq('id', roomId);
  if (updateErr) throw updateErr;
}

// ── 질문 답변 (방장) ───────────────────────────────────────
export async function answerQuestion(roomId, questionId, answer) {
  const { data, error } = await supabase
    .from('akinator_rooms')
    .select('game_state')
    .eq('id', roomId)
    .single();
  if (error) throw error;

  const state = data.game_state;
  const questions = state.questions.map(q =>
    q.id === questionId ? { ...q, answer } : q
  );

  const answeredCount = questions.filter(q => q.answer !== null).length;
  const phase = answeredCount >= state.maxQuestions ? 'guessing' : state.phase;

  const { error: updateErr } = await supabase
    .from('akinator_rooms')
    .update({ game_state: { ...state, questions, phase } })
    .eq('id', roomId);
  if (updateErr) throw updateErr;
}

// ── 맞히기 단계로 전환 (방장) ─────────────────────────────
export async function triggerGuessing(roomId) {
  const { data, error } = await supabase
    .from('akinator_rooms')
    .select('game_state')
    .eq('id', roomId)
    .single();
  if (error) throw error;

  const { error: updateErr } = await supabase
    .from('akinator_rooms')
    .update({ game_state: { ...data.game_state, phase: 'guessing' } })
    .eq('id', roomId);
  if (updateErr) throw updateErr;
}

// ── 정답 제출 ──────────────────────────────────────────────
export async function submitGuess(roomId, playerId, playerName, guess, totalPlayers) {
  const { data, error } = await supabase
    .from('akinator_rooms')
    .select('game_state')
    .eq('id', roomId)
    .single();
  if (error) throw error;

  const state = data.game_state;
  if (state.phase !== 'guessing') return;
  if (state.guesses[playerId]) return; // 이미 제출

  const character = state.character;
  const correct =
    guess.trim().toLowerCase() === character.name.toLowerCase() ||
    guess.trim() === character.name;

  const guesses = {
    ...state.guesses,
    [playerId]: { name: playerName, guess: guess.trim(), correct },
  };

  const scores = { ...state.scores };
  if (correct) {
    const isFirst = !Object.values(state.guesses).some(g => g.correct);
    scores[playerId] = (scores[playerId] || 0) + (isFirst ? 15 : 10);
  }

  // 방장 제외한 플레이어 수 기준
  const guesserCount = totalPlayers - 1; // 방장은 제출 안 함
  const allGuessed = Object.keys(guesses).length >= Math.max(guesserCount, 1);
  const phase = allGuessed ? 'ended' : 'guessing';

  const { error: updateErr } = await supabase
    .from('akinator_rooms')
    .update({ game_state: { ...state, guesses, scores, phase } })
    .eq('id', roomId);
  if (updateErr) throw updateErr;
}

// ── 정답 공개 (방장) ──────────────────────────────────────
export async function revealAnswer(roomId) {
  const { data, error } = await supabase
    .from('akinator_rooms')
    .select('game_state')
    .eq('id', roomId)
    .single();
  if (error) throw error;

  const { error: updateErr } = await supabase
    .from('akinator_rooms')
    .update({ game_state: { ...data.game_state, phase: 'ended' } })
    .eq('id', roomId);
  if (updateErr) throw updateErr;
}

// ── 대기실로 초기화 ───────────────────────────────────────
export async function resetToWaiting(roomId) {
  const { error } = await supabase
    .from('akinator_rooms')
    .update({
      game_state: {
        phase: 'waiting',
        character: null,
        questions: [],
        guesses: {},
        scores: {},
        maxQuestions: 20,
      },
    })
    .eq('id', roomId);
  if (error) throw error;
}

// ── 실시간 구독 ───────────────────────────────────────────
export function subscribeToRoom(roomId, onUpdate, onRoomDeleted) {
  const channel = supabase
    .channel(`akinator_room_${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'akinator_rooms', filter: `id=eq.${roomId}` }, (payload) => {
      if (payload.eventType === 'DELETE') {
        onRoomDeleted?.();
      } else {
        onUpdate?.();
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'akinator_players', filter: `room_id=eq.${roomId}` }, () => {
      onUpdate?.();
    })
    .subscribe();

  return channel;
}

export function unsubscribeFromRoom(channel) {
  supabase.removeChannel(channel);
}
