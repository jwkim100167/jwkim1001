/**
 * update-kbo-rank.js
 * Daum 스포츠에서 KBO 팀 순위(승/무/패)를 파싱해 Supabase에 업데이트하는 스크립트
 * 데이터 출처: https://sports.daum.net/record/kbo/team
 *
 * 로컬 실행:  node scripts/update-kbo-rank.js
 * 필요 env:   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env 파일)
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// .env 수동 로드 — cwd 기준으로 탐색 (node scripts/update-kbo-rank.js 로 실행 시)
try {
  const envPath = resolve(process.cwd(), '.env');
  const lines = readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch {}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ 환경변수 누락: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 확인');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const SEASON = 2026;

// 팀명 → 내부 ID 매핑
const TEAM_NAME_MAP = {
  'KIA': 1,  'KIA 타이거즈': 1,
  '삼성': 2, '삼성 라이온즈': 2,
  'LG': 3,   'LG 트윈스': 3,
  '두산': 4, '두산 베어스': 4,
  'KT': 5,   'KT wiz': 5, 'KT WIZ': 5,
  '한화': 6, '한화 이글스': 6,
  '롯데': 7, '롯데 자이언츠': 7,
  'SSG': 8,  'SSG 랜더스': 8,
  'NC': 9,   'NC 다이노스': 9,
  '키움': 10,'키움 히어로즈': 10,
};

const DAUM_URL = 'https://sports.daum.net/record/kbo/team';

/**
 * Puppeteer로 Daum 스포츠 KBO 순위를 파싱
 * 출처: https://sports.daum.net/record/kbo/team
 * 테이블 구조: 순위(0) | 팀(1) | 경기(2) | 승(3) | 무(4) | 패(5) | ...
 */
async function scrapeStandings() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    console.log(`🌐 Daum 스포츠 로딩: ${DAUM_URL}`);
    await page.goto(DAUM_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('table', { timeout: 15000 }).catch(() => null);

    const rows = await page.evaluate(() => {
      // 첫 번째 테이블 = 팀 순위표 (순위/팀/경기/승/무/패/...)
      const table = document.querySelector('table');
      if (!table) return null;

      const headers = Array.from(table.querySelectorAll('thead th, thead td'))
        .map((el) => el.textContent.trim());

      const teamIdx = headers.findIndex((h) => h === '팀');
      const winIdx  = headers.findIndex((h) => h === '승');
      const drawIdx = headers.findIndex((h) => h === '무');
      const lossIdx = headers.findIndex((h) => h === '패');

      if (teamIdx === -1 || winIdx === -1 || lossIdx === -1) return null;

      return Array.from(table.querySelectorAll('tbody tr')).map((tr) => {
        const cells = Array.from(tr.querySelectorAll('td'));
        return {
          name: cells[teamIdx]?.textContent?.trim() ?? '',
          w: parseInt(cells[winIdx]?.textContent?.trim())  || 0,
          d: drawIdx >= 0 ? (parseInt(cells[drawIdx]?.textContent?.trim()) || 0) : 0,
          l: parseInt(cells[lossIdx]?.textContent?.trim()) || 0,
        };
      }).filter((r) => r.name);
    });

    return rows;
  } finally {
    await browser.close();
  }
}

async function main() {
  const rows = await scrapeStandings();

  if (!rows || rows.length < 10) {
    console.error(`❌ 데이터 없음 (${rows?.length ?? 0}팀). 시즌 미개막 또는 Daum 구조 변경 가능성.`);
    process.exit(0); // Actions 실패로 기록되지 않도록
  }

  console.log(`✅ Daum 스포츠 ${rows.length}팀 데이터 파싱 완료`);

  // 팀명 → ID 변환
  const rankOrder = [];
  const rankStats = [];

  for (const row of rows) {
    const id = TEAM_NAME_MAP[row.name];
    if (!id) {
      console.warn(`⚠️  알 수 없는 팀명: "${row.name}" — 매핑 확인 필요`);
      continue;
    }
    rankOrder.push(id);
    rankStats.push({ w: row.w, d: row.d, l: row.l });
    console.log(`  ${rankOrder.length}위 ${row.name}(${id}) — ${row.w}승 ${row.d}무 ${row.l}패`);
  }

  if (rankOrder.length < 10) {
    console.error(`❌ 팀 수 부족 (${rankOrder.length}/10). 팀명 매핑을 확인하세요.`);
    process.exit(1);
  }

  // Supabase 업데이트
  console.log('\n📤 Supabase 업데이트 중...');
  // KST 기준 ISO 문자열 생성 (TIMESTAMP without timezone 컬럼에 맞게)
  const kstOffset = 9 * 60;
  const now = new Date(Date.now() + kstOffset * 60000).toISOString().slice(0, 19).replace('T', ' ');

  const { error } = await supabase
    .from('kboActualRankTable')
    .upsert(
      { season: SEASON, rank_order: rankOrder, rank_stats: rankStats, updated_at: now },
      { onConflict: 'season' }
    );

  if (error) {
    console.error('❌ Supabase 업데이트 실패:', error.message);
    process.exit(1);
  }

  console.log(`✅ kboActualRankTable (season=${SEASON}) 업데이트 완료 — ${now}`);
}

main().catch((err) => {
  console.error('❌ 예상치 못한 오류:', err);
  process.exit(1);
});
