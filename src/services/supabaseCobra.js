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
  getCardDisplayValue,
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
export async function startGame(roomId, players, options = {}) {
  const gameState = initGame(players, options);
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

/** 카드 한 장 확인 (뒤집기) — 2장 선택 시 자동 준비 완료 */
export async function peekCard(roomId, playerId, cardIndex, gameState) {
  const newFaceUpArr = gameState.face_up[playerId].map((v, i) => (i === cardIndex ? true : v));
  const newFaceUp = { ...gameState.face_up, [playerId]: newFaceUpArr };
  const peekedCount = newFaceUpArr.filter(Boolean).length;

  let newState = { ...gameState, face_up: newFaceUp };
  if (peekedCount >= 2) {
    const newReady = { ...gameState.viewing_ready, [playerId]: true };
    const allReady = gameState.player_order.every(pid => newReady[pid]);
    newState = { ...newState, viewing_ready: newReady, phase: allReady ? 'playing' : 'viewing' };
  }
  await updateGameState(roomId, newState);
}

// ─────────────────────────────────────────
// 플레이 페이즈 액션
// ─────────────────────────────────────────

/** 덱에서 카드 한 장 뽑기 */
export async function drawFromDeck(roomId, _playerId, gameState) {
  let deck = [...gameState.deck];
  let discardPile = [...gameState.discard_pile];

  if (deck.length === 0) {
    const top = discardPile.pop();
    if (discardPile.length === 0) return; // 수학적으로 발생 불가
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
    seonjeom_window: false, // 덱에서 뽑으면 선점 창 닫힘
  });
}

/** 뽑은 카드를 버리기 (손패 유지) — J/Q/K 특수 능력 처리 포함 */
export async function discardDrawn(roomId, playerId, gameState) {
  const discardedCard = gameState.drawn_card;
  const newDiscard = [...gameState.discard_pile, discardedCard];

  if (gameState.options?.specialCards) {
    const val = getCardDisplayValue(discardedCard);
    if (val === 'J' || val === 'Q' || val === 'K') {
      // J: 비공개 카드가 없으면 턴 pass
      if (val === 'J') {
        const faceUpArr = gameState.face_up[playerId];
        const selfKnown = gameState.private_knowledge?.[playerId]?.[playerId] || {};
        const hasUnknown = gameState.hands[playerId].some((_, i) => !faceUpArr[i] && !selfKnown[i]);
        if (!hasUnknown) {
          const newState = { ...gameState, discard_pile: newDiscard, drawn_card: null, turn_phase: 'draw' };
          await advanceTurn(roomId, playerId, newState);
          return;
        }
      }
      const type = val === 'J' ? 'peek_own' : val === 'Q' ? 'peek_opp' : 'swap';
      await updateGameState(roomId, {
        ...gameState,
        discard_pile: newDiscard,
        drawn_card: null,
        turn_phase: 'special',
        special_pending: { type, initiator_id: playerId },
      });
      return;
    }
  }

  // 카드 버림 → 다른 플레이어 즉시 선점 가능 창 열기
  const newState = { ...gameState, discard_pile: newDiscard, drawn_card: null, turn_phase: 'draw', seonjeom_window: true };
  await advanceTurn(roomId, playerId, newState);
}

/** J(내 카드 확인) 또는 Q(상대 카드 확인) 특수 능력 해결
 *  - J: 자기 카드 → private_knowledge 에만 기록 (나만 앎, face_up 변경 없음)
 *  - Q: 상대 카드 → private_knowledge 에만 기록 (나만 앎, 교체되면 무효)
 */
export async function resolveSpecialPeek(roomId, initiatorId, targetPlayerId, cardIdx, gameState) {
  let newPrivateKnowledge = gameState.private_knowledge || {};
  // J든 Q든 모두 private_knowledge 에만 기록
  const myKnowledge = newPrivateKnowledge[initiatorId] || {};
  const targetKnowledge = myKnowledge[targetPlayerId] || {};
  newPrivateKnowledge = {
    ...newPrivateKnowledge,
    [initiatorId]: {
      ...myKnowledge,
      [targetPlayerId]: { ...targetKnowledge, [cardIdx]: true },
    },
  };

  const newState = {
    ...gameState,
    private_knowledge: newPrivateKnowledge,
    turn_phase: 'draw',
    special_pending: null,
  };
  await advanceTurn(roomId, initiatorId, newState);
}

/** K(카드 교환) 특수 능력 해결 — p1 의 p1Idx ↔ p2 의 p2Idx
 *  face_up 상태는 카드와 함께 이동 (카드의 공개 상태 유지).
 *  교환된 위치에 대한 private_knowledge 는 무효화.
 */
