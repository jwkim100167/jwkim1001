// ─────────────────────────────────────────────────────────────────
// 취향 알기 (Taste Match) — 문항 데이터
// JW가 jwAnswer 값을 직접 수정해서 본인 취향을 설정하세요.
// '1' = 왼쪽 선택 (emojiA / textA)
// '2' = 오른쪽 선택 (emojiB / textB)
// ─────────────────────────────────────────────────────────────────

export const questions = [
  // ── 입맛 취향 (1~10) ──────────────────────────────────────────
  {
    id: 1,
    category: 'food',
    emojiA: '🍰', textA: '달달한 것',
    emojiB: '🌶️', textB: '매운 것',
    jwAnswer: '1',
  },
  {
    id: 2,
    category: 'food',
    emojiA: '🥩', textA: '고기',
    emojiB: '🐟', textB: '해산물',
    jwAnswer: '1',
  },
  {
    id: 3,
    category: 'food',
    emojiA: '🍗', textA: '치킨',
    emojiB: '🍕', textB: '피자',
    jwAnswer: '1',
  },
  {
    id: 4,
    category: 'food',
    emojiA: '☕', textA: '아메리카노',
    emojiB: '🍫', textB: '라떼·달달한 커피',
    jwAnswer: '1',
  },
  {
    id: 5,
    category: 'food',
    emojiA: '🍜', textA: '국물 (국·탕)',
    emojiB: '🍳', textB: '볶음·구이',
    jwAnswer: '1',
  },
  {
    id: 6,
    category: 'food',
    emojiA: '🍱', textA: '밥',
    emojiB: '🥖', textB: '빵·면',
    jwAnswer: '1',
  },
  {
    id: 7,
    category: 'food',
    emojiA: '🌮', textA: '양식·분식',
    emojiB: '🍚', textB: '한식',
    jwAnswer: '2',
  },
  {
    id: 8,
    category: 'food',
    emojiA: '🥤', textA: '탄산음료',
    emojiB: '🧃', textB: '과일음료·주스',
    jwAnswer: '1',
  },
  {
    id: 9,
    category: 'food',
    emojiA: '🍣', textA: '날 음식 (회·초밥)',
    emojiB: '🔥', textB: '익힌 음식',
    jwAnswer: '1',
  },
  {
    id: 10,
    category: 'food',
    emojiA: '🏠', textA: '집밥',
    emojiB: '🛵', textB: '배달·외식',
    jwAnswer: '2',
  },

  // ── 인간관계 취향 (11~20) ─────────────────────────────────────
  {
    id: 11,
    category: 'relation',
    emojiA: '📞', textA: '연락 자주',
    emojiB: '🤫', textB: '연락은 가끔, 만나면 진하게',
    jwAnswer: '1',
  },
  {
    id: 12,
    category: 'relation',
    emojiA: '🏠', textA: '집에서 쉬기',
    emojiB: '🌆', textB: '밖에서 놀기',
    jwAnswer: '1',
  },
  {
    id: 13,
    category: 'relation',
    emojiA: '👥', textA: '친구 많이 (넓게)',
    emojiB: '💞', textB: '친구 소수 (깊게)',
    jwAnswer: '2',
  },
  {
    id: 14,
    category: 'relation',
    emojiA: '📅', textA: '계획파',
    emojiB: '🎲', textB: '즉흥파',
    jwAnswer: '1',
  },
  {
    id: 15,
    category: 'relation',
    emojiA: '🗣️', textA: '갈등은 바로 해결',
    emojiB: '⏳', textB: '시간 두고 천천히',
    jwAnswer: '1',
  },
  {
    id: 16,
    category: 'relation',
    emojiA: '🧠', textA: '논리·이성',
    emojiB: '❤️', textB: '감성·직관',
    jwAnswer: '1',
  },
  {
    id: 17,
    category: 'relation',
    emojiA: '🙋', textA: '분위기 주도',
    emojiB: '👀', textB: '조용히 맞추기',
    jwAnswer: '1',
  },
  {
    id: 18,
    category: 'relation',
    emojiA: '🎁', textA: '기념일 철저히',
    emojiB: '📆', textB: '일상이 중요',
    jwAnswer: '1',
  },
  {
    id: 19,
    category: 'relation',
    emojiA: '😂', textA: '유머·개그 스타일',
    emojiB: '🤝', textB: '진지하고 속 깊게',
    jwAnswer: '1',
  },
  {
    id: 20,
    category: 'relation',
    emojiA: '💬', textA: '표현을 말로',
    emojiB: '🤗', textB: '표현을 행동·선물로',
    jwAnswer: '1',
  },
];
