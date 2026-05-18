import { getRandomPerson } from '../data/turneyKiaData';

/**
 * 랜덤 인물 + 힌트 반환 (정적 데이터 사용)
 * 나중에 Claude API로 전환 시 이 함수만 교체하면 됩니다.
 */
export async function generatePersonWithHints(category, usedNames = []) {
  return getRandomPerson(category, usedNames);
}

/**
 * 이름으로 글자 패턴 생성
 * '대한민국 만세' → 'OOOO OO'
 */
export function buildNamePattern(name) {
  return name
    .split('')
    .map((ch) => (ch === ' ' ? ' ' : 'O'))
    .join('');
}
