# Purple Bus Dynamic Route Following Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Purple (unassigned-driver) buses the same dead-reckoning animation as colored buses by dynamically picking the nearest route at each GPS poll, pausing at shared line-junction points until the next poll confirms direction — without changing the bus's displayed color.

**Architecture:** Both `frontend/lib/busMotionEngine.ts` and `upbus-mobile/lib/busMotionEngine.ts` gain a `pickNearestRoute()` helper and an `activeColor?: string` field on `BusMotionState`. The orchestration layers (`frontend/components/Map/useBusMarkers.ts`, `upbus-mobile/lib/useAnimatedBuses.ts`) use `pickNearestRoute()` only for `bus.color === 'Purple'` to choose which route/stops pair to feed into the existing `onGpsUpdate`/`advanceFrame` engine functions, forcing a fresh re-snap whenever the chosen route changes between polls. `advanceFrame` gains an optional `intersections` parameter that freezes movement for one frame when the bus is within a junction's radius; only Purple buses pass a non-empty intersections list.

**Tech Stack:** TypeScript, React (web, Next.js + Leaflet), React Native (Expo + react-native-maps), Jest/ts-jest (mobile only — frontend has no test runner configured).

## Global Constraints

- Bus color/icon must never change because of this feature — Purple buses stay visually Purple. (Spec: "โดยที่ไม่เปลี่ยนสีรถตามสายนั้นๆ")
- Colored buses (Red/Green/Blue) must be byte-for-byte unaffected — same route lookup, no intersection freeze logic applied to them.
- The two `busMotionEngine.ts` files must stay algorithmically identical between web and mobile (existing project convention, see file header comment `// frontend/lib/busMotionEngine.ts` present even in the mobile copy).
- Intersection points (5 confirmed in the spec) are hardcoded data, not derived at runtime.
- No backend/DB changes.

---

### Task 1: Intersection points data file (web + mobile)

**Files:**
- Create: `frontend/lib/intersections.ts`
- Create: `upbus-mobile/lib/intersections.ts`

**Interfaces:**
- Produces: `IntersectionPoint` interface (`{ lat: number; lng: number; name: string; radiusM: number; }`) and `ROUTE_INTERSECTIONS: IntersectionPoint[]` constant — consumed by Task 2/3 (`advanceFrame`) and Task 4/5 (orchestration).

- [ ] **Step 1: Create the web data file**

```ts
// frontend/lib/intersections.ts

export interface IntersectionPoint {
  lat:     number;
  lng:     number;
  name:    string;
  radiusM: number;
}

// Points where two or more lines share a stop name in their KML data — confirmed
// against the actual KML files, not derived from raw polyline proximity (the three
// lines run along a shared central corridor for long stretches, so proximity
// clustering alone produces noisy, unusable results).
export const ROUTE_INTERSECTIONS: IntersectionPoint[] = [
  { lat: 19.0300, lng: 99.8977, name: 'หอประชุมพญางำเมือง',       radiusM: 25 },
  { lat: 19.0290, lng: 99.8961, name: 'อธิการบดี',                radiusM: 25 },
  { lat: 19.0296, lng: 99.8958, name: 'ศิลปศาสตร์',                radiusM: 25 },
  { lat: 19.0254, lng: 99.8951, name: 'PKY',                       radiusM: 25 },
  { lat: 19.0306, lng: 99.9012, name: 'วิศวกรรมศาสตร์(ขากลับ)',    radiusM: 25 },
];
```

- [ ] **Step 2: Create the identical mobile data file**

```ts
// upbus-mobile/lib/intersections.ts

export interface IntersectionPoint {
  lat:     number;
  lng:     number;
  name:    string;
  radiusM: number;
}

// Points where two or more lines share a stop name in their KML data — confirmed
// against the actual KML files, not derived from raw polyline proximity (the three
// lines run along a shared central corridor for long stretches, so proximity
// clustering alone produces noisy, unusable results).
export const ROUTE_INTERSECTIONS: IntersectionPoint[] = [
  { lat: 19.0300, lng: 99.8977, name: 'หอประชุมพญางำเมือง',       radiusM: 25 },
  { lat: 19.0290, lng: 99.8961, name: 'อธิการบดี',                radiusM: 25 },
  { lat: 19.0296, lng: 99.8958, name: 'ศิลปศาสตร์',                radiusM: 25 },
  { lat: 19.0254, lng: 99.8951, name: 'PKY',                       radiusM: 25 },
  { lat: 19.0306, lng: 99.9012, name: 'วิศวกรรมศาสตร์(ขากลับ)',    radiusM: 25 },
];
```

