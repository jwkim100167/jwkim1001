export const FRUITS = ['strawberry', 'banana', 'lime', 'plum'];
export const FRUIT_EMOJI = { strawberry: '🍓', banana: '🍌', lime: '🍋', plum: '🍇', joker: '🃏' };
export const FRUIT_LABEL = { strawberry: '딸기', banana: '바나나', lime: '라임', plum: '자두', joker: '조커' };

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// 60장 덱 생성: 4종류 × [1×3, 2×3, 3×3, 4×2, 5×3] + 조커 4장
export function buildDeck() {
  const distribution = [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 5, 5];
  const deck = [];
  for (const fruit of FRUITS) {
    for (const count of distribution) {
      deck.push({ fruit, count });
    }
  }
  // 조커 4장 (모든 과일에 +1 효과)
  for (let i = 0; i < 4; i++) deck.push({ fruit: 'joker', count: 1 });
  return shuffle(deck);
}

// 플레이어에게 카드 균등 분배 (나머지 버림)
export function dealCards(playerIds) {
  const deck = buildDeck();
  const perPlayer = Math.floor(deck.length / playerIds.length);
  const decks = {};
  const top_cards = {};
  playerIds.forEach((id, i) => {
    decks[id] = deck.slice(i * perPlayer, (i + 1) * perPlayer);
    top_cards[id] = null;
  });
  return { decks, top_cards };
}

// 현재 공개된 카드에서 과일 합계 계산 (조커 = 모든 과일에 +1)
export function getFruitCounts(topCards) {
  const counts = { strawberry: 0, banana: 0, lime: 0, plum: 0 };
  for (const card of Object.values(topCards)) {
    if (!card) continue;
    if (card.fruit === 'joker') {
      for (const fruit of FRUITS) counts[fruit] += 1;
    } else {
      counts[card.fruit] += card.count;
    }
  }
  return counts;
}

// 벨 조건: 동일 과일이 정확히 5개
export function checkBellCondition(topCards) {
  const counts = getFruitCounts(topCards);
  return Object.values(counts).some((v) => v === 5);
}

// 카드 수 재계산 (덱 + 공개 카드)
function recalcCardCounts(state) {
  const card_counts = {};
  for (const id of state.turn_order) {
    card_counts[id] = (state.decks[id]?.length ?? 0) + (state.top_cards[id] ? 1 : 0);
  }
  return { ...state, card_counts };
}

// 탈락 여부 갱신 (카드 0장인 플레이어)
function checkEliminations(state) {
  const eliminated = [...(state.eliminated || [])];
  for (const id of state.turn_order) {
    if (!eliminated.includes(id)) {
      const total = (state.decks[id]?.length ?? 0) + (state.top_cards[id] ? 1 : 0);
      if (total === 0) eliminated.push(id);
    }
  }
  return { ...state, eliminated };
}

// 올바른 벨: winnerId가 공개 카드 전부 가져감
export function collectCards(state, winnerId) {
  const s = deepClone(state);
  const gathered = shuffle(Object.values(s.top_cards).filter(Boolean));
  s.decks[winnerId] = [...s.decks[winnerId], ...gathered];
  for (const id of Object.keys(s.top_cards)) s.top_cards[id] = null;
  return checkEliminations(recalcCardCounts(s));
}

// 틀린 벨: loserId가 각 생존 플레이어에게 1장씩 줌 (덱에서)
export function penalizeWrongBell(state, loserId) {
  const s = deepClone(state);
  const others = s.turn_order.filter(
    (id) => id !== loserId && !s.eliminated.includes(id)
  );
  for (const otherId of others) {
    if (s.decks[loserId].length > 0) {
      const card = s.decks[loserId].shift();
      s.decks[otherId].push(card);
    }
  }
  // top_cards는 그대로 유지 (틀린 벨 후에도 공개 카드는 테이블에 남음)
  return checkEliminations(recalcCardCounts(s));
}

// 타임아웃: 공개 카드 전체 버림
export function discardTopCards(state) {
  const s = deepClone(state);
  for (const id of Object.keys(s.top_cards)) s.top_cards[id] = null;
  return recalcCardCounts(s);
}

// 다음 활성 플레이어 턴 인덱스 계산
export function advanceTurn(state, fromIndex) {
  const n = state.turn_order.length;
  let next = (fromIndex + 1) % n;
  for (let i = 0; i < n; i++) {
    if (!state.eliminated.includes(state.turn_order[next])) return next;
    next = (next + 1) % n;
  }
  return fromIndex;
}
