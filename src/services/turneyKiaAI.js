import Anthropic from '@anthropic-ai/sdk';
import { getRandomPerson } from '../data/turneyKiaData';

const CATEGORY_LABEL = {
  celebrity: '연예인 (가수, 배우, 방송인 등 한국 연예계 인물)',
  athlete:   '운동선수 (모든 종목, 한국 및 세계)',
  politician: '정치인 (한국 역사 인물 및 현대 정치인)',
};

async function generateFromAI(category, usedNames = []) {
  const client = new Anthropic({
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  const usedNote = usedNames.length > 0
    ? `\n이미 사용된 인물(제외): ${usedNames.join(', ')}`
    : '';

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `한국인이 잘 알 만한 실존 ${CATEGORY_LABEL[category]} 한 명을 랜덤하게 골라서 힌트 6개를 어려운 것부터 쉬운 것 순서로 만들어줘.${usedNote}
힌트는 직접적인 이름/별명을 언급하지 말고, 점점 구체적인 정보만 제공해.

반드시 아래 JSON 형식으로만 답해 (다른 텍스트 없이):
{"name":"이름","hints":["힌트1","힌트2","힌트3","힌트4","힌트5","힌트6"]}`,
    }],
  });

  return JSON.parse(message.content[0].text);
}

/**
 * 랜덤 인물 + 힌트 반환
 * mode='ai'  → Claude API 실시간 생성
 * mode='static' (기본값) → 정적 데이터 파일
 */
export async function generatePersonWithHints(category, usedNames = [], mode = 'static') {
  if (mode === 'ai') {
    return generateFromAI(category, usedNames);
  }
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
