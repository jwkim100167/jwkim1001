// 로또 당첨번호 데이터를 다운로드하는 스크립트
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOTTO_API_BASE = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber';

// 프록시 서버 옵션
const PROXY_SERVERS = [
  'https://api.allorigins.win/get?url=',
  'https://cors-anywhere.herokuapp.com/',
  'https://thingproxy.freeboard.io/fetch/'
];

// 프록시를 사용해서 데이터 가져오기
async function fetchWithProxy(url) {
  for (let i = 0; i < PROXY_SERVERS.length; i++) {
    try {
      const proxyUrl = PROXY_SERVERS[i] + encodeURIComponent(url);
      console.log(`프록시 ${i + 1} 시도...`);

      const response = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (response.ok) {
        let data;
        if (PROXY_SERVERS[i].includes('allorigins')) {
          const wrapper = await response.json();
          data = JSON.parse(wrapper.contents);
        } else {
          data = await response.json();
        }
        return data;
      }
    } catch (error) {
      console.error(`프록시 ${i + 1} 실패:`, error.message);
      continue;
    }
  }

  // 프록시 없이 직접 시도
  try {
    console.log('프록시 없이 직접 시도...');
    const response = await fetch(url);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('직접 요청 실패:', error.message);
  }

  throw new Error('모든 요청 방법 실패');
}

// 특정 회차 데이터 가져오기
async function getLottoNumber(round) {
  try {
    const url = `${LOTTO_API_BASE}&drwNo=${round}`;
    const data = await fetchWithProxy(url);

    if (data.returnValue === 'success') {
      return {
        round: data.drwNo,
        date: data.drwNoDate,
        num1: data.drwtNo1,
        num2: data.drwtNo2,
        num3: data.drwtNo3,
        num4: data.drwtNo4,
        num5: data.drwtNo5,
        num6: data.drwtNo6,
        bonus: data.bnusNo
      };
    }
    return null;
  } catch (error) {
    console.error(`${round}회차 에러:`, error.message);
    return null;
  }
}

// 최신 회차 추정
function getEstimatedLatestRound() {
  const firstLottoDate = new Date('2002-12-07');
  const today = new Date();
  const diffTime = Math.abs(today - firstLottoDate);
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  return diffWeeks + 1;
}

// 전체 데이터 다운로드
async function downloadAllLottoData() {
  const allData = [];
  const estimatedLatest = getEstimatedLatestRound();

  console.log(`예상 최신 회차: ${estimatedLatest}`);
  console.log('1회차부터 데이터 다운로드 시작...\n');

  let currentRound = 1;
  let consecutiveFailures = 0;
  const maxFailures = 10;

  while (currentRound <= estimatedLatest + 10 && consecutiveFailures < maxFailures) {
    const result = await getLottoNumber(currentRound);

    if (result) {
      allData.push(result);
      consecutiveFailures = 0;
      console.log(`✓ ${currentRound}회차 수집 완료`);
    } else {
      consecutiveFailures++;
      console.log(`✗ ${currentRound}회차 데이터 없음 (연속 실패: ${consecutiveFailures})`);
    }

    currentRound++;

    // API 부하 방지
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`\n총 ${allData.length}회차 데이터 수집 완료`);

  // JSON 파일로 저장
  const outputPath = path.join(__dirname, '../public/lotto-data.json');
  const outputData = {
    lastUpdated: new Date().toISOString(),
    totalRounds: allData.length,
    format: 'static_json',
    data: allData
  };

  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
  console.log(`\n✓ 데이터 저장 완료: ${outputPath}`);
  console.log(`회차 범위: ${allData[0]?.round} ~ ${allData[allData.length - 1]?.round}`);
}

// 실행
downloadAllLottoData().catch(error => {
  console.error('스크립트 실행 에러:', error);
  process.exit(1);
});
