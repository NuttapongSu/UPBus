/**
 * ส่งข้อความแจ้งเตือนผ่าน LINE Messaging API (Push Message)
 *
 * ตั้งค่าใน .env:
 *   LINE_CHANNEL_ACCESS_TOKEN  — Channel Access Token จาก LINE Developers Console
 *   LINE_ADMIN_USER_ID         — LINE User ID ของ admin ที่จะรับแจ้งเตือน
 *                                (ดูได้จาก webhook event เมื่อ admin ส่งข้อความหา bot ครั้งแรก)
 *
 * หรือส่งแบบ Broadcast ไปยังทุกคนที่ follow bot:
 *   LINE_USE_BROADCAST=true    — ถ้า true จะ broadcast แทน push
 */
const axios = require('axios');

async function sendLineMessage(message) {
  const token   = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const userId  = process.env.LINE_ADMIN_USER_ID;
  const useBcast = process.env.LINE_USE_BROADCAST === 'true';

  if (!token || token === 'YOUR_CHANNEL_ACCESS_TOKEN_HERE') {
    console.log('⚠️  LINE_CHANNEL_ACCESS_TOKEN ยังไม่ได้ตั้งค่า — ข้าม notify');
    return;
  }

  const body = useBcast
    ? { messages: [{ type: 'text', text: message }] }
    : { to: userId, messages: [{ type: 'text', text: message }] };

  const url = useBcast
    ? 'https://api.line.me/v2/bot/message/broadcast'
    : 'https://api.line.me/v2/bot/message/push';

  try {
    await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    console.log('✅ LINE Message ส่งสำเร็จ');
  } catch (err) {
    console.error('❌ LINE Messaging API error:', err.response?.data || err.message);
  }
}

/**
 * ส่ง LINE push message ไปยัง userId ที่ระบุโดยตรง (เช่น คนขับรถ)
 */
async function sendLinePush(userId, message) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || token === 'YOUR_CHANNEL_ACCESS_TOKEN_HERE' || !userId) return;
  try {
    await axios.post(
      'https://api.line.me/v2/bot/message/push',
      { to: userId, messages: [{ type: 'text', text: message }] },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    console.log(`✅ LINE push ส่งถึง ${userId}`);
  } catch (err) {
    console.error('❌ LINE push error:', err.response?.data || err.message);
  }
}

module.exports = { sendLineNotify: sendLineMessage, sendLinePush };
