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
       WHERE recorded_at >= ? AND recorded_at < ? AND odo > 0 AND speed > 0
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
    const MAX_KM_PER_BUS_PER_HOUR = 150;

    Object.values(busOdo).forEach(bus => {
      const km = Math.min(
        Math.max(0, bus.last - bus.first) / 1000,
        MAX_KM_PER_BUS_PER_HOUR
      ); // odo เป็นเมตร → km พร้อม sanity cap
      totalKm += km;
      const avgBv = bus.count > 0 ? bus.bvSum / bus.count : 0;
      const avgBe = bus.count > 0 ? bus.beSum / bus.count : 0;
      totalKwh += calcKwhUsed(avgBv, avgBe, bus.count * 30); // เวลา active จริง (30s/snapshot)
    });

    const co2Saved = calcCO2Saved(totalKm, totalKwh);

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

// รันตอนเที่ยงคืน: snapshot ยอดรวมของวันที่เพิ่งจบ → sustainability_daily_summary
async function snapshotEndOfDay() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const statDate = yesterday.toISOString().slice(0, 10);

  try {
    const [rows] = await db.query(
      `SELECT
         COALESCE(SUM(co2_saved_kg), 0) as co2_saved_kg,
         COALESCE(SUM(kwh_used), 0)     as kwh_used,
         COALESCE(SUM(km_total), 0)     as km_total
       FROM sustainability_log
       WHERE DATE(logged_at) = ?`,
      [statDate]
    );

    const [busRows] = await db.query(
      `SELECT COUNT(DISTINCT bus_id) as cnt
       FROM gps_snapshots
       WHERE DATE(recorded_at) = ?`,
      [statDate]
    );

    await db.query(
      `INSERT INTO sustainability_daily_summary (stat_date, co2_saved_kg, kwh_used, km_total, buses_active)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         co2_saved_kg = VALUES(co2_saved_kg),
         kwh_used     = VALUES(kwh_used),
         km_total     = VALUES(km_total),
         buses_active = VALUES(buses_active)`,
      [statDate, rows[0].co2_saved_kg, rows[0].kwh_used, rows[0].km_total, busRows[0].cnt ?? 0]
    );

    console.log(`📅 Daily snapshot saved: ${statDate} — CO₂=${rows[0].co2_saved_kg.toFixed(2)}kg`);
  } catch (err) {
    console.error('❌ Daily snapshot error:', err.message);
  }
}

function start() {
  // รันทุก 30 วินาที — aggregate ชั่วโมงที่แล้ว (idempotent ด้วย ON DUPLICATE KEY)
  cron.schedule('*/30 * * * * *', aggregateLastHour);
  // รันตอนเที่ยงคืน — snapshot ยอดรวมวันที่เพิ่งจบ
  cron.schedule('0 0 * * *', snapshotEndOfDay);
  console.log('🌿 CO₂ Aggregator started (hourly agg every 30s, daily snapshot at midnight)');
}

module.exports = { start, aggregateLastHour, snapshotEndOfDay };
