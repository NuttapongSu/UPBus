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
  }
}

function start() {
  cron.schedule('59 23 * * *', resetDrivers, { timezone: 'Asia/Bangkok' });
  console.log('🔄 Daily Reset scheduled at 23:59 every day');
}

module.exports = { start, resetDrivers };