export async function resolveSpecialSwap(roomId, initiatorId, p1Id, p1Idx, p2Id, p2Idx, gameState) {
  const card1 = gameState.hands[p1Id][p1Idx];
  const card2 = gameState.hands[p2Id][p2Idx];
  const fu1 = gameState.face_up[p1Id][p1Idx];
  const fu2 = gameState.face_up[p2Id][p2Idx];

  const newHands = {
    ...gameState.hands,
    [p1Id]: gameState.hands[p1Id].map((c, i) => (i === p1Idx ? card2 : c)),
    [p2Id]: gameState.hands[p2Id].map((c, i) => (i === p2Idx ? card1 : c)),
  };
  const newFaceUp = {
    ...gameState.face_up,
    [p1Id]: gameState.face_up[p1Id].map((v, i) => (i === p1Idx ? fu2 : v)),
    [p2Id]: gameState.face_up[p2Id].map((v, i) => (i === p2Idx ? fu1 : v)),
  };

  // 교환된 위치에 대한 private_knowledge 무효화 (카드가 이동했으므로 기존 지식 무효)
  const oldPK = gameState.private_knowledge || {};
  const newPrivateKnowledge = {};
  for (const [peekerId, peekerData] of Object.entries(oldPK)) {
    newPrivateKnowledge[peekerId] = {};
    for (const [targetId, targetData] of Object.entries(peekerData)) {
      const cleaned = { ...targetData };
      if (targetId === p1Id) delete cleaned[p1Idx];
      if (targetId === p2Id) delete cleaned[p2Idx];
      if (Object.keys(cleaned).length > 0) newPrivateKnowledge[peekerId][targetId] = cleaned;
    }
    if (Object.keys(newPrivateKnowledge[peekerId]).length === 0) delete newPrivateKnowledge[peekerId];
  }

  const newState = {
    ...gameState,
    hands: newHands,
    face_up: newFaceUp,
    private_knowledge: newPrivateKnowledge,
    turn_phase: 'draw',
    special_pending: null,
  };
  await advanceTurn(roomId, initiatorId, newState);
}

