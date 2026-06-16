const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/driver/check?line_id=xxx
router.get('/check', async (req, res) => {
  const { line_id } = req.query;
  if (!line_id) return res.status(400).json({ error: 'line_id required' });
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, line_user_id FROM drivers WHERE line_user_id = ?',
      [line_id]
    );
    if (rows.length > 0) return res.json({ is_driver: true, driver: rows[0] });
    res.json({ is_driver: false });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/driver/register
router.post('/register', async (req, res) => {
  const { line_user_id, full_name } = req.body;
  if (!line_user_id || !full_name) return res.status(400).json({ error: 'ข้อมูลไม่ครบ' });
  try {
    const [existing] = await db.query('SELECT id FROM drivers WHERE line_user_id = ?', [line_user_id]);
    if (existing.length > 0) return res.status(400).json({ error: 'ลงทะเบียนแล้ว' });
    await db.query(
      'INSERT INTO drivers (line_user_id, full_name, created_at) VALUES (?, ?, NOW())',
      [line_user_id, full_name]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/driver/buses
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

// POST /api/driver/update-status
router.post('/update-status', async (req, res) => {
  const { bus_id, driver_id, color } = req.body;
  if (!bus_id || !driver_id || !color) return res.status(400).json({ error: 'ข้อมูลไม่ครบ' });
  try {
    await db.query(
      'UPDATE buses SET current_driver_id = NULL, status_color = "Purple" WHERE current_driver_id = ?',
      [driver_id]
    );
    await db.query(
      'UPDATE buses SET current_driver_id = ?, status_color = ? WHERE id = ?',
      [driver_id, color, bus_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/driver/stop
router.post('/stop', async (req, res) => {
  const { driver_id } = req.body;
  if (!driver_id) return res.status(400).json({ error: 'driver_id required' });
  try {
    await db.query(
      'UPDATE buses SET current_driver_id = NULL, status_color = "Purple" WHERE current_driver_id = ?',
      [driver_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/driver/current-job?driver_id=xxx
router.get('/current-job', async (req, res) => {
  const { driver_id } = req.query;
  try {
    const [rows] = await db.query('SELECT * FROM buses WHERE current_driver_id = ?', [driver_id]);
    if (rows.length > 0) return res.json({ is_driving: true, bus: rows[0] });
    res.json({ is_driving: false });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
