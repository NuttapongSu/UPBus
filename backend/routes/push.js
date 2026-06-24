// backend/routes/push.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/register', async (req, res) => {
  const { token, lines } = req.body;
  if (!token || !Array.isArray(lines)) {
    return res.status(400).json({ error: 'token and lines[] required' });
  }
  const linesJson = JSON.stringify(lines);
  await db.query(
    `INSERT INTO push_tokens (token, lines) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE lines = ?, updated_at = NOW()`,
    [token, linesJson, linesJson]
  );
  res.json({ ok: true });
});

router.delete('/unregister', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  await db.query(`DELETE FROM push_tokens WHERE token = ?`, [token]);
  res.json({ ok: true });
});

module.exports = router;
