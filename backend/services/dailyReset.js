const cron = require('node-cron');
const db = require('../db');
const { sendLineNotify: sendLineMessage } = require('./lineNotify');

async function resetDrivers() {
  try {
    const [result] = await db.query(
      'UPDATE buses SET current_driver_id = NULL, status_color = "Purple" WHERE current_driver_id IS NOT NULL'
    );
    const n = result.affectedRows;
    console.log(`🔄 Daily Reset: เคลียร์คนขับ ${n} คัน`);

    const msg = n > 0
      ? `[Daily Reset] เคลียร์คนขับออกจากรถสำเร็จ ${n} คัน — รถพร้อมสำหรับพรุ่งนี้`
      : `[Daily Reset] ไม่มีรถที่มีคนขับ — ข้ามการเคลียร์`;

    await sendLineMessage(msg);
  } catch (err) {
    console.error('❌ Daily Reset error:', err);
    sendLineMessage(`[Daily Reset] ❌ รีเซ็ตล้มเหลว: ${err.message}`).catch(() => {});
  }
}

async function recoverIfMissed() {
  // If server starts between 00:00–08:00 Bangkok time and drivers are still assigned,
  // the overnight cron was missed (server was down). Run reset immediately.
  const bangkokHour = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Bangkok',
    hour: 'numeric',
    hour12: false,
  });
  const hour = parseInt(bangkokHour, 10);
  if (hour >= 0 && hour < 8) {
    const [rows] = await db.query(
      'SELECT COUNT(*) AS n FROM buses WHERE current_driver_id IS NOT NULL'
    );
    if (rows[0].n > 0) {
      console.log('🔄 Daily Reset: detected missed overnight reset, running catch-up...');
      await resetDrivers();
    }
  }
}

function start() {
  cron.schedule('59 23 * * *', resetDrivers, { timezone: 'Asia/Bangkok' });
  console.log('🔄 Daily Reset scheduled at 23:59 every day');
  recoverIfMissed().catch(err => console.error('❌ Daily Reset catch-up error:', err));
}

module.exports = { start, resetDrivers };
