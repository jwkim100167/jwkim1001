/**
 * Supabase service for Blokus multiplayer game
 *
 * Required SQL (run in Supabase SQL editor):
 *
 * CREATE TABLE IF NOT EXISTS blokus_rooms (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   code TEXT UNIQUE NOT NULL,
 *   host_user_id TEXT,
 *   game_state JSONB DEFAULT NULL,
 *   status TEXT DEFAULT 'waiting',
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * CREATE TABLE IF NOT EXISTS blokus_players (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   room_id UUID REFERENCES blokus_rooms(id) ON DELETE CASCADE,
 *   player_name TEXT NOT NULL,
 *   user_id TEXT,
 *   color TEXT,
 *   is_host BOOLEAN DEFAULT false,
 *   is_active BOOLEAN DEFAULT true,
 *   joined_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * ALTER PUBLICATION supabase_realtime ADD TABLE blokus_rooms;
 * ALTER PUBLICATION supabase_realtime ADD TABLE blokus_players;
 */

import { supabase } from '../../supabaseClient';
import { PIECES, COLOR_CORNERS, TWO_PLAYER_PAIRS } from '../../data/games/blokusPieces';

export const MAX_PLAYERS = 4;

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── 방 생성 ──────────────────────────────────────────────
export async function createRoom(hostName, userId) {
  let code;
  for (let attempt = 0; attempt < 10; attempt++) {
    code = genCode();
    const { data: existing } = await supabase
      .from('blokus_rooms')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (!existing) break;
  }

  const { data: room, error: roomErr } = await supabase
    .from('blokus_rooms')
    .insert({ code, host_user_id: userId || null, status: 'waiting' })
    .select()
    .single();
  if (roomErr) throw roomErr;

  const { data: player, error: playerErr } = await supabase
    .from('blokus_players')
    .insert({
      room_id: room.id,
      player_name: hostName,
      user_id: userId || null,
      is_host: true,
      is_active: true,
    })
    .select()
    .single();
  if (playerErr) throw playerErr;

  return { room, player };
}

