// frontend/lib/busMotionEngine.ts

import type { IntersectionPoint } from './intersections';

const DEG2RAD = Math.PI / 180;
const R_EARTH = 6_371_000;
const DECAY_K = 0.15;
const STOP_RADIUS_M = 50;
const STOP_SPEED_MS = 1.39; // 5 km/h in m/s

export interface RoutePoint { lat: number; lng: number; }

export interface BusMotionState {
  routeIdx:       number;    // segment index on route (0 … route.length-2)
  routeT:         number;    // 0–1 within segment
  direction:      1 | -1;   // +1 = forward along array, -1 = backward
  directionLock:  number;   // 0–5: consecutive polls confirming this direction; must drain before flip
  speedMs:        number;    // GPS speed in m/s
  multiplier:     number;    // current lerped multiplier (applied every frame)
  targetMultiplier: number;  // target set on GPS poll; multiplier lerps toward this
  lat:            number;    // current animated position
  lng:            number;
  bearing:        number;    // 0–360°, used by renderer for flip logic
  activeColor?:   string;    // Purple buses only: which line's route this bus is currently snapped to
  confirmed:      boolean;   // false until a second poll confirms the first-ever GPS fix — see onGpsUpdate
  msElapsedSinceGps: number; // ms since the last GPS poll arrived (used for DR decay)
  blendFromLat?:  number;   // predicted position just before GPS update arrived
  blendFromLng?:  number;
  blendStartMs?:  number;   // wall-clock timestamp (Date.now()) when blend started
  stopsVisited:   number;   // circular routes: stops passed this lap (0=at terminal/start)
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

// Snap within an explicit index range [lo, hi] — used to lock a bus to one
// leg of a two-segment out-and-back route so it cannot jump to the parallel leg.
function snapToRouteInRange(
  route: RoutePoint[], lat: number, lng: number, lo: number, hi: number,
): { idx: number; t: number; lat: number; lng: number } {
  lo = Math.max(0, Math.min(lo, route.length - 2));
  hi = Math.max(lo, Math.min(hi, route.length - 2));
  let bestIdx = lo, bestT = 0, bestLat = lat, bestLng = lng, bestD = Infinity;
  for (let i = lo; i <= hi; i++) {
    const p = projectOnSeg(route[i], route[i + 1], lat, lng);
    const d = haversine(lat, lng, p.lat, p.lng);
    if (d < bestD) { bestD = d; bestIdx = i; bestT = p.t; bestLat = p.lat; bestLng = p.lng; }
  }
  return { idx: bestIdx, t: bestT, lat: bestLat, lng: bestLng };
}

// Same as snapToRoute, but only searches within `windowM` metres (walked along
// the path, not as-the-crow-flies) of `nearIdx`. Some routes are out-and-back
// spurs where the return leg runs a few metres parallel to the outbound leg —
// a global nearest-point search can snap onto the wrong leg there and make the
// bus appear to jump/reverse at the fork. Restricting the search to a window
// around the last known position keeps the snap physically continuous.
function snapToRouteNear(
  route: RoutePoint[], lat: number, lng: number, nearIdx: number, windowM: number,
): { idx: number; t: number; lat: number; lng: number } {
  const n = route.length;
  let lo = Math.max(0, Math.min(nearIdx, n - 2)), hi = lo;
  let distLo = 0, distHi = 0;
  while (lo > 0 && distLo < windowM) {
    distLo += haversine(route[lo].lat, route[lo].lng, route[lo - 1].lat, route[lo - 1].lng);
    lo--;
  }
  while (hi < n - 2 && distHi < windowM) {
    distHi += haversine(route[hi].lat, route[hi].lng, route[hi + 1].lat, route[hi + 1].lng);
    hi++;
  }
  let bestIdx = lo, bestT = 0, bestLat = lat, bestLng = lng, bestD = Infinity;
  for (let i = lo; i <= hi; i++) {
    const p = projectOnSeg(route[i], route[i + 1], lat, lng);
    const d = haversine(lat, lng, p.lat, p.lng);
    if (d < bestD) { bestD = d; bestIdx = i; bestT = p.t; bestLat = p.lat; bestLng = p.lng; }
  }
  return { idx: bestIdx, t: bestT, lat: bestLat, lng: bestLng };
}

/**
 * For a bus not locked to one line (Purple), find which route polyline is
 * physically closest to (lat, lng). Returns null if routesByColor is empty
 * or every route has fewer than 2 points.
 */
export function pickNearestRoute(
  lat: number, lng: number,
  routesByColor: Map<string, RoutePoint[]>,
): string | null {
  let bestColor: string | null = null;
  let bestDist = Infinity;
  routesByColor.forEach((route, color) => {
    if (route.length < 2) return;
    const snapped = snapToRoute(route, lat, lng);
    const dist = haversine(lat, lng, snapped.lat, snapped.lng);
    if (dist < bestDist) { bestDist = dist; bestColor = color; }
  });
  return bestColor;
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
  prev:             BusMotionState | null,
  route:            RoutePoint[],   // ordered route polyline
  stops:            RoutePoint[],   // ordered stops (used by advanceFrame stop-freeze)
  gpsLat:           number,
  gpsLng:           number,
  gpsBearing:       number,         // degrees 0–360 from GPS device
  gpsSpeedKph:      number,
  gpsTimestampMs:   number,         // Date.now()-equivalent when vendor GPS was captured
  acc:              0 | 1 = 0,     // ignition: 1 = engine on, 0 = engine off / charging
  junctionIdx?:     number,         // index where Seg1 ends / Seg2 begins (two-segment routes)
  terminalIdx?:     number,         // ~90% of route length for circular loops — prevents false wrap
                                    // at the terminal where route start/end share the same location
): BusMotionState {
  // acc=0 (engine off) → hard stop regardless of GPS speed noise
  const speedMs = (acc === 1 && gpsSpeedKph >= 5) ? gpsSpeedKph / 3.6 : 0;

  if (route.length < 2) {
    return {
      routeIdx: 0, routeT: 0,
      direction: prev?.direction ?? 1,
      directionLock: prev?.directionLock ?? 0,
      speedMs, multiplier: prev?.multiplier ?? 1, targetMultiplier: 1,
      lat: gpsLat, lng: gpsLng, bearing: gpsBearing,
      confirmed: false,
      msElapsedSinceGps: 0,
      stopsVisited: prev?.stopsVisited ?? 0,
    };
  }

  // First-ever observation of this bus: hold at the raw GPS fix instead of
  // committing to a route position. routeIdx/routeT below are placeholders —
  // they're never read while confirmed is false (advanceFrame won't move the
  // bus, and the windowed-snap guard below only fires once prev.confirmed).
  if (prev === null) {
    return {
      routeIdx: 0, routeT: 0,
      direction: 1,
      directionLock: 0,
      speedMs, multiplier: 1, targetMultiplier: 1,
      lat: gpsLat, lng: gpsLng, bearing: gpsBearing,
      confirmed: false,
      msElapsedSinceGps: 0,
      stopsVisited: 0,
    };
  }

  // Locality-biased snap: prefer the point near where the bus was last seen,
  // falling back to a global search only when that's a much worse fit (route
  // change, GPS glitch, or first confirmation after a cold-start hold). See
  // snapToRouteNear for why. Guarded on prev.confirmed, not just prev's
  // existence — an unconfirmed placeholder's routeIdx is meaningless and must
  // never be used as a window anchor.
  const SNAP_WINDOW_M = 300;
  let gpsSnapped = snapToRoute(route, gpsLat, gpsLng);

  if (prev.confirmed) {
    const windowed  = snapToRouteNear(route, gpsLat, gpsLng, prev.routeIdx, SNAP_WINDOW_M);
    const windowedD = haversine(gpsLat, gpsLng, windowed.lat, windowed.lng);
    const globalD   = haversine(gpsLat, gpsLng, gpsSnapped.lat, gpsSnapped.lng);
    if (windowedD <= globalD + 30) gpsSnapped = windowed;

    if (junctionIdx !== undefined) {
      const onSecondLeg = prev.routeIdx > junctionIdx;
      const lo = onSecondLeg ? junctionIdx + 1 : 0;
      const hi = onSecondLeg ? route.length - 2 : junctionIdx;
      if (gpsSnapped.idx < lo || gpsSnapped.idx > hi) {
        gpsSnapped = snapToRouteInRange(route, gpsLat, gpsLng, lo, hi);
      }
    }

    if (terminalIdx !== undefined && prev.routeIdx > terminalIdx) {
      // Bus is in the terminal approach zone of a circular loop.
      // Snap returning to idx < 10 could be a genuine new-lap wrap OR a false
      // snap to the route's geographic start (same location as the end).
      // Confirm with GPS bearing: if bearing matches the forward segment at the
      // new-lap position, the bus has truly crossed the terminal — allow wrap.
      // Otherwise lock it to the terminal zone until the next poll.
      if (gpsSnapped.idx < 10) {
        const newLapBearing = bearingOfSegment(route, Math.max(0, gpsSnapped.idx), 1);
        if (gpsSpeedKph < 5 || angleDiff(gpsBearing, newLapBearing) >= 90) {
          gpsSnapped = snapToRouteInRange(route, gpsLat, gpsLng, terminalIdx, route.length - 2);
        }
      } else if (gpsSnapped.idx < terminalIdx) {
        // Mid-route false snap while in terminal zone — clamp back
        gpsSnapped = snapToRouteInRange(route, gpsLat, gpsLng, terminalIdx, route.length - 2);
      }
    }
  } else if (junctionIdx !== undefined && gpsSpeedKph >= 5) {
    const seg1Snap = snapToRouteInRange(route, gpsLat, gpsLng, 0, junctionIdx);
    const seg2Snap = snapToRouteInRange(route, gpsLat, gpsLng, junctionIdx + 1, route.length - 2);
    const b1 = bearingTo(route[seg1Snap.idx], route[Math.min(seg1Snap.idx + 1, route.length - 1)]);
    const b2 = bearingTo(route[seg2Snap.idx], route[Math.min(seg2Snap.idx + 1, route.length - 1)]);
    gpsSnapped = angleDiff(gpsBearing, b1) <= angleDiff(gpsBearing, b2) ? seg1Snap : seg2Snap;
  }

  // ── Direction detection with hysteresis ────────────────────────────────────
  // directionLock counts consecutive polls that confirmed the current direction.
  // A flip is only allowed once the lock drains to 0 — requires MAX_DIR_LOCK
  // consecutive polls all agreeing on the opposite direction (≈ 50 s at 10 s poll).
  const MAX_DIR_LOCK = 5;
  const prevDir  = prev?.direction     ?? 1;
  const prevLock = prev?.directionLock ?? 0;

  let direction:     1 | -1 = prevDir;
  let directionLock: number  = prevLock;

  if (speedMs === 0 || gpsSpeedKph < 1.8) {
    // Bus stationary or very slow — keep current direction, maintain lock.
    directionLock = Math.min(MAX_DIR_LOCK, prevLock + 1);
  } else {
    // Compare GPS bearing to the route segment bearing at the snapped position.
    // This avoids dependence on stop ordering in KML (which may be wrong for
    // routes with parallel outbound/return legs on different roads).
    // angleDiff < 90° → bus faces forward along route polyline direction.
    const segBearing = bearingOfSegment(route, gpsSnapped.idx, 1);
    const detectedDir: 1 | -1 = angleDiff(gpsBearing, segBearing) < 90 ? 1 : -1;

    if (detectedDir === prevDir) {
      direction     = prevDir;
      directionLock = Math.min(MAX_DIR_LOCK, prevLock + 1);
    } else if (prevLock > 0) {
      direction     = prevDir;
      directionLock = prevLock - 1;
    } else {
      direction     = detectedDir;
      directionLock = 1;
    }
  }

  // ── Pre-advance: sync both platforms to same "now" position ──────────────────
  // gpsTimestampMs = when vendor captured this GPS packet.
  // Advance from the raw GPS snap by (age × speed) so web and mobile always
  // start dead-reckoning from the same reference point, regardless of when
  // each platform polled the API.
  const ageMs      = Math.max(0, Math.min(Date.now() - gpsTimestampMs, 15_000));
  const preAdvanceM = speedMs * (ageMs / 1000);
  const gpsNow = preAdvanceM > 0
    ? advance(route, gpsSnapped.idx, gpsSnapped.t, preAdvanceM, direction)
    : gpsSnapped;

  // ── Multiplier: catch up or slow down ────────────────────────────────────────
  // Use gpsNow position as base for animation unless prev is confirmed and exists.
  // An unconfirmed prev means we're transitioning from cold-start hold to routed
  // motion — use the newly snapped position, not the placeholder.
  const animIdx = prev && prev.confirmed ? prev.routeIdx : gpsNow.idx;
  const animT   = prev && prev.confirmed ? prev.routeT   : gpsNow.t;

  // Compute targetMultiplier proportional to how far ahead/behind GPS is.
  // multiplier itself lerps toward target at 0.04/frame in advanceFrame.
  const POLL_S = 10; // expected seconds between GPS polls
  const THRESH = 15; // metres dead-band — within this = "on target"
  let targetMultiplier: number;

  if (speedMs === 0) {
    // Stationary — reset so bus doesn't surge when it starts moving again
    targetMultiplier = 1.0;
  } else {
    const rawAhead = directedAheadM(route, animIdx, animT, gpsNow.idx, gpsNow.t, direction);
    if (rawAhead > THRESH) {
      // GPS is ahead → speed up proportionally to catch up within one poll interval
      const catchUp = rawAhead / (speedMs * POLL_S);
      targetMultiplier = Math.min(2.0, 1.0 + catchUp * 0.8);
    } else if (rawAhead < -THRESH) {
      // GPS is behind → slow down (never stop unless speed=0)
      const behindFrac = Math.abs(rawAhead) / (speedMs * POLL_S);
      targetMultiplier = Math.max(0.25, 1.0 - behindFrac * 0.8);
    } else {
      targetMultiplier = 1.0;
    }
  }

  // ── Stop counter (circular routes only) ──────────────────────────────────────
  const STOP_ZONE_M = 80;
  let stopsVisited = prev?.stopsVisited ?? 0;

  if (terminalIdx !== undefined && stops.length >= 2) {
    const terminal   = stops[0];
    const atTerminal = haversine(gpsLat, gpsLng, terminal.lat, terminal.lng) < STOP_ZONE_M;

    if (atTerminal) {
      if (stopsVisited >= stops.length) {
        stopsVisited = 0;
      } else if (stopsVisited === 0 && gpsSpeedKph >= 5) {
        stopsVisited = 1;
      }
    } else if (stopsVisited >= 1 && stopsVisited < stops.length) {
      const nextStop = stops[stopsVisited];
      if (haversine(gpsLat, gpsLng, nextStop.lat, nextStop.lng) < STOP_ZONE_M) {
        stopsVisited++;
      }
    }
  }

  // If prev was confirmed and has moved more than 2m from new GPS snap → blend
  const prevLat = prev?.lat;
  const prevLng = prev?.lng;
  const shouldBlend = prev?.confirmed === true
    && prevLat !== undefined
    && prevLng !== undefined
    && haversine(prevLat, prevLng, gpsNow.lat, gpsNow.lng) > 2;

  return {
    routeIdx:  animIdx,
    routeT:    animT,
    direction,
    directionLock,
    speedMs,
    multiplier:       prev?.multiplier       ?? targetMultiplier,
    targetMultiplier,
    lat: shouldBlend ? gpsNow.lat : (prev?.lat ?? gpsNow.lat),
    lng: shouldBlend ? gpsNow.lng : (prev?.lng ?? gpsNow.lng),
    bearing: prev?.bearing ?? gpsBearing,
    confirmed: true,
    msElapsedSinceGps: 0,
    blendFromLat: shouldBlend ? prevLat : undefined,
    blendFromLng: shouldBlend ? prevLng : undefined,
    blendStartMs: shouldBlend ? Date.now() : undefined,
    stopsVisited,
  };
}

/** Call every animation frame (~16 ms). Returns new state with updated position. */
export function advanceFrame(
  state: BusMotionState,
  route: RoutePoint[],
  dtMs:  number,
  stops: RoutePoint[],
  intersections?: IntersectionPoint[],
): BusMotionState {
  const msElapsedSinceGps = state.msElapsedSinceGps + dtMs;
  if (route.length < 2) return { ...state, msElapsedSinceGps };

  // First-ever fix hasn't been confirmed by a second poll yet — hold in
  // place rather than dead-reckoning from a placeholder route position.
  if (!state.confirmed) return { ...state, msElapsedSinceGps };

  // Lerp multiplier toward target each frame — this is what makes motion smooth
  const multiplier = state.multiplier + (state.targetMultiplier - state.multiplier) * 0.04;

  // Stop Window: freeze marker when near a bus stop at low speed (<5 km/h).
  if (state.speedMs < STOP_SPEED_MS && stops.length > 0) {
    const nearStop = stops.some(
      s => haversine(state.lat, state.lng, s.lat, s.lng) < STOP_RADIUS_M
    );
    if (nearStop) return { ...state, multiplier, msElapsedSinceGps };
  }

  // Purple buses only: freeze in place while inside a line-junction zone until
  // the next GPS poll (onGpsUpdate) re-evaluates which route to follow.
  const haltedAtIntersection = !!intersections && intersections.some(
    p => haversine(state.lat, state.lng, p.lat, p.lng) <= p.radiusM
  );
  if (haltedAtIntersection) return { ...state, multiplier, msElapsedSinceGps };

  // Conservative DR decay: the longer we go without a fresh GPS poll, the
  // more we trust the bus has slowed or stopped. e^(-0.15 * t) reaches ~22%
  // of nominal speed at 10 s (one poll interval) if no update arrives.
  const elapsedSec = msElapsedSinceGps / 1000;
  const decayedSpeed = state.speedMs * Math.exp(-DECAY_K * elapsedSec);

  const effectiveDist = decayedSpeed * multiplier * (dtMs / 1000);
  if (effectiveDist <= 0) return { ...state, multiplier, msElapsedSinceGps };

  const next = advance(route, state.routeIdx, state.routeT, effectiveDist, state.direction);
  const bearing = bearingOfSegment(route, next.idx, state.direction);
  return { ...state, multiplier, msElapsedSinceGps, routeIdx: next.idx, routeT: next.t, lat: next.lat, lng: next.lng, bearing };
}
