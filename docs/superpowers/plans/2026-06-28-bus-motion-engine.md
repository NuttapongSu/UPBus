# Bus Motion Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace linear-interpolation bus movement on both web and mobile with a shared dead-reckoning engine that detects direction from next 2 stops and uses GPS speed to advance the bus marker smoothly along its route.

**Architecture:** Pure engine (`frontend/lib/busMotionEngine.ts`) imported by both web (`useBusMarkers.ts`) and mobile (`useAnimatedBuses.ts`). KML stop order fixed first as a prerequisite — the engine depends on stops being in circular route order. No new npm dependencies.

**Tech Stack:** TypeScript, Leaflet (web), React Native Maps (mobile), KML XML.

## Global Constraints

- No new npm dependencies.
- `frontend/lib/busMotionEngine.ts` must be pure TypeScript — zero React, Leaflet, or React Native imports.
- Poll interval unified to **10 000 ms** on both platforms. Web already uses 10 000; mobile must change from 5 000.
- Web `offsetLeft(pos, bearing, 3.5)` lane-offset applied at render time (in animate loop), NOT stored in engine state.
- Mobile bearing flip: `bearing <= 180 → scaleX(-1)` (unchanged from current BusMarker).
- Stops passed to engine must be in **KML Placemark order** (circular route order), not sorted by arc length.
- Engine `advance()` never moves with negative distance (multiplier floor = 0.0).
- Excluded stop keyword `'ชาร์จ'` — omit charging-station placemarks when building stop arrays.

---

## File Map

| File | Action |
|---|---|
| `frontend/public/kml/up_bus_transit_red.kml` | Reorder 14 stop Placemarks |
| `frontend/public/kml/up_bus_transit_blue.kml` | Rebuild จุดจอด folder (add 4, remove 1, reorder) |
| `frontend/lib/busMotionEngine.ts` | **CREATE** — shared pure engine |
| `frontend/components/Map/BusMap.tsx` | Add `stopsByColorRef`, parse stops in KML order, pass to hook |
| `frontend/components/Map/useBusMarkers.ts` | Replace lerp with engine; add `stopsByColor` param |
| `upbus-mobile/lib/useAnimatedBuses.ts` | Replace lerp with engine; POLL_MS 5000→10000 |
| `upbus-mobile/app/(tabs)/index.tsx` | `refreshInterval: 5000 → 10000` |

---

## Task 1: Fix Red KML stop order

**Files:**
- Modify: `frontend/public/kml/up_bus_transit_red.kml`

**Interfaces:**
- Consumes: nothing
- Produces: `up_bus_transit_red.kml` with stops in circular route order (used by Tasks 3–5)

The `<Folder id="02EB4D047C402E788894"><name>จุดจอด</name>` folder currently has 14 `<Placemark>` blocks in wrong order. Reorder them so the `<Point>` placemarks appear in this sequence (identified by `<name>` content):

```
1.  จุดจอดรถประตูสอง
2.  สถานีหน้าอาคารสงวนเสริมศรี(ขาไป)
3.  สถานีหน้าเวียงพะเยา(ขาไป)
4.  สถานีหน้าอาคาร ๙๙ ปี(ขาไป)
5.  สถานีหน้าคณะศิลปศาสตร์
6.  สถานีหน้าคณะวิทยาศาสตร์
7.  สถานีหน้าหอประชุมพญางำเมือง
8.  สถานีหน้าตึกอธิการบดี          ← was #13
9.  จุดจอดรถบัสPKY                 ← was #14
10. สถานีหน้าอาคาร ๙๙ ปี(ขากลับ)  ← was #12
11. สถานีหน้าเวียงพะเยา(ขากลับ)
12. สถานีหน้าอาคารสงวนเสริมศรี(ขากลับ) ← was #10
13. สถานีหน้าโรงเรียนสาธิตมหาวิทยาลัยพะเยา ← was #9
14. สถานีโรงเรียนสาธิตมหาวิทยาลัยพะเยา   ← was #8
```

The Placemark XML blocks themselves do NOT change — only their order inside the folder changes.

- [ ] **Step 1: Reorder the 14 Point Placemarks inside the จุดจอด folder**

Open `frontend/public/kml/up_bus_transit_red.kml`. Inside the folder whose `<name>` is `จุดจอด`, cut and paste the Placemark blocks so they match the order above. The Placemark block for อธิการบดี (contains `99.896108,19.028986`) moves up to position 8; PKY (contains `99.895234,19.025409`) to position 9; 99ปีขากลับ (contains `99.893220,19.031849`) to position 10; สงวนเสริมฯขากลับ (contains `99.886207,19.034012`) to position 12; หน้าโรงเรียนสาธิต (contains `99.884246,19.034365`) to position 13; โรงเรียนสาธิต (contains `99.884051,19.035348`) to position 14.

- [ ] **Step 2: Verify stop order with Node.js script**

```bash
node -e "
const fs = require('fs');
const kml = fs.readFileSync('frontend/public/kml/up_bus_transit_red.kml', 'utf8');
const pms = [...kml.matchAll(/<Placemark[\s\S]*?<\/Placemark>/g)].map(m => m[0]);
const stops = pms
  .filter(pm => /<Point>/.test(pm) && !pm.includes('ชาร์จ'))
  .map(pm => pm.match(/<name>([\s\S]*?)<\/name>/)?.[1].trim() ?? '?');
stops.forEach((n,i) => console.log(i+1, n));
"
```

