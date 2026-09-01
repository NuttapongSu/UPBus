const express = require('express');
const router = express.Router();
const { EventEmitter } = require('events');
const db = require('../db');

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

// A device counts as "online" if a snapshot arrived within this window --
// wide enough to cover normal network hiccups above the board's ~1-3s push
// cycle when it has a GPS fix, without calling a genuinely dropped device
// online for minutes.
const DEVICE_ONLINE_THRESHOLD_MS = 30000;

// A gap between two consecutive snapshots from the same ESP32 board longer
// than this counts as a dropout event for the stability-analysis view.
const ESP32_DROPOUT_THRESHOLD_SEC = 3;

// RAM cache — ค่าล่าสุดของแต่ละ device_id
const latestByDevice = new Map();

function isValidCoord(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// Walks snapshots (already ordered by bus_id, then recorded_at ascending)
// and turns any gap longer than thresholdSec into a dropout event. The last
// gap for a device that hasn't reconnected yet (recorded_at vs `now`) is
// reported as an ongoing event with gap_end: null.
function computeDropoutEvents(rows, thresholdSec, now) {
  const events = [];
  let prev = null;

  function checkOngoing(lastRowOfDevice) {
    const sinceLastSec = (now - new Date(lastRowOfDevice.recorded_at)) / 1000;
    if (sinceLastSec > thresholdSec) {
      events.push({
        device_id: lastRowOfDevice.bus_id,
        lat: lastRowOfDevice.lat,
        lng: lastRowOfDevice.lng,
        gap_start: lastRowOfDevice.recorded_at,
        gap_end: null,
        end_lat: null,
        end_lng: null,
        duration_sec: Math.round(sinceLastSec),
      });
    }
  }

  for (const row of rows) {
    if (prev && prev.bus_id === row.bus_id) {
      const gapSec = (new Date(row.recorded_at) - new Date(prev.recorded_at)) / 1000;
      if (gapSec > thresholdSec) {
        events.push({
          device_id: row.bus_id,
          lat: prev.lat,
          lng: prev.lng,
          gap_start: prev.recorded_at,
          gap_end: row.recorded_at,
          end_lat: row.lat,
          end_lng: row.lng,
          duration_sec: Math.round(gapSec),
        });
      }
    } else if (prev) {
      // bus_id changed — prev was the last snapshot seen for its device
      checkOngoing(prev);
    }
    prev = row;
  }

  if (prev) checkOngoing(prev);

  return events;
}

// POST /api/gps/ingest — ESP32 push ตำแหน่งเข้ามา
router.post('/ingest', (req, res) => {
  const deviceKey = req.header('X-Device-Key');
  if (!deviceKey || deviceKey !== process.env.GPS_DEVICE_API_KEY) {
    return res.status(401).json({ error: 'Invalid device key' });
  }

  const { device_id, lat, lng, speed, bearing } = req.body || {};
  const latNum = Number(lat);
  const lngNum = Number(lng);
  const speedNum = speed === undefined ? 0 : Number(speed);
  const bearingNum = bearing === undefined ? 0 : Number(bearing);

  if (!device_id || typeof device_id !== 'string') {
    return res.status(400).json({ error: 'device_id is required' });
  }
  if (!isValidCoord(latNum, lngNum)) {
    return res.status(400).json({ error: 'lat/lng must be valid numbers within range' });
  }
  if (!Number.isFinite(speedNum) || !Number.isFinite(bearingNum)) {
    return res.status(400).json({ error: 'speed/bearing must be numbers' });
  }

  const point = {
    device_id,
    lat: latNum,
    lng: lngNum,
    speed: speedNum,
    bearing: bearingNum,
    recorded_at: new Date().toISOString(),
  };

  latestByDevice.set(device_id, point);
  emitter.emit(device_id, point);

  db.query(
    `INSERT INTO gps_snapshots (bus_id, lat, lng, speed, bearing, soc, bv, be, odo, acc)
     VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0)`,
    [device_id, latNum, lngNum, speedNum, bearingNum]
  ).catch(err => console.error('❌ gpsIngest snapshot insert error:', err.message));

  res.json({ ok: true });
});

// GET /api/gps/:device_id/stream — SSE realtime feed
// NOTE: does not work through a reverse proxy that buffers responses (e.g. IIS
// ARR) since it never completes. Use /:device_id/latest for polling instead.
router.get('/:device_id/stream', (req, res) => {
  const { device_id } = req.params;

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();

  const last = latestByDevice.get(device_id);
  if (last) {
    res.write(`data: ${JSON.stringify(last)}\n\n`);
  }

  const onPoint = (point) => {
    res.write(`data: ${JSON.stringify(point)}\n\n`);
  };
  emitter.on(device_id, onPoint);

  req.on('close', () => {
    emitter.off(device_id, onPoint);
  });
});

// GET /api/gps/:device_id/latest — last known point, read straight from
// gps_snapshots (not the in-RAM cache — that resets on every restart).
// Plain request/response works fine behind IIS ARR, unlike /stream.
router.get('/:device_id/latest', async (req, res) => {
  const { device_id } = req.params;
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  try {
    const [rows] = await db.query(
      `SELECT bus_id, lat, lng, speed, bearing, recorded_at
       FROM gps_snapshots
       WHERE bus_id = ?
       ORDER BY recorded_at DESC, id DESC
       LIMIT 1`,
      [device_id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'no data yet for this device_id' });
    }
    const row = rows[0];
    res.json({
      device_id: row.bus_id,
      lat: Number(row.lat),
      lng: Number(row.lng),
      speed: Number(row.speed),
      bearing: Number(row.bearing),
      recorded_at: row.recorded_at,
    });
  } catch (err) {
    console.error('❌ gpsIngest /latest query error:', err.message);
    res.status(500).json({ error: 'query failed' });
  }
});

