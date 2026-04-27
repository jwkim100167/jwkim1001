// 매주 일요일 최신 로또 회차를 Supabase lottoTable에 upsert하는 스크립트
// GitHub Actions에서 실행 (Node 18+ 내장 fetch 사용)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LOTTO_API_BASE = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 환경변수 VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getLatestRoundFromDB() {
  const { data, error } = await supabase
    .from('lottoTable')
    .select('number')
    .order('number', { ascending: false })
    .limit(1)
    .single();

  if (error) throw new Error(`DB 최신 회차 조회 실패: ${error.message}`);
  return data.number;
}

const PROXY_SERVERS = [
  'https://api.allorigins.win/get?url=',
  'https://cors-anywhere.herokuapp.com/',
  'https://thingproxy.freeboard.io/fetch/'
];

async function fetchWithProxy(url) {
  // 프록시 순차 시도
  for (let i = 0; i < PROXY_SERVERS.length; i++) {
    try {
      const proxyUrl = PROXY_SERVERS[i] + encodeURIComponent(url);
      const response = await fetch(proxyUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!response.ok) continue;
      if (PROXY_SERVERS[i].includes('allorigins')) {
        const wrapper = await response.json();
        return JSON.parse(wrapper.contents);
      }
      return await response.json();
    } catch (e) {
      console.log(`프록시 ${i + 1} 실패: ${e.message}`);
    }
  }
  // 직접 요청 최후 시도
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) throw new Error(`직접 요청 실패: ${response.status}`);
  return await response.json();
}

async function fetchLottoRound(round) {
  const url = `${LOTTO_API_BASE}&drwNo=${round}`;
  const data = await fetchWithProxy(url);

  if (data.returnValue !== 'success') return null;

  return {
    number: data.drwNo,
    date: data.drwNoDate,
    count1: data.drwtNo1,
    count2: data.drwtNo2,
    count3: data.drwtNo3,
    count4: data.drwtNo4,
    count5: data.drwtNo5,
    count6: data.drwtNo6,
    bonus: data.bnusNo
  };
}

async function main() {
  console.log('🎰 로또 Supabase 업데이트 시작...');

  // 1. DB 최신 회차 조회
  const latestRound = await getLatestRoundFromDB();
  const nextRound = latestRound + 1;
  console.log(`📊 DB 최신 회차: ${latestRound} → ${nextRound}회차 확인`);

  // 2. 다음 회차 API 호출
  const lottoData = await fetchLottoRound(nextRound);

  if (!lottoData) {
    console.log(`⏳ ${nextRound}회차 데이터 없음 (아직 발표 전이거나 회차 없음)`);
    process.exit(0);
  }

  // 3. Supabase upsert (중복 삽입 방지)
  const { error } = await supabase
    .from('lottoTable')
    .upsert(lottoData, { onConflict: 'number' });

  if (error) throw new Error(`Supabase upsert 실패: ${error.message}`);

  console.log(`✅ ${nextRound}회차 삽입 완료:`, lottoData);
}

main().catch(err => {
  console.error('❌ 스크립트 에러:', err.message);
  process.exit(1);
});