Expected output (in order):
```
1 จุดจอดรถประตูสอง
2 สถานีหน้าอาคารสงวนเสริมศรี(ขาไป)
3 สถานีหน้าเวียงพะเยา(ขาไป)
4 สถานีหน้าอาคาร ๙๙ ปี(ขาไป)
5 สถานีหน้าคณะศิลปศาสตร์
6 สถานีหน้าคณะวิทยาศาสตร์
7 สถานีหน้าหอประชุมพญางำเมือง
8 สถานีหน้าตึกอธิการบดี
9 จุดจอดรถบัสPKY
10 สถานีหน้าอาคาร ๙๙ ปี(ขากลับ)
11 สถานีหน้าเวียงพะเยา(ขากลับ)
12 สถานีหน้าอาคารสงวนเสริมศรี(ขากลับ)
13 สถานีหน้าโรงเรียนสาธิตมหาวิทยาลัยพะเยา
14 สถานีโรงเรียนสาธิตมหาวิทยาลัยพะเยา
```

- [ ] **Step 3: Commit**

```bash
git add frontend/public/kml/up_bus_transit_red.kml
git commit -m "fix(kml): reorder Red line stops into circular route order"
```

---

## Task 2: Fix Blue KML stops

**Files:**
- Modify: `frontend/public/kml/up_bus_transit_blue.kml`

**Interfaces:**
- Consumes: nothing
- Produces: `up_bus_transit_blue.kml` with 8 stops in correct circular order

Current Blue KML has 5 stops: ประตูสาม, ICT, วิศวฯขากลับ, ศูนย์เศรษฐกิจฯ, วิศวฯขาไป (wrong order, missing 4 stops, 1 extra).

Target: 8 stops in this order:
```
1. จุดจอดรถบัสประตูสาม
2. สถานีหน้าศูนย์การเรียนรู้เศรษฐกิจพอเพียง
3. สถานีหน้าหอประชุมพญางำเมือง        ← NEW
4. สถานีหน้าอาคารสำนักงานอธิการบดี    ← NEW
5. สถานีหน้าคณะศิลปศาสตร์             ← NEW
6. สถานีหน้าคณะวิทยาศาสตร์           ← NEW
7. สถานีหน้าคณะวิศวกรรมศาสตร์(ขากลับ)
8. สถานีหน้าคณะเทคโนโลยีสารสนเทศและการสื่อสาร
```

- [ ] **Step 1: Replace the entire จุดจอด folder content in Blue KML**

Find the `<Folder id="0767A9E876403230AA58">` block (the one with `<name>จุดจอด</name>`) and replace its contents with:

```xml
<Folder id="0767A9E876403230AA58">
	<name>จุดจอด</name>
	<open>1</open>
	<styleUrl>#__managed_style_0925918F02403235A591</styleUrl>
	<Placemark id="5D0FD8D7E0000002">
		<name>จุดจอดรถบัสประตูสาม</name>
		<styleUrl>#__managed_style_0325BE94B8403235A593</styleUrl>
		<Point>
			<coordinates>99.89530321535115,19.02258994476954,0</coordinates>
		</Point>
	</Placemark>
	<Placemark id="5D0FD8D7E0000005">
		<name>สถานีหน้าศูนย์การเรียนรู้เศรษฐกิจพอเพียง</name>
		<styleUrl>#__managed_style_0325BE94B8403235A593</styleUrl>
		<Point>
			<coordinates>99.89934755606482,19.02713329155001,0</coordinates>
		</Point>
	</Placemark>
	<Placemark id="BLUE_HALL">
		<name>สถานีหน้าหอประชุมพญางำเมือง</name>
		<styleUrl>#__managed_style_0325BE94B8403235A593</styleUrl>
		<Point>
			<coordinates>99.897711,19.030000,0</coordinates>
		</Point>
	</Placemark>
	<Placemark id="BLUE_RECTOR">
		<name>สถานีหน้าอาคารสำนักงานอธิการบดี</name>
		<styleUrl>#__managed_style_0325BE94B8403235A593</styleUrl>
		<Point>
			<coordinates>99.896067,19.029034,0</coordinates>
		</Point>
	</Placemark>
	<Placemark id="BLUE_ARTS">
		<name>สถานีหน้าคณะศิลปศาสตร์</name>
		<styleUrl>#__managed_style_0325BE94B8403235A593</styleUrl>
		<Point>
			<coordinates>99.895767,19.029649,0</coordinates>
		</Point>
	</Placemark>
	<Placemark id="BLUE_SCI">
		<name>สถานีหน้าคณะวิทยาศาสตร์</name>
		<styleUrl>#__managed_style_0325BE94B8403235A593</styleUrl>
		<Point>
			<coordinates>99.897597,19.030695,0</coordinates>
		</Point>
	</Placemark>
	<Placemark id="5D0FD8D7E0000004">
		<name>สถานีหน้าคณะวิศวกรรมศาสตร์(ขากลับ)</name>
		<styleUrl>#__managed_style_0325BE94B8403235A593</styleUrl>
		<Point>
			<coordinates>99.90122487072315,19.03052210543519,0</coordinates>
		</Point>
	</Placemark>
	<Placemark id="5D0FD8D7E0000003">
		<name>สถานีหน้าคณะเทคโนโลยีสารสนเทศและการสื่อสาร</name>
		<styleUrl>#__managed_style_0325BE94B8403235A593</styleUrl>
		<Point>
			<coordinates>99.89982899158804,19.02846854942618,0</coordinates>
		</Point>
	</Placemark>
</Folder>
```