// GET /api/gps/devices — latest snapshot per device_id, with an "online" flag
router.get('/devices', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  try {
    const [rows] = await db.query(
      `SELECT s.bus_id, s.lat, s.lng, s.speed, s.bearing, s.recorded_at
       FROM gps_snapshots s
       INNER JOIN (
         SELECT bus_id, MAX(id) AS max_id FROM gps_snapshots GROUP BY bus_id
       ) latest ON latest.bus_id = s.bus_id AND latest.max_id = s.id
       ORDER BY s.recorded_at DESC`
    );
    const now = Date.now();
    const devices = rows.map(row => ({
      device_id: row.bus_id,
      lat: Number(row.lat),
      lng: Number(row.lng),
      speed: Number(row.speed),
      bearing: Number(row.bearing),
      recorded_at: row.recorded_at,
      online: (now - new Date(row.recorded_at).getTime()) <= DEVICE_ONLINE_THRESHOLD_MS,
    }));
    res.json({ devices });
  } catch (err) {
    console.error('❌ gpsIngest /devices query error:', err.message);
    res.status(500).json({ error: 'query failed' });
  }
});

// GET /api/gps/devices/view — human-readable table of every device_id that
// has ever sent a snapshot, auto-refreshing off /devices above.
router.get('/devices/view', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.type('html').send(DEVICES_HTML);
});

// GET /api/gps/devices/map — every device_id plotted on one map at once,
// auto-refreshing off /devices above.
router.get('/devices/map', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.type('html').send(DEVICES_MAP_HTML);
});

// GET /api/gps/devices/stability?device_id=&hours= — dropout events for
// ESP32 boards (bus_id LIKE 'ESP32-%'), computed from gps_snapshots gaps
// wider than ESP32_DROPOUT_THRESHOLD_SEC. `hours` accepts fractional values
// (e.g. 0.5 for 30 minutes) and looks back up to 72 (the ESP32 retention
// window); defaults to 24. Converted to whole minutes for the SQL interval
// since MySQL's INTERVAL ... HOUR truncates fractional values.
router.get('/devices/stability', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  try {
    const hours = Math.min(72, Math.max(0.5, Number(req.query.hours) || 24));
    const minutes = Math.round(hours * 60);
    const { device_id } = req.query;

    const params = [minutes];
    let deviceFilter = '';
    if (device_id) {
      deviceFilter = 'AND bus_id = ?';
      params.push(device_id);
    }

    const [rows] = await db.query(
      `SELECT bus_id, lat, lng, recorded_at
       FROM gps_snapshots
       WHERE bus_id LIKE 'ESP32-%' AND recorded_at >= NOW() - INTERVAL ? MINUTE ${deviceFilter}
       ORDER BY bus_id, recorded_at`,
      params
    );

    const normalized = rows.map(row => ({
      bus_id: row.bus_id,
      lat: Number(row.lat),
      lng: Number(row.lng),
      recorded_at: row.recorded_at,
    }));

    const events = computeDropoutEvents(normalized, ESP32_DROPOUT_THRESHOLD_SEC, new Date());
    events.sort((a, b) => new Date(b.gap_start) - new Date(a.gap_start));

    res.json({ threshold_sec: ESP32_DROPOUT_THRESHOLD_SEC, events });
  } catch (err) {
    console.error('❌ gpsIngest /devices/stability query error:', err.message);
    res.status(500).json({ error: 'query failed' });
  }
});

// GET /api/gps/devices/stability/view — map of ESP32 dropout locations,
// click a marker for the datetime/duration detail. Auto-refreshes off
// /devices/stability above.
router.get('/devices/stability/view', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.type('html').send(STABILITY_HTML);
});

// GET /api/gps/monitor?device_id=XXX — simple polling viewer page
router.get('/monitor', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.type('html').send(MONITOR_HTML);
});

