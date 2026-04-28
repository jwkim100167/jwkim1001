const SUITS = ['H', 'D', 'C', 'S'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateDeck() {
  const deck = [];
  for (const suit of SUITS)
    for (const value of VALUES)
      deck.push(value + suit);
  deck.push('JKR', 'JKB');
  return shuffle(deck);
}

/** 카드 점수 반환 (조커=-1, A=1, 2-10=숫자, J/Q/K=10) */
export function getCardValue(card) {
  if (card === 'JKR' || card === 'JKB') return -1;
  const v = card.slice(0, -1);
  if (v === 'A') return 1;
  if (v === 'J' || v === 'Q' || v === 'K') return 10;
  return parseInt(v, 10);
}

/** 표시용 값 문자열 (A, 2~10, J, Q, K, JK) */
export function getCardDisplayValue(card) {
  if (card === 'JKR' || card === 'JKB') return 'JK';
  return card.slice(0, -1);
}

/** 수트 반환 (H/D/C/S, 조커는 'JK') */
export function getCardSuit(card) {
  if (card === 'JKR' || card === 'JKB') return 'JK';
  return card.slice(-1);
}

/** 손패 합계 */
export function getHandScore(hand) {
  return hand.reduce((sum, c) => sum + getCardValue(c), 0);
}

/** 두 카드가 같은 숫자인지 (J/Q/K 서로 매칭 가능) */
export function cardsMatch(a, b) {
  return getCardValue(a) === getCardValue(b);
}

/** 다음 플레이어 id */
export function getNextPlayerId(playerOrder, currentId) {
  const idx = playerOrder.indexOf(currentId);
  return playerOrder[(idx + 1) % playerOrder.length];
}

/** 게임 상태 초기화 */
export function initGame(players) {
  const deck = generateDeck();
  const hands = {};
  const faceUp = {};
  const viewingReady = {};

  for (const p of players) {
    hands[p.id] = [deck.pop(), deck.pop(), deck.pop(), deck.pop()];
    faceUp[p.id] = [false, false, false, false];
    viewingReady[p.id] = false;
  }

  return {
    phase: 'viewing',           // viewing | playing | cobra | ended
    deck,
    discard_pile: [],
    player_order: players.map(p => p.id),
    current_player_id: players[0].id,
    turn_phase: 'draw',         // draw | action
    drawn_card: null,
    hands,
    face_up: faceUp,
    viewing_ready: viewingReady,
    cobra_caller_id: null,
    scores: {},
  };
}
