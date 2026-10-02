// 음악 취향 유형 데이터
// 4개 차원: 템포(H/C) × 감성(B/D) × 장르(M/A) × 감상법(L/S) = 16가지 유형

export const MUSIC_TYPES = [
  // ── 뜨거운(H) + 밝음(B) ──────────────────────────────────────
  {
    code: 'HBML',
    name: '떼창 응원단장',
    tagline: '신나는 가요 가사를 통째로 외우고, 노래방에서 제일 먼저 마이크를 잡는 사람',
    description:
      '플레이리스트는 언제나 업템포 아이돌·가요 위주. 가사 한 줄 한 줄을 소중히 외워두고, 드라이브할 때도 버스 안에서도 입이 먼저 움직입니다. 좋아하는 아티스트 이야기라면 몇 시간이고 할 수 있어요.',
    loves: ['떼창 가능한 후렴구', '응원 파트가 있는 노래', '밝고 청량한 아이돌 팝'],
    avoid: ['가사 없는 인스트루멘탈', '너무 마이너한 인디'],
    best_match: 'HBAL',
    opposite: 'CDAS',
  },
  {
    code: 'HBMS',
    name: '댄스플로어 지배자',
    tagline: '비트 한 방에 몸이 먼저 반응하고, 프로덕션이 좋으면 말 없이 고개부터 끄덕이는 사람',
    description:
      '가사보다 사운드가 먼저 귀에 꽂힙니다. 편곡이 독특하거나 드롭이 강렬하면 그 노래는 이미 플레이리스트에 추가됩니다. 클럽이든 방에서든, 좋은 비트 앞에선 몸이 먼저 알아요.',
    loves: ['강한 드롭과 훅', '세련된 프로덕션', '안무 영상이 있는 퍼포먼스 곡'],
    avoid: ['편곡 없이 밋밋한 곡', '라이브 위주 무반주 공연'],
    best_match: 'HBAS',
    opposite: 'CDAL',
  },
  {
    code: 'HBAL',
    name: '청량 인디 활동가',
    tagline: '신나고 밝으면서도 진짜 이야기가 담긴 인디 노래를 찾아다니는 사람',
    description:
      '에너지 넘치는 인디·밴드 음악을 좋아하는데, 가사에 이야기가 있어야 완벽합니다. 잔나비, 혁오, DAY6 같은 밴드의 청량하고 생동감 있는 노래들이 딱 취향. 주류냐 비주류냐보단 "진짜 느낌"이 있는지가 기준이에요.',
    loves: ['에너지 넘치는 밴드 사운드', '구체적이고 생생한 가사', '라이브 느낌 나는 녹음'],
    avoid: ['기계적으로 생산된 느낌의 아이돌 팝'],
    best_match: 'HBML',
    opposite: 'CDMS',
  },
  {
    code: 'HBAS',
    name: '사운드 혁신가',
    tagline: '뭔가 독특한 사운드·편곡이 있는 인디·R&B를 가장 먼저 찾아 듣는 사람',
    description:
      '남들이 모르는 곡을 먼저 찾아 듣는 재미가 있습니다. 신선한 리듬, 독특한 악기 조합, 실험적 프로덕션에 끌리고, 업템포이면서 밝은 분위기를 좋아해요. 딘, 코드 쿤스트, pH-1 같은 아티스트가 주로 플레이리스트에 있습니다.',
    loves: ['실험적 프로덕션', '장르의 경계를 넘나드는 사운드', '신선한 비트'],
    avoid: ['식상한 공식을 그대로 따르는 곡'],
    best_match: 'HBMS',
    opposite: 'CDML',
  },
  // ── 뜨거운(H) + 어두움(D) ─────────────────────────────────────
  {
    code: 'HDML',
    name: '감성 폭발가',
    tagline: '드라마틱한 발라드 가사에 울면서 따라 부르는 사람. 감정을 숨기지 않아요',
    description:
      '빠르고 강렬하면서도 진하고 슬픈 노래가 최고입니다. 박효신, 임창정, 나얼처럼 폭발적인 고음과 무거운 감정을 동시에 가진 노래에 전율합니다. 가사를 외워서 함께 부르면서 감정을 쏟아내는 게 최고의 힐링이에요.',
    loves: ['고음 폭발 클라이맥스', '이별·그리움·후회를 담은 가사', '듣는 내내 감정이 오르는 곡'],
    avoid: ['차갑고 무심한 분위기의 곡', '감정 없이 쿨한 가사'],
    best_match: 'HDAL',
    opposite: 'CBAS',
  },
  {
    code: 'HDMS',
    name: '카리스마 사냥꾼',
    tagline: '강렬하고 어두운 사운드에서 뿜어나오는 카리스마에 전율하는 사람',
    description:
      '빅뱅, 2NE1, 선미처럼 강렬하고 어두운 아우라를 가진 가요·팝이 딱 취향입니다. 가사보단 사운드가 주는 카리스마와 파워감이 먼저입니다. 들었을 때 "이 사람 분위기 있다" 싶은 곡들이 플레이리스트를 가득 채우고 있어요.',
    loves: ['강렬한 보컬', '어두운 팝 프로덕션', '드라마틱한 무대 연출 느낌'],
    avoid: ['잔잔하고 평화로운 곡', '너무 밝고 귀여운 분위기'],
    best_match: 'HDAS',
    opposite: 'CBAL',
  },
  {
    code: 'HDAL',
    name: '다크 시인',
    tagline: '시처럼 진하고 어두운 인디 가사에 밤마다 빠져드는 사람',
    description:
      '오혁, 검정치마, 적재처럼 인디씬에서 나오는 밀도 높은 가사를 사랑합니다. 단어 하나하나를 음미하고, 모호한 은유에서 나만의 해석을 찾는 과정이 즐거워요. 빠르고 강렬하면서도 어두운 인디 음악은 밤에 들어야 제맛입니다.',
    loves: ['시적인 가사', '어두운 인디 특유의 날 것 감성', '감정을 에둘러 표현한 노래'],
    avoid: ['달달하고 가벼운 가사', '주류 상업 팝'],
    best_match: 'HDML',
    opposite: 'CBMS',
  },
  {
    code: 'HDAS',
    name: '음악 반란군',
    tagline: '헤비하고 어두운 인디·힙합 사운드를 남들보다 먼저 발굴하는 사람',
    description:
      '빈지노, 기리보이, 크루셜스타 같은 언더그라운드 힙합이나 어두운 색채의 인디 사운드를 좋아합니다. 가사보단 비트와 플로우, 사운드의 텍스처에 집중하고, 주류에서 외면하는 독특한 음악을 찾아다니는 재미가 있어요.',
    loves: ['헤비한 비트', '언더그라운드 힙합', '어두운 인디·얼터너티브'],
    avoid: ['음원차트 상위권의 흔한 발라드', '너무 달달한 가요'],
    best_match: 'HDMS',
    opposite: 'CBML',
  },
  // ── 서늘한(C) + 밝음(B) ──────────────────────────────────────
  {
    code: 'CBML',
    name: '봄날 서정가',
    tagline: '따뜻한 가사의 잔잔한 가요로 위로받고, 가사 한 줄에 오래 머무는 사람',
    description:
      'IU, 폴킴, 김필처럼 잔잔하고 따뜻한 가요 가사가 딱입니다. 자극 없이 노래 하나가 마음을 포근하게 감싸는 느낌을 좋아해요. 가사를 읽듯 들으면서 "이 부분 진짜 좋다"며 반복 재생하는 타입입니다.',
    loves: ['따뜻하고 위로가 되는 가사', '깔끔한 어쿠스틱 편곡', '잔잔하게 감동을 주는 곡'],
    avoid: ['귀가 찢어질 것 같은 업템포', '가사가 없는 전자음악'],
    best_match: 'CBAL',
    opposite: 'HDAS',
  },
  {
    code: 'CBMS',
    name: '청량 멜로디 수집가',
    tagline: '귀에 쏙 들어오는 깔끔한 팝 멜로디를 수집하는 귀 취향 부자',
    description:
      '멜로망스, 볼빨간사춘기 팝풍 곡처럼 깔끔하고 청량한 멜로디 라인이 있는 가요를 좋아합니다. 가사보단 귀에 꽂히는 훅과 편곡의 완성도를 먼저 봐요. "이 멜로디 진짜 예쁘다" 싶은 곡들이 플레이리스트에 가득합니다.',
    loves: ['귀에 쏙 들어오는 훅', '세련된 팝 편곡', '청량한 보컬'],
    avoid: ['날 것의 감성이 너무 강한 인디', '지저분한 사운드'],
    best_match: 'CBAS',
    opposite: 'HDAL',
  },
  {
    code: 'CBAL',
    name: '인디 서정시인',
    tagline: '따뜻하고 잔잔한 인디 가사에 마음을 여는 감수성 풍부한 사람',
    description:
      '이소라, 요조, 10cm처럼 인디씬의 서정적이고 잔잔한 노래를 좋아합니다. 가사 한 줄이 마음에 오래 남고, 그 노래를 어떤 계절에 어떤 상황에서 들어야 하는지 아는 사람이에요. 음악 취향이 곧 삶의 감수성과 연결되어 있습니다.',
    loves: ['서정적인 인디 가사', '따뜻한 어쿠스틱 사운드', '감수성 있는 목소리'],
    avoid: ['자극적인 사운드', '가사 없는 전자 음악'],
    best_match: 'CBML',
    opposite: 'HDMS',
  },
  {
    code: 'CBAS',
    name: '미니멀 사운드 탐구자',
    tagline: '군더더기 없는 잔잔한 인디 사운드·질감을 수집하는 귀 높은 사람',
    description:
      '새소년, 술탄오브더디스코, 혁오처럼 미니멀하고 세련된 인디 사운드를 좋아합니다. 복잡한 편곡보다 딱 필요한 만큼만 들어간 악기, 공백을 활용한 사운드 디자인이 귀를 자극해요. 밝고 청량한 분위기 안에서도 사운드가 주는 쾌감을 즐깁니다.',
    loves: ['미니멀한 편곡', '공백이 있는 사운드', '세련된 인디 프로덕션'],
    avoid: ['과도하게 두꺼운 편곡', '화려한 아이돌 퍼포먼스 곡'],
    best_match: 'CBMS',
    opposite: 'HDML',
  },
  // ── 서늘한(C) + 어두움(D) ─────────────────────────────────────
  {
    code: 'CDML',
    name: '새벽 감성 수집가',
    tagline: '이별·그리움 발라드 가사로 새벽을 보내는 사람. 남들이 다 자는 시간에 혼자 듣는 노래가 있어요',
    description:
      '버스커버스커, 김광석, 이문세처럼 잔잔하고 어두운 발라드 가사를 좋아합니다. 새벽에 혼자 헤드폰 끼고 가사를 읽으며 감정에 잠기는 시간이 소중해요. 슬픔도 아름다울 수 있다는 걸 아는 사람입니다.',
    loves: ['이별과 그리움의 가사', '차분하고 여운 있는 발라드', '감성적인 라이브 버전'],
    avoid: ['시끄럽고 자극적인 음악', '너무 의미 없는 가사'],
    best_match: 'CDAL',
    opposite: 'HBAS',
  },
  {
    code: 'CDMS',
    name: '심야 무드메이커',
    tagline: '저음 R&B·어두운 팝 사운드로 분위기를 만드는 사람. 음악이 곧 인테리어예요',
    description:
      '헤이즈, 딘, pH-1처럼 무드 있는 R&B·어두운 팝 사운드를 좋아합니다. 가사보다 사운드가 만드는 분위기에 집중하고, 밤의 공기와 어울리는 곡들을 큐레이션하는 걸 즐깁니다. 음악을 배경으로 깔고 생활하는 타입이에요.',
    loves: ['무드 있는 R&B', '잔잔하고 어두운 팝', '사운드가 분위기를 만드는 곡'],
    avoid: ['시끄럽고 자극적인 클럽 음악', '너무 밝고 청량한 아이돌 팝'],
    best_match: 'CDAS',
    opposite: 'HBAL',
  },
  {
    code: 'CDAL',
    name: '어두운 서정 탐독자',
    tagline: '시적이고 내밀한 어두운 인디 가사를 읽듯 듣는 사람. 가사집이 있으면 같이 펴요',
    description:
      '가호, 권진아, 장범준처럼 인디씬의 내밀하고 어두운 서정 노래를 좋아합니다. 가사 안에 숨겨진 감정을 파고들고, 한 곡을 수십 번 반복하며 새로운 뉘앙스를 발견하는 재미를 알아요. 음악을 삶의 언어로 쓰는 사람입니다.',
    loves: ['내밀하고 은유적인 가사', '어두운 인디 서정', '반복 재생 가능한 깊이 있는 곡'],
    avoid: ['가볍고 소비적인 팝', '가사 없는 음악'],
    best_match: 'CDML',
    opposite: 'HBMS',
  },
  {
    code: 'CDAS',
    name: '음악 지하세계 탐험가',
    tagline: '실험적이고 어두운 인디·장르 사운드를 남들보다 먼저 발굴하는 음악 탐험가',
    description:
      '혁오의 어두운 트랙, 새소년의 실험적 사운드, 언더그라운드 인디 아티스트들을 좋아합니다. 편안하고 깔끔한 것보다 불편하더라도 새롭고 독특한 사운드가 좋습니다. 주류에서 외면받아도 예술적으로 완성도 높은 음악을 찾는 탐험가예요.',
    loves: ['실험적인 사운드', '장르의 경계를 무너뜨리는 곡', '어둡고 독특한 인디'],
    avoid: ['차트를 위해 만든 상업 음악', '공식대로 만든 아이돌 팝'],
    best_match: 'CDMS',
    opposite: 'HBML',
  },
];