// ── 방 입장 ──────────────────────────────────────────────
export async function joinRoom(code, playerName, userId) {
  const { data: room, error: findErr } = await supabase
    .from('blokus_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();
  if (findErr) throw findErr;
  if (!room) throw new Error('존재하지 않는 방 코드입니다.');
  if (room.status !== 'waiting') throw new Error('이미 게임이 진행 중입니다.');

  const { data: existingPlayers } = await supabase
    .from('blokus_players')
    .select('id')
    .eq('room_id', room.id);
  if ((existingPlayers?.length ?? 0) >= MAX_PLAYERS) throw new Error('방이 가득 찼습니다. (최대 4명)');

  const { data: player, error: joinErr } = await supabase
    .from('blokus_players')
    .insert({
      room_id: room.id,
      player_name: playerName,
      user_id: userId || null,
      is_host: false,
      is_active: true,
    })
    .select()
    .single();
  if (joinErr) throw joinErr;

  return { room, player };
}

// ── 조회 ──────────────────────────────────────────────────
export async function getRoomData(roomId) {
  const { data, error } = await supabase
    .from('blokus_rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  if (error) throw error;
  return data;
}

export async function getRoomPlayers(roomId) {
  const { data, error } = await supabase
    .from('blokus_players')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

// ── 나가기 / 삭제 ─────────────────────────────────────────
export async function leaveRoom(playerId) {
  await supabase.from('blokus_players').delete().eq('id', playerId);
}

export async function deleteRoom(roomId) {
  await supabase.from('blokus_rooms').delete().eq('id', roomId);
}

export async function promoteToHost(playerId) {
  const { error } = await supabase.from('blokus_players').update({ is_host: true }).eq('id', playerId);
  if (error) console.error('promoteToHost error:', error);
}

// ── 게임 시작 ──────────────────────────────────────────────
export async function startGame(roomId, players, timerSeconds = 30) {
  const n = players.length;
  const allColors = ['blue', 'yellow', 'red', 'green'];

  let assignedColors;
  if (n === 2) {
    const pair = TWO_PLAYER_PAIRS[Math.floor(Math.random() * TWO_PLAYER_PAIRS.length)];
    const shuffledPair = shuffle(pair);
    assignedColors = shuffledPair;
  } else if (n === 3) {
    const excluded = allColors[Math.floor(Math.random() * allColors.length)];
    const pool = allColors.filter((c) => c !== excluded);
    assignedColors = shuffle(pool);
  } else {
    assignedColors = shuffle(allColors);
  }

  // Update each player's color
  for (let i = 0; i < players.length; i++) {
    await supabase
      .from('blokus_players')
      .update({ color: assignedColors[i] })
      .eq('id', players[i].id);
  }

  // Randomize turn order using assigned colors
  const turnOrder = shuffle([...assignedColors]);

  // Build empty 20×20 board (null = empty)
  const board = Array.from({ length: 20 }, () => Array(20).fill(null));

  // remaining[color] = array of 21 booleans (true = not yet used)
  const remaining = {};
  assignedColors.forEach((color) => {
    remaining[color] = Array(PIECES.length).fill(true);
  });

  const scores = {};
  assignedColors.forEach((color) => { scores[color] = 0; });

  const corners = {};
  assignedColors.forEach((color) => { corners[color] = COLOR_CORNERS[color]; });

  const gameState = {
    phase: 'playing',
    board,
    turn_order: turnOrder,
    turn_index: 0,
    passed: [],
    timer_seconds: timerSeconds,
    turn_started_at: new Date().toISOString(),
    corners,
    remaining,
    scores,
  };

  const { error } = await supabase
    .from('blokus_rooms')
    .update({ game_state: gameState, status: 'playing' })
    .eq('id', roomId);
  if (error) throw error;
}

// ── 피스 배치 ──────────────────────────────────────────────
export async function placePiece(roomId, color, pieceId, cells) {
  const { data, error } = await supabase
    .from('blokus_rooms')
    .select('game_state')
    .eq('id', roomId)
    .single();
  if (error) throw error;

  const state = JSON.parse(JSON.stringify(data.game_state));
  if (state.phase !== 'playing') return;

  const currentColor = state.turn_order[state.turn_index];
  if (currentColor !== color) throw new Error('지금 내 차례가 아닙니다.');

  // Place cells on board
  cells.forEach(([r, c]) => {
    state.board[r][c] = color;
  });

  // Mark piece as used
  state.remaining[color][pieceId] = false;
  if (!state.last_piece_id) state.last_piece_id = {};
  state.last_piece_id[color] = pieceId;

  // Advance turn
  const { nextIndex, nextPassed } = advanceTurn(state);
  state.turn_index = nextIndex;
  state.passed = nextPassed;
  state.turn_started_at = new Date().toISOString();

  // Check if game over (all players passed)
  if (state.passed.length >= state.turn_order.length) {
    state.phase = 'ended';
    state.scores = calcScores(state);
  }

  const { error: updateErr } = await supabase
    .from('blokus_rooms')
    .update({ game_state: state })
    .eq('id', roomId);
  if (updateErr) throw updateErr;
}

// ── 기권 ──────────────────────────────────────────────────
export async function passTurn(roomId, color) {
  const { data, error } = await supabase
    .from('blokus_rooms')
    .select('game_state')
    .eq('id', roomId)
    .single();
  if (error) throw error;

  const state = JSON.parse(JSON.stringify(data.game_state));
  if (state.phase !== 'playing') return;

  const currentColor = state.turn_order[state.turn_index];
  if (currentColor !== color) return;

  // Add to passed if not already
  if (!state.passed.includes(color)) {
    state.passed.push(color);
  }

  const { nextIndex, nextPassed } = advanceTurn(state);
  state.turn_index = nextIndex;
  state.passed = nextPassed;
  state.turn_started_at = new Date().toISOString();

  if (state.passed.length >= state.turn_order.length) {
    state.phase = 'ended';
    state.scores = calcScores(state);
  }

  const { error: updateErr } = await supabase
    .from('blokus_rooms')
    .update({ game_state: state })
    .eq('id', roomId);
  if (updateErr) throw updateErr;
}

// ── 오프라인 강퇴 (3회 스킵 후 호스트가 호출) ─────────────
export async function kickColor(roomId, color) {
  const { data, error } = await supabase
    .from('blokus_rooms')
    .select('game_state')
    .eq('id', roomId)
    .single();
  if (error) return;

  const state = JSON.parse(JSON.stringify(data.game_state));
  if (state.phase !== 'playing') return;

  if (!state.passed.includes(color)) state.passed.push(color);

  if (state.turn_order[state.turn_index] === color) {
    const { nextIndex } = advanceTurn(state);
    state.turn_index = nextIndex;
    state.turn_started_at = new Date().toISOString();
  }

  if (state.passed.length >= state.turn_order.length) {
    state.phase = 'ended';
    state.scores = calcScores(state);
  }

  await supabase.from('blokus_rooms').update({ game_state: state }).eq('id', roomId);
}

// ── 자동 기권 (타이머 만료 - 호스트 클라이언트가 호출) ───────
export async function autoPass(roomId, color, expectedTurnStartedAt) {
  const { data, error } = await supabase
    .from('blokus_rooms')
    .select('game_state')
    .eq('id', roomId)
    .single();
  if (error) return;

  const state = data.game_state;
  if (state.phase !== 'playing') return;
  if (state.turn_started_at !== expectedTurnStartedAt) return; // already advanced
  if (state.turn_order[state.turn_index] !== color) return;

  await passTurn(roomId, color);
}

// ── 게임 리셋 ──────────────────────────────────────────────
export async function resetGame(roomId) {
  const { error } = await supabase
    .from('blokus_rooms')
    .update({ game_state: null, status: 'waiting' })
    .eq('id', roomId);
  if (error) throw error;

  // Reset player colors
  await supabase
    .from('blokus_players')
    .update({ color: null })
    .eq('room_id', roomId);
}

// ── 실시간 구독 ───────────────────────────────────────────
export function subscribeToRoom(roomId, onUpdate, onRoomDeleted) {
  const channel = supabase
    .channel(`blokus_room_${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'blokus_rooms', filter: `id=eq.${roomId}` }, (payload) => {
      if (payload.eventType === 'DELETE') {
        onRoomDeleted?.();
      } else {
        onUpdate?.();
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'blokus_players', filter: `room_id=eq.${roomId}` }, () => {
      onUpdate?.();
    })
    .subscribe();
  return channel;
}

export function unsubscribeFromRoom(channel) {
  if (channel) supabase.removeChannel(channel);
}

// ── 헬퍼 ──────────────────────────────────────────────────
function advanceTurn(state) {
  const order = state.turn_order;
  let passed = [...state.passed];
  let idx = state.turn_index;

  // If all passed → done
  if (passed.length >= order.length) {
    return { nextIndex: idx, nextPassed: passed };
  }

  let next = (idx + 1) % order.length;
  let loops = 0;
  while (passed.includes(order[next]) && loops < order.length) {
    next = (next + 1) % order.length;
    loops++;
  }
  return { nextIndex: next, nextPassed: passed };
}

function calcScores(state) {
  const scores = {};
  for (const color of state.turn_order) {
    const remaining = state.remaining[color];
    let penalty = 0;
    let usedAll = true;
    let lastWasMono = false;
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i]) {
        // piece still unused
        penalty += i === 0 ? 1 : i === 1 ? 2 : i === 2 ? 3 : i === 3 ? 3 : i === 4 ? 4 : 4 + (i - 4);
        usedAll = false;
      }
    }
    // More precise: penalty = sum of cells in remaining pieces
    penalty = 0;
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i]) {
        penalty += PIECES[i].cells.length;
        usedAll = false;
      }
    }
    let score = -penalty;
    if (usedAll) {
      score += 15;
      // +5 bonus if last placed piece was the monomino (piece id 0)
      if (state.last_piece_id?.[color] === 0) score += 5;
    }
    scores[color] = score;
  }
  return scores;
}
