// 2026 FIFA 월드컵 참가국 데이터
// 출처: FIFA 공식 대진 추첨 결과 (2025.12.05)
// 국기 이미지: flagcdn.com (ISO 3166-1 alpha-2 코드 기준)

const FLAG = (code) => `https://flagcdn.com/w40/${code}.png`;

export const WC_TEAMS = {
  // ── Group A ──
  1:  { name: '멕시코',             flagUrl: FLAG('mx'),     group: 'A' },
  2:  { name: '남아프리카공화국',    flagUrl: FLAG('za'),     group: 'A' },
  3:  { name: '대한민국',            flagUrl: FLAG('kr'),     group: 'A' },
  4:  { name: '체코',               flagUrl: FLAG('cz'),     group: 'A' },
  // ── Group B ──
  5:  { name: '캐나다',             flagUrl: FLAG('ca'),     group: 'B' },
  6:  { name: '보스니아 헤르체고비나', flagUrl: FLAG('ba'),   group: 'B' },
  7:  { name: '카타르',             flagUrl: FLAG('qa'),     group: 'B' },
  8:  { name: '스위스',             flagUrl: FLAG('ch'),     group: 'B' },
  // ── Group C ──
  9:  { name: '브라질',             flagUrl: FLAG('br'),     group: 'C' },
  10: { name: '모로코',             flagUrl: FLAG('ma'),     group: 'C' },
  11: { name: '아이티',             flagUrl: FLAG('ht'),     group: 'C' },
  12: { name: '스코틀랜드',         flagUrl: FLAG('gb-sct'), group: 'C' },
  // ── Group D ──
  13: { name: '미국',               flagUrl: FLAG('us'),     group: 'D' },
  14: { name: '파라과이',           flagUrl: FLAG('py'),     group: 'D' },
  15: { name: '호주',               flagUrl: FLAG('au'),     group: 'D' },
  16: { name: '터키',               flagUrl: FLAG('tr'),     group: 'D' },
  // ── Group E ──
  17: { name: '독일',               flagUrl: FLAG('de'),     group: 'E' },
  18: { name: '퀴라소',             flagUrl: FLAG('cw'),     group: 'E' },
  19: { name: '코트디부아르',        flagUrl: FLAG('ci'),     group: 'E' },
  20: { name: '에콰도르',           flagUrl: FLAG('ec'),     group: 'E' },
  // ── Group F ──
  21: { name: '네덜란드',           flagUrl: FLAG('nl'),     group: 'F' },
  22: { name: '일본',               flagUrl: FLAG('jp'),     group: 'F' },
  23: { name: '스웨덴',             flagUrl: FLAG('se'),     group: 'F' },
  24: { name: '튀니지',             flagUrl: FLAG('tn'),     group: 'F' },
  // ── Group G ──
  25: { name: '벨기에',             flagUrl: FLAG('be'),     group: 'G' },
  26: { name: '이집트',             flagUrl: FLAG('eg'),     group: 'G' },
  27: { name: '이란',               flagUrl: FLAG('ir'),     group: 'G' },
  28: { name: '뉴질랜드',           flagUrl: FLAG('nz'),     group: 'G' },
  // ── Group H ──
  29: { name: '스페인',             flagUrl: FLAG('es'),     group: 'H' },
  30: { name: '카보베르데',         flagUrl: FLAG('cv'),     group: 'H' },
  31: { name: '사우디아라비아',      flagUrl: FLAG('sa'),     group: 'H' },
  32: { name: '우루과이',           flagUrl: FLAG('uy'),     group: 'H' },
  // ── Group I ──
  33: { name: '프랑스',             flagUrl: FLAG('fr'),     group: 'I' },
  34: { name: '세네갈',             flagUrl: FLAG('sn'),     group: 'I' },
  35: { name: '이라크',             flagUrl: FLAG('iq'),     group: 'I' },
  36: { name: '노르웨이',           flagUrl: FLAG('no'),     group: 'I' },
  // ── Group J ──
  37: { name: '아르헨티나',         flagUrl: FLAG('ar'),     group: 'J' },
  38: { name: '알제리',             flagUrl: FLAG('dz'),     group: 'J' },
  39: { name: '오스트리아',         flagUrl: FLAG('at'),     group: 'J' },
  40: { name: '요르단',             flagUrl: FLAG('jo'),     group: 'J' },
  // ── Group K ──
  41: { name: '포르투갈',           flagUrl: FLAG('pt'),     group: 'K' },
  42: { name: '콩고민주공화국',      flagUrl: FLAG('cd'),     group: 'K' },
  43: { name: '우즈베키스탄',        flagUrl: FLAG('uz'),     group: 'K' },
  44: { name: '콜롬비아',           flagUrl: FLAG('co'),     group: 'K' },
  // ── Group L ──
  45: { name: '잉글랜드',           flagUrl: FLAG('gb-eng'), group: 'L' },
  46: { name: '크로아티아',         flagUrl: FLAG('hr'),     group: 'L' },
  47: { name: '가나',               flagUrl: FLAG('gh'),     group: 'L' },
  48: { name: '파나마',             flagUrl: FLAG('pa'),     group: 'L' },
};

export const WC_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// 그룹별 팀 배열
export const WC_TEAMS_BY_GROUP = WC_GROUPS.reduce((acc, group) => {
  acc[group] = Object.entries(WC_TEAMS)
    .filter(([, t]) => t.group === group)
    .map(([id, t]) => ({ id: parseInt(id), ...t }));
  return acc;
}, {});
