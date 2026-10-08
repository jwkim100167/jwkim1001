// ─────────────────────────────────────────────────────────────────
// 취향 알기 (Taste Match) — 33문항 전면 재설계
// 6개 카테고리: content / sensory / space / activity / relation / value
// jw_answer: '1' = 왼쪽, '2' = 오른쪽
// ─────────────────────────────────────────────────────────────────

export const questions = [
  // ── 콘텐츠·미디어 (1~5) ───────────────────────────────────────
  {
    id: 1, category: 'content', is_active: true,
    emoji_a: '📖', text_a: '책·웹툰·만화',
    emoji_b: '📺', text_b: '드라마·예능·유튜브',
    jw_answer: '2',
  },
  {
    id: 2, category: 'content', is_active: true,
    emoji_a: '🎮', text_a: '게임 (싱글·스토리)',
    emoji_b: '🎙️', text_b: '팟캐스트·오디오북',
    jw_answer: '1',
  },
  {
    id: 3, category: 'content', is_active: true,
    emoji_a: '🔥', text_a: '몰아보기 (정주행)',
    emoji_b: '📅', text_b: '매일 조금씩 꾸준히',
    jw_answer: '1',
  },
  {
    id: 4, category: 'content', is_active: true,
    emoji_a: '🎬', text_a: '영화관·극장 선호',
    emoji_b: '🏠', text_b: '집에서 OTT 선호',
    jw_answer: '2',
  },
  {
    id: 5, category: 'content', is_active: true,
    emoji_a: '📰', text_a: '정보·지식 콘텐츠',
    emoji_b: '🎭', text_b: '감성·오락 콘텐츠',
    jw_answer: '2',
  },

  // ── 감각·취향 (6~11) ───────────────────────────────────────────
  {
    id: 6, category: 'sensory', is_active: true,
    emoji_a: '🍰', text_a: '달달한 것',
    emoji_b: '🌶️', text_b: '매운 것',
    jw_answer: '1',
  },
  {
    id: 7, category: 'sensory', is_active: true,
    emoji_a: '🍜', text_a: '국물 요리',
    emoji_b: '🍳', text_b: '볶음·구이',
    jw_answer: '1',
  },
  {
    id: 8, category: 'sensory', is_active: true,
    emoji_a: '☕', text_a: '아메리카노',
    emoji_b: '🍫', text_b: '라떼·달달한 커피',
    jw_answer: '1',
  },
  {
    id: 9, category: 'sensory', is_active: true,
    emoji_a: '🥩', text_a: '고기',
    emoji_b: '🐟', text_b: '해산물',
    jw_answer: '1',
  },
  {
    id: 10, category: 'sensory', is_active: true,
    emoji_a: '🌸', text_a: '강한·진한 향',
    emoji_b: '🌿', text_b: '은은·자연스러운 향',
    jw_answer: '2',
  },
  {
    id: 11, category: 'sensory', is_active: true,
    emoji_a: '🍺', text_a: '술·음주 즐기기',
    emoji_b: '🧃', text_b: '안 마심·음료파',
    jw_answer: '1',
  },

  // ── 공간·사물 (12~16) ─────────────────────────────────────────
  {
    id: 12, category: 'space', is_active: true,
    emoji_a: '🖤', text_a: '미니멀·심플 패션',
    emoji_b: '🎨', text_b: '포인트·개성 패션',
    jw_answer: '1',
  },
  {
    id: 13, category: 'space', is_active: true,
    emoji_a: '🪵', text_a: '모던·우드톤 인테리어',
    emoji_b: '🕯️', text_b: '빈티지·감성 인테리어',
    jw_answer: '1',
  },
  {
    id: 14, category: 'space', is_active: true,
    emoji_a: '⚙️', text_a: '전자기기: 기능·성능',
    emoji_b: '✨', text_b: '디자인·브랜드 우선',
    jw_answer: '1',
  },
  {
    id: 15, category: 'space', is_active: true,
    emoji_a: '🏠', text_a: '집밥·직접 요리',
    emoji_b: '🛵', text_b: '배달·외식',
    jw_answer: '2',
  },
  {
    id: 16, category: 'space', is_active: true,
    emoji_a: '🚆', text_a: '대중교통·도보 선호',
    emoji_b: '🚗', text_b: '개인 이동수단 선호',
    jw_answer: '1',
  },

  // ── 활동·여행 (17~22) ─────────────────────────────────────────
  {
    id: 17, category: 'activity', is_active: true,
    emoji_a: '🏖️', text_a: '휴양·힐링 여행',
    emoji_b: '🏙️', text_b: '도시·문화 탐방',
    jw_answer: '2',
  },
  {
    id: 18, category: 'activity', is_active: true,
    emoji_a: '📋', text_a: '철저한 계획 여행',
    emoji_b: '🎲', text_b: '즉흥·자유 여행',
    jw_answer: '1',
  },
  {
    id: 19, category: 'activity', is_active: true,
    emoji_a: '🏠', text_a: '실내 취미 (독서·그림·게임)',
    emoji_b: '🏕️', text_b: '야외 취미 (캠핑·사진·스포츠)',
    jw_answer: '1',
  },
  {
    id: 20, category: 'activity', is_active: true,
    emoji_a: '👀', text_a: '스포츠 보는 것 좋아',
    emoji_b: '🏃', text_b: '직접 하는 것 좋아',
    jw_answer: '1',
  },
  {
    id: 21, category: 'activity', is_active: true,
    emoji_a: '📸', text_a: '기록·사진 남기기',
    emoji_b: '🧠', text_b: '경험 자체에 집중',
    jw_answer: '1',
  },
  {
    id: 22, category: 'activity', is_active: true,
    emoji_a: '🌍', text_a: '해외 여행 선호',
    emoji_b: '🇰🇷', text_b: '국내 여행 선호',
    jw_answer: '2',
  },

  // ── 사람·관계 (23~27) ─────────────────────────────────────────
  {
    id: 23, category: 'relation', is_active: true,
    emoji_a: '📞', text_a: '연락 자주·자잘하게',
    emoji_b: '🤫', text_b: '가끔이지만 깊게',
    jw_answer: '1',
  },
  {
    id: 24, category: 'relation', is_active: true,
    emoji_a: '👥', text_a: '친구 많이 (넓게)',
    emoji_b: '💞', text_b: '소수 깊게',
    jw_answer: '2',
  },
  {
    id: 25, category: 'relation', is_active: true,
    emoji_a: '🎉', text_a: '대규모 모임·파티',
    emoji_b: '🫂', text_b: '소규모 친밀한 자리',
    jw_answer: '2',
  },
  {
    id: 26, category: 'relation', is_active: true,
    emoji_a: '😂', text_a: '유머·개그 스타일',
    emoji_b: '🤝', text_b: '진지하고 속 깊게',
    jw_answer: '1',
  },
  {
    id: 27, category: 'relation', is_active: true,
    emoji_a: '🗣️', text_a: '갈등은 바로 해결',
    emoji_b: '⏳', text_b: '시간 두고 천천히',
    jw_answer: '1',
  },

  // ── 가치·성향 (28~33) ─────────────────────────────────────────
  {
    id: 28, category: 'value', is_active: true,
    emoji_a: '🏠', text_a: '집순이·홈파티',
    emoji_b: '🌆', text_b: '밖순이·활동적',
    jw_answer: '1',
  },
  {
    id: 29, category: 'value', is_active: true,
    emoji_a: '🌙', text_a: '저녁형·야행성',
    emoji_b: '🌅', text_b: '아침형·조기 기상',
    jw_answer: '1',
  },
  {
    id: 30, category: 'value', is_active: true,
    emoji_a: '🎟️', text_a: '소비: 경험 (여행·공연)',
    emoji_b: '📦', text_b: '물건 (옷·전자기기)',
    jw_answer: '2',
  },
  {
    id: 31, category: 'value', is_active: true,
    emoji_a: '🆕', text_a: '새로운 것 도전',
    emoji_b: '✅', text_b: '검증된 익숙한 것',
    jw_answer: '1',
  },
  {
    id: 32, category: 'value', is_active: true,
    emoji_a: '🙋', text_a: '분위기 주도',
    emoji_b: '👀', text_b: '조용히 맞추기',
    jw_answer: '1',
  },
  {
    id: 33, category: 'value', is_active: true,
    emoji_a: '🧠', text_a: '논리·이성',
    emoji_b: '❤️', text_b: '감성·직관',
    jw_answer: '1',
  },
];

