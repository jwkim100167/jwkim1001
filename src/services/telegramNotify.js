const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;

const EXCLUDED_IDS = ['admin', 'test'];

export async function notifyLogin(loginId) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('[TelegramNotify] 환경변수 없음 — BOT_TOKEN:', !!BOT_TOKEN, 'CHAT_ID:', !!CHAT_ID);
    return;
  }
  if (EXCLUDED_IDS.includes(loginId)) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: `🔔 ${loginId} 가 접속하였습니다.`,
      }),
    });
    const json = await res.json();
    console.log('[TelegramNotify] 응답:', json);
  } catch (err) {
    console.error('[TelegramNotify] 발송 실패:', err);
  }
}
