// 사주 계산 유틸 (엔터테인먼트용 간략 버전)
// 연주(年柱) + 일주(日柱) 계산, 오행 분포, 오행 관계 분류

export const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const JI  = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const ZODIAC = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];

export const GAN_ELEMENT = {
  甲: '木', 乙: '木',
  丙: '火', 丁: '火',
  戊: '土', 己: '土',
  庚: '金', 辛: '金',
  壬: '水', 癸: '水',
};

export const JI_ELEMENT = {
  子: '水', 丑: '土', 寅: '木', 卯: '木',
  辰: '土', 巳: '火', 午: '火', 未: '土',
  申: '金', 酉: '金', 戌: '土', 亥: '水',
};

// 오행 한국어 이름
export const ELEMENT_KOR = { 木: '목(木)', 火: '화(火)', 土: '토(土)', 金: '금(金)', 水: '수(水)' };

// 연주(年柱) 계산
// 기준: 1984년 = 甲子年, 입춘(2월 4일) 이전이면 전년도 간지 사용
export function getYearGanji(year, month, day) {
  const y = (month < 2 || (month === 2 && day < 4)) ? year - 1 : year;
  const offset = ((y - 1984) % 60 + 60) % 60;
  return {
    gan: GAN[offset % 10],
    ji: JI[offset % 12],
    zodiac: ZODIAC[offset % 12],
  };
}

// 일주(日柱) 계산
// 기준: 1900년 1월 31일 = 甲子日
export function getDayGanji(year, month, day) {
  const base = new Date(1900, 0, 31);
  const target = new Date(year, month - 1, day);
  const diff = Math.round((target - base) / 86400000);
  return {
    gan: GAN[((diff % 10) + 10) % 10],
    ji:  JI[((diff % 12) + 12) % 12],
  };
}

// 오행 상생·상극 테이블
const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }; // 상생 (내가 생해줌)
const OVERCOMES  = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' }; // 상극 (내가 극함)

// 오행 관계 분류 (내 일간 vs 오늘 일간)
// 비화: 같은 오행 / 식상: 내가 생해줌 / 재성: 내가 극함 / 관성: 극당함 / 인성: 생받음
export function getRelation(myGan, todayGan) {
  const me    = GAN_ELEMENT[myGan];
  const today = GAN_ELEMENT[todayGan];
  if (me === today) return '비화';
  if (GENERATES[me]   === today) return '식상';
  if (GENERATES[today] === me)   return '인성';
  if (OVERCOMES[me]   === today) return '재성';
  return '관성';
}

// 오행 분포 계산
// 연주 간지 2글자 + 일주 간지 2글자 = 4요소에서 木火土金水 개수
export function getElementDist(yearGanji, dayGanji) {
  const elements = [
    GAN_ELEMENT[yearGanji.gan],
    JI_ELEMENT[yearGanji.ji],
    GAN_ELEMENT[dayGanji.gan],
    JI_ELEMENT[dayGanji.ji],
  ];
  const count = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  elements.forEach(e => count[e]++);
  return count; // 각 값 0~4, 합계 = 4
}

// 오늘 메시지 인덱스 (매일 바뀜)
export function getTodayMsgIndex(total = 15) {
  const today = new Date();
  return (today.getDate() + today.getMonth()) % total;
}
