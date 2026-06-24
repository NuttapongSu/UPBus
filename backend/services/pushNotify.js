// backend/services/pushNotify.js
const axios = require('axios');
const db = require('../db');

const LINE_STOPS = {
  Green: [
    { name: 'จุดจอดรถบัส PKY',                            lat: 19.02562,   lng: 99.895015  },
    { name: 'สถานีหน้าคณะศิลปศาสตร์',                     lat: 19.0294776, lng: 99.8957507 },
    { name: 'สถานีหน้าคณะพยาบาลศาสตร์',                   lat: 19.0306625, lng: 99.897615  },
    { name: 'สถานีหน้าคณะวิศวกรรมศาสตร์',                 lat: 19.0307963, lng: 99.9011997 },
    { name: 'สถานีหน้าคณะทันตแพทยศาสตร์',                 lat: 19.0298661, lng: 99.9154259 },
    { name: 'จุดจอดรถบัสหน้ามหาวิทยาลัย',                lat: 19.030564,  lng: 99.923098  },
    { name: 'สถานีหน้าเรือนเอื้องคำ',                     lat: 19.028584,  lng: 99.906696  },
    { name: 'สถานีหน้าคณะวิศวกรรมศาสตร์ (ขากลับ)',        lat: 19.0305663, lng: 99.901226  },
    { name: 'สถานีหน้าหอประชุมพญางำเมือง',                lat: 19.0299998, lng: 99.8977114 },
    { name: 'สถานีหน้าอาคารสำนักงานอธิการบดี',            lat: 19.0290339, lng: 99.8960666 },
  ],
  Blue: [
    { name: 'จุดจอดรถบัสประตูสาม',                        lat: 19.02281,   lng: 99.89537   },
    { name: 'สถานีหน้าคณะเทคโนโลยีสารสนเทศและการสื่อสาร', lat: 19.0284949, lng: 99.8998267 },
    { name: 'สถานีหน้าคณะวิศวกรรมศาสตร์',                 lat: 19.0305663, lng: 99.901226  },
    { name: 'สถานีหน้าศูนย์การเรียนรู้เศรษฐกิจพอเพียง',   lat: 19.02696,   lng: 99.899542  },
  ],
  Red: [
    { name: 'สถานีหน้าอาคารสงวนเสริมศรี',                 lat: 19.0342438, lng: 99.8863112 },
    { name: 'สถานีหน้าอาคาร ๙๙ ปี',                       lat: 19.0320031, lng: 99.8934952 },
    { name: 'สถานีหน้าเวียงพะเยา',                        lat: 19.0331648, lng: 99.8908747 },
    { name: 'สถานีหน้าโรงเรียนสาธิตมหาวิทยาลัยพะเยา',    lat: 19.0344118, lng: 99.8842468 },
    { name: 'จุดจอดรถบัส PKY',                            lat: 19.02562,   lng: 99.895015  },
  ],
};

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
    const [tokenRows] = await db.query(`SELECT token, lines FROM push_tokens`);
    if (tokenRows.length === 0) return;

    const now = Date.now();
    const messages = [];

    for (const bus of busesWithColor) {
      if (!bus.latitude || !bus.longitude || !shouldNotify(bus)) continue;
      const stops = LINE_STOPS[bus.color];
      if (!stops) continue;

      for (const stop of stops) {
        if (haversineM(bus.latitude, bus.longitude, stop.lat, stop.lng) > NOTIFY_RADIUS_M) continue;

        for (const row of tokenRows) {
          let lines;
          try {
            lines = JSON.parse(row.lines);
          } catch {
            continue; // skip this token, don't abort the whole cycle
          }
          if (!lines.includes(bus.color)) continue;

          const key = `${row.token}:${bus.imei_id}:${stop.name}`;
          if (now - (cooldownMap.get(key) || 0) < COOLDOWN_MS) continue;
          cooldownMap.set(key, now);

          const emoji = { Red: '🔴', Green: '🟢', Blue: '🔵' }[bus.color];
          messages.push({
            to: row.token,
            title: 'UP Smart Transit',
            body: `รถสาย${emoji} กำลังเข้าป้าย ${stop.name}`,
            data: { busId: bus.imei_id, stopName: stop.name, line: bus.color },
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
