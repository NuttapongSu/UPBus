// backend/services/pushNotify.js
const axios = require('axios');
const db = require('../db');

const NOTIFY_RADIUS_M = 500;
const COOLDOWN_MS = 3 * 60 * 1000;
const cooldownMap = new Map();

const LINE_NAMES = {
  Green: 'สายหน้ามอ',
  Red:   'สายหอพัก',
  Blue:  'สายประตูสาม',
};

const LINE_EMOJI = { Green: '🟢', Red: '🔴', Blue: '🔵' };

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

/**
 * shouldNotify(bus, boardingStop) — returns true when:
 *   1. bus.color matches boardingStop.lineColor
 *   2. distance between bus and boardingStop is ≤ 500m
 */
function shouldNotify(bus, boardingStop) {
  if (bus.color !== boardingStop.lineColor) return false;
  const dist = haversineM(
    parseFloat(bus.latitude), parseFloat(bus.longitude),
    boardingStop.lat, boardingStop.lng
  );
  return dist <= NOTIFY_RADIUS_M;
}

/**
 * buildMessage(lineColor, lineName, stopName) — formats Expo push payload
 */
function buildMessage(lineColor, lineName, stopName) {
  return {
    title: `${LINE_EMOJI[lineColor] || ''} ${lineName} — ใกล้ถึงแล้ว!`,
    body: `รีบไปรอที่ ${stopName} เลยนะ`,
    sound: 'default',
  };
}

/**
 * dispatchNotifications(buses) — queries push_tokens, checks each bus against
 * registered boarding stops, and POSTs Expo push messages in batches of 100.
 */
async function dispatchNotifications(buses) {
  try {
    const [rows] = await db.query(
      `SELECT token, destination_stop_id, boarding_stops FROM push_tokens`
    );
    if (!rows.length) return;

    const now = Date.now();
    const messages = [];

    for (const row of rows) {
      let boardingStops;
      try {
        boardingStops = typeof row.boarding_stops === 'string'
          ? JSON.parse(row.boarding_stops)
          : row.boarding_stops;
      } catch {
        continue;
      }
      if (!Array.isArray(boardingStops)) continue;

      for (const bs of boardingStops) {
        if (!bs.lat || !bs.lng) continue;

        const matchingBus = buses.find(b => shouldNotify(b, bs));
        if (!matchingBus) continue;

        const key = `${row.token}:${matchingBus.imei_id}:${bs.stopName}`;
        if (now - (cooldownMap.get(key) || 0) < COOLDOWN_MS) continue;
        cooldownMap.set(key, now);

        messages.push({
          to: row.token,
          ...buildMessage(bs.lineColor, LINE_NAMES[bs.lineColor] || bs.lineColor, bs.stopName),
          data: {
            busId: matchingBus.imei_id,
            stopName: bs.stopName,
            line: bs.lineColor,
            destinationStopId: row.destination_stop_id,
          },
        });
      }
    }

    if (!messages.length) return;

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

module.exports = { haversineM, shouldNotify, buildMessage, dispatchNotifications };
