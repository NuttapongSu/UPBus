// frontend/lib/busMotionEngine.ts

const DEG2RAD = Math.PI / 180;
const R_EARTH = 6_371_000;

export interface RoutePoint { lat: number; lng: number; }

export interface BusMotionState {
  routeIdx:   number;    // segment index on route (0 … route.length-2)
  routeT:     number;    // 0–1 within segment
  direction:  1 | -1;   // +1 = forward along array, -1 = backward
  speedMs:    number;    // GPS speed in m/s
  multiplier: number;    // 0.0–2.0 catch-up / slow-down factor
  lat:        number;    // current animated position
  lng:        number;
  bearing:    number;    // 0–360°, used by renderer for flip logic
}

// ─── Internal geometry ───────────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLng = (lng2 - lng1) * DEG2RAD;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * Math.sin(dLng / 2) ** 2;
  return R_EARTH * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function projectOnSeg(
  p1: RoutePoint, p2: RoutePoint, lat: number, lng: number,
): { lat: number; lng: number; t: number } {
  const dx = p2.lng - p1.lng, dy = p2.lat - p1.lat;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0
    ? Math.max(0, Math.min(1, ((lng - p1.lng) * dx + (lat - p1.lat) * dy) / len2))
    : 0;
  return { lat: p1.lat + t * dy, lng: p1.lng + t * dx, t };
}

function snapToRoute(
  route: RoutePoint[], lat: number, lng: number,
): { idx: number; t: number; lat: number; lng: number } {
  if (route.length < 2) return { idx: 0, t: 0, lat, lng };
  let bestIdx = 0, bestT = 0, bestLat = lat, bestLng = lng, bestD = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const p = projectOnSeg(route[i], route[i + 1], lat, lng);
    const d = haversine(lat, lng, p.lat, p.lng);
    if (d < bestD) { bestD = d; bestIdx = i; bestT = p.t; bestLat = p.lat; bestLng = p.lng; }
  }
  return { idx: bestIdx, t: bestT, lat: bestLat, lng: bestLng };
}

function bearingTo(a: RoutePoint, b: RoutePoint): number {
  const dLng = (b.lng - a.lng) * DEG2RAD;
  const y = Math.sin(dLng) * Math.cos(b.lat * DEG2RAD);
  const x = Math.cos(a.lat * DEG2RAD) * Math.sin(b.lat * DEG2RAD)
    - Math.sin(a.lat * DEG2RAD) * Math.cos(b.lat * DEG2RAD) * Math.cos(dLng);
  return ((Math.atan2(y, x) / DEG2RAD) + 360) % 360;
}

