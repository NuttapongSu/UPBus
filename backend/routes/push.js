const express = require('express');
const db = require('../db');
const router = express.Router();

router.post('/register', async (req, res) => {
  const { token, destinationStopId, boardingStops } = req.body;
  if (!token || !destinationStopId || !Array.isArray(boardingStops)) {
    return res.status(400).json({ error: 'token, destinationStopId, boardingStops required' });
  }
  try {
    await db.query(
      `INSERT INTO push_tokens (token, destination_stop_id, boarding_stops)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE destination_stop_id=VALUES(destination_stop_id),
         boarding_stops=VALUES(boarding_stops), updated_at=NOW()`,
      [token, destinationStopId, JSON.stringify(boardingStops)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ push/register error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/unregister', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    await db.query('DELETE FROM push_tokens WHERE token = ?', [token]);
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ push/unregister error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
