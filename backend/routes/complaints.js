const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { requireJWT } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'evidence-' + unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// POST /api/complaints — สาธารณะ
router.post('/', upload.single('image'), async (req, res) => {
  const { topic, bus_number, detail } = req.body;
  if (!topic || !detail || bus_number === undefined || bus_number === '') {
    return res.status(400).json({ error: 'topic, bus_number, and detail required' });
  }
  const busNum = parseInt(bus_number, 10);
  if (isNaN(busNum)) {
    return res.status(400).json({ error: 'bus_number must be an integer' });
  }
  try {
    const image_file = req.file ? req.file.filename : null;
    const [result] = await db.query(
      'INSERT INTO complaints (topic, bus_number, detail, image_file) VALUES (?, ?, ?, ?)',
      [topic, busNum, detail, image_file]
    );
    res.json({ status: 'success', id: result.insertId });
  } catch (err) {
    console.error('Complaint error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/complaints — Admin only
router.get('/', requireJWT, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;
  try {
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM complaints');
    const [complaints] = await db.query(
      'SELECT * FROM complaints ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    res.json({ complaints, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/complaints/:id/status — Admin only
router.put('/:id/status', requireJWT, async (req, res) => {
  const { status } = req.body;
  try {
    await db.query('UPDATE complaints SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