- [ ] **Step 3: Type-check both projects**

Run: `cd frontend && npx tsc --noEmit`
Expected: `TypeScript: No errors found`

Run: `cd upbus-mobile && npx tsc --noEmit`
Expected: Only the pre-existing `__tests__/stops.test.ts` jest-type errors (11 errors, all `TS2304`/`TS2593` about `test`/`expect`) — no new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/intersections.ts upbus-mobile/lib/intersections.ts
git commit -m "$(cat <<'EOF'
feat: add shared route-intersection point data

Five points where two or more bus lines share a named stop, used by
the upcoming Purple-bus dynamic routing feature to pause dead-reckoning
at line junctions instead of guessing through a fork.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Web engine — `pickNearestRoute` + `activeColor` + intersection hold

**Files:**
- Modify: `frontend/lib/busMotionEngine.ts`

**Interfaces:**
- Consumes: `IntersectionPoint` type from `./intersections` (Task 1).
- Produces: `pickNearestRoute(lat: number, lng: number, routesByColor: Map<string, RoutePoint[]>): string | null`, `BusMotionState.activeColor?: string`, `advanceFrame(state, route, dtMs, intersections?: IntersectionPoint[])` — consumed by Task 4 (`useBusMarkers.ts`).

- [ ] **Step 1: Add the `activeColor` field to `BusMotionState`**

In `frontend/lib/busMotionEngine.ts`, find the `BusMotionState` interface and add one field:

```ts
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
}
```

- [ ] **Step 2: Add a type-only import of `IntersectionPoint`**

At the top of `frontend/lib/busMotionEngine.ts`, after the existing constants, add:

```ts
import type { IntersectionPoint } from './intersections';
```

- [ ] **Step 3: Add `pickNearestRoute`**

Add this exported function right after `snapToRoute` (it reuses `snapToRoute` and `haversine`, both already defined earlier in the file):

```ts
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
  for (const [color, route] of routesByColor) {
    if (route.length < 2) continue;
    const snapped = snapToRoute(route, lat, lng);
    const dist = haversine(lat, lng, snapped.lat, snapped.lng);
    if (dist < bestDist) { bestDist = dist; bestColor = color; }
  }
  return bestColor;
}
```

- [ ] **Step 4: Add the intersection-hold check to `advanceFrame`**

Replace the existing `advanceFrame` function:

```ts
/** Call every animation frame (~16 ms). Returns new state with updated position. */
export function advanceFrame(
  state: BusMotionState,
  route: RoutePoint[],
  dtMs:  number,
): BusMotionState {
  if (route.length < 2) return state;

  // Lerp multiplier toward target each frame — this is what makes motion smooth
  const multiplier = state.multiplier + (state.targetMultiplier - state.multiplier) * 0.04;

  const effectiveDist = state.speedMs * multiplier * (dtMs / 1000);
  if (effectiveDist <= 0) return { ...state, multiplier };

  const next = advance(route, state.routeIdx, state.routeT, effectiveDist, state.direction);
  const bearing = bearingOfSegment(route, next.idx, state.direction);
  return { ...state, multiplier, routeIdx: next.idx, routeT: next.t, lat: next.lat, lng: next.lng, bearing };
}
```

with this version (adds the optional `intersections` parameter and the hold check):

```ts
/** Call every animation frame (~16 ms). Returns new state with updated position. */
export function advanceFrame(
  state: BusMotionState,
  route: RoutePoint[],
  dtMs:  number,
  intersections?: IntersectionPoint[],
): BusMotionState {
  if (route.length < 2) return state;

  // Lerp multiplier toward target each frame — this is what makes motion smooth
  const multiplier = state.multiplier + (state.targetMultiplier - state.multiplier) * 0.04;

  // Purple buses only: freeze in place while inside a line-junction zone until
  // the next GPS poll (onGpsUpdate) re-evaluates which route to follow.
  const haltedAtIntersection = !!intersections && intersections.some(
    p => haversine(state.lat, state.lng, p.lat, p.lng) <= p.radiusM
  );
  if (haltedAtIntersection) return { ...state, multiplier };

  const effectiveDist = state.speedMs * multiplier * (dtMs / 1000);
  if (effectiveDist <= 0) return { ...state, multiplier };

  const next = advance(route, state.routeIdx, state.routeT, effectiveDist, state.direction);
  const bearing = bearingOfSegment(route, next.idx, state.direction);
  return { ...state, multiplier, routeIdx: next.idx, routeT: next.t, lat: next.lat, lng: next.lng, bearing };
}
```