function angleDiff(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

// Signed arc distance from position A to position B going forward (+index).
// Positive = B is ahead of A (shorter to go forward).
// Negative = B is behind A (shorter to go backward = B is "behind").
function signedFwdArc(
  route: RoutePoint[],
  aIdx: number, aT: number,
  bIdx: number, bT: number,
): number {
  const n = route.length;
  if (n < 2) return 0;

  const totalLen = (() => {
    let l = 0;
    for (let i = 0; i < n - 1; i++) l += haversine(route[i].lat, route[i].lng, route[i+1].lat, route[i+1].lng);
    return l;
  })();

  // Same segment shortcut
  if (aIdx === bIdx) {
    const s = haversine(route[aIdx].lat, route[aIdx].lng, route[(aIdx+1)%n].lat, route[(aIdx+1)%n].lng);
    const direct = s * (bT - aT);
    if (direct > totalLen / 2) return direct - totalLen;
    if (direct < -totalLen / 2) return direct + totalLen;
    return direct;
  }

  // Forward arc: A → end of its segment → ... → start of B's segment → B
  const sA = haversine(route[aIdx].lat, route[aIdx].lng, route[(aIdx+1)%n].lat, route[(aIdx+1)%n].lng);
  let fwd = sA * (1 - aT);
  let cur = (aIdx + 1) % n;
  let steps = 0;
  while (cur !== bIdx && steps < n) {
    fwd += haversine(route[cur].lat, route[cur].lng, route[(cur+1)%n].lat, route[(cur+1)%n].lng);
    cur = (cur + 1) % n;
    steps++;
  }
  const sB = haversine(route[bIdx].lat, route[bIdx].lng, route[(bIdx+1)%n].lat, route[(bIdx+1)%n].lng);
  fwd += sB * bT;

  const bwd = totalLen - fwd;
  return fwd <= bwd ? fwd : -bwd;
}

// Signed metres: how far ahead is GPS vs animation, in the direction of travel.
// Positive = GPS is ahead (bus needs to catch up).
// Negative = GPS is behind (bus overshot → slow down).
function directedAheadM(
  route: RoutePoint[],
  aIdx: number, aT: number,   // animation position
  bIdx: number, bT: number,   // GPS position
  direction: 1 | -1,
): number {
  return direction === 1
    ? signedFwdArc(route, aIdx, aT, bIdx, bT)
    : signedFwdArc(route, bIdx, bT, aIdx, aT);
}

// Move distM metres from (idx, t) in direction along route, wrapping circularly.
function advance(
  route: RoutePoint[], idx: number, t: number,
  distM: number, direction: 1 | -1,
): { idx: number; t: number; lat: number; lng: number } {
  const n = route.length;
  let curIdx = ((idx % n) + n) % n;
  let curT = Math.max(0, Math.min(1, t));

  if (n < 2 || distM <= 0) {
    const p1 = route[curIdx], p2 = route[(curIdx+1)%n];
    return { idx: curIdx, t: curT, lat: p1.lat + curT*(p2.lat-p1.lat), lng: p1.lng + curT*(p2.lng-p1.lng) };
  }

  let rem = distM;
  let guard = 0;
  while (rem > 1e-6 && guard < n * 2) {
    guard++;
    const p1 = route[curIdx], p2 = route[(curIdx+1)%n];
    const segLen = haversine(p1.lat, p1.lng, p2.lat, p2.lng);
    if (segLen < 1e-6) {
      curIdx = direction === 1 ? (curIdx+1)%n : (curIdx-1+n)%n;
      curT   = direction === 1 ? 0 : 1;
      continue;
    }
    if (direction === 1) {
      const toEnd = segLen * (1 - curT);
      if (rem <= toEnd) { curT += rem / segLen; rem = 0; }
      else { rem -= toEnd; curIdx = (curIdx+1)%n; curT = 0; }
    } else {
      const toStart = segLen * curT;
      if (rem <= toStart) { curT -= rem / segLen; rem = 0; }
      else { rem -= toStart; curIdx = (curIdx-1+n)%n; curT = 1; }
    }
  }

  curIdx = ((curIdx%n)+n)%n;
  curT = Math.max(0, Math.min(1, curT));
  const p1 = route[curIdx], p2 = route[(curIdx+1)%n];
  return { idx: curIdx, t: curT, lat: p1.lat+curT*(p2.lat-p1.lat), lng: p1.lng+curT*(p2.lng-p1.lng) };
}

function bearingOfSegment(route: RoutePoint[], idx: number, direction: 1 | -1): number {
  const n = route.length;
  const i = ((idx%n)+n)%n;
  const a = route[i], b = route[(i+1)%n];
  return direction === 1 ? bearingTo(a, b) : bearingTo(b, a);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Call when a new GPS packet arrives (every 10 s). */
export function onGpsUpdate(
  prev:          BusMotionState | null,
  route:         RoutePoint[],   // ordered route polyline
  stops:         RoutePoint[],   // ordered stops in circular route order
  gpsLat:        number,
  gpsLng:        number,
  gpsBearing:    number,         // degrees 0–360 from GPS device
  gpsSpeedKph:   number,
): BusMotionState {
  // below 5 km/h = GPS noise / bus stationary — don't advance
  const speedMs = gpsSpeedKph >= 5 ? gpsSpeedKph / 3.6 : 0;

  if (route.length < 2) {
    return {
      routeIdx: 0, routeT: 0,
      direction: prev?.direction ?? 1,
      speedMs, multiplier: prev?.multiplier ?? 1,
      lat: gpsLat, lng: gpsLng, bearing: gpsBearing,
    };
  }

  const gpsSnapped = snapToRoute(route, gpsLat, gpsLng);

  // ── Direction detection from next 2 stops ──────────────────────────────────
  let direction: 1 | -1 = prev?.direction ?? 1;
  if (gpsSpeedKph >= 1.8 && stops.length >= 3) {
    const n = stops.length;
    let nearestIdx = 0, nearestD = Infinity;
    for (let i = 0; i < n; i++) {
      const d = haversine(gpsLat, gpsLng, stops[i].lat, stops[i].lng);
      if (d < nearestD) { nearestD = d; nearestIdx = i; }
    }
    const f1 = stops[(nearestIdx+1)%n], f2 = stops[(nearestIdx+2)%n];
    const b1 = stops[(nearestIdx-1+n)%n], b2 = stops[(nearestIdx-2+n)%n];
    const gps = { lat: gpsLat, lng: gpsLng };
    const sf = angleDiff(gpsBearing, bearingTo(gps, f1)) + angleDiff(gpsBearing, bearingTo(gps, f2));
    const sb = angleDiff(gpsBearing, bearingTo(gps, b1)) + angleDiff(gpsBearing, bearingTo(gps, b2));
    direction = sf <= sb ? 1 : -1;
  }

  // ── Multiplier: catch up or slow down ──────────────────────────────────────
  const animIdx = prev?.routeIdx ?? gpsSnapped.idx;
  const animT   = prev?.routeT   ?? gpsSnapped.t;

  // When stationary, reset multiplier to 1 so the bus doesn't surge when it starts moving.
  // GPS drift while parked would otherwise push multiplier to 2× before any real movement.
  let multiplier: number;
  if (speedMs === 0) {
    multiplier = 1.0;
  } else {
    const rawAhead = directedAheadM(route, animIdx, animT, gpsSnapped.idx, gpsSnapped.t, direction);
    multiplier = prev?.multiplier ?? 1.0;
    const THRESH = 15; // metres — within 15 m is "on target"
    if (rawAhead > THRESH) {
      multiplier = Math.min(2.0, multiplier + 0.15);
    } else if (rawAhead < -THRESH) {
      multiplier = Math.max(0.0, multiplier - 0.20);
    } else {
      multiplier += (1.0 - multiplier) * 0.3;
    }
  }

  return {
    routeIdx:  animIdx,
    routeT:    animT,
    direction,
    speedMs,
    multiplier,
    lat: prev?.lat ?? gpsSnapped.lat,
    lng: prev?.lng ?? gpsSnapped.lng,
    bearing: prev?.bearing ?? gpsBearing,
  };
}

/** Call every animation frame (~16 ms). Returns new state with updated position. */
export function advanceFrame(
  state: BusMotionState,
  route: RoutePoint[],
  dtMs:  number,
): BusMotionState {
  if (route.length < 2) return state;
  const effectiveDist = state.speedMs * state.multiplier * (dtMs / 1000);
  if (effectiveDist <= 0) return state;

  const next = advance(route, state.routeIdx, state.routeT, effectiveDist, state.direction);
  const bearing = bearingOfSegment(route, next.idx, state.direction);
  return { ...state, routeIdx: next.idx, routeT: next.t, lat: next.lat, lng: next.lng, bearing };
}
