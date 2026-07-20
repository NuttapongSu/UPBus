# Bus Motion Engine — Shared Dead Reckoning Algorithm

**Date:** 2026-06-28
**Scope:** Web (`frontend/`) + Mobile (`upbus-mobile/`) + KML data fixes

---

## Goal

Replace the current linear-interpolation movement (both platforms) with a shared dead-reckoning engine that:
1. Detects travel direction from the next 2 stops on the bus's own line
2. Advances the marker along the route using actual GPS speed
3. Smoothly catches up when GPS is ahead, and smoothly slows to a stop when overshot — never reverses

---

## Architecture

```
frontend/lib/busMotionEngine.ts       ← NEW: pure TypeScript, zero React/DOM deps
    ↓ import                              ↓ import
frontend/components/Map/              upbus-mobile/lib/
  useBusMarkers.ts (web renderer)       useAnimatedBuses.ts (mobile renderer)
```

Both renderers call the same engine functions. Bug fixes happen once.

---

## KML Data Fixes (prerequisite)

Both platforms read KML stops to determine direction. Stops **must** be in circular route order.

### 🔴 Red line — reorder only

Correct order (14 stops):
1. จุดจอดรถประตูสอง
2. สถานีหน้าอาคารสงวนเสริมศรี(ขาไป)
3. สถานีหน้าเวียงพะเยา(ขาไป)
4. สถานีหน้าอาคาร ๙๙ ปี(ขาไป)
5. สถานีหน้าคณะศิลปศาสตร์
6. สถานีหน้าคณะวิทยาศาสตร์
7. สถานีหน้าหอประชุมพญางำเมือง
8. สถานีหน้าตึกอธิการบดี ← moved up (was #13)
9. จุดจอดรถบัสPKY ← moved up (was #14)
10. สถานีหน้าอาคาร ๙๙ ปี(ขากลับ) ← reordered (was #12)
11. สถานีหน้าเวียงพะเยา(ขากลับ) ← (was #11)
12. สถานีหน้าอาคารสงวนเสริมศรี(ขากลับ) ← (was #10)
13. สถานีหน้าโรงเรียนสาธิตมหาวิทยาลัยพะเยา ← moved down (was #9)
14. สถานีโรงเรียนสาธิตมหาวิทยาลัยพะเยา ← moved down (was #8)

### 🔵 Blue line — add 4 stops + remove 1 + reorder

Remove: สถานีหน้าคณะวิศวกรรมศาสตร์(ขาไป) (duplicate/wrong)

Correct order (8 stops):
1. จุดจอดรถบัสประตูสาม (19.022590, 99.895303) — existing
2. สถานีหน้าศูนย์การเรียนรู้เศรษฐกิจพอเพียง (19.027133, 99.899348) — existing, moved
3. สถานีหน้าหอประชุมพญางำเมือง (19.030000, 99.897711) — **NEW** (coords from Green)
4. สถานีหน้าอาคารสำนักงานอธิการบดี (19.029034, 99.896067) — **NEW** (coords from Green)
5. สถานีหน้าคณะศิลปศาสตร์ (19.029649, 99.895767) — **NEW** (coords from Green)
6. สถานีหน้าคณะวิทยาศาสตร์ (19.030695, 99.897597) — **NEW** (coords from Red)
7. สถานีหน้าคณะวิศวกรรมศาสตร์(ขากลับ) (19.030522, 99.901225) — existing
8. สถานีหน้าคณะเทคโนโลยีสารสนเทศและการสื่อสาร (19.028469, 99.899829) — existing

KML files to fix (same content, two locations):
- `frontend/public/kml/up_bus_transit_red.kml`
- `frontend/public/kml/up_bus_transit_blue.kml`
- Backend serves these via `backend/routes/kml.js` — verify path at implementation time

---

## busMotionEngine.ts — Public API

```ts
export interface RoutePoint { lat: number; lng: number; }

export interface BusMotionState {
  routeIdx:   number;    // current segment index on circular route
  routeT:     number;    // 0–1 interpolation within segment
  direction:  1 | -1;   // +1 = forward along array
  speedMs:    number;    // GPS speed in m/s
  multiplier: number;    // 0.0–2.0, nominal 1.0
  lat:        number;    // current animated position
  lng:        number;
  bearing:    number;    // degrees 0–360, for flip logic
}

// Called when a new GPS packet arrives (every 10s)
export function onGpsUpdate(
  prev:       BusMotionState | null,
  route:      RoutePoint[],   // ordered route polyline points
  stops:      RoutePoint[],   // ordered stops (circular, same line)
  gpsLat:     number,
  gpsLng:     number,
  gpsBearing: number,         // degrees from GPS device
  gpsSpeedKph: number,
): BusMotionState;

// Called every animation frame (~16ms)
export function advanceFrame(
  state: BusMotionState,
  route: RoutePoint[],
  dtMs:  number,
): BusMotionState;
```

---

## Algorithm Details

### Direction Detection (inside `onGpsUpdate`)

```
1. Find nearest stop to (gpsLat, gpsLng) → nearestStopIdx
   (haversine distance, O(n) scan, n ≤ 14)

2. Forward candidates (circular):
     f1 = stops[(nearestStopIdx + 1) % n]
     f2 = stops[(nearestStopIdx + 2) % n]

3. Backward candidates (circular):
     b1 = stops[(nearestStopIdx - 1 + n) % n]
     b2 = stops[(nearestStopIdx - 2 + n) % n]

4. For each candidate, compute bearing from GPS position to stop.

5. angleDiff(a, b) = |((a - b + 540) % 360) - 180|  // 0–180°

6. scoreForward  = angleDiff(gpsBearing, bearing_to_f1)
                 + angleDiff(gpsBearing, bearing_to_f2)
   scoreBackward = angleDiff(gpsBearing, bearing_to_b1)
                 + angleDiff(gpsBearing, bearing_to_b2)

7. if gpsSpeedKph < 1.8 (≈ 0.5 m/s):
     direction = prev?.direction ?? 1   // bus stopped, keep last direction
   else:
     direction = scoreForward <= scoreBackward ? 1 : -1
```

### Multiplier Adjustment (inside `onGpsUpdate`)

```
gpsSnapped = snapToRoute(route, gpsLat, gpsLng)
           → { idx: number, t: number, lat: number, lng: number }

rawAhead   = segmentsAhead(route, animIdx, animT, gpsSnapped.idx, gpsSnapped.t)
           // signed: + = GPS ahead of animation, − = animation overshot GPS

if   rawAhead >  1.5 → multiplier = min(2.0, multiplier + 0.15)   // catch up
elif rawAhead < -1.5 → multiplier = max(0.0, multiplier - 0.20)   // slow down
else                 → multiplier += (1.0 − multiplier) × 0.3     // converge to 1×
```

### Frame Advance (inside `advanceFrame`)

```
effectiveDist = speedMs × multiplier × (dtMs / 1000)
(routeIdx, routeT, lat, lng) = advance(route, routeIdx, routeT, effectiveDist, direction)
bearing = bearingOfSegment(route, routeIdx, direction)
```

`advance()` wraps circularly at end of route. Never moves with negative distance.

---

## Geometry Helpers (internal to engine)

Pure functions. `haversine`, `projectOnSeg`, `snapToRoute`, `bearingTo` exist in `useAnimatedBuses.ts` and should be moved to the engine. `segmentsAhead`, `advance`, `angleDiff` are new and must be implemented.

```ts
haversine(lat1, lng1, lat2, lng2): number
// Great-circle distance in metres

projectOnSeg(p1, p2, lat, lng): RoutePoint
// Nearest point on segment p1→p2 to (lat,lng)

snapToRoute(route, lat, lng): { idx: number; t: number; lat: number; lng: number }
// idx = segment index (0..n-2), t = 0-1 along that segment

segmentsAhead(route, aIdx, aT, bIdx, bT): number
// Signed arc distance from position A to position B along route,
// in "segment units" (1.0 = one full segment). Positive = B is ahead of A.

advance(route, idx, t, distM, direction): { idx: number; t: number; lat: number; lng: number }
// Move distM metres from (idx,t) in direction (+1/-1). Wraps circularly.

bearingTo(a, b): number
// Compass bearing 0–360° from point a to point b

angleDiff(a, b): number
// Smallest angle between two bearings, 0–180°
// = |((a - b + 540) % 360) - 180|
```

---

## Platform Integration

### Web (`useBusMarkers.ts`)

- Change `POLL_INTERVAL` → already 10000 ✅
- On each buses update: call `onGpsUpdate` per bus → store `BusMotionState` in `markersRef`
- `routePathByColor` already available → pass as `route`
- Need to also pass `stopsByColor` (parse from KML, same as mobile already does)
- In `animate()` loop: call `advanceFrame(state, route, dtMs)` → `state.marker.setLatLng([pos.lat, pos.lng])`
- Flip logic: `bearing 0–180 → scaleX(-1)` (unchanged)

### Mobile (`useAnimatedBuses.ts`)

- Change `POLL_MS` 5000 → 10000
- `_stopsByRoute` param: un-ignore, pass through to engine
- On GPS update: call `onGpsUpdate` per bus
- In 60fps loop: call `advanceFrame` → `setPositions`
- Also update `upbus-mobile/app/(tabs)/index.tsx`: `refreshInterval: 5000 → 10000`

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| Bus stopped (speed < 1.8 km/h) | Keep direction, multiplier converges to 1×, advance = 0 |
| GPS signal lost (no new packet) | Animation continues at last speed×multiplier until next packet |
| Route not loaded yet | Fall back to raw GPS lat/lng, no advance |
| Stops not available | Skip direction detection, keep prev direction |
| routeIdx out of bounds after route change | Clamp with `((idx % n) + n) % n` (guard already in advance()) |
| Bus overshot by many segments | multiplier → 0 gradually; bus stops; next GPS corrects |

---

## Files Changed

| File | Change |
|---|---|
| `frontend/lib/busMotionEngine.ts` | **NEW** — shared pure engine |
| `frontend/public/kml/up_bus_transit_red.kml` | Reorder stops |
| `frontend/public/kml/up_bus_transit_blue.kml` | Add 4 stops, remove 1, reorder |
| `frontend/components/Map/useBusMarkers.ts` | Import engine, add stops, replace interpolation |
| `upbus-mobile/lib/useAnimatedBuses.ts` | Import engine, un-ignore stops, POLL_MS→10000 |
| `upbus-mobile/app/(tabs)/index.tsx` | refreshInterval 5000→10000 |

No new npm dependencies.
