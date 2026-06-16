const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireJWT } = require('../middleware/auth');

// ทุก route ใน admin ต้อง JWT
router.use(requireJWT);

// GET /api/admin/buses
router.get('/buses', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT buses.id, buses.bus_number, buses.status_color,
             buses.current_driver_id, drivers.full_name AS driver_name
      FROM buses
      LEFT JOIN drivers ON buses.current_driver_id = drivers.id
      ORDER BY CAST(buses.bus_number AS UNSIGNED) ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/evaluations
router.get('/evaluations', async (req, res) => {
  try {
    const [[appStats]] = await db.query(`
      SELECT AVG(service_score) as avg_service, AVG(status_score) as avg_status,
             AVG(efficiency_score) as avg_efficiency, COUNT(*) as total
      FROM evaluations_app
    `);
    const [[travelStats]] = await db.query(`
      SELECT AVG(comfort_score) as avg_comfort, AVG(time_score) as avg_time,
             AVG(safety_score) as avg_safety, COUNT(*) as total
      FROM evaluations_travel
    `);
    res.json({ app: appStats, travel: travelStats });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
