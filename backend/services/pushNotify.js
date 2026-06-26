// backend/services/pushNotify.js
const axios = require('axios');
const db = require('../db');

const NOTIFY_RADIUS_M = 200;
const COOLDOWN_MS = 3 * 60 * 1000;
const cooldownMap = new Map();

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function shouldNotify(bus) {
  if (!bus.color || bus.color === 'Purple' || bus.color === 'Orange') return false;
  return (bus.speed || 0) >= 2 && ['Red', 'Green', 'Blue'].includes(bus.color);
}

async function dispatch(busesWithColor) {
  try {
    const [tokenRows] = await db.query(
      `SELECT token, destination_stop_id, boarding_stops FROM push_tokens`
    );
    if (tokenRows.length === 0) return;

    const now = Date.now();
    const messages = [];

    for (const bus of busesWithColor) {
      if (!bus.latitude || !bus.longitude || !shouldNotify(bus)) continue;

      for (const row of tokenRows) {
        let boardingStops;
        try {
          boardingStops = typeof row.boarding_stops === 'string'
            ? JSON.parse(row.boarding_stops)
            : row.boarding_stops;
        } catch {
          continue;
        }

        if (!Array.isArray(boardingStops)) continue;

        const matchingStops = boardingStops.filter(
          s => s.lineColor === bus.color
        );

        for (const stop of matchingStops) {
          if (!stop.lat || !stop.lng) continue;
          if (haversineM(bus.latitude, bus.longitude, stop.lat, stop.lng) > NOTIFY_RADIUS_M) continue;

          const key = `${row.token}:${bus.imei_id}:${stop.stopName}`;
          if (now - (cooldownMap.get(key) || 0) < COOLDOWN_MS) continue;
          cooldownMap.set(key, now);

          const emoji = { Red: '🔴', Green: '🟢', Blue: '🔵' }[bus.color] || '';
          messages.push({
            to: row.token,
            title: 'UP Smart Transit',
            body: `รถสาย${emoji} กำลังเข้าป้าย ${stop.stopName}`,
            data: {
              busId: bus.imei_id,
              stopName: stop.stopName,
              line: bus.color,
              destinationStopId: row.destination_stop_id,
            },
          });
        }
      }
    }

    if (messages.length === 0) return;

    for (let i = 0; i < messages.length; i += 100) {
      await axios.post('https://exp.host/--/api/v2/push/send', messages.slice(i, i + 100), {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        timeout: 5000,
      });
    }
    console.log(`📲 Sent ${messages.length} push notifications`);
  } catch (err) {
    console.error('❌ Push dispatch error:', err.message);
  }
}

module.exports = { haversineM, shouldNotify, dispatch };