- [ ] **Step 2: Verify Blue stop order**

```bash
node -e "
const fs = require('fs');
const kml = fs.readFileSync('frontend/public/kml/up_bus_transit_blue.kml', 'utf8');
const pms = [...kml.matchAll(/<Placemark[\s\S]*?<\/Placemark>/g)].map(m => m[0]);
const stops = pms
  .filter(pm => /<Point>/.test(pm) && !pm.includes('ชาร์จ'))
  .map(pm => pm.match(/<name>([\s\S]*?)<\/name>/)?.[1].trim() ?? '?');
stops.forEach((n,i) => console.log(i+1, n));
"
```

Expected output:
```
1 จุดจอดรถบัสประตูสาม
2 สถานีหน้าศูนย์การเรียนรู้เศรษฐกิจพอเพียง
3 สถานีหน้าหอประชุมพญางำเมือง
4 สถานีหน้าอาคารสำนักงานอธิการบดี
5 สถานีหน้าคณะศิลปศาสตร์
6 สถานีหน้าคณะวิทยาศาสตร์
7 สถานีหน้าคณะวิศวกรรมศาสตร์(ขากลับ)
8 สถานีหน้าคณะเทคโนโลยีสารสนเทศและการสื่อสาร
```

- [ ] **Step 3: Commit**

```bash
git add frontend/public/kml/up_bus_transit_blue.kml
git commit -m "fix(kml): rebuild Blue line stops — add 4 missing stops, remove duplicate, fix order"
```

---

## Task 3: Create `frontend/lib/busMotionEngine.ts`

**Files:**
- Create: `frontend/lib/busMotionEngine.ts`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces:
  - `export interface RoutePoint { lat: number; lng: number }`
  - `export interface BusMotionState { routeIdx: number; routeT: number; direction: 1 | -1; speedMs: number; multiplier: number; lat: number; lng: number; bearing: number }`
  - `export function onGpsUpdate(prev, route, stops, gpsLat, gpsLng, gpsBearing, gpsSpeedKph): BusMotionState`
  - `export function advanceFrame(state, route, dtMs): BusMotionState`

- [ ] **Step 1: Create the file with full implementation**

```typescript
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
  const speedMs = gpsSpeedKph / 3.6;

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
  const rawAhead = directedAheadM(route, animIdx, animT, gpsSnapped.idx, gpsSnapped.t, direction);

  let multiplier = prev?.multiplier ?? 1.0;
  const THRESH = 15; // metres — within 15 m is "on target"
  if (rawAhead > THRESH) {
    multiplier = Math.min(2.0, multiplier + 0.15);
  } else if (rawAhead < -THRESH) {
    multiplier = Math.max(0.0, multiplier - 0.20);
  } else {
    multiplier += (1.0 - multiplier) * 0.3;
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/UPBus/frontend
npx tsc --noEmit 2>&1 | grep -i "busMotionEngine" | head -20
```

Expected: no errors mentioning `busMotionEngine.ts`.

- [ ] **Step 3: Run a quick smoke test**

```bash
node -e "
const { onGpsUpdate, advanceFrame } = require('./frontend/lib/busMotionEngine.ts');
console.log('import OK');
" 2>&1 || echo "(TypeScript import expected to fail in plain node — that is fine)"
```

If the project has ts-node, run:
```bash
cd /Applications/XAMPP/xamppfiles/htdocs/UPBus/frontend
npx ts-node -e "
import { onGpsUpdate, advanceFrame, BusMotionState } from './lib/busMotionEngine';
const route = [
  {lat:19.022, lng:99.895},
  {lat:19.025, lng:99.895},
  {lat:19.030, lng:99.897},
  {lat:19.028, lng:99.900},
];
const stops = [{lat:19.023,lng:99.895},{lat:19.027,lng:99.895},{lat:19.030,lng:99.897}];
const s1 = onGpsUpdate(null, route, stops, 19.022, 99.895, 45, 30);
console.log('onGpsUpdate ok:', s1.direction, s1.speedMs.toFixed(2));
const s2 = advanceFrame(s1, route, 1000);
console.log('advanceFrame ok:', s2.lat.toFixed(5), s2.lng.toFixed(5));
" 2>&1 | head -10
```

