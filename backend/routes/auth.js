const express = require('express');
const router = express.Router();
const db = require('../db');
const { signToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  try {
    const [users] = await db.query(
      'SELECT id, username FROM admins WHERE username = ? AND password = ?',
      [username, password]
    );
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signToken({ id: users[0].id, username: users[0].username });
    res.json({ token, user: { id: users[0].id, username: users[0].username } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
