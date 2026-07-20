// Wrong-route detection via route-exclusive checkpoints.
// Each checkpoint is >120 m from all other routes, so hitting one
// unambiguously identifies which route the bus is actually on.

const lineNotify = require('./lineNotify');

const CHECKPOINTS = {
  Green: [
    { lat: 19.02858, lng: 99.90670, name: 'หน้าเอื้องคำ' },
    { lat: 19.02993, lng: 99.91544, name: 'หน้าทันตะ' },
    { lat: 19.03056, lng: 99.92310, name: 'หน้ามอ' },
  ],
  Red: [
    { lat: 19.03315, lng: 99.89090, name: 'หน้า 99 ปี' },
    { lat: 19.03363, lng: 99.88731, name: 'สนามกีฬา' },
    { lat: 19.03293, lng: 99.88966, name: 'สาธิต' },
    { lat: 19.03800, lng: 99.88375, name: 'ประตูสอง/หอพัก' },
  ],
  Blue: [
    { lat: 19.02281, lng: 99.89537, name: 'ประตูสาม' },
    { lat: 19.02696, lng: 99.89954, name: 'หน้า ICT' },
  ],
};

const RADIUS_M = 120;
const WRONG_THRESHOLD = 2; // ต้องผ่าน checkpoint สายผิด N ครั้งติดกันก่อน switch

const DEG2RAD = Math.PI / 180;
function haversine(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLng = (lng2 - lng1) * DEG2RAD;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Returns nearest exclusive checkpoint within RADIUS_M, or null (= overlap zone / open road)
function nearestCheckpoint(lat, lng) {
  let best = null, bestDist = RADIUS_M;
  for (const [route, cps] of Object.entries(CHECKPOINTS)) {
    for (const cp of cps) {
      const d = haversine(lat, lng, cp.lat, cp.lng);
      if (d < bestDist) { bestDist = d; best = { route, name: cp.name, dist: Math.round(d) }; }
    }
  }
  return best;
}

// Per-bus RAM state: streak + current detected route
// { streak: number, wrongRoute: string|null, alerted: boolean }
const busState = new Map();

function getState(busId) {
  if (!busState.has(busId)) busState.set(busId, { streak: 0, wrongRoute: null, alerted: false });
  return busState.get(busId);
}

// Call every GPS poll for buses that have an assigned color (Green/Red/Blue).
// Returns the auto-detected display route (may differ from assignedColor), or null if not enough evidence.
async function checkBusRoute(busId, assignedColor, lat, lng) {
  if (!['Green', 'Red', 'Blue'].includes(assignedColor)) return null;
  if (!lat || !lng) return null;

  const cp = nearestCheckpoint(lat, lng);
  const state = getState(busId);

  if (!cp) {
    // In overlap zone / open road — don't reset streak, just wait
    return state.wrongRoute || null;
  }

  if (cp.route === assignedColor) {
    // Confirmed on correct route — reset everything
    state.streak = 0;
    state.wrongRoute = null;
    state.alerted = false;
    return null;
  }

  // On wrong route checkpoint
  state.streak += 1;

  if (state.streak >= WRONG_THRESHOLD) {
    const prev = state.wrongRoute;
    state.wrongRoute = cp.route;

    // Send LINE alert once per route-switch event
    if (!state.alerted || prev !== cp.route) {
      state.alerted = true;
      const msg = `⚠️ ตรวจพบรถผิดสาย\nรถ ${busId} assigned สาย${assignedColor} แต่ผ่าน "${cp.name}" (สาย${cp.route})\nระบบแสดงผลสลับเป็นสาย${cp.route} อัตโนมัติ`;
      lineNotify.sendLineNotify(msg).catch(e => console.error('[routeCheckpoints] LINE notify:', e.message));
      console.log(`🚨 [wrongRoute] ${busId}: assigned=${assignedColor} detected=${cp.route} via ${cp.name}`);
    }

    return cp.route;
  }

  return state.wrongRoute || null;
}

// Expose for admin dashboard / API
function getWrongRouteState() {
  const out = {};
  for (const [busId, s] of busState.entries()) {
    if (s.wrongRoute) out[busId] = { detectedRoute: s.wrongRoute, streak: s.streak };
  }
  return out;
}

module.exports = { checkBusRoute, getWrongRouteState };