Expected: prints `onGpsUpdate ok:` and `advanceFrame ok:` without crashing.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/busMotionEngine.ts
git commit -m "feat: shared bus motion engine — dead reckoning + direction detection"
```

---

## Task 4: Update web — BusMap.tsx + useBusMarkers.ts

**Files:**
- Modify: `frontend/components/Map/BusMap.tsx`
- Modify: `frontend/components/Map/useBusMarkers.ts`

**Interfaces:**
- Consumes: `onGpsUpdate`, `advanceFrame`, `BusMotionState`, `RoutePoint` from `@/lib/busMotionEngine`
- Produces: `useBusMarkers(mapRef, buses, routePathByColor, stopsByColor)` — same external behaviour, bus markers move with dead reckoning

### Part A: BusMap.tsx — add stopsByColor parsing

In `BusMap.tsx`, `routeCoordsByColorRef` is already built from KML. We need a parallel `stopsByColorRef` that stores stops **in KML Placemark order** (not arc-length sorted).

- [ ] **Step 1: Add stopsByColorRef and parseKmlStopsOrdered to BusMap.tsx**

After line 43 (`const routeCoordsByColorRef = useRef...`), add:

```typescript
const stopsByColorRef = useRef<Record<string, { lat: number; lng: number }[]>>({});
```

After the existing `parseKmlStops` function (around line 235), add a new function:

```typescript
// Returns stops in KML Placemark order — used by direction-detection engine.
// IMPORTANT: do NOT sort these; the engine depends on circular route order.
function parseKmlStopsOrdered(kml: string): { lat: number; lng: number }[] {
  const placemarks = kml.match(/<Placemark[^>]*>[\s\S]*?<\/Placemark>/g) || [];
  const stops: { lat: number; lng: number }[] = [];
  placemarks.forEach(pm => {
    if (!/<Point>/.test(pm)) return;
    const nameMatch = pm.match(/<name>([\s\S]*?)<\/name>/);
    if (nameMatch && nameMatch[1].includes('ชาร์จ')) return;
    const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
    if (!coordMatch) return;
    const [lng, lat] = coordMatch[1].trim().split(',').map(Number);
    if (!isNaN(lat) && !isNaN(lng)) stops.push({ lat, lng });
  });
  return stops;
}
```

- [ ] **Step 2: Populate stopsByColorRef inside the KML Promise.all block**

Inside the `kmlFiles.map(({ file, color, key }) => fetch(file)...` block, after setting `routeCoordsByColorRef.current[key] = coords;`, add:

```typescript
stopsByColorRef.current[key] = parseKmlStopsOrdered(kmlText);
```

- [ ] **Step 3: Pass stopsByColor to useBusMarkers**

Change line 230 from:
```typescript
useBusMarkers(mapRef, buses, routeCoordsByColorRef.current);
```
to:
```typescript
useBusMarkers(mapRef, buses, routeCoordsByColorRef.current, stopsByColorRef.current);
```

### Part B: useBusMarkers.ts — replace lerp with engine

- [ ] **Step 4: Replace the entire useBusMarkers.ts file**

```typescript
import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { BusData } from '@/lib/api';
import { offsetLeft, LatLng } from '@/lib/interpolation';
import {
  onGpsUpdate, advanceFrame,
  BusMotionState, RoutePoint,
} from '@/lib/busMotionEngine';

/* eslint-disable no-var, @typescript-eslint/no-unused-vars */
declare var L: typeof import('leaflet');
/* eslint-enable no-var, @typescript-eslint/no-unused-vars */

const BUS_IMG: Record<string, string> = {
  Red:    '/images/bus-red-base.png',
  Green:  '/images/bus-green-base.png',
  Blue:   '/images/bus-blue-base.png',
  Purple: '/images/bus-purple-base-2.png',
  Orange: '/images/bus-orange-base.png',
};

interface MarkerState {
  motion: BusMotionState;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  marker: any;
}

function parseBusDateMs(dateStr: string): number {
  if (!dateStr) return 0;
  return new Date(dateStr.replace(' ', 'T') + '+07:00').getTime();
}

function fmtThai(ms: number): string {
  return new Date(ms).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

export function useBusMarkers(
  mapRef:           React.MutableRefObject<LeafletMap | null>,
  buses:            BusData[],
  routePathByColor: Record<string, LatLng[]>,
  stopsByColor:     Record<string, RoutePoint[]>,
) {
  const markersRef    = useRef<Map<string, MarkerState>>(new Map());
  const animRef       = useRef<number | null>(null);
  const lastFrameRef  = useRef<number>(0);
  const serverOffsetRef  = useRef(0);
  const listenerReadyRef = useRef(false);

  // ── Popup clock ────────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    const refBus = buses.find(b => b.date);
    if (refBus?.date) {
      const serverMs = parseBusDateMs(refBus.date);
      if (serverMs > 0) serverOffsetRef.current = serverMs - Date.now();
    }

    if (!listenerReadyRef.current) {
      listenerReadyRef.current = true;
      let tickTimer: ReturnType<typeof setInterval> | null = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mapRef.current.on('popupopen', (e: any) => {
        const timeEl: HTMLElement | null = e.popup.getElement()?.querySelector('.bus-popup-time');
        if (!timeEl) return;
        const tick = () => { timeEl.textContent = fmtThai(Date.now() + serverOffsetRef.current); };
        tick();
        tickTimer = setInterval(tick, 1000);
      });
      mapRef.current.on('popupclose', () => {
        if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
      });
    }
  }, [buses]);

  // ── GPS update: call engine onGpsUpdate per bus ────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const Leaflet = window.L;

    // Remove markers for buses no longer in list
    const activeIds = new Set(buses.map(b => b.imei_id));
    markersRef.current.forEach((state, id) => {
      if (!activeIds.has(id)) { state.marker.remove(); markersRef.current.delete(id); }
    });

    buses.forEach(bus => {
      if (bus.latitude == null) return;

      const route  = (routePathByColor[bus.color] ?? []) as RoutePoint[];
      const stops  = (stopsByColor[bus.color]     ?? []) as RoutePoint[];
      const prev   = markersRef.current.get(bus.imei_id);

      // Engine: update motion state with new GPS
      const motion = onGpsUpdate(
        prev?.motion ?? null,
        route, stops,
        bus.latitude, bus.longitude!,
        bus.bearing ?? 0,
        bus.speed ?? 0,
      );

      // Popup content
      const accLabel = bus.acc === 1 ? '🟢 ทำงาน' : '🔴 กำลังชาร์จ';
      const popupHtml =
        `<b>รถ ${bus.imei_id}</b><br>` +
        `คนขับ: ${bus.driver || '-'}<br>` +
        `สาย: ${bus.color}<br>` +
        `สถานะ: ${accLabel}<br>` +
        `ความเร็ว: ${bus.speed} km/h<br>` +
        `SOC: ${bus.soc}%<br>` +
        `เวลา: <span class="bus-popup-time">...</span>`;

      const isOffRoute = bus.color === 'Orange';
      const isReserved = !!bus.department;
      const isCharging = bus.acc === 0;
      const imgSrc     = (isReserved || isOffRoute) ? BUS_IMG.Orange : (BUS_IMG[bus.color] || BUS_IMG.Purple);
      const chargeBadge = `<div class="charge-badge" style="position:absolute;bottom:6px;right:4px;font-size:16px;line-height:1;pointer-events:none;filter:drop-shadow(0 0 2px rgba(0,0,0,0.6));display:${isCharging ? '' : 'none'};">⚡</div>`;
      const shortDept   = (s: string) => s.length > 14 ? s.slice(0, 13) + '…' : s;
      const deptLabel   = isOffRoute
        ? `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(230,126,34,0.92);color:#fff;font-size:10px;font-family:sans-serif;font-weight:bold;padding:2px 6px;border-radius:6px;pointer-events:none;max-width:140px;overflow:hidden;text-overflow:ellipsis;">🟠 ${bus.department ? shortDept(bus.department) : 'นอกเส้นทาง'}</div>`
        : isReserved
        ? `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(230,126,34,0.92);color:#fff;font-size:10px;font-family:sans-serif;font-weight:bold;padding:2px 6px;border-radius:6px;pointer-events:none;max-width:140px;overflow:hidden;text-overflow:ellipsis;">🟠 ${shortDept(bus.department!)}</div>`
        : '';

      if (prev) {
        // Update existing marker: keep Leaflet marker, update motion + popup
        prev.motion = motion;
        prev.marker.setPopupContent(popupHtml);
        const imgEl = prev.marker.getElement()?.querySelector('img') as HTMLImageElement | null;
        if (imgEl && imgEl.src !== window.location.origin + imgSrc) imgEl.src = imgSrc;
        const chargeEl = prev.marker.getElement()?.querySelector('.charge-badge') as HTMLElement | null;
        if (chargeEl) chargeEl.style.display = isCharging ? '' : 'none';
      } else {
        // Create new Leaflet marker at engine's current position
        const displayed = offsetLeft({ lat: motion.lat, lng: motion.lng }, motion.bearing, 3.5);
        const icon = Leaflet.divIcon({
          html: `<div style="width:84px;height:84px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));position:relative;">${deptLabel}<img src="${imgSrc}" style="width:100%;height:100%;object-fit:contain;" /><span style="position:absolute;top:10px;left:50%;transform:translateX(-50%);color:white;font-weight:bold;font-size:15px;font-family:sans-serif;text-shadow:0 1px 3px rgba(0,0,0,0.6);pointer-events:none;">${bus.imei_id.slice(-2)}</span>${chargeBadge}</div>`,
          iconSize: [84, 84],
          iconAnchor: [42, 42],
          className: '',
        });
        const marker = Leaflet.marker([displayed.lat, displayed.lng], { icon })
          .addTo(mapRef.current!)
          .bindPopup(popupHtml);
        markersRef.current.set(bus.imei_id, { motion, marker });
      }
    });
  }, [buses]);

  // ── 60 fps animation loop ──────────────────────────────────────────────────
  useEffect(() => {
    function animate(ts: number) {
      const dtMs = lastFrameRef.current > 0 ? Math.min(ts - lastFrameRef.current, 200) : 16;
      lastFrameRef.current = ts;

      markersRef.current.forEach((state, _id) => {
        const route = (routePathByColor[state.motion.bearing >= 0 ? 'dummy' : 'dummy'] as RoutePoint[] | undefined);
        // routePathByColor lookup happens inside the closure; we need a stable ref.
        // IMPORTANT: routePathByColorRef is not available here. Read from closure capture.
        // (The animate closure captures routePathByColor at mount — it never changes since
        //  it is a ref's .current object mutated in place. This is intentional.)
        //
        // We'll fix this by reading via a ref. See note below.
      });

      animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);
```

Wait — there is a subtle problem: the animate loop closure captures `routePathByColor` and `stopsByColor` at mount time but these are object references that are mutated in place by BusMap.tsx. Since `routeCoordsByColorRef.current` is passed directly as the prop (not wrapped in another ref), it works because the same object reference is mutated. But to be explicit and correct, restructure the animate loop to read via `markersRef`:

Replace the entire `useBusMarkers.ts` file with this corrected version:

```typescript
import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { BusData } from '@/lib/api';
import { offsetLeft, LatLng } from '@/lib/interpolation';
import {
  onGpsUpdate, advanceFrame,
  BusMotionState, RoutePoint,
} from '@/lib/busMotionEngine';

/* eslint-disable no-var, @typescript-eslint/no-unused-vars */
declare var L: typeof import('leaflet');
/* eslint-enable no-var, @typescript-eslint/no-unused-vars */

const BUS_IMG: Record<string, string> = {
  Red:    '/images/bus-red-base.png',
  Green:  '/images/bus-green-base.png',
  Blue:   '/images/bus-blue-base.png',
  Purple: '/images/bus-purple-base-2.png',
  Orange: '/images/bus-orange-base.png',
};

interface MarkerState {
  motion:  BusMotionState;
  color:   string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  marker:  any;
}

function parseBusDateMs(dateStr: string): number {
  if (!dateStr) return 0;
  return new Date(dateStr.replace(' ', 'T') + '+07:00').getTime();
}

function fmtThai(ms: number): string {
  return new Date(ms).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

export function useBusMarkers(
  mapRef:           React.MutableRefObject<LeafletMap | null>,
  buses:            BusData[],
  routePathByColor: Record<string, LatLng[]>,
  stopsByColor:     Record<string, RoutePoint[]>,
) {
  const markersRef       = useRef<Map<string, MarkerState>>(new Map());
  const animRef          = useRef<number | null>(null);
  const lastFrameRef     = useRef<number>(0);
  const routeRef         = useRef(routePathByColor);
  const serverOffsetRef  = useRef(0);
  const listenerReadyRef = useRef(false);

  // Keep routeRef current so the animate loop can read fresh route data
  useEffect(() => { routeRef.current = routePathByColor; }, [routePathByColor]);

  // ── Popup clock ────────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    const refBus = buses.find(b => b.date);
    if (refBus?.date) {
      const serverMs = parseBusDateMs(refBus.date);
      if (serverMs > 0) serverOffsetRef.current = serverMs - Date.now();
    }

    if (!listenerReadyRef.current) {
      listenerReadyRef.current = true;
      let tickTimer: ReturnType<typeof setInterval> | null = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mapRef.current.on('popupopen', (e: any) => {
        const timeEl: HTMLElement | null = e.popup.getElement()?.querySelector('.bus-popup-time');
        if (!timeEl) return;
        const tick = () => { timeEl.textContent = fmtThai(Date.now() + serverOffsetRef.current); };
        tick();
        tickTimer = setInterval(tick, 1000);
      });
      mapRef.current.on('popupclose', () => {
        if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
      });
    }
  }, [buses]);

  // ── GPS update: onGpsUpdate per bus ───────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const Leaflet = window.L;

    const activeIds = new Set(buses.map(b => b.imei_id));
    markersRef.current.forEach((state, id) => {
      if (!activeIds.has(id)) { state.marker.remove(); markersRef.current.delete(id); }
    });

    buses.forEach(bus => {
      if (bus.latitude == null) return;

      const route  = (routePathByColor[bus.color] ?? []) as RoutePoint[];
      const stops  = (stopsByColor[bus.color]     ?? []) as RoutePoint[];
      const prev   = markersRef.current.get(bus.imei_id);

      const motion = onGpsUpdate(
        prev?.motion ?? null, route, stops,
        bus.latitude, bus.longitude!,
        bus.bearing ?? 0, bus.speed ?? 0,
      );

      const accLabel = bus.acc === 1 ? '🟢 ทำงาน' : '🔴 กำลังชาร์จ';
      const popupHtml =
        `<b>รถ ${bus.imei_id}</b><br>` +
        `คนขับ: ${bus.driver || '-'}<br>` +
        `สาย: ${bus.color}<br>` +
        `สถานะ: ${accLabel}<br>` +
        `ความเร็ว: ${bus.speed} km/h<br>` +
        `SOC: ${bus.soc}%<br>` +
        `เวลา: <span class="bus-popup-time">...</span>`;

      const isOffRoute = bus.color === 'Orange';
      const isReserved = !!bus.department;
      const isCharging = bus.acc === 0;
      const imgSrc     = (isReserved || isOffRoute) ? BUS_IMG.Orange : (BUS_IMG[bus.color] || BUS_IMG.Purple);
      const chargeBadge = `<div class="charge-badge" style="position:absolute;bottom:6px;right:4px;font-size:16px;line-height:1;pointer-events:none;filter:drop-shadow(0 0 2px rgba(0,0,0,0.6));display:${isCharging ? '' : 'none'};">⚡</div>`;
      const shortDept   = (s: string) => s.length > 14 ? s.slice(0, 13) + '…' : s;
      const deptLabel   = isOffRoute
        ? `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(230,126,34,0.92);color:#fff;font-size:10px;font-family:sans-serif;font-weight:bold;padding:2px 6px;border-radius:6px;pointer-events:none;max-width:140px;overflow:hidden;text-overflow:ellipsis;">🟠 ${bus.department ? shortDept(bus.department) : 'นอกเส้นทาง'}</div>`
        : isReserved
        ? `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(230,126,34,0.92);color:#fff;font-size:10px;font-family:sans-serif;font-weight:bold;padding:2px 6px;border-radius:6px;pointer-events:none;max-width:140px;overflow:hidden;text-overflow:ellipsis;">🟠 ${shortDept(bus.department!)}</div>`
        : '';

      if (prev) {
        prev.motion = motion;
        prev.color  = bus.color;
        prev.marker.setPopupContent(popupHtml);
        const imgEl = prev.marker.getElement()?.querySelector('img') as HTMLImageElement | null;
        if (imgEl && imgEl.src !== window.location.origin + imgSrc) imgEl.src = imgSrc;
        const chargeEl = prev.marker.getElement()?.querySelector('.charge-badge') as HTMLElement | null;
        if (chargeEl) chargeEl.style.display = isCharging ? '' : 'none';
      } else {
        const displayed = offsetLeft({ lat: motion.lat, lng: motion.lng }, motion.bearing, 3.5);
        const icon = Leaflet.divIcon({
          html: `<div style="width:84px;height:84px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));position:relative;">${deptLabel}<img src="${imgSrc}" style="width:100%;height:100%;object-fit:contain;" /><span style="position:absolute;top:10px;left:50%;transform:translateX(-50%);color:white;font-weight:bold;font-size:15px;font-family:sans-serif;text-shadow:0 1px 3px rgba(0,0,0,0.6);pointer-events:none;">${bus.imei_id.slice(-2)}</span>${chargeBadge}</div>`,
          iconSize: [84, 84], iconAnchor: [42, 42], className: '',
        });
        const marker = Leaflet.marker([displayed.lat, displayed.lng], { icon })
          .addTo(mapRef.current!)
          .bindPopup(popupHtml);
        markersRef.current.set(bus.imei_id, { motion, color: bus.color, marker });
      }
    });
  }, [buses]);

  // ── 60 fps animation loop ──────────────────────────────────────────────────
  useEffect(() => {
    function animate(ts: number) {
      const dtMs = lastFrameRef.current > 0 ? Math.min(ts - lastFrameRef.current, 200) : 16;
      lastFrameRef.current = ts;

      markersRef.current.forEach(state => {
        const route = (routeRef.current[state.color] ?? []) as RoutePoint[];
        state.motion = advanceFrame(state.motion, route, dtMs);

        // Apply 3.5 m lane offset at render time (not stored in engine state)
        const displayed = offsetLeft(
          { lat: state.motion.lat, lng: state.motion.lng },
          state.motion.bearing, 3.5,
        );
        state.marker.setLatLng([displayed.lat, displayed.lng]);

        // Flip image: bearing 0–180 = going left → scaleX(-1)
        const goingLeft = state.motion.bearing >= 0 && state.motion.bearing <= 180;
        const imgEl = state.marker.getElement()?.querySelector('img') as HTMLImageElement | null;
        if (imgEl) imgEl.style.transform = goingLeft ? 'scaleX(-1)' : '';
      });

      animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);
}
```

- [ ] **Step 5: Verify TypeScript compiles without errors**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/UPBus/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. If errors appear, fix them before committing.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/Map/BusMap.tsx frontend/components/Map/useBusMarkers.ts
git commit -m "feat(web): integrate bus motion engine into useBusMarkers — dead reckoning"
```

---

## Task 5: Update mobile — useAnimatedBuses.ts + index.tsx

**Files:**
- Modify: `upbus-mobile/lib/useAnimatedBuses.ts`
- Modify: `upbus-mobile/app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `onGpsUpdate`, `advanceFrame`, `BusMotionState`, `RoutePoint` from `../../frontend/lib/busMotionEngine` **OR** a shared symlink/copy. See note below.
- Produces: `useAnimatedBuses(buses, routes, stopsByRoute)` — same external API, `AnimBus` unchanged

**Note on shared engine path:** The mobile app is in `upbus-mobile/` while the engine is in `frontend/lib/`. The simplest approach is to copy the engine file to `upbus-mobile/lib/busMotionEngine.ts`. If a monorepo symlink exists, use that instead. The implementer should check if `upbus-mobile/tsconfig.json` can resolve `../../frontend/lib/busMotionEngine` — if not, copy the file.

- [ ] **Step 1: Copy or symlink the engine into the mobile project**

```bash
cp frontend/lib/busMotionEngine.ts upbus-mobile/lib/busMotionEngine.ts
```

Verify it's there:
```bash
ls upbus-mobile/lib/busMotionEngine.ts
```

- [ ] **Step 2: Replace `upbus-mobile/lib/useAnimatedBuses.ts` entirely**

```typescript
import { useState, useEffect, useRef } from 'react';
import type { BusData } from './api';
import { onGpsUpdate, advanceFrame, BusMotionState, RoutePoint } from './busMotionEngine';

const FRAME_MS = 16;      // ~60 fps
const POLL_MS  = 10000;   // matches SWR refreshInterval in index.tsx

export type RouteMap     = Map<string, RoutePoint[]>;
export type StopsByRoute = Map<string, RoutePoint[]>;

export interface AnimBus {
  lat:     number;
  lng:     number;
  color:   string;
  driver:  string;
  bearing: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAnimatedBuses(
  buses:         BusData[],
  routes:        RouteMap,
  stopsByRoute:  StopsByRoute,
): Map<string, AnimBus> {
  const motionRef  = useRef<Map<string, BusMotionState & { color: string; driver: string }>>(new Map());
  const routesRef  = useRef<RouteMap>(routes);
  const stopsRef   = useRef<StopsByRoute>(stopsByRoute);
  const [positions, setPositions] = useState<Map<string, AnimBus>>(new Map());

  useEffect(() => { routesRef.current = routes; },       [routes]);
  useEffect(() => { stopsRef.current  = stopsByRoute; }, [stopsByRoute]);

  // ── GPS update: call engine onGpsUpdate ────────────────────────────────────
  useEffect(() => {
    const map = motionRef.current;
    const now = performance.now();
    void now; // suppress unused warning

    for (const bus of buses) {
      if (bus.latitude == null || bus.longitude == null) continue;

      const route = routesRef.current.get(bus.color) ?? [];
      const stops = stopsRef.current.get(bus.color)  ?? [];
      const prev  = map.get(bus.imei_id) ?? null;

      const motion = onGpsUpdate(
        prev, route, stops,
        bus.latitude, bus.longitude,
        bus.bearing ?? 0,
        bus.speed   ?? 0,
      );

      map.set(bus.imei_id, { ...motion, color: bus.color, driver: bus.driver });
    }

    // Remove buses no longer in API response
    for (const id of map.keys()) {
      if (!buses.find(b => b.imei_id === id)) map.delete(id);
    }
  }, [buses]);

  // ── 60 fps loop: advanceFrame ──────────────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let lastTs = performance.now();

    const frame = () => {
      const now  = performance.now();
      const dtMs = Math.min(now - lastTs, 200);
      lastTs = now;

      const next = new Map<string, AnimBus>();

      for (const [id, state] of motionRef.current) {
        const route   = routesRef.current.get(state.color) ?? [];
        const updated = advanceFrame(state, route, dtMs);

        // Persist updated motion back (mutate in place to avoid Map recreation)
        motionRef.current.set(id, { ...updated, color: state.color, driver: state.driver });

        next.set(id, {
          lat:     updated.lat,
          lng:     updated.lng,
          color:   state.color,
          driver:  state.driver,
          bearing: updated.bearing,
        });
      }

      setPositions(new Map(next));
      timer = setTimeout(frame, FRAME_MS);
    };

    timer = setTimeout(frame, FRAME_MS);
    return () => clearTimeout(timer);
  }, []);

  return positions;
}
```

- [ ] **Step 3: Update refreshInterval in `upbus-mobile/app/(tabs)/index.tsx`**

Find the line (around line 132):
```typescript
const { data: buses = [] } = useSWR<BusData[]>('/api/buses', getBuses, { refreshInterval: 5000 });
```

Change `5000` to `10000`:
```typescript
const { data: buses = [] } = useSWR<BusData[]>('/api/buses', getBuses, { refreshInterval: 10000 });
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/UPBus/upbus-mobile
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. Fix any type errors before continuing.

