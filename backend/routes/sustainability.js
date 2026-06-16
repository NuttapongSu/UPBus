const express = require('express');
const router = express.Router();
const db = require('../db');
const { calcTreesEquiv } = require('../services/co2Calculator');

// GET /api/sustainability
router.get('/', async (req, res) => {
  try {
    // ยอดรวมวันนี้
    const [todayRows] = await db.query(`
      SELECT
        COALESCE(SUM(co2_saved_kg), 0) as co2_saved_kg,
        COALESCE(SUM(kwh_used), 0)     as kwh_used,
        COALESCE(SUM(km_total), 0)     as km_total
      FROM sustainability_log
      WHERE DATE(logged_at) = CURDATE()
    `);
    const today = todayRows[0];
    today.trees_equiv = Math.round(calcTreesEquiv(today.co2_saved_kg));

    // กราฟ CO₂ รายวัน 7 วันล่าสุด
    const [weeklyRows] = await db.query(`
      SELECT
        DATE(logged_at) as day,
        SUM(co2_saved_kg) as co2
      FROM sustainability_log
      WHERE logged_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(logged_at)
      ORDER BY day ASC
    `);

    res.json({ today, weekly: weeklyRows });
  } catch (err) {
    console.error('Sustainability route error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
