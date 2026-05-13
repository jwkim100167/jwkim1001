const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;

const EXCLUDED_IDS = ['admin', 'test'];

export async function notifyLogin(loginId) {
  if (!BOT_TOKEN || !CHAT_ID) return;
  if (EXCLUDED_IDS.includes(loginId)) return;

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: `🔔 ${loginId} 가 접속하였습니다.`,
      }),
    });
  } catch {
    // 알림 실패가 로그인 흐름에 영향을 주지 않도록 무시
  }
}