export function findType(code) {
  return MUSIC_TYPES.find(t => t.code === code) || null;
}

// 36개 질문 정의
// dim: 'tempo' | 'mood' | 'genre' | 'focus'
// songA/songB: 노래 예시 질문 (retrySongA/B: 안 들어봤어요 시 재시도용)
export const QUESTIONS = [
  // ── 그룹 1: 템포 (H/C) ──────────────────────────────────────
  {
    id: 0, group: 'tempo', groupLabel: '템포',
    q: '플레이리스트 대부분이 어느 쪽이야?',
    a: '신나고 빠른 곡들로 가득', b: '잔잔하고 여유로운 곡들로 가득',
    dim: 'tempo', aDir: 'H', bDir: 'C',
  },
  {
    id: 1, group: 'tempo', groupLabel: '템포',
    q: '기분 전환할 때 음악을 튼다면?',
    a: '기운 올려주는 업템포 한 방', b: '차분히 가라앉혀주는 잔잔한 곡',
    dim: 'tempo', aDir: 'H', bDir: 'C',
  },
  {
    id: 2, group: 'tempo', groupLabel: '템포',
    q: '노래방에서 주로 어떤 곡을 골라?',
    a: '흥 오르는 댄스·힙합 위주', b: '감성 발라드 위주',
    dim: 'tempo', aDir: 'H', bDir: 'C',
  },
  {
    id: 3, group: 'tempo', groupLabel: '템포',
    q: '드라이브할 때 창문 열고 틀고 싶은 노래는?',
    a: '크게 틀고 같이 부르고 싶은 신나는 곡', b: '바람 맞으며 조용히 듣고 싶은 잔잔한 곡',
    dim: 'tempo', aDir: 'H', bDir: 'C',
  },
  {
    id: 4, group: 'tempo', groupLabel: '템포',
    q: '아침에 일어나서 틀고 싶은 음악은?',
    a: '기운 올려주는 모닝 업템포', b: '천천히 깨어나는 잔잔한 아침 음악',
    dim: 'tempo', aDir: 'H', bDir: 'C',
  },
  {
    id: 5, group: 'tempo', groupLabel: '템포',
    q: '어느 노래가 더 끌려?',
    dim: 'tempo', aDir: 'H', bDir: 'C',
    songA: { title: '불타오르네', artist: 'BTS', year: 2016, reason: '뜨겁게 몰아치는 에너지' },
    songB: { title: '밤편지', artist: 'IU', year: 2017, reason: '잔잔하게 스며드는 감성' },
    retrySongA: { title: 'Hype Boy', artist: '뉴진스', year: 2022, reason: '신나고 통통 튀는 청량 팝' },
    retrySongB: { title: '모든 날 모든 순간', artist: '폴킴', year: 2017, reason: '따뜻하게 감싸는 발라드' },
  },
  {
    id: 6, group: 'tempo', groupLabel: '템포',
    q: '산책할 때 이어폰에서 나오는 음악은?',
    a: '발걸음이 빨라지는 템포', b: '천천히 걷게 만드는 여유로운 템포',
    dim: 'tempo', aDir: 'H', bDir: 'C',
  },
  {
    id: 7, group: 'tempo', groupLabel: '템포',
    q: '집에서 혼자 있을 때 배경음악으로 트는 음악은?',
    a: '집안이 시끌벅적해지는 업비트', b: '조용히 공간을 채우는 잔잔한 음악',
    dim: 'tempo', aDir: 'H', bDir: 'C',
  },
  // ── 그룹 2: 감성 (B/D) ──────────────────────────────────────
  {
    id: 8, group: 'mood', groupLabel: '감성',
    q: '감정적으로 더 끌리는 노래 분위기는?',
    a: '밝고 설레는 느낌 — 들으면 기분이 좋아지는', b: '어둡고 진한 느낌 — 들으면 감정이 울컥하는',
    dim: 'mood', aDir: 'B', bDir: 'D',
  },
  {
    id: 9, group: 'mood', groupLabel: '감성',
    q: '사랑 노래라면 어떤 이야기가 더 좋아?',
    a: '설레고 행복한 연애 이야기', b: '이별하고 그리워하는 이야기',
    dim: 'mood', aDir: 'B', bDir: 'D',
  },
  {
    id: 10, group: 'mood', groupLabel: '감성',
    q: '노래를 듣고 나서 어떤 감정이 더 좋아?',
    a: '기분이 좋아지고 에너지가 생기는 느낌', b: '마음이 뭉클하고 여운이 남는 느낌',
    dim: 'mood', aDir: 'B', bDir: 'D',
  },
  {
    id: 11, group: 'mood', groupLabel: '감성',
    q: '비 오는 날 듣는 음악 분위기는?',
    a: '비 오는 날도 기분 올려주는 밝은 노래', b: '비 오는 날 더 잘 어울리는 감성 노래',
    dim: 'mood', aDir: 'B', bDir: 'D',
  },
  {
    id: 12, group: 'mood', groupLabel: '감성',
    q: '어느 노래가 더 끌려?',
    dim: 'mood', aDir: 'B', bDir: 'D',
    songA: { title: '좋은날', artist: 'IU', year: 2010, reason: '청량하고 설레는 감성이 가득한 곡' },
    songB: { title: '벚꽃엔딩', artist: '버스커버스커', year: 2012, reason: '달콤하면서도 쓸쓸한 그리움의 감성' },
    retrySongA: { title: 'Blueming', artist: 'IU', year: 2019, reason: '사랑의 설렘과 청량함을 담은 팝' },
    retrySongB: { title: '저 별', artist: '헤이즈', year: 2016, reason: '잔잔하고 어두운 감성의 이별 노래' },
  },
  {
    id: 13, group: 'mood', groupLabel: '감성',
    q: '기억에 오래 남는 노래의 색깔은?',
    a: '봄볕처럼 따뜻하고 밝은 노래', b: '새벽처럼 어둡고 깊은 노래',
    dim: 'mood', aDir: 'B', bDir: 'D',
  },
  {
    id: 14, group: 'mood', groupLabel: '감성',
    q: '여름 한낮 vs 겨울 새벽 — 어느 시간대의 감성이 더 잘 어울리는 음악을 좋아해?',
    a: '여름 한낮처럼 밝고 선명한 분위기', b: '겨울 새벽처럼 어둡고 조용한 분위기',
    dim: 'mood', aDir: 'B', bDir: 'D',
  },
  {
    id: 15, group: 'mood', groupLabel: '감성',
    q: '친구에게 음악을 추천한다면?',
    a: '"기분 올라갈 거야" 하고 추천하는 밝은 곡', b: '"이거 들으면 감성 폭발이야" 하고 추천하는 진한 곡',
    dim: 'mood', aDir: 'B', bDir: 'D',
  },
  // ── 그룹 3: 장르 (M/A) ──────────────────────────────────────
  {
    id: 16, group: 'genre', groupLabel: '장르',
    q: '음악을 고를 때 기준이 뭐야?',
    a: '음원 차트·인기 아티스트 위주로 찾아 들어', b: '주류보다 숨어있는 아티스트를 찾아 들어',
    dim: 'genre', aDir: 'M', bDir: 'A',
  },
  {
    id: 17, group: 'genre', groupLabel: '장르',
    q: '좋아하는 음악의 무대는?',
    a: '대형 기획사·뮤직쇼·음방 무대', b: '소규모 인디 공연장·라이브 클럽',
    dim: 'genre', aDir: 'M', bDir: 'A',
  },
  {
    id: 18, group: 'genre', groupLabel: '장르',
    q: '노래 스타일로는 어느 쪽이 더 끌려?',
    a: '아이돌·가요·발라드 같은 주류 음악', b: '인디·힙합·밴드 같은 비주류 음악',
    dim: 'genre', aDir: 'M', bDir: 'A',
  },
  {
    id: 19, group: 'genre', groupLabel: '장르',
    q: '어느 노래가 더 끌려?',
    dim: 'genre', aDir: 'M', bDir: 'A',
    songA: { title: 'Dynamite', artist: 'BTS', year: 2020, reason: '전 세계를 흔든 K팝의 대표 트랙' },
    songB: { title: '위잉위잉', artist: '혁오', year: 2015, reason: '인디씬의 명곡, 독특한 분위기' },
    retrySongA: { title: 'Ditto', artist: '뉴진스', year: 2022, reason: '압도적 스트리밍을 기록한 팝' },
    retrySongB: { title: '봄날, 봄', artist: '장범준', year: 2014, reason: '인디 감성의 따뜻한 봄날 노래' },
  },
  {
    id: 20, group: 'genre', groupLabel: '장르',
    q: '좋아하는 공연 스타일은?',
    a: '화려한 무대 연출의 대형 콘서트', b: '아티스트와 가까이서 호흡하는 소규모 공연',
    dim: 'genre', aDir: 'M', bDir: 'A',
  },
  {
    id: 21, group: 'genre', groupLabel: '장르',
    q: '새 아티스트를 발견하는 방법은?',
    a: '차트·추천 알고리즘·SNS 바이럴', b: '인디씬 탐방·음악 커뮤니티·지인 추천',
    dim: 'genre', aDir: 'M', bDir: 'A',
  },
  {
    id: 22, group: 'genre', groupLabel: '장르',
    q: '좋아하는 음악의 탄생 배경은?',
    a: '대형 팀이 만들어낸 완성도 높은 상업 음악', b: '아티스트가 직접 쓰고 만든 자작곡·독립 음반',
    dim: 'genre', aDir: 'M', bDir: 'A',
  },
  // ── 그룹 4: 감상법 (L/S) ──────────────────────────────────────
  {
    id: 23, group: 'focus', groupLabel: '감상법',
    q: '노래를 들을 때 뭐에 더 집중해?',
    a: '가사가 무슨 말인지, 이야기가 어떻게 흘러가는지', b: '멜로디 라인, 편곡, 사운드의 질감',
    dim: 'focus', aDir: 'L', bDir: 'S',
  },
  {
    id: 24, group: 'focus', groupLabel: '감상법',
    q: '좋은 노래의 기준은?',
    a: '"가사가 진짜 공감됐어" — 가사가 마음에 꽂히는 곡', b: '"편곡이 천재다" — 사운드·멜로디가 완벽한 곡',
    dim: 'focus', aDir: 'L', bDir: 'S',
  },
  {
    id: 25, group: 'focus', groupLabel: '감상법',
    q: '새 곡을 들을 때 어떻게 즐겨?',
    a: '가사부터 찾아서 읽으면서 들어', b: '귀로 먼저 들어보고 나중에 가사 확인해',
    dim: 'focus', aDir: 'L', bDir: 'S',
  },
  {
    id: 26, group: 'focus', groupLabel: '감상법',
    q: '어느 노래가 더 끌려?',
    dim: 'focus', aDir: 'L', bDir: 'S',
    songA: { title: '소격동', artist: 'IU', year: 2014, reason: '시처럼 정교하게 짜여진 가사의 명곡' },
    songB: { title: 'Savage', artist: 'aespa', year: 2021, reason: '강렬하고 중독적인 사운드 프로덕션' },
    retrySongA: { title: '그리워서', artist: '권진아', year: 2016, reason: '마음을 찌르는 진솔한 가사' },
    retrySongB: { title: 'Any Song', artist: '지코', year: 2020, reason: '귀를 사로잡는 중독적인 비트' },
  },
  {
    id: 27, group: 'focus', groupLabel: '감상법',
    q: '노래방에서 노래를 고를 때?',
    a: '가사를 잘 아는 노래, 따라부를 수 있는 노래', b: '편곡이 좋고 노래 자체가 좋은 노래',
    dim: 'focus', aDir: 'L', bDir: 'S',
  },
  {
    id: 28, group: 'focus', groupLabel: '감상법',
    q: '공연을 즐기는 방식은?',
    a: '가사를 같이 외치며 가수와 호흡하는 떼창', b: '라이브 사운드에 집중하며 몰입하는 감상',
    dim: 'focus', aDir: 'L', bDir: 'S',
  },
  {
    id: 29, group: 'focus', groupLabel: '감상법',
    q: '어떤 노래가 더 오래 플레이리스트에 남아?',
    a: '가사가 계속 생각나는 노래', b: '멜로디·사운드가 계속 귀에 맴도는 노래',
    dim: 'focus', aDir: 'L', bDir: 'S',
  },
  // ── 노래 VS 노래 ─────────────────────────────────────────────
  {
    id: 30, group: 'song_vs', groupLabel: '노래 VS 노래',
    q: '어느 노래가 더 끌려?',
    dim: 'tempo', aDir: 'H', bDir: 'C',
    songA: { title: 'DDU-DU DDU-DU', artist: '블랙핑크', year: 2018, reason: '강렬하고 파워풀한 퍼포먼스 팝' },
    songB: { title: '동에 번쩍', artist: '멜로망스', year: 2018, reason: '잔잔하게 감동을 주는 팝 발라드' },
  },
  {
    id: 31, group: 'song_vs', groupLabel: '노래 VS 노래',
    q: '어느 노래가 더 끌려?',
    dim: 'mood', aDir: 'B', bDir: 'D',
    songA: { title: '우주를 줄게', artist: '볼빨간사춘기', year: 2017, reason: '달콤하고 설레는 사랑 노래' },
    songB: { title: '봄날', artist: 'BTS', year: 2017, reason: '그리움과 쓸쓸함이 담긴 감성 팝' },
  },
  {
    id: 32, group: 'song_vs', groupLabel: '노래 VS 노래',
    q: '어느 노래가 더 끌려?',
    dim: 'genre', aDir: 'M', bDir: 'A',
    songA: { title: '라이터', artist: '지코 (feat. G.O.D)', year: 2017, reason: '주류 차트를 장악한 국민 힙합' },
    songB: { title: '수면 위를 걷는 법', artist: '잔나비', year: 2015, reason: '인디씬의 감성 있는 밴드 음악' },
  },
  {
    id: 33, group: 'song_vs', groupLabel: '노래 VS 노래',
    q: '어느 노래가 더 끌려?',
    dim: 'focus', aDir: 'L', bDir: 'S',
    songA: { title: '나의 사춘기에게', artist: '마마무', year: 2015, reason: '가사 한 줄 한 줄 공감되는 성장 이야기' },
    songB: { title: 'Kill This Love', artist: '블랙핑크', year: 2019, reason: '가사보다 사운드 자체가 강렬한 곡' },
  },
  {
    id: 34, group: 'song_vs', groupLabel: '노래 VS 노래',
    q: '어느 노래가 더 끌려?',
    dim: 'mood', aDir: 'D', bDir: 'B',
    songA: { title: '나의 이름', artist: '이수', year: 2018, reason: '깊고 무거운 감성의 발라드' },
    songB: { title: 'Feel My Rhythm', artist: '레드벨벳', year: 2022, reason: '밝고 우아한 청량 팝' },
  },
];

export const GROUP_ICONS = {
  tempo:    '🎵',
  mood:     '🎭',
  genre:    '🎸',
  focus:    '💬',
  song_vs:  '🎤',
};
