const express = require('express');
const router = express.Router();
const db = require('../db');
const { calcTreesEquiv, calcEVCO2, calcNGVCO2, calcCO2Saved, calcKwhUsed } = require('../services/co2Calculator');

// คำนวณชั่วโมงปัจจุบัน (partial) จาก gps_snapshots โดยตรง
async function getLiveCurrentHour() {
  const now = new Date();
  const hourStart = new Date(now);
  hourStart.setMinutes(0, 0, 0, 0);

  const [rows] = await db.query(
    `SELECT bus_id,
            MIN(odo) as odo_first, MAX(odo) as odo_last,
            AVG(bv)  as avg_bv,   AVG(be)  as avg_be,
            COUNT(*) as cnt
     FROM gps_snapshots
     WHERE recorded_at >= ? AND odo > 0
     GROUP BY bus_id`,
    [hourStart]
  );

  let liveKm = 0, liveKwh = 0;
  const elapsedSec = (now - hourStart) / 1000;

  const MAX_KM_PER_BUS_PER_HOUR = 150; // sanity cap — รถไม่วิ่งเกินนี้ใน 1 ชม.
  rows.forEach(row => {
    const rawKm = Math.max(0, row.odo_last - row.odo_first) / 1000;
    liveKm  += Math.min(rawKm, MAX_KM_PER_BUS_PER_HOUR); // ตัด outlier odo
    liveKwh += calcKwhUsed(row.avg_bv, row.avg_be, elapsedSec);
  });

  return { liveKm, liveKwh, liveC02: calcCO2Saved(liveKm, liveKwh) };
}

// GET /api/sustainability
router.get('/', async (req, res) => {
  try {
    // kwh จาก sustainability_log (hourly aggregation)
    const [todayRows] = await db.query(`
      SELECT
        COALESCE(SUM(co2_saved_kg), 0) as co2_saved_kg,
        COALESCE(SUM(kwh_used), 0)     as kwh_used
      FROM sustainability_log
      WHERE DATE(logged_at) = CURDATE()
    `);
    const today = todayRows[0];

    // km จาก bus_daily_stats: km_today = odo_ปัจจุบัน - odo_แรกของวัน (start_odo)
    const [[statsRow]] = await db.query(
      `SELECT COALESCE(SUM(km_today), 0) AS km_total FROM bus_daily_stats WHERE stat_date = CURDATE()`
    );
    today.km_total = statsRow.km_total / 1000; // metres → km

    // บวก live kwh ชั่วโมงปัจจุบันที่ยังไม่ถูก aggregate
    const live = await getLiveCurrentHour();
    today.co2_saved_kg = +(Number(today.co2_saved_kg) + live.liveC02).toFixed(3);
    today.kwh_used     = +(Number(today.kwh_used)     + live.liveKwh).toFixed(3);
    // km ไม่บวก live เพราะ bus_daily_stats อัปเดต real-time อยู่แล้ว

    const km  = today.km_total;
    const kwh = today.kwh_used;

    // คำนวณจาก km/kWh รวมโดยตรง เพื่อให้ ev+ngv+co2Saved สอดคล้องกันเสมอ
    today.ev_co2_kg   = +calcEVCO2(kwh).toFixed(2);
    today.ngv_co2_kg  = +calcNGVCO2(km).toFixed(2);
    today.co2_saved_kg = +(today.ngv_co2_kg - today.ev_co2_kg).toFixed(3);
    if (today.co2_saved_kg < 0) today.co2_saved_kg = 0;
    today.trees_equiv = Math.round(calcTreesEquiv(today.co2_saved_kg));

    // จำนวนรถที่วิ่งวันนี้ (มีข้อมูลใน gps_snapshots วันนี้)
    const [busCountRows] = await db.query(`
      SELECT COUNT(DISTINCT bus_id) as cnt
      FROM gps_snapshots
      WHERE DATE(recorded_at) = CURDATE()
    `);
    today.buses_active = busCountRows[0]?.cnt ?? 0;

    const [weeklyRows] = await db.query(`
      SELECT stat_date as day, co2_saved_kg as co2
      FROM sustainability_daily_summary
      WHERE stat_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        AND stat_date < CURDATE()
      ORDER BY stat_date ASC
    `);

    const todayStr = new Date().toISOString().slice(0, 10);
    const weekly = [...weeklyRows, { day: todayStr, co2: today.co2_saved_kg }];

    res.json({ today, weekly });
  } catch (err) {
    console.error('Sustainability route error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
