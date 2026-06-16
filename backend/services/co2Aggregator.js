const cron = require('node-cron');
const db = require('../db');
const { calcCO2Saved, calcKwhUsed } = require('./co2Calculator');

// รันทุกต้นชั่วโมง: "0 * * * *"
async function aggregateLastHour() {
  const now = new Date();
  // ต้นชั่วโมงที่แล้ว
  const hourStart = new Date(now);
  hourStart.setMinutes(0, 0, 0);
  hourStart.setHours(hourStart.getHours() - 1);

  const hourEnd = new Date(hourStart);
  hourEnd.setHours(hourEnd.getHours() + 1);

  try {
    // ดึง snapshots ชั่วโมงที่แล้ว
    const [snapshots] = await db.query(
      `SELECT bus_id, odo, bv, be, recorded_at
       FROM gps_snapshots
       WHERE recorded_at >= ? AND recorded_at < ?
       ORDER BY bus_id, recorded_at ASC`,
      [hourStart, hourEnd]
    );

    if (snapshots.length === 0) return;

    // คำนวณ km สะสมแต่ละคัน (odo ท้าย - odo แรก)
    const busOdo = {};

    snapshots.forEach(row => {
      if (!busOdo[row.bus_id]) busOdo[row.bus_id] = { first: row.odo, last: row.odo, bvSum: 0, beSum: 0, count: 0 };
      busOdo[row.bus_id].last = row.odo;
      busOdo[row.bus_id].bvSum += Number(row.bv) || 0;
      busOdo[row.bus_id].beSum += Number(row.be) || 0;
      busOdo[row.bus_id].count += 1;
    });

    let totalKm = 0;
    let totalKwh = 0;

    Object.values(busOdo).forEach(bus => {
      const km = Math.max(0, bus.last - bus.first);
      totalKm += km;
      const avgBv = bus.count > 0 ? bus.bvSum / bus.count : 0;
      const avgBe = bus.count > 0 ? bus.beSum / bus.count : 0;
      totalKwh += calcKwhUsed(avgBv, avgBe, 3600); // 1 ชั่วโมง
    });

    const co2Saved = calcCO2Saved(totalKm);

    await db.query(
      `INSERT INTO sustainability_log (logged_at, co2_saved_kg, kwh_used, km_total, passengers)
       VALUES (?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE co2_saved_kg=VALUES(co2_saved_kg), kwh_used=VALUES(kwh_used), km_total=VALUES(km_total)`,
      [hourStart, co2Saved, totalKwh, totalKm]
    );

    console.log(`🌿 Aggregated: CO₂=${co2Saved.toFixed(2)}kg, kWh=${totalKwh.toFixed(2)}, km=${totalKm}`);
  } catch (err) {
    console.error('❌ CO₂ Aggregator error:', err.message);
  }
}

function start() {
  // รันทุกต้นชั่วโมง
  cron.schedule('0 * * * *', aggregateLastHour);
  console.log('🌿 CO₂ Aggregator started (runs hourly)');
}

module.exports = { start, aggregateLastHour };
