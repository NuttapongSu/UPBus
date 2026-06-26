const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const KML_DIR = path.join(__dirname, '../../frontend/public/kml');

const KML_FILES = {
  green: 'up_bus_transit_green.kml',
  red:   'up_bus_transit_red.kml',
  blue:  'up_bus_transit_blue.kml',
};

router.get('/:line', (req, res) => {
  const line = req.params.line.toLowerCase();
  const filename = KML_FILES[line];
  if (!filename) {
    return res.status(404).json({ error: `Unknown line: ${line}. Valid: green, red, blue` });
  }
  const filePath = path.join(KML_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `KML file not found: ${filename}` });
  }
  res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
  res.sendFile(filePath);
});

module.exports = router;
