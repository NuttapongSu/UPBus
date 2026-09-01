const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../db');

const FIRMWARE_DIR = path.join(__dirname, '..', 'uploads', 'firmware');

function requireDeviceKey(req, res, next) {
  const deviceKey = req.header('X-Device-Key');
  if (!deviceKey || deviceKey !== process.env.GPS_DEVICE_API_KEY) {
    return res.status(401).json({ error: 'Invalid device key' });
  }
  next();
}

// GET /api/firmware/check?device_id=TC001&current_version=1.0.0
router.get('/check', requireDeviceKey, async (req, res) => {
  const { device_id, current_version } = req.query;
  if (!device_id || !current_version) {
    return res.status(400).json({ error: 'device_id and current_version are required' });
  }

  try {
    const [targetRows] = await db.query(
      'SELECT target_version FROM firmware_targets WHERE device_id = ?',
      [device_id]
    );
    const pinnedVersion = targetRows[0] && targetRows[0].target_version;

    let releaseRows;
    if (pinnedVersion) {
      [releaseRows] = await db.query(
        'SELECT version, md5, size_bytes FROM firmware_releases WHERE version = ?',
        [pinnedVersion]
      );
    } else {
      [releaseRows] = await db.query(
        'SELECT version, md5, size_bytes FROM firmware_releases WHERE is_stable = 1 LIMIT 1'
      );
    }

    const resolved = releaseRows[0];
    if (!resolved || resolved.version === current_version) {
      return res.json({ update_available: false });
    }

    // The ESP32 device firmware parses this response with manual string matching
    // (no JSON library) -- do not enable `app.set('json spaces', ...)` anywhere in
    // this app, it would silently break firmware update checks fleet-wide.
    res.json({
      update_available: true,
      version: resolved.version,
      md5: resolved.md5,
      size_bytes: resolved.size_bytes,
    });
  } catch (err) {
    console.error('firmware/check error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/firmware/download/:version
router.get('/download/:version', requireDeviceKey, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT filename, size_bytes FROM firmware_releases WHERE version = ?',
      [req.params.version]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Unknown version' });
    }
    const filePath = path.join(FIRMWARE_DIR, rows[0].filename);
    res.set('Content-Length', rows[0].size_bytes);
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('firmware/download stream error:', err);
      if (res.headersSent) {
        return res.destroy();
      }
      res.status(404).json({ error: 'Firmware file not found' });
    });
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  } catch (err) {
    console.error('firmware/download error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
