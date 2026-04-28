/**
 * Cobra 게임 Supabase 서비스
 *
 * 필요한 SQL (SQL Editor에서 실행):
 *
 * CREATE TABLE cobra_rooms (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   code TEXT UNIQUE NOT NULL,
 *   status TEXT DEFAULT 'waiting',
 *   game_state JSONB DEFAULT NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE TABLE cobra_players (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   room_id uuid REFERENCES cobra_rooms(id) ON DELETE CASCADE,
 *   player_name TEXT NOT NULL,
 *   is_host BOOLEAN DEFAULT FALSE,
 *   joined_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * ALTER TABLE cobra_rooms DISABLE ROW LEVEL SECURITY;
 * ALTER TABLE cobra_players DISABLE ROW LEVEL SECURITY;
 *
 * -- Realtime 활성화
 * ALTER PUBLICATION supabase_realtime ADD TABLE cobra_players;
 * ALTER PUBLICATION supabase_realtime ADD TABLE cobra_rooms;
 *
 * -- 기존 테이블에 game_state 컬럼 추가 (이미 테이블이 있는 경우):
 * ALTER TABLE cobra_rooms ADD COLUMN IF NOT EXISTS game_state JSONB DEFAULT NULL;
 */

import { supabase } from '../supabaseClient';
import {
  initGame,
  getCardValue,
  cardsMatch,
  getNextPlayerId,
  getHandScore,
} from '../utils/cobraGameLogic';

// ─────────────────────────────────────────
// 코드 생성
// ─────────────────────────────────────────

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
  let code = '';
  for (let i = 0; i < 6; i++)
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

async function getUniqueCode() {
  for (let attempts = 0; attempts < 10; attempts++) {
    const code = generateCode();
    const { data } = await supabase.from('cobra_rooms').select('id').eq('code', code).single();
    if (!data) return code;
  }
  throw new Error('코드 생성에 실패했습니다. 다시 시도해주세요.');
}

// ─────────────────────────────────────────
// 방 관리
// ─────────────────────────────────────────

export async function createRoom(hostName) {
  const code = await getUniqueCode();

  const { data: room, error: roomError } = await supabase
    .from('cobra_rooms')
    .insert({ code, status: 'waiting' })
    .select()
    .single();
  if (roomError) throw new Error('방 생성에 실패했습니다.');

  const { data: player, error: playerError } = await supabase
    .from('cobra_players')
    .insert({ room_id: room.id, player_name: hostName, is_host: true })
    .select()
    .single();
  if (playerError) throw new Error('플레이어 등록에 실패했습니다.');

  return { room, player };
}

export async function joinRoom(code, playerName) {
  const { data: room, error: roomError } = await supabase
    .from('cobra_rooms')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('status', 'waiting')
    .single();
  if (roomError || !room) throw new Error('방을 찾을 수 없습니다. 코드를 확인해주세요.');

  const { count } = await supabase
    .from('cobra_players')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', room.id);
  if (count >= 5) throw new Error('방이 가득 찼습니다. (최대 5명)');

  const { data: player, error: playerError } = await supabase
    .from('cobra_players')
    .insert({ room_id: room.id, player_name: playerName, is_host: false })
    .select()
    .single();
  if (playerError) throw new Error('입장에 실패했습니다.');

  return { room, player };
}