const DEVICES_HTML = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>GPS Devices</title>
<style>
  html, body { margin: 0; min-height: 100%; font-family: system-ui, sans-serif; background: #0b0f14; color: #e6edf3; }
  body { padding: 16px; }
  h1 { font-size: 16px; color: #9fb3c8; font-weight: 600; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #2a3441; }
  th { color: #7d8b99; font-weight: 600; }
  tr:hover td { background: rgba(255,255,255,.03); }
  a { color: #60a5fa; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
  .dot.online { background: #4ade80; }
  .dot.offline { background: #f87171; }
  #status { font-size: 12px; color: #7d8b99; margin-top: 12px; }
  #empty { color: #7d8b99; font-size: 13px; }
</style>
</head>
<body>
  <h1>GPS Devices <a href="map" style="font-size:12px;">ดูบนแผนที่ →</a> <a href="stability/view" style="font-size:12px;">วิเคราะห์ความเสถียร →</a></h1>
  <table id="table" style="display:none;">
    <thead>
      <tr><th>Device ID</th><th>สถานะ</th><th>lat</th><th>lng</th><th>speed</th><th>bearing</th><th>อัปเดตล่าสุด</th></tr>
    </thead>
    <tbody id="rows"></tbody>
  </table>
  <div id="empty">กำลังโหลด...</div>
  <div id="status"></div>

<script>
  const POLL_MS = 3000;
  const apiBase = location.pathname.replace(/\\/devices\\/view.*$/, ''); // this page lives at .../devices/view

  async function poll() {
    const statusEl = document.getElementById('status');
    const emptyEl = document.getElementById('empty');
    const tableEl = document.getElementById('table');
    const rowsEl = document.getElementById('rows');
    try {
      const res = await fetch(apiBase + '/devices', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const { devices } = await res.json();

      if (!devices.length) {
        emptyEl.textContent = 'ยังไม่มีอุปกรณ์ส่งข้อมูลเข้ามาเลย';
        emptyEl.style.display = '';
        tableEl.style.display = 'none';
      } else {
        emptyEl.style.display = 'none';
        tableEl.style.display = '';
        rowsEl.innerHTML = devices.map(d => {
          const status = d.online ? 'online' : 'offline';
          const href = apiBase + '/monitor?device_id=' + encodeURIComponent(d.device_id);
          return '<tr>' +
            '<td><a href="' + href + '">' + d.device_id + '</a></td>' +
            '<td><span class="dot ' + status + '"></span>' + status + '</td>' +
            '<td>' + d.lat.toFixed(6) + '</td>' +
            '<td>' + d.lng.toFixed(6) + '</td>' +
            '<td>' + d.speed + ' km/h</td>' +
            '<td>' + d.bearing + '°</td>' +
            '<td>' + new Date(d.recorded_at).toLocaleTimeString('th-TH') + '</td>' +
            '</tr>';
        }).join('');
      }

      statusEl.textContent = 'อัปเดตล่าสุด: ' + new Date().toLocaleTimeString('th-TH') + ' (' + devices.length + ' เครื่อง)';
    } catch (err) {
      statusEl.textContent = 'เชื่อมต่อไม่ได้: ' + err.message;
    }
  }

  poll();
  setInterval(poll, POLL_MS);
</script>
</body>
</html>`;

const DEVICES_MAP_HTML = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>GPS Devices Map</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body { margin: 0; height: 100%; font-family: system-ui, sans-serif; background: #0b0f14; color: #e6edf3; }
  #panel { position: absolute; z-index: 1000; top: 12px; left: 12px; background: rgba(15,20,26,.9);
           border: 1px solid #2a3441; border-radius: 8px; padding: 10px 14px; font-size: 12px; }
  #panel a { color: #60a5fa; text-decoration: none; }
  #panel a:hover { text-decoration: underline; }
  #status { color: #7d8b99; margin-top: 6px; }
  #map { position: absolute; inset: 0; }
  .bus-label { background: rgba(15,20,26,.85); border: 1px solid #2a3441; color: #e6edf3;
               border-radius: 4px; padding: 1px 6px; font-size: 11px; }
  .bus-label.offline { color: #7d8b99; }
  #attribution { position: absolute; z-index: 1000; right: 6px; bottom: 4px; font-size: 10px;
                 color: #7d8b99; background: rgba(15,20,26,.75); padding: 2px 6px; border-radius: 4px; }
</style>
</head>
<body>
  <div id="panel">
    <a href="view">← ดูแบบตาราง</a>
    <div id="status">กำลังโหลด...</div>
  </div>
  <div id="map"></div>
  <div id="attribution">Imagery &copy; Esri</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const POLL_MS = 3000;
  const apiBase = location.pathname.replace(/\\/devices\\/map.*$/, ''); // this page lives at .../devices/map

  const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([19.03, 99.90], 14);
  L.control.zoom({ position: 'topright' }).addTo(map); // topleft would sit under the status panel
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
  }).addTo(map);

  const busState = new Map(); // device_id -> animation state (see poll() for shape)
  let didInitialFit = false;

  // Same dead-reckoning approach as the single-device /monitor page: real
  // fixes land every ~1-3s, too sparse to animate between directly, so each
  // marker keeps extrapolating forward from its last known (lat,lng,speed,
  // bearing) every frame and blends smoothly into a new fix when one lands,
  // instead of snapping. Unlike /monitor, the map itself is never rotated or
  // re-centered -- with many buses on screen at once, locking the view to
  // one of them would fight whatever the viewer is trying to look at.
  const MAX_PREDICT_S = 2.2; // don't trust straight-line extrapolation further than this past a fix
  const CORRECTION_MS = 300; // how long a new fix takes to smoothly pull the marker back on track

  function shortestAngleDelta(from, to) {
    let d = (to - from) % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  function destinationPoint(lat, lng, bearingDeg, distanceM) {
    const R = 6371000;
    const brng = bearingDeg * Math.PI / 180;
    const lat1 = lat * Math.PI / 180;
    const dR = distanceM / R;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(dR) + Math.cos(lat1) * Math.sin(dR) * Math.cos(brng));
    const lng2 = (lng * Math.PI / 180) + Math.atan2(
      Math.sin(brng) * Math.sin(dR) * Math.cos(lat1),
      Math.cos(dR) - Math.sin(lat1) * Math.sin(lat2)
    );
    return { lat: lat2 * 180 / Math.PI, lng: lng2 * 180 / Math.PI };
  }

  function iconFor(online) {
    const color = online ? '#3b82f6' : '#6b7280';
    return L.divIcon({
      className: '',
      html: '<div class="bus-rotor"><svg width="26" height="26" viewBox="0 0 24 24">' +
            '<path d="M12 1.5 L20 20.5 L12 16.5 L4 20.5 Z" fill="' + color + '" stroke="#0b0f14" stroke-width="1"/></svg></div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
  }

  function tooltipHtml(d) {
    const time = new Date(d.recorded_at).toLocaleTimeString('th-TH');
    return '<div>' + d.device_id + (d.online ? '' : ' (offline)') + '</div>' +
           '<div style="font-size:10px;opacity:.75;">' + time + '</div>';
  }

  function renderFrame(now) {
    for (const state of busState.values()) {
      const elapsedS = Math.min(MAX_PREDICT_S, (now - state.baseTime) / 1000);
      const distanceM = (state.baseSpeedKmh * 1000 / 3600) * elapsedS;
      const projected = destinationPoint(state.baseLat, state.baseLng, state.baseBearing, distanceM);

      let lat = projected.lat, lng = projected.lng;
      if (state.correctFrom) {
        const t = Math.min(1, (now - state.correctStart) / CORRECTION_MS);
        lat = state.correctFrom.lat + (projected.lat - state.correctFrom.lat) * t;
        lng = state.correctFrom.lng + (projected.lng - state.correctFrom.lng) * t;
        if (t >= 1) state.correctFrom = null;
      }

      state.displayBearing += shortestAngleDelta(state.displayBearing, state.baseBearing) * 0.15;

      state.marker.setLatLng([lat, lng]);
      if (state.rotor) state.rotor.style.transform = 'rotate(' + state.displayBearing + 'deg)';
    }
    requestAnimationFrame(renderFrame);
  }
  requestAnimationFrame(renderFrame);

  async function poll() {
    const statusEl = document.getElementById('status');
    try {
      const res = await fetch(apiBase + '/devices', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const { devices } = await res.json();

      const seen = new Set();
      devices.forEach(d => {
        seen.add(d.device_id);
        let state = busState.get(d.device_id);

        if (!state) {
          const marker = L.marker([d.lat, d.lng], { icon: iconFor(d.online) }).addTo(map);
          marker.bindTooltip(tooltipHtml(d), { permanent: true, direction: 'top', offset: [0, -10], className: 'bus-label' });
          state = {
            marker,
            rotor: marker.getElement().querySelector('.bus-rotor'),
            baseLat: d.lat, baseLng: d.lng, baseBearing: d.bearing, baseSpeedKmh: d.speed,
            baseTime: performance.now(), displayBearing: d.bearing,
            correctFrom: null, correctStart: 0,
            lastRecordedAt: d.recorded_at, online: d.online,
          };
          busState.set(d.device_id, state);
        } else {
          if (d.recorded_at !== state.lastRecordedAt) {
            // snapshot where the extrapolation currently sits, then blend from there into the new fix
            const elapsedS = Math.min(MAX_PREDICT_S, (performance.now() - state.baseTime) / 1000);
            const distanceM = (state.baseSpeedKmh * 1000 / 3600) * elapsedS;
            state.correctFrom = destinationPoint(state.baseLat, state.baseLng, state.baseBearing, distanceM);
            state.correctStart = performance.now();

            state.baseLat = d.lat; state.baseLng = d.lng; state.baseBearing = d.bearing; state.baseSpeedKmh = d.speed;
            state.baseTime = performance.now();
            state.lastRecordedAt = d.recorded_at;
          }
          if (state.online !== d.online) {
            state.online = d.online;
            state.marker.setIcon(iconFor(d.online));
            state.rotor = state.marker.getElement().querySelector('.bus-rotor');
          }
        }

        state.marker.setTooltipContent(tooltipHtml(d));
        const tooltipEl = state.marker.getTooltip() && state.marker.getTooltip().getElement();
        if (tooltipEl) tooltipEl.classList.toggle('offline', !d.online);
      });

      // drop markers for device_ids that vanished from the feed entirely
      for (const [id, state] of busState) {
        if (!seen.has(id)) {
          map.removeLayer(state.marker);
          busState.delete(id);
        }
      }

      if (!didInitialFit && devices.length) {
        map.fitBounds(L.latLngBounds(devices.map(d => [d.lat, d.lng])), { padding: [40, 40], maxZoom: 16 });
        didInitialFit = true;
      }

      const onlineCount = devices.filter(d => d.online).length;
      statusEl.textContent = 'อัปเดตล่าสุด: ' + new Date().toLocaleTimeString('th-TH') + ' (' + onlineCount + '/' + devices.length + ' online)';
    } catch (err) {
      statusEl.textContent = 'เชื่อมต่อไม่ได้: ' + err.message;
    }
  }

  poll();
  setInterval(poll, POLL_MS);
</script>
</body>
</html>`;

const STABILITY_HTML = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>GPS Stability Analysis</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body { margin: 0; height: 100%; font-family: system-ui, sans-serif; background: #0b0f14; color: #e6edf3; }
  #panel { position: absolute; z-index: 1000; top: 12px; left: 12px; background: rgba(15,20,26,.9);
           border: 1px solid #2a3441; border-radius: 8px; padding: 10px 14px; font-size: 12px; max-width: 220px; }
  #panel h1 { font-size: 14px; margin: 0 0 8px; color: #9fb3c8; font-weight: 600; }
  #panel a { color: #60a5fa; text-decoration: none; }
  #panel a:hover { text-decoration: underline; }
  #panel select { width: 100%; box-sizing: border-box; margin-top: 6px; padding: 5px 6px;
                  background: #0b0f14; border: 1px solid #2a3441; border-radius: 6px; color: #e6edf3; font-size: 12px; }
  #status { color: #7d8b99; margin-top: 8px; }
  #map { position: absolute; inset: 0; }
  .drop-marker.ongoing { filter: drop-shadow(0 0 3px #f87171); }
  .drop-marker { transition: opacity .15s ease; }
  .drop-marker svg { transition: transform .15s ease, filter .15s ease; transform-origin: center; }
  .drop-tooltip { background: rgba(15,20,26,.95); border: 1px solid #2a3441; color: #e6edf3;
                  border-radius: 6px; padding: 5px 8px; font-size: 11px; line-height: 1.5; }
  .drop-tooltip b { color: #9fb3c8; }
  .hotspot-badge { width: 24px; height: 24px; border-radius: 50%; background: #0b0f14; border-width: 3px;
                   border-style: solid; display: flex; align-items: center; justify-content: center;
                   font-size: 12px; font-weight: 700; color: #e6edf3; box-shadow: 0 0 6px rgba(0,0,0,.7); }
  #detail { position: absolute; z-index: 1000; bottom: 12px; left: 12px; right: 12px; max-width: 320px;
            background: rgba(15,20,26,.95); border: 1px solid #2a3441; border-radius: 8px; padding: 12px 14px;
            font-size: 13px; display: none; }
  #detail h2 { font-size: 13px; margin: 0 0 8px; color: #9fb3c8; font-weight: 600; }
  #detail .row { display: flex; justify-content: space-between; gap: 12px; padding: 2px 0; }
  #detail .row span:first-child { color: #7d8b99; }
  #detail .close { position: absolute; top: 8px; right: 10px; cursor: pointer; color: #7d8b99; }
  #empty { position: absolute; z-index: 1000; top: 50%; left: 50%; transform: translate(-50%, -50%);
           color: #7d8b99; font-size: 13px; display: none; }
  #summary { position: absolute; z-index: 1000; bottom: 12px; right: 12px; width: 280px; max-width: 42vw;
             background: rgba(15,20,26,.95); border: 1px solid #2a3441; border-radius: 8px; padding: 10px 14px; }
  #summary h2 { font-size: 13px; margin: 0 0 8px; color: #9fb3c8; font-weight: 600; }
  #summary-chart-wrap { height: 220px; }
  #summary-empty { color: #7d8b99; font-size: 12px; display: none; }
  #attribution { position: absolute; z-index: 1000; right: 6px; bottom: 4px; font-size: 10px;
                 color: #7d8b99; background: rgba(15,20,26,.75); padding: 2px 6px; border-radius: 4px; }
</style>
</head>
<body>
  <div id="panel">
    <h1>ความเสถียรบอร์ด ESP32</h1>
    <a href="../view">← กลับหน้าอุปกรณ์</a>
    <select id="hours">
      <option value="0.5">30 นาทีล่าสุด</option>
      <option value="1">1 ชั่วโมงล่าสุด</option>
      <option value="3">3 ชั่วโมงล่าสุด</option>
      <option value="6">6 ชั่วโมงล่าสุด</option>
      <option value="24" selected>24 ชั่วโมงล่าสุด</option>
      <option value="72">3 วันล่าสุด</option>
    </select>
    <div id="status">กำลังโหลด...</div>
    <div style="margin-top:8px;">
      <span style="color:#4ade80;">●</span> &lt; 5 วิ &nbsp;
      <span style="color:#eab308;">●</span> 5-30 วิ &nbsp;
      <span style="color:#f87171;">●</span> &gt; 30 วิ
    </div>
    <div style="margin-top:4px; font-size:11px; color:#7d8b99;">วงแหวนขาว = จุดกลับมา</div>
  </div>
  <div id="map"></div>
  <div id="empty">ไม่พบเหตุการณ์หลุดหายในช่วงเวลานี้</div>
  <div id="detail">
    <span class="close" onclick="document.getElementById('detail').style.display='none';">✕</span>
    <h2 id="d-device">-</h2>
    <div class="row"><span>หลุดเมื่อ</span><span id="d-start">-</span></div>
    <div class="row"><span>กลับมาเมื่อ</span><span id="d-end">-</span></div>
    <div class="row"><span>ระยะเวลาหลุด</span><span id="d-duration">-</span></div>
  </div>
  <div id="summary">
    <h2>จุดที่หลุดบ่อย (เรียงตามความถี่)</h2>
    <div id="summary-chart-wrap"><canvas id="summary-chart"></canvas></div>
    <div id="summary-empty">ยังไม่มีข้อมูลพอสรุป</div>
  </div>
  <div id="attribution">Imagery &copy; Esri</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/chart.js@4.4.4/dist/chart.umd.js"></script>
<script>
  const POLL_MS = 15000;
  const apiBase = location.pathname.replace(/\\/devices\\/stability\\/view.*$/, ''); // this page lives at .../devices/stability/view
  const hoursSelect = document.getElementById('hours');

  const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([19.03, 99.90], 14);
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
  }).addTo(map);

  let eventGroups = []; // [{ markers: [dropMarker, reconnectMarker?], line? }]
  let didInitialFit = false;

  function fmtTime(iso) {
    return iso ? new Date(iso).toLocaleString('th-TH', { hour12: false }) : '-';
  }

  function fmtDuration(sec) {
    if (sec < 60) return sec + ' วินาที';
    const min = Math.floor(sec / 60);
    const rem = sec % 60;
    return min + ' นาที' + (rem ? ' ' + rem + ' วิ' : '');
  }

  function showDetail(ev) {
    document.getElementById('d-device').textContent = ev.device_id;
    document.getElementById('d-start').textContent = fmtTime(ev.gap_start);
    document.getElementById('d-end').textContent = ev.gap_end ? fmtTime(ev.gap_end) : 'ยังไม่กลับมา';
    document.getElementById('d-duration').textContent = fmtDuration(ev.duration_sec) + (ev.gap_end ? '' : ' (และยังนับต่อเนื่อง)');
    document.getElementById('detail').style.display = '';
  }

  function tooltipHtml(ev) {
    return '<div><b>' + ev.device_id + '</b></div>' +
           '<div>หลุด: ' + fmtTime(ev.gap_start) + '</div>' +
           '<div>กลับมา: ' + (ev.gap_end ? fmtTime(ev.gap_end) : 'ยังไม่กลับมา') + '</div>' +
           '<div>ระยะเวลา: ' + fmtDuration(ev.duration_sec) + (ev.gap_end ? '' : ' (นับต่อเนื่อง)') + '</div>';
  }

  // > 30s = แดง (รุนแรง), > 5s = เหลือง (ปานกลาง), <= 5s = เขียว (เล็กน้อย)
  function severityColor(durationSec) {
    if (durationSec > 30) return '#f87171';
    if (durationSec > 5) return '#eab308';
    return '#4ade80';
  }

  // isReconnect draws a white ring so the reconnect point of a pair is
  // visually distinct from the drop point, while the fill color always
  // reflects the event's severity (see severityColor).
  function iconFor(color, isReconnect, isOngoing) {
    const stroke = isReconnect ? '#e6edf3' : '#0b0f14';
    const strokeWidth = isReconnect ? 3 : 2;
    return L.divIcon({
      className: 'drop-marker' + (isOngoing ? ' ongoing' : ''),
      html: '<svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="' + color + '" stroke="' + stroke + '" stroke-width="' + strokeWidth + '"/></svg>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  }

  // Hovering either point of a drop/reconnect pair floats that whole pair
  // (both markers + the connecting line) above the rest of the map and dims
  // everything else, so the two points forming one event read as a unit.
  function setGroupHighlighted(group, isTarget) {
    group.markers.forEach(m => {
      const el = m.getElement();
      if (el) {
        el.style.opacity = isTarget ? '1' : '0.25';
        const svg = el.querySelector('svg');
        if (svg) svg.style.transform = isTarget ? 'scale(1.7)' : 'scale(1)';
      }
      m.setZIndexOffset(isTarget ? 1000 : 0);
    });
    if (group.line) {
      group.line.setStyle({
        opacity: isTarget ? 1 : 0.15,
        weight: isTarget ? 3 : 1,
        color: isTarget ? '#e6edf3' : '#7d8b99',
      });
      if (isTarget) group.line.bringToFront();
    }
  }

  function highlightGroup(target) {
    eventGroups.forEach(g => setGroupHighlighted(g, g === target));
  }

  function clearHighlight() {
    eventGroups.forEach(g => setGroupHighlighted(g, true));
  }

  async function poll() {
    const statusEl = document.getElementById('status');
    const emptyEl = document.getElementById('empty');
    try {
      const hours = hoursSelect.value;
      const res = await fetch(apiBase + '/devices/stability?hours=' + hours, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const { events } = await res.json();

      eventGroups.forEach(g => {
        g.markers.forEach(m => map.removeLayer(m));
        if (g.line) map.removeLayer(g.line);
      });
      eventGroups = [];
      const boundsPoints = [];

      events.forEach(ev => {
        const tooltipOpts = { direction: 'top', offset: [0, -10], className: 'drop-tooltip' };
        const group = { markers: [], line: null };
        const color = severityColor(ev.duration_sec);

        const dropMarker = L.marker([ev.lat, ev.lng], { icon: iconFor(color, false, !ev.gap_end) }).addTo(map);
        dropMarker.bindTooltip(tooltipHtml(ev), tooltipOpts);
        dropMarker.on('click', () => showDetail(ev));
        group.markers.push(dropMarker);
        boundsPoints.push([ev.lat, ev.lng]);

        if (ev.gap_end && ev.end_lat != null && ev.end_lng != null) {
          const reconnectMarker = L.marker([ev.end_lat, ev.end_lng], { icon: iconFor(color, true, false) }).addTo(map);
          reconnectMarker.bindTooltip(tooltipHtml(ev), tooltipOpts);
          reconnectMarker.on('click', () => showDetail(ev));
          group.markers.push(reconnectMarker);
          boundsPoints.push([ev.end_lat, ev.end_lng]);

          group.line = L.polyline([[ev.lat, ev.lng], [ev.end_lat, ev.end_lng]], {
            color: '#7d8b99', weight: 1, dashArray: '4,4',
          }).addTo(map);
        }

        group.markers.forEach(m => {
          m.on('mouseover', () => highlightGroup(group));
          m.on('mouseout', clearHighlight);
        });
        eventGroups.push(group);
      });

      emptyEl.style.display = events.length ? 'none' : '';

      if (!didInitialFit && boundsPoints.length) {
        map.fitBounds(L.latLngBounds(boundsPoints), { padding: [40, 40], maxZoom: 16 });
        didInitialFit = true;
      }

      const ongoingCount = events.filter(ev => !ev.gap_end).length;
      statusEl.textContent = 'อัปเดตล่าสุด: ' + new Date().toLocaleTimeString('th-TH') + ' (' + events.length + ' เหตุการณ์, ' + ongoingCount + ' กำลังหลุด)';

      // Kept out of the try above on purpose: a chart-rendering failure
      // (e.g. Chart.js blocked/slow to load) must never overwrite the
      // status line above with a misleading "connection failed" message
      // when the map data itself loaded fine.
      try {
        const hotspots = buildHotspots(events);
        renderSummaryChart(hotspots); // also updates currentTopHotspots, which renderHotspotMarkers reads
        renderHotspotMarkers();
      } catch (chartErr) {
        console.error('summary chart render failed:', chartErr);
      }
    } catch (err) {
      statusEl.textContent = 'เชื่อมต่อไม่ได้: ' + err.message;
    }
  }

  // Buckets dropout events by device_id + coarse location (~110m grid, 3
  // decimal places) so repeated dropouts at roughly the same physical spot
  // count as one recurring hotspot instead of many near-identical points,
  // then ranks hotspots by how often they occurred.
  function buildHotspots(events) {
    const buckets = new Map();
    events.forEach(ev => {
      const key = ev.device_id + '@' + ev.lat.toFixed(3) + ',' + ev.lng.toFixed(3);
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { device_id: ev.device_id, lat: ev.lat, lng: ev.lng, count: 0, totalDurationSec: 0 };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      bucket.totalDurationSec += ev.duration_sec;
    });
    return Array.from(buckets.values()).sort((a, b) => b.count - a.count);
  }

  let summaryChart = null;
  let hotspotMarkers = [];
  let currentTopHotspots = []; // kept in sync with the chart's bars, index-for-index, so a bar click can find its map pin
  const TOP_HOTSPOTS = 8;

  function renderSummaryChart(hotspots) {
    const canvasWrap = document.getElementById('summary-chart-wrap');
    const emptyEl = document.getElementById('summary-empty');

    currentTopHotspots = hotspots.slice(0, TOP_HOTSPOTS);

    if (!currentTopHotspots.length) {
      canvasWrap.style.display = 'none';
      emptyEl.style.display = '';
      if (summaryChart) { summaryChart.destroy(); summaryChart = null; }
      return;
    }
    canvasWrap.style.display = '';
    emptyEl.style.display = 'none';

    const labels = currentTopHotspots.map((h, i) => '#' + (i + 1) + ' ' + h.device_id + ' (' + h.lat.toFixed(3) + ', ' + h.lng.toFixed(3) + ')');
    const data = currentTopHotspots.map(h => h.count);
    const colors = currentTopHotspots.map(h => severityColor(h.totalDurationSec / h.count));

    if (summaryChart) {
      summaryChart.data.labels = labels;
      summaryChart.data.datasets[0].data = data;
      summaryChart.data.datasets[0].backgroundColor = colors;
      summaryChart.update();
      return;
    }

    summaryChart = new Chart(document.getElementById('summary-chart').getContext('2d'), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'จำนวนครั้งที่หลุด', data, backgroundColor: colors }] },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        onClick: (evt, elements) => {
          if (!elements.length) return;
          panToHotspot(currentTopHotspots[elements[0].index]);
        },
        onHover: (evt, elements) => {
          evt.native.target.style.cursor = elements.length ? 'pointer' : 'default';
        },
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { color: '#7d8b99', precision: 0 }, grid: { color: '#2a3441' } },
          y: { ticks: { color: '#e6edf3', font: { size: 10 } }, grid: { display: false } },
        },
      },
    });
  }

  // Clicking a bar in the summary chart jumps the map to that hotspot and
  // pops its badge open, answering "which point on the map is this bar?".
  function panToHotspot(hotspot) {
    if (!hotspot) return;
    map.setView([hotspot.lat, hotspot.lng], 18);
    const marker = hotspotMarkers.find(m => m.hotspotRef === hotspot);
    if (marker) marker.openTooltip();
  }

  // Numbered badges (#1 = หลุดบ่อยที่สุด) pinned at each hotspot location so
  // the ranking in the chart can be found directly on the map.
  function renderHotspotMarkers() {
    hotspotMarkers.forEach(m => map.removeLayer(m));
    hotspotMarkers = [];

    currentTopHotspots.forEach((h, i) => {
      const rank = i + 1;
      const avgDurationSec = h.totalDurationSec / h.count;
      const color = severityColor(avgDurationSec);
      const icon = L.divIcon({
        className: '',
        html: '<div class="hotspot-badge" style="border-color:' + color + ';">' + rank + '</div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const marker = L.marker([h.lat, h.lng], { icon, zIndexOffset: 2000 }).addTo(map);
      marker.hotspotRef = h;
      marker.bindTooltip(
        '<div><b>อันดับ ' + rank + ': ' + h.device_id + '</b></div>' +
        '<div>หลุดที่จุดนี้ ' + h.count + ' ครั้ง</div>' +
        '<div>เฉลี่ยหลุดนาน ' + fmtDuration(Math.round(avgDurationSec)) + '</div>',
        { direction: 'top', offset: [0, -14], className: 'drop-tooltip' }
      );
      hotspotMarkers.push(marker);
    });
  }

  hoursSelect.addEventListener('change', () => { didInitialFit = false; poll(); });
  poll();
  setInterval(poll, POLL_MS);
</script>
</body>
</html>`;

const MONITOR_HTML = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>GPS Monitor</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body { margin: 0; height: 100%; font-family: system-ui, sans-serif; background: #0b0f14; color: #e6edf3; }
  #panel { position: absolute; z-index: 1000; top: 12px; left: 12px; background: rgba(15,20,26,.9);
           border: 1px solid #2a3441; border-radius: 8px; padding: 12px 16px; min-width: 220px; }
  #panel h1 { font-size: 14px; margin: 0 0 8px; color: #9fb3c8; font-weight: 600; }
  #panel .row { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; padding: 2px 0; }
  #panel .row span:first-child { color: #7d8b99; }
  #panel a { color: #60a5fa; text-decoration: none; font-size: 12px; }
  #panel a:hover { text-decoration: underline; }
  #panel input { width: 100%; box-sizing: border-box; margin-bottom: 8px; padding: 6px 8px;
                 background: #0b0f14; border: 1px solid #2a3441; border-radius: 6px; color: #e6edf3; }
  #status { font-size: 12px; margin-top: 8px; }
  #status.ok { color: #4ade80; }
  #status.err { color: #f87171; }
  /* #map is deliberately oversized (220%) and centered inside #map-wrap so
     that rotating it to face the vehicle's heading never exposes blank
     corners — the wrapper crops it back down to the visible viewport. */
  #map-wrap { position: absolute; inset: 0; overflow: hidden; background: #0b0f14; }
  #map { position: absolute; top: -60%; left: -60%; width: 220%; height: 220%; }
  #attribution { position: absolute; z-index: 1000; right: 6px; bottom: 4px; font-size: 10px;
                 color: #7d8b99; background: rgba(15,20,26,.75); padding: 2px 6px; border-radius: 4px; }
</style>
</head>
<body>
  <div id="panel">
    <h1>GPS Monitor</h1>
    <div class="row"><a id="devicesLink" href="devices/view">← ดูทุกเครื่อง</a></div>
    <input id="deviceId" placeholder="device_id เช่น TC001" />
    <div class="row"><span>lat</span><span id="lat">-</span></div>
    <div class="row"><span>lng</span><span id="lng">-</span></div>
    <div class="row"><span>speed</span><span id="speed">-</span></div>
    <div class="row"><span>bearing</span><span id="bearing">-</span></div>
    <div class="row"><span>recorded_at</span><span id="recorded_at">-</span></div>
    <div id="status">รอค่า...</div>
  </div>
  <div id="map-wrap"><div id="map"></div></div>
  <div id="attribution">Imagery &copy; Esri</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const params = new URLSearchParams(location.search);
  const deviceIdInput = document.getElementById('deviceId');
  deviceIdInput.value = params.get('device_id') || 'TC001';

  const apiBase = location.pathname.replace(/\\/monitor.*$/, '');

  const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([19.03, 99.90], 15);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
  }).addTo(map);
  const mapEl = document.getElementById('map');

  // Arrow icon so the marker visibly points the way it's heading (rotated by
  // bearing) instead of a plain static pin — the rotation lives on an INNER
  // div so it doesn't fight with Leaflet's own transform on the outer
  // element (that's what positions the marker on the map).
  const busIcon = L.divIcon({
    className: '',
    html: '<div class="bus-rotor"><svg width="30" height="30" viewBox="0 0 24 24">' +
          '<path d="M12 1.5 L20 20.5 L12 16.5 L4 20.5 Z" fill="#3b82f6" stroke="#0b0f14" stroke-width="1"/>' +
          '</svg></div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
  const marker = L.marker([19.03, 99.90], { icon: busIcon }).addTo(map);
  const rotor = marker.getElement().querySelector('.bus-rotor');

  const POLL_MS = 400; // how often we ask the server — real fixes still land only as often as the board/DB produce them
  const CORRECTION_MS = 300; // how long a real fix takes to smoothly pull us back on track

  function shortestAngleDelta(from, to) {
    let d = (to - from) % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  // Great-circle projection: where would you be after travelling
  // distanceM metres on heading bearingDeg from (lat, lng)?
  function destinationPoint(lat, lng, bearingDeg, distanceM) {
    const R = 6371000;
    const brng = bearingDeg * Math.PI / 180;
    const lat1 = lat * Math.PI / 180;
    const dR = distanceM / R;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(dR) + Math.cos(lat1) * Math.sin(dR) * Math.cos(brng));
    const lng2 = (lng * Math.PI / 180) + Math.atan2(
      Math.sin(brng) * Math.sin(dR) * Math.cos(lat1),
      Math.cos(dR) - Math.sin(lat1) * Math.sin(lat2)
    );
    return { lat: lat2 * 180 / Math.PI, lng: lng2 * 180 / Math.PI };
  }

  // Dead reckoning: real fixes land every ~1-3s (board GPS cycle + network),
  // which is too sparse to animate between directly without either
  // stalling or jumping. Instead we keep extrapolating the marker forward
  // every frame from the last known (lat, lng, speed, bearing) — the same
  // trick Google Maps/Uber use to fill the gap between GPS updates. When a
  // real fix lands, we don't snap to it: we note where our extrapolation
  // currently thinks the bus is and blend smoothly (CORRECTION_MS) from
  // there into the new true position, then keep extrapolating onward.
  let baseLat = 19.03, baseLng = 99.90, baseBearing = 0, baseSpeedKmh = 0, baseTime = performance.now();
  let correctFrom = null, correctStart = 0;
  let displayBearing = 0;
  let lastRecordedAt = null;
  let firstFix = true;
  let lastPanAt = 0;

  // Don't trust straight-line extrapolation further than this into a real
  // fix's absence — on a curve the road bends but our projection doesn't,
  // so left unclamped a late fix means the marker keeps sailing straight
  // through the turn. Slightly above the board's normal ~2s send interval:
  // long enough to still cover a normal gap, short enough to cap the
  // overshoot when one fix is late.
  const MAX_PREDICT_S = 2.2;
  const PAN_THROTTLE_MS = 100; // re-centering the real Leaflet view is comparatively expensive; 10/s is plenty smooth

  function onNewFix(lat, lng, speedKmh, bearingDeg, recordedAt) {
    if (recordedAt === lastRecordedAt) return; // same DB row as last poll — nothing new to react to
    lastRecordedAt = recordedAt;

    if (firstFix) {
      baseLat = lat; baseLng = lng; baseBearing = bearingDeg; baseSpeedKmh = speedKmh;
      baseTime = performance.now();
      displayBearing = bearingDeg;
      marker.setLatLng([lat, lng]);
      rotor.style.transform = 'rotate(' + bearingDeg + 'deg)';
      mapEl.style.transform = 'rotate(' + (-bearingDeg) + 'deg)';
      map.setView([lat, lng], 17);
      firstFix = false;
      return;
    }

    // Snapshot where the extrapolation currently sits — that's the point
    // we'll blend away from, so the correction starts from what's on
    // screen right now, not from the old fix.
    const elapsedS = Math.min(MAX_PREDICT_S, (performance.now() - baseTime) / 1000);
    const distanceM = (baseSpeedKmh * 1000 / 3600) * elapsedS;
    correctFrom = destinationPoint(baseLat, baseLng, baseBearing, distanceM);
    correctStart = performance.now();

    baseLat = lat; baseLng = lng; baseBearing = bearingDeg; baseSpeedKmh = speedKmh;
    baseTime = performance.now();
  }

  function renderFrame(now) {
    const elapsedS = Math.min(MAX_PREDICT_S, (now - baseTime) / 1000);
    const distanceM = (baseSpeedKmh * 1000 / 3600) * elapsedS;
    const projected = destinationPoint(baseLat, baseLng, baseBearing, distanceM);

    let lat = projected.lat, lng = projected.lng;
    if (correctFrom) {
      const t = Math.min(1, (now - correctStart) / CORRECTION_MS);
      lat = correctFrom.lat + (projected.lat - correctFrom.lat) * t;
      lng = correctFrom.lng + (projected.lng - correctFrom.lng) * t;
      if (t >= 1) correctFrom = null;
    }

    displayBearing += shortestAngleDelta(displayBearing, baseBearing) * 0.15; // ease heading, don't snap-rotate

    if (!firstFix) {
      marker.setLatLng([lat, lng]);
      rotor.style.transform = 'rotate(' + displayBearing + 'deg)';
      // Heading-up nav mode: rotate the whole map opposite the vehicle's
      // heading (so the arrow above, rotated the same amount the other way,
      // nets out to always pointing straight up) and keep it centred on the
      // vehicle, like Google Maps / Uber turn-by-turn view.
      mapEl.style.transform = 'rotate(' + (-displayBearing) + 'deg)';
      if (now - lastPanAt >= PAN_THROTTLE_MS) {
        map.setView([lat, lng], map.getZoom(), { animate: false });
        lastPanAt = now;
      }
    }
    requestAnimationFrame(renderFrame);
  }
  requestAnimationFrame(renderFrame);

  async function poll() {
    const deviceId = deviceIdInput.value.trim();
    if (!deviceId) return;
    const statusEl = document.getElementById('status');
    try {
      const res = await fetch(apiBase + '/' + encodeURIComponent(deviceId) + '/latest', { cache: 'no-store' });
      if (res.status === 404) {
        statusEl.textContent = 'ยังไม่มีข้อมูลสำหรับ device_id นี้';
        statusEl.className = 'err';
        return;
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const p = await res.json();
      document.getElementById('lat').textContent = p.lat.toFixed(6);
      document.getElementById('lng').textContent = p.lng.toFixed(6);
      document.getElementById('speed').textContent = p.speed + ' km/h';
      document.getElementById('bearing').textContent = p.bearing + '°';
      document.getElementById('recorded_at').textContent = new Date(p.recorded_at).toLocaleTimeString('th-TH');
      statusEl.textContent = 'อัปเดตล่าสุด: ' + new Date().toLocaleTimeString('th-TH');
      statusEl.className = 'ok';

      onNewFix(p.lat, p.lng, p.speed, p.bearing, p.recorded_at);
    } catch (err) {
      statusEl.textContent = 'เชื่อมต่อไม่ได้: ' + err.message;
      statusEl.className = 'err';
    }
  }

  poll();
  setInterval(poll, POLL_MS);
</script>
</body>
</html>`;

// Lets other routes (buses.js) read the latest ESP32-reported position for a
// device, to override the vendor GPS position with a lower-latency source
// when available -- independent of gpsIngest's own gps_snapshots/DB writes.
function getLatestByDevice(deviceId) {
  return latestByDevice.get(deviceId) || null;
}

router.getLatestByDevice = getLatestByDevice;
router.DEVICE_ONLINE_THRESHOLD_MS = DEVICE_ONLINE_THRESHOLD_MS;
router.computeDropoutEvents = computeDropoutEvents;
module.exports = router;
