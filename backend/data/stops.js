const fs = require('fs');
const path = require('path');

const KML_DIR = path.join(__dirname, '../../frontend/public/kml');
const KML_FILES = [
  { file: 'up_bus_transit_green.kml', line: 'Green' },
  { file: 'up_bus_transit_red.kml',   line: 'Red' },
  { file: 'up_bus_transit_blue.kml',  line: 'Blue' },
];

function parseKmlStops(kmlText, lineColor) {
  const stops = [];
  const placemarkRe = /<Placemark[\s\S]*?<\/Placemark>/g;
  let pm;
  while ((pm = placemarkRe.exec(kmlText)) !== null) {
    if (!/<Point>/.test(pm[0])) continue;
    const nameMatch = pm[0].match(/<name>([\s\S]*?)<\/name>/);
    const coordMatch = pm[0].match(/<coordinates>([\s\S]*?)<\/coordinates>/);
    if (!nameMatch || !coordMatch) continue;
    const name = nameMatch[1].trim();
    const parts = coordMatch[1].trim().split(',').map(Number);
    const lng = parts[0], lat = parts[1];
    if (isNaN(lat) || isNaN(lng)) continue;
    stops.push({ name, lat, lng, lines: [lineColor] });
  }
  return stops;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mergeStops(allStops) {
  const merged = [];
  for (const stop of allStops) {
    const existing = merged.find(s => haversine(s.lat, s.lng, stop.lat, stop.lng) < 50);
    if (existing) {
      stop.lines.forEach(l => { if (!existing.lines.includes(l)) existing.lines.push(l); });
    } else {
      merged.push({ ...stop, id: Buffer.from(stop.name).toString('base64').slice(0, 12) });
    }
  }
  return merged;
}

function loadAllStops() {
  const all = [];
  for (const { file, line } of KML_FILES) {
    try {
      const kml = fs.readFileSync(path.join(KML_DIR, file), 'utf8');
      all.push(...parseKmlStops(kml, line));
    } catch (e) {
      console.warn(`[stops] Could not read ${file}:`, e.message);
    }
  }
  return mergeStops(all);
}

// Load once at startup, cache in memory
const STOPS = loadAllStops();

module.exports = { parseKmlStops, mergeStops, STOPS };