// 카테고리별 메타 (라벨 + 질문 id 목록 + A/B 태그)
export const CATEGORY_META = {
  content:  {
    label: '콘텐츠',    ids: [1, 2, 3, 4, 5],
    A: '📖 몰입형 스토리텔러',  B: '🎮 인터랙티브 탐험가',
  },
  sensory:  {
    label: '감각·취향', ids: [6, 7, 8, 9, 10, 11],
    A: '🍰 달콤·깔끔 추구파',   B: '🌶️ 강렬·자극 추구파',
  },
  space:    {
    label: '공간·사물', ids: [12, 13, 14, 15, 16],
    A: '🖤 미니멀 실용주의자',   B: '🎨 감성 큐레이터',
  },
  activity: {
    label: '활동·여행', ids: [17, 18, 19, 20, 21, 22],
    A: '🏖️ 여유로운 힐링러',    B: '🏕️ 활동적 탐험가',
  },
  relation: {
    label: '사람·관계', ids: [23, 24, 25, 26, 27],
    A: '📞 적극적 연결형',       B: '💞 소수 정예주의자',
  },
  value:    {
    label: '가치·성향', ids: [28, 29, 30, 31, 32, 33],
    A: '🏠 집순이 경험파',       B: '🌆 밖순이 실용파',
  },
};

// 페르소나: Q28(집순이/밖순이) × Q12(미니멀/감성) × Q31(새것/익숙)
export const PERSONA_MAP = {
  '집+미니멀+새것': { name: '🔭 은둔 탐험가',          desc: '조용히 새로운 것을 탐구하는 독자적인 사람' },
  '집+미니멀+익숙': { name: '📚 나만의 세계',           desc: '심플한 공간에서 자신만의 루틴을 즐기는 사람' },
  '집+감성+새것':   { name: '🌿 조용한 감성 탐험가',    desc: '감성적인 공간에서 새로운 것을 수집하는 사람' },
  '집+감성+익숙':   { name: '🕯️ 감성 수집가',          desc: '익숙한 것들을 아름답게 가꾸며 사는 사람' },
  '밖+미니멀+새것': { name: '🚀 도시 개척자',           desc: '심플하게 무장하고 새로운 곳을 누비는 사람' },
  '밖+미니멀+익숙': { name: '⚡ 실용적 소셜라이저',    desc: '효율적으로 사람들과 어울리는 현실적인 사람' },
  '밖+감성+새것':   { name: '🌟 에너지 넘치는 탐험가',  desc: '어디서든 에너지를 발산하며 새로움을 찾는 사람' },
  '밖+감성+익숙':   { name: '🎉 소셜 감성러',           desc: '사람들과 함께하는 감성적인 순간을 사랑하는 사람' },
};