- [ ] **Step 5: Verify with a throwaway compiled script**

There is no test runner configured in `frontend/`. Verify by compiling the single file (the `IntersectionPoint` import is type-only and erased, so this file has no other local dependencies) and exercising it with Node:

```bash
cd frontend
npx tsc lib/busMotionEngine.ts --module commonjs --target es2020 --outDir /tmp/busmotion-check
node -e "
const { pickNearestRoute, advanceFrame } = require('/tmp/busmotion-check/busMotionEngine.js');

const routeA = [{lat:19.0,lng:99.0},{lat:19.001,lng:99.0}];
const routeB = [{lat:19.0,lng:99.01},{lat:19.001,lng:99.01}];
const routes = new Map([['Green', routeA], ['Blue', routeB]]);

const near = pickNearestRoute(19.0005, 99.0001, routes);
console.log('nearest to (19.0005,99.0001):', near, near === 'Green' ? 'PASS' : 'FAIL');

const far = pickNearestRoute(19.0005, 99.0099, routes);
console.log('nearest to (19.0005,99.0099):', far, far === 'Blue' ? 'PASS' : 'FAIL');

const empty = pickNearestRoute(19.0, 99.0, new Map());
console.log('empty map:', empty, empty === null ? 'PASS' : 'FAIL');

const state = { routeIdx:0, routeT:0, direction:1, directionLock:0, speedMs:5, multiplier:1, targetMultiplier:1, lat:19.0, lng:99.0, bearing:0 };
const intersections = [{ lat: 19.0, lng: 99.0, name: 'test', radiusM: 50 }];
const halted = advanceFrame(state, routeA, 1000, intersections);
console.log('halted at intersection, position unchanged:', halted.lat === state.lat && halted.lng === state.lng ? 'PASS' : 'FAIL');

const moved = advanceFrame(state, routeA, 1000, []);
console.log('moves when no intersections:', (moved.lat !== state.lat || moved.lng !== state.lng) ? 'PASS' : 'FAIL');
"
rm -rf /tmp/busmotion-check
```

Expected: all five lines print `PASS`.

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/busMotionEngine.ts
git commit -m "$(cat <<'EOF'
feat(web): add pickNearestRoute and intersection hold to motion engine

BusMotionState gains activeColor for buses not locked to one line.
advanceFrame freezes movement for one frame while inside a junction
zone, releasing on the next GPS poll. Colored buses are unaffected
since they never pass a non-empty intersections list.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Mobile engine — `pickNearestRoute` + `activeColor` + intersection hold

**Files:**
- Modify: `upbus-mobile/lib/busMotionEngine.ts`
- Test: `upbus-mobile/__tests__/pickNearestRoute.test.ts`

