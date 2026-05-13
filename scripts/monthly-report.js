// 매월 1일 09:00 KST — 전월 활동 리포트를 텔레그램으로 발송
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요');
  process.exit(1);
}
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('❌ TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID 필요');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function getLastMonthRange() {
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    start: firstOfLastMonth.toISOString(),
    end: firstOfThisMonth.toISOString(),
    label: `${firstOfLastMonth.getFullYear()}년 ${firstOfLastMonth.getMonth() + 1}월`,
  };
}

async function sendTelegram(text) {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram 발송 실패: ${JSON.stringify(json)}`);
}

async function main() {
  const { start, end, label } = getLastMonthRange();
  console.log(`📊 ${label} 리포트 생성 중... (${start} ~ ${end})`);

  // 1. 전월 로그인 기록 전체 조회
  const { data: loginHistory, error: loginError } = await supabase
    .from('loginHistoryTable')
    .select('u_id, created_at')
    .gte('created_at', start)
    .lt('created_at', end);

  if (loginError) throw new Error(`로그인 기록 조회 실패: ${loginError.message}`);

  const totalLogins = loginHistory.length;

  // 2. 유저별 로그인 횟수 집계
  const loginCountMap = {};
  for (const row of loginHistory) {
    loginCountMap[row.u_id] = (loginCountMap[row.u_id] || 0) + 1;
  }

  // 3. 상위 3명 추출
  const topUserIds = Object.entries(loginCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([u_id, count]) => ({ u_id, count }));

  // 4. 유저 ID → login_id 변환
  let topUsersText = '없음';
  if (topUserIds.length > 0) {
    const { data: users } = await supabase
      .from('userTable')
      .select('id, login_id')
      .in('id', topUserIds.map((u) => u.u_id));

    const idMap = Object.fromEntries((users || []).map((u) => [u.id, u.login_id]));
    topUsersText = topUserIds
      .map((u, i) => `  ${i + 1}위. ${idMap[u.u_id] ?? u.u_id} (${u.count}회)`)
      .join('\n');
  }

  // 5. 서비스별 클릭 수 TOP 3
  const { data: serviceData, error: serviceError } = await supabase
    .from('serviceConfigTable')
    .select('service_id, menu_click_count')
    .order('menu_click_count', { ascending: false })
    .limit(3);

  let topServicesText = '없음';
  if (!serviceError && serviceData?.length > 0) {
    topServicesText = serviceData
      .map((s, i) => `  ${i + 1}위. ${s.service_id} (${s.menu_click_count ?? 0}회)`)
      .join('\n');
  }

  // 6. 전월 신규 가입자 수
  const { count: newUserCount } = await supabase
    .from('userTable')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', start)
    .lt('created_at', end);

  // 7. 현재 총 회원 수
  const { count: totalUserCount } = await supabase
    .from('userTable')
    .select('*', { count: 'exact', head: true });

  // 8. 메시지 조합
  const message = [
    `📊 ${label} 활동 리포트`,
    ``,
    `👤 최다 로그인 회원`,
    topUsersText,
    ``,
    `🎮 최다 클릭 서비스`,
    topServicesText,
    ``,
    `📈 총 로그인 횟수: ${totalLogins}회`,
    `🆕 신규 가입자: ${newUserCount ?? 0}명`,
    `👥 누적 회원 수: ${totalUserCount ?? 0}명`,
  ].join('\n');

  console.log(message);
  await sendTelegram(message);
  console.log('✅ 리포트 발송 완료');
}

main().catch((err) => {
  console.error('❌ 리포트 생성 실패:', err.message);
  process.exit(1);
});