export async function getRoomPlayers(roomId) {
  const { data, error } = await supabase
    .from('cobra_players')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getRoomData(roomId) {
  const { data, error } = await supabase
    .from('cobra_rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  if (error) throw error;
  return data;
}

export async function leaveRoom(playerId) {
  const { error } = await supabase.from('cobra_players').delete().eq('id', playerId);
  if (error) console.error('leaveRoom error:', error);
}

export async function deleteRoom(roomId) {
  await supabase.from('cobra_rooms').delete().eq('id', roomId);
}

export function subscribeToRoom(roomId, onUpdate) {
  return supabase
    .channel(`cobra-room-${roomId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'cobra_players', filter: `room_id=eq.${roomId}` },
      onUpdate
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'cobra_rooms', filter: `id=eq.${roomId}` },
      onUpdate
    )
    .subscribe();
}

export function unsubscribeFromRoom(channel) {
  if (channel) supabase.removeChannel(channel);
}

// ─────────────────────────────────────────
// 게임 상태 관리
// ─────────────────────────────────────────

async function updateGameState(roomId, gameState) {
  const { error } = await supabase
    .from('cobra_rooms')
    .update({ game_state: gameState })
    .eq('id', roomId);
  if (error) throw error;
}

/** 호스트가 게임을 시작할 때 호출 */
export async function startGame(roomId, players) {
  const gameState = initGame(players);
  await updateGameState(roomId, gameState);
}

/** 게임을 초기 대기 상태로 리셋 */
export async function resetGame(roomId) {
  await supabase
    .from('cobra_rooms')
    .update({ game_state: null, status: 'waiting' })
    .eq('id', roomId);
}

// ─────────────────────────────────────────
// 뷰잉 페이즈
// ─────────────────────────────────────────

/** 카드 한 장 확인 (뒤집기) */
export async function peekCard(roomId, playerId, cardIndex, gameState) {
  const newFaceUp = {
    ...gameState.face_up,
    [playerId]: gameState.face_up[playerId].map((v, i) => (i === cardIndex ? true : v)),
  };
  await updateGameState(roomId, { ...gameState, face_up: newFaceUp });
}

/** 카드 확인 완료 (준비 완료) */
export async function setViewingReady(roomId, playerId, gameState) {
  const newReady = { ...gameState.viewing_ready, [playerId]: true };
  const allReady = gameState.player_order.every(pid => newReady[pid]);
  await updateGameState(roomId, {
    ...gameState,
    viewing_ready: newReady,
    phase: allReady ? 'playing' : 'viewing',
  });
}

// ─────────────────────────────────────────
// 플레이 페이즈 액션
// ─────────────────────────────────────────

/** 덱에서 카드 한 장 뽑기 */
export async function drawFromDeck(roomId, playerId, gameState) {
  let deck = [...gameState.deck];
  let discardPile = [...gameState.discard_pile];

  if (deck.length === 0) {
    // 버린 패 중 맨 위 카드 제외하고 다시 섞기
    const top = discardPile.pop();
    if (discardPile.length === 0) return; // 카드 없음 → 코브라 강제
    deck = discardPile.sort(() => Math.random() - 0.5);
    discardPile = top ? [top] : [];
  }

  const drawnCard = deck.pop();
  await updateGameState(roomId, {
    ...gameState,
    deck,
    discard_pile: discardPile,
    drawn_card: drawnCard,
    turn_phase: 'action',
  });
}

/** 뽑은 카드를 버리기 (손패 유지) */
export async function discardDrawn(roomId, playerId, gameState) {
  const newDiscard = [...gameState.discard_pile, gameState.drawn_card];
  const newState = { ...gameState, discard_pile: newDiscard, drawn_card: null, turn_phase: 'draw' };
  await advanceTurn(roomId, playerId, newState);
}

/** 손패의 카드와 뽑은 카드 교체 (손패 카드가 버리기 패로) */
export async function swapWithHand(roomId, playerId, handIndex, gameState) {
  const handCard = gameState.hands[playerId][handIndex];
  const drawnCard = gameState.drawn_card;

  const newHand = [...gameState.hands[playerId]];
  newHand[handIndex] = drawnCard;

  // 교체된 카드는 이제 내가 알고 있음 (face_up = true)
  const newFaceUp = {
    ...gameState.face_up,
    [playerId]: gameState.face_up[playerId].map((v, i) => (i === handIndex ? true : v)),
  };

  const newState = {
    ...gameState,
    hands: { ...gameState.hands, [playerId]: newHand },
    face_up: newFaceUp,
    discard_pile: [...gameState.discard_pile, handCard],
    drawn_card: null,
    turn_phase: 'draw',
  };

  if (newHand.length === 0) {
    await triggerCobra(roomId, playerId, { ...newState, current_player_id: playerId });
  } else {
    await advanceTurn(roomId, playerId, newState);
  }
}

/** 뽑은 카드와 손패 카드가 같은 숫자 → 둘 다 버리기 */
export async function matchAndDiscard(roomId, playerId, handIndex, gameState) {
  const handCard = gameState.hands[playerId][handIndex];
  const drawnCard = gameState.drawn_card;

  if (!cardsMatch(handCard, drawnCard)) throw new Error('같은 숫자가 아닙니다.');

  const newHand = gameState.hands[playerId].filter((_, i) => i !== handIndex);
  const newFaceUp = {
    ...gameState.face_up,
    [playerId]: gameState.face_up[playerId].filter((_, i) => i !== handIndex),
  };

  const newState = {
    ...gameState,
    hands: { ...gameState.hands, [playerId]: newHand },
    face_up: newFaceUp,
    discard_pile: [...gameState.discard_pile, drawnCard, handCard],
    drawn_card: null,
    turn_phase: 'draw',
  };

  if (newHand.length === 0) {
    await triggerCobra(roomId, playerId, { ...newState, current_player_id: playerId });
  } else {
    await advanceTurn(roomId, playerId, newState);
  }
}

/**
 * 버린 패 선점 매칭
 * 내 차례 draw 단계에서 버린 패 top 카드가 내 face-up 손패와 같으면
 * 덱을 뽑기 전에 선점해서 두 장 모두 버리기
 */
export async function takeFromDiscard(roomId, playerId, handIndex, gameState) {
  const discardPile = gameState.discard_pile || [];
  if (discardPile.length === 0) throw new Error('버린 패가 없습니다.');

  const discardTop = discardPile[discardPile.length - 1];
  const handCard = gameState.hands[playerId][handIndex];

  if (!cardsMatch(discardTop, handCard)) throw new Error('같은 숫자가 아닙니다.');

  const newHand = gameState.hands[playerId].filter((_, i) => i !== handIndex);
  const newFaceUp = {
    ...gameState.face_up,
    [playerId]: gameState.face_up[playerId].filter((_, i) => i !== handIndex),
  };
  // discard top 제거 (선점으로 소모됨)
  const newDiscardPile = discardPile.slice(0, -1);

  const newState = {
    ...gameState,
    hands: { ...gameState.hands, [playerId]: newHand },
    face_up: newFaceUp,
    discard_pile: newDiscardPile,
    drawn_card: null,
    turn_phase: 'draw',
  };

  if (newHand.length === 0) {
    await triggerCobra(roomId, playerId, { ...newState, current_player_id: playerId });
  } else {
    await advanceTurn(roomId, playerId, newState);
  }
}

/** 코브라 선언 */
export async function callCobra(roomId, playerId, gameState) {
  await triggerCobra(roomId, playerId, { ...gameState, drawn_card: null, turn_phase: 'draw' });
}

// ─────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────

async function advanceTurn(roomId, currentPlayerId, state) {
  const nextId = getNextPlayerId(state.player_order, currentPlayerId);

  if (state.phase === 'cobra' && nextId === state.cobra_caller_id) {
    await endGame(roomId, state);
  } else {
    await updateGameState(roomId, {
      ...state,
      current_player_id: nextId,
      turn_phase: 'draw',
    });
  }
}

async function triggerCobra(roomId, callerId, state) {
  // 코브라 선언 즉시 선언자 카드 공개
  const newFaceUp = {
    ...state.face_up,
    [callerId]: (state.hands[callerId] || []).map(() => true),
  };

  const nextId = getNextPlayerId(state.player_order, callerId);

  // 혼자이거나 바로 돌아오면 즉시 종료
  if (state.player_order.length === 1 || nextId === callerId) {
    return await endGame(roomId, { ...state, face_up: newFaceUp, cobra_caller_id: callerId });
  }

  await updateGameState(roomId, {
    ...state,
    phase: 'cobra',
    cobra_caller_id: callerId,
    face_up: newFaceUp,
    current_player_id: nextId,
    turn_phase: 'draw',
  });
}

async function endGame(roomId, state) {
  const scores = {};
  const revealedFaceUp = {};

  for (const pid of state.player_order) {
    scores[pid] = getHandScore(state.hands[pid]);
    revealedFaceUp[pid] = state.hands[pid].map(() => true);
  }

  await updateGameState(roomId, {
    ...state,
    phase: 'ended',
    face_up: revealedFaceUp,
    scores,
    drawn_card: null,
    turn_phase: null,
  });
}
