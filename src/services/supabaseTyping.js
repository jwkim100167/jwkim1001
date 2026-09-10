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