**Interfaces:**
- Consumes: `IntersectionPoint` type from `./intersections` (Task 1).
- Produces: same signatures as Task 2 (`pickNearestRoute`, `BusMotionState.activeColor?`, `advanceFrame(..., intersections?)`) — consumed by Task 5 (`useAnimatedBuses.ts`). Mobile's `advanceFrame` signature is otherwise identical to web's (mobile's extra `acc` parameter lives only on `onGpsUpdate`, untouched by this task).

- [ ] **Step 1: Write the failing tests**

Create `upbus-mobile/__tests__/pickNearestRoute.test.ts`:

```ts
import { pickNearestRoute, advanceFrame, BusMotionState, RoutePoint } from '../lib/busMotionEngine';

const routeA: RoutePoint[] = [{ lat: 19.0, lng: 99.0 }, { lat: 19.001, lng: 99.0 }];
const routeB: RoutePoint[] = [{ lat: 19.0, lng: 99.01 }, { lat: 19.001, lng: 99.01 }];

test('pickNearestRoute returns the closer route color', () => {
  const routes = new Map([['Green', routeA], ['Blue', routeB]]);
  expect(pickNearestRoute(19.0005, 99.0001, routes)).toBe('Green');
  expect(pickNearestRoute(19.0005, 99.0099, routes)).toBe('Blue');
});

test('pickNearestRoute returns null for an empty route map', () => {
  expect(pickNearestRoute(19.0, 99.0, new Map())).toBeNull();
});

test('advanceFrame freezes position inside an intersection radius', () => {
  const state: BusMotionState = {
    routeIdx: 0, routeT: 0, direction: 1, directionLock: 0,
    speedMs: 5, multiplier: 1, targetMultiplier: 1,
    lat: 19.0, lng: 99.0, bearing: 0,
  };
  const intersections = [{ lat: 19.0, lng: 99.0, name: 'test', radiusM: 50 }];
  const halted = advanceFrame(state, routeA, 1000, intersections);
  expect(halted.lat).toBe(state.lat);
  expect(halted.lng).toBe(state.lng);
});

test('advanceFrame moves normally when no intersections are passed', () => {
  const state: BusMotionState = {
    routeIdx: 0, routeT: 0, direction: 1, directionLock: 0,
    speedMs: 5, multiplier: 1, targetMultiplier: 1,
    lat: 19.0, lng: 99.0, bearing: 0,
  };
  const moved = advanceFrame(state, routeA, 1000, []);
  expect(moved.lat !== state.lat || moved.lng !== state.lng).toBe(true);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd upbus-mobile && npx jest pickNearestRoute`
Expected: FAIL — `pickNearestRoute` is not exported / does not exist, and `advanceFrame` does not accept a 4th argument.

- [ ] **Step 3: Add the `activeColor` field to `BusMotionState`**

In `upbus-mobile/lib/busMotionEngine.ts`, update the interface:

```ts
export interface BusMotionState {
  routeIdx:        number;    // segment index on route (0 … route.length-2)
  routeT:          number;    // 0–1 within segment
  direction:       1 | -1;   // +1 = forward along array, -1 = backward
  directionLock:   number;   // 0–5: consecutive polls confirming this direction; must drain before flip
  speedMs:         number;    // GPS speed in m/s
  multiplier:      number;    // current lerped multiplier (applied every frame)
  targetMultiplier: number;   // target set on GPS poll; multiplier lerps toward this
  lat:             number;    // current animated position
  lng:             number;
  bearing:         number;    // 0–360°, used by renderer for flip logic
  activeColor?:    string;    // Purple buses only: which line's route this bus is currently snapped to
}
```

- [ ] **Step 4: Add the type-only import**

At the top of `upbus-mobile/lib/busMotionEngine.ts`:

```ts
import type { IntersectionPoint } from './intersections';
```

- [ ] **Step 5: Add `pickNearestRoute`**

Add right after `snapToRoute`, identical to the web version:

```ts
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
  for (const [color, route] of routesByColor) {
    if (route.length < 2) continue;
    const snapped = snapToRoute(route, lat, lng);
    const dist = haversine(lat, lng, snapped.lat, snapped.lng);
    if (dist < bestDist) { bestDist = dist; bestColor = color; }
  }
  return bestColor;
}
```

- [ ] **Step 6: Add the intersection-hold check to `advanceFrame`**

Replace the existing `advanceFrame` function:

```ts
/** Call every animation frame (~16 ms). Returns new state with updated position. */
export function advanceFrame(
  state: BusMotionState,
  route: RoutePoint[],
  dtMs:  number,
): BusMotionState {
  if (route.length < 2) return state;

  const multiplier = state.multiplier + (state.targetMultiplier - state.multiplier) * 0.04;
  const effectiveDist = state.speedMs * multiplier * (dtMs / 1000);
  if (effectiveDist <= 0) return { ...state, multiplier };

  const next = advance(route, state.routeIdx, state.routeT, effectiveDist, state.direction);
  const bearing = bearingOfSegment(route, next.idx, state.direction);
  return { ...state, multiplier, routeIdx: next.idx, routeT: next.t, lat: next.lat, lng: next.lng, bearing };
}
```

with:

```ts
/** Call every animation frame (~16 ms). Returns new state with updated position. */
export function advanceFrame(
  state: BusMotionState,
  route: RoutePoint[],
  dtMs:  number,
  intersections?: IntersectionPoint[],
): BusMotionState {
  if (route.length < 2) return state;

  const multiplier = state.multiplier + (state.targetMultiplier - state.multiplier) * 0.04;

  // Purple buses only: freeze in place while inside a line-junction zone until
  // the next GPS poll (onGpsUpdate) re-evaluates which route to follow.
  const haltedAtIntersection = !!intersections && intersections.some(
    p => haversine(state.lat, state.lng, p.lat, p.lng) <= p.radiusM
  );
  if (haltedAtIntersection) return { ...state, multiplier };

  const effectiveDist = state.speedMs * multiplier * (dtMs / 1000);
  if (effectiveDist <= 0) return { ...state, multiplier };

  const next = advance(route, state.routeIdx, state.routeT, effectiveDist, state.direction);
  const bearing = bearingOfSegment(route, next.idx, state.direction);
  return { ...state, multiplier, routeIdx: next.idx, routeT: next.t, lat: next.lat, lng: next.lng, bearing };
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd upbus-mobile && npx jest pickNearestRoute`
Expected: `PASS` — 4 tests passing.

- [ ] **Step 8: Type-check**

Run: `cd upbus-mobile && npx tsc --noEmit`
Expected: Only the pre-existing `__tests__/stops.test.ts` errors — no new errors (the new test file uses plain `test`/`expect` from jest globals exactly like `stops.test.ts` already does, so it will show the same pre-existing type-noise, not new failures).

- [ ] **Step 9: Commit**

```bash
git add upbus-mobile/lib/busMotionEngine.ts upbus-mobile/__tests__/pickNearestRoute.test.ts
git commit -m "$(cat <<'EOF'
feat(mobile): add pickNearestRoute and intersection hold to motion engine

Mirrors the web engine change: BusMotionState gains activeColor,
advanceFrame freezes movement for one frame while inside a junction
zone. Colored buses are unaffected.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Web orchestration — wire Purple buses in `useBusMarkers.ts`

**Files:**
- Modify: `frontend/components/Map/useBusMarkers.ts`

**Interfaces:**
- Consumes: `pickNearestRoute`, `advanceFrame(..., intersections?)`, `BusMotionState.activeColor?` (Task 2); `ROUTE_INTERSECTIONS` (Task 1).

- [ ] **Step 1: Add the new imports**

At the top of `frontend/components/Map/useBusMarkers.ts`, change:

```ts
import {
  onGpsUpdate, advanceFrame,
  BusMotionState, RoutePoint,
} from '@/lib/busMotionEngine';
```

to:

```ts
import {
  onGpsUpdate, advanceFrame, pickNearestRoute,
  BusMotionState, RoutePoint,
} from '@/lib/busMotionEngine';
import { ROUTE_INTERSECTIONS } from '@/lib/intersections';
```

- [ ] **Step 2: Build the route map once per GPS-update pass, and pick a route for Purple buses**

In the `// ── GPS update (every 10 s poll)` effect, replace:

```ts
    buses.forEach(bus => {
      if (bus.latitude == null) return;

      const prev  = markersRef.current.get(bus.imei_id);
      const route = (routePathByColor[bus.color] ?? []) as RoutePoint[];
      const stops = (stopsByColor[bus.color]     ?? []) as RoutePoint[];

      const motion = onGpsUpdate(
        prev?.motion ?? null, route, stops,
        bus.latitude, bus.longitude!,
        bus.bearing ?? 0, bus.speed ?? 0,
        parseBusDateMs(bus.date ?? ''),
      );
```

with:

```ts
    const routesMapForPicking = new Map(Object.entries(routePathByColor)) as Map<string, RoutePoint[]>;

    buses.forEach(bus => {
      if (bus.latitude == null) return;

      const prev = markersRef.current.get(bus.imei_id);

      let route: RoutePoint[];
      let stops: RoutePoint[];
      let activeColor: string | undefined;

      if (bus.color === 'Purple') {
        // Not locked to one line — pick whichever route is physically closest
        // this poll, falling back to last poll's choice if none is closer.
        activeColor = pickNearestRoute(bus.latitude, bus.longitude!, routesMapForPicking)
          ?? prev?.motion.activeColor;
        route = activeColor ? ((routePathByColor[activeColor] ?? []) as RoutePoint[]) : [];
        stops = activeColor ? ((stopsByColor[activeColor]     ?? []) as RoutePoint[]) : [];
      } else {
        route = (routePathByColor[bus.color] ?? []) as RoutePoint[];
        stops = (stopsByColor[bus.color]     ?? []) as RoutePoint[];
      }

      // Switching which line a Purple bus follows changes the coordinate frame
      // (routeIdx/routeT are meaningless on a different polyline) — force a
      // fresh snap exactly like a brand-new bus would get.
      const routeChanged = bus.color === 'Purple' && prev?.motion.activeColor !== activeColor;

      const motion = {
        ...onGpsUpdate(
          routeChanged ? null : (prev?.motion ?? null), route, stops,
          bus.latitude, bus.longitude!,
          bus.bearing ?? 0, bus.speed ?? 0,
          parseBusDateMs(bus.date ?? ''),
        ),
        activeColor,
      };
```

- [ ] **Step 3: Use the resolved route color in the 60fps animation loop**

In the `// ── 60 fps animation loop` effect, replace:

```ts
      markersRef.current.forEach(state => {
        const route = (routeRef.current[state.color] ?? []) as RoutePoint[];
        if (route.length < 2) return; // Purple / no route → skip

        const next = advanceFrame(state.motion, route, dt);
        state.motion = next;
```

with:

```ts
      markersRef.current.forEach(state => {
        const routeColor = state.motion.activeColor ?? state.color;
        const route = (routeRef.current[routeColor] ?? []) as RoutePoint[];
        if (route.length < 2) return; // No route resolved yet → skip

        const intersections = state.color === 'Purple' ? ROUTE_INTERSECTIONS : undefined;
        const next = advanceFrame(state.motion, route, dt, intersections);
        state.motion = next;
```

- [ ] **Step 4: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: `TypeScript: No errors found`

- [ ] **Step 5: Manual verification**

There is no Purple-bus-specific automated test at the UI layer (this hook drives live Leaflet markers). Verify manually:

1. Run `cd frontend && npm run dev`.
2. Open the map page. If a currently-unassigned (Purple) bus is in the live fleet, watch it for at least one full GPS poll cycle (~10s): confirm it now animates smoothly between polls instead of jumping straight to each new GPS point.
3. If no Purple bus is currently active, confirm at minimum that colored buses are unaffected (same smooth motion as before this change) — this is the regression check that matters most since Purple buses depend on live fleet state outside our control.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/Map/useBusMarkers.ts
git commit -m "$(cat <<'EOF'
feat(web): dead-reckon Purple buses on their nearest route

Purple buses now pick whichever line's route is physically closest
each GPS poll and animate along it like colored buses, pausing at
shared junction points until the next poll confirms direction.
Display color is untouched — this is motion-only.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Mobile orchestration — wire Purple buses in `useAnimatedBuses.ts`

**Files:**
- Modify: `upbus-mobile/lib/useAnimatedBuses.ts`

**Interfaces:**
- Consumes: `pickNearestRoute`, `advanceFrame(..., intersections?)`, `BusMotionState.activeColor?` (Task 3); `ROUTE_INTERSECTIONS` (Task 1).

- [ ] **Step 1: Add the new imports**

At the top of `upbus-mobile/lib/useAnimatedBuses.ts`, change:

```ts
import { onGpsUpdate, advanceFrame, BusMotionState, RoutePoint } from './busMotionEngine';
```

to:

```ts
import { onGpsUpdate, advanceFrame, pickNearestRoute, BusMotionState, RoutePoint } from './busMotionEngine';
import { ROUTE_INTERSECTIONS } from './intersections';
```

- [ ] **Step 2: Pick a route for Purple buses in the GPS-update effect**

Replace:

```ts
    for (const bus of buses) {
      if (bus.latitude == null || bus.longitude == null) continue;
      activeIds.add(bus.imei_id);

      const route = routesRef.current.get(bus.color) ?? [];
      const stops = stopsRef.current.get(bus.color)  ?? [];
      const prev  = map.get(bus.imei_id) ?? null;

      const gpsTs = bus.date
        ? new Date(bus.date.replace(' ', 'T') + '+07:00').getTime()
        : Date.now();
      const motion = onGpsUpdate(
        prev, route, stops,
        bus.latitude, bus.longitude,
        bus.bearing ?? 0,
        bus.speed   ?? 0,
        gpsTs,
        bus.acc ?? 0,
      );

      map.set(bus.imei_id, { ...motion, color: bus.color, driver: bus.driver });
    }
```

with:

```ts
    for (const bus of buses) {
      if (bus.latitude == null || bus.longitude == null) continue;
      activeIds.add(bus.imei_id);

      const prev = map.get(bus.imei_id) ?? null;

      let route: RoutePoint[];
      let stops: RoutePoint[];
      let activeColor: string | undefined;

      if (bus.color === 'Purple') {
        // Not locked to one line — pick whichever route is physically closest
        // this poll, falling back to last poll's choice if none is closer.
        activeColor = pickNearestRoute(bus.latitude, bus.longitude, routesRef.current)
          ?? prev?.activeColor;
        route = activeColor ? (routesRef.current.get(activeColor) ?? []) : [];
        stops = activeColor ? (stopsRef.current.get(activeColor)  ?? []) : [];
      } else {
        route = routesRef.current.get(bus.color) ?? [];
        stops = stopsRef.current.get(bus.color)  ?? [];
      }

      // Switching which line a Purple bus follows changes the coordinate frame
      // (routeIdx/routeT are meaningless on a different polyline) — force a
      // fresh snap exactly like a brand-new bus would get.
      const routeChanged = bus.color === 'Purple' && prev?.activeColor !== activeColor;

      const gpsTs = bus.date
        ? new Date(bus.date.replace(' ', 'T') + '+07:00').getTime()
        : Date.now();
      const motion = onGpsUpdate(
        routeChanged ? null : prev,
        route, stops,
        bus.latitude, bus.longitude,
        bus.bearing ?? 0,
        bus.speed   ?? 0,
        gpsTs,
        bus.acc ?? 0,
      );

      map.set(bus.imei_id, { ...motion, activeColor, color: bus.color, driver: bus.driver });
    }
```

- [ ] **Step 3: Use the resolved route color in the 60fps animation loop**

Replace:

```ts
      for (const [id, state] of motionRef.current) {
        const route   = routesRef.current.get(state.color) ?? [];
        const updated = advanceFrame(state, route, dtMs);

        motionRef.current.set(id, { ...updated, color: state.color, driver: state.driver });
```

with:

```ts
      for (const [id, state] of motionRef.current) {
        const routeColor = state.activeColor ?? state.color;
        const route = routesRef.current.get(routeColor) ?? [];
        const intersections = state.color === 'Purple' ? ROUTE_INTERSECTIONS : undefined;
        const updated = advanceFrame(state, route, dtMs, intersections);

        motionRef.current.set(id, { ...updated, color: state.color, driver: state.driver });
```

(`updated` already carries `activeColor` forward — `advanceFrame` spreads `...state` internally — so no extra field needs adding here.)

- [ ] **Step 4: Type-check**

Run: `cd upbus-mobile && npx tsc --noEmit`
Expected: Only the pre-existing `__tests__/stops.test.ts` errors — no new errors.

- [ ] **Step 5: Run the full mobile test suite**

Run: `cd upbus-mobile && npx jest`
Expected: All suites pass (same pass count as Task 3 plus any pre-existing suites).

- [ ] **Step 6: Manual verification**

Run `cd upbus-mobile && npx expo start`, open in the iOS Simulator (or device), and:

1. If a Purple bus is currently in the live fleet, watch it for at least one GPS poll cycle: confirm smooth animation instead of jumps.
2. Confirm colored buses still animate exactly as before (regression check).

- [ ] **Step 7: Commit**

```bash
git add upbus-mobile/lib/useAnimatedBuses.ts
git commit -m "$(cat <<'EOF'
feat(mobile): dead-reckon Purple buses on their nearest route

Mirrors the web orchestration change: Purple buses pick whichever
line's route is physically closest each GPS poll and animate along it,
pausing at shared junction points until the next poll confirms
direction. Display color is untouched.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Post-implementation report (for the user)

After all 5 tasks are complete, summarize for the user:
- Every file created or modified (Tasks 1–5's file lists).
- That only `frontend/` and `upbus-mobile/` source files changed — no backend, no DB, no KML files.
- Which files need deploying: the backend doesn't need redeploying (no backend changes); the web frontend (`frontend/`) needs a rebuild/redeploy for users to get the change; the mobile app (`upbus-mobile/`) needs a new Expo build/OTA update for users to get the change.