/** 손패의 카드와 뽑은 카드 교체 (손패 카드가 버리기 패로) */
export async function swapWithHand(roomId, playerId, handIndex, gameState) {
  const handCard = gameState.hands[playerId][handIndex];
  const drawnCard = gameState.drawn_card;

  const newHand = [...gameState.hands[playerId]];
  newHand[handIndex] = drawnCard;

  // 교체 시 손패 카드 버림 → 선점 창 열기
  const { newFaceUp, newPK: clearedPK } = clearPositionKnowledge(
    gameState.face_up, gameState.private_knowledge || {}, playerId, handIndex
  );
  // 나는 뽑은 카드를 봤으므로 private_knowledge 에만 기록 (나만 앎)
  const myKnowledge = clearedPK[playerId] || {};
  const selfKnowledge = myKnowledge[playerId] || {};
  const newPK = {
    ...clearedPK,
    [playerId]: { ...myKnowledge, [playerId]: { ...selfKnowledge, [handIndex]: true } },
  };

  const newState = {
    ...gameState,
    hands: { ...gameState.hands, [playerId]: newHand },
    face_up: newFaceUp,
    private_knowledge: newPK,
    discard_pile: [...gameState.discard_pile, handCard],
    drawn_card: null,
    turn_phase: 'draw',
    seonjeom_window: true,
  };

  if (newHand.length === 0 && newState.phase !== 'cobra') {
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
  // 카드 제거 → 인덱스 조정 + private_knowledge 정리
  const { newFaceUp, newPK } = removePositionKnowledge(
    gameState.face_up, gameState.private_knowledge || {}, playerId, handIndex
  );

  const newState = {
    ...gameState,
    hands: { ...gameState.hands, [playerId]: newHand },
    face_up: newFaceUp,
    private_knowledge: newPK,
    discard_pile: [...gameState.discard_pile, drawnCard, handCard],
    drawn_card: null,
    turn_phase: 'draw',
    seonjeom_window: true,
  };

  if (newHand.length === 0 && newState.phase !== 'cobra') {
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
  // 카드 제거 → 인덱스 조정 + private_knowledge 정리
  const { newFaceUp, newPK } = removePositionKnowledge(
    gameState.face_up, gameState.private_knowledge || {}, playerId, handIndex
  );
  // discard top 제거 (선점으로 소모됨)
  const newDiscardPile = discardPile.slice(0, -1);

  const newState = {
    ...gameState,
    hands: { ...gameState.hands, [playerId]: newHand },
    face_up: newFaceUp,
    private_knowledge: newPK,
    discard_pile: newDiscardPile,
    drawn_card: null,
    turn_phase: 'draw',
    seonjeom_window: false,
  };

  if (newHand.length === 0 && newState.phase !== 'cobra') {
    await triggerCobra(roomId, playerId, { ...newState, current_player_id: playerId });
  } else {
    await advanceTurn(roomId, playerId, newState);
  }
}

/**
 * 비활성 플레이어 선점 인터럽트
 * seonjeom_window가 열려있을 때 내 아는 카드와 버린 패 top이 같으면 즉시 선점.
 * 선점 = 내 차례를 사용 → 다음은 내 다음 플레이어.
 */
export async function seonjeomInterrupt(roomId, playerId, handIndex, gameState) {
  const discardPile = gameState.discard_pile || [];
  if (!gameState.seonjeom_window || discardPile.length === 0) throw new Error('선점 기회가 없습니다.');

  const discardTop = discardPile[discardPile.length - 1];
  const handCard = gameState.hands[playerId][handIndex];
  if (!cardsMatch(discardTop, handCard)) throw new Error('같은 숫자가 아닙니다.');

  const newHand = gameState.hands[playerId].filter((_, i) => i !== handIndex);
  const { newFaceUp, newPK } = removePositionKnowledge(
    gameState.face_up, gameState.private_knowledge || {}, playerId, handIndex
  );

  const newState = {
    ...gameState,
    hands: { ...gameState.hands, [playerId]: newHand },
    face_up: newFaceUp,
    private_knowledge: newPK,
    discard_pile: discardPile.slice(0, -1),
    seonjeom_window: false,
    turn_phase: 'draw',
  };

  // 선점자의 차례를 사용한 것 → 선점자 기준으로 다음 플레이어에게 넘김
  if (newHand.length === 0 && newState.phase !== 'cobra') {
    await triggerCobra(roomId, playerId, { ...newState, current_player_id: playerId });
  } else {
    await advanceTurn(roomId, playerId, newState);
  }
}

/** 특수 능력 패스 (K에서 교환 안 할 때) */
export async function skipSpecialAbility(roomId, playerId, gameState) {
  const newState = { ...gameState, turn_phase: 'draw', special_pending: null };
  await advanceTurn(roomId, playerId, newState);
}

/** 코브라 선언 */
export async function callCobra(roomId, playerId, gameState) {
  await triggerCobra(roomId, playerId, { ...gameState, drawn_card: null, turn_phase: 'draw' });
}

// ─────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────

/** 특정 위치의 카드가 교체될 때 face_up 및 private_knowledge 초기화 */
function clearPositionKnowledge(face_up, pk, targetPlayerId, cardIdx) {
  const newFaceUp = {
    ...face_up,
    [targetPlayerId]: face_up[targetPlayerId].map((v, i) => (i === cardIdx ? false : v)),
  };
  const newPK = {};
  for (const [peekerId, peekerData] of Object.entries(pk)) {
    const inner = {};
    for (const [tid, tdata] of Object.entries(peekerData)) {
      const cleaned = { ...tdata };
      if (tid === targetPlayerId) delete cleaned[cardIdx];
      if (Object.keys(cleaned).length > 0) inner[tid] = cleaned;
    }
    if (Object.keys(inner).length > 0) newPK[peekerId] = inner;
  }
  return { newFaceUp, newPK };
}

/** 특정 위치의 카드가 제거될 때 face_up 및 private_knowledge 인덱스 조정 */
function removePositionKnowledge(face_up, pk, targetPlayerId, removedIdx) {
  const newFaceUp = {
    ...face_up,
    [targetPlayerId]: face_up[targetPlayerId].filter((_, i) => i !== removedIdx),
  };
  const newPK = {};
  for (const [peekerId, peekerData] of Object.entries(pk)) {
    const inner = {};
    for (const [tid, tdata] of Object.entries(peekerData)) {
      if (tid === targetPlayerId) {
        const shifted = {};
        for (const [k, v] of Object.entries(tdata)) {
          const i = parseInt(k);
          if (i < removedIdx) shifted[i] = v;
          else if (i > removedIdx) shifted[i - 1] = v;
        }
        if (Object.keys(shifted).length > 0) inner[tid] = shifted;
      } else {
        inner[tid] = tdata;
      }
    }
    if (Object.keys(inner).length > 0) newPK[peekerId] = inner;
  }
  return { newFaceUp, newPK };
}

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