- [ ] **Step 5: Commit**

```bash
git add upbus-mobile/lib/busMotionEngine.ts upbus-mobile/lib/useAnimatedBuses.ts upbus-mobile/app/(tabs)/index.tsx
git commit -m "feat(mobile): integrate bus motion engine — dead reckoning, POLL_MS 5000→10000"
```

---

## Self-Review Checklist (implementer runs this)

| Spec requirement | Task |
|---|---|
| Red KML stops in circular route order (14 stops) | Task 1 |
| Blue KML 8 stops correct order, no วิศวฯขาไป | Task 2 |
| `busMotionEngine.ts` zero React/DOM imports | Task 3 |
| Direction detection: next 2 stops, skip if speed < 1.8 km/h | Task 3 `onGpsUpdate` |
| multiplier: +0.15 when ahead>15m, -0.20 when behind>15m, converge otherwise | Task 3 |
| advance() never reverses (distM always ≥ 0, multiplier ≥ 0) | Task 3 `advance()` |
| Web: offsetLeft(3.5m) applied at render time, not in engine | Task 4 animate loop |
| Web: bearing flip 0–180 → scaleX(-1) | Task 4 animate loop |
| Web: stopsByColor passed from BusMap in KML Placemark order | Task 4 BusMap.tsx |
| Mobile: POLL_MS = 10000 | Task 5 useAnimatedBuses.ts |
| Mobile: refreshInterval = 10000 | Task 5 index.tsx |
| Mobile: stopsByRoute parameter actually used (not `_` prefix) | Task 5 |
| No new npm dependencies | All tasks |
| TypeScript compiles clean on both platforms | Tasks 3–5 |
