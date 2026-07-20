# Cold-Start Position Hold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `confirmed` flag to the bus motion engine so a bus's first-ever GPS fix holds in place (raw position, no animation) until the next poll confirms it, instead of immediately snapping onto a route and potentially dead-reckoning from a meaningless placeholder position.

**Architecture:** `BusMotionState` gains a required `confirmed: boolean` field. `onGpsUpdate` returns `confirmed: false` (and raw, unsnapped lat/lng) the first time a bus is seen (`prev === null`); `advanceFrame` refuses to move a state with `confirmed: false`. The already-present `snapToRouteNear` windowed-snap mechanism (committed separately, not touched by this plan) gets one required fix: its guard must check `prev.confirmed`, not just `prev` truthiness, so a held/unconfirmed placeholder is never used as a snap anchor.

**Tech Stack:** TypeScript, shared dead-reckoning engine duplicated (intentionally, kept in sync) between `frontend/lib/busMotionEngine.ts` (web) and `upbus-mobile/lib/busMotionEngine.ts` (mobile, Jest-tested).

## Global Constraints

- The two `busMotionEngine.ts` files must stay algorithmically identical between web and mobile (existing project convention).
- Do not modify `snapToRouteNear`'s internals, `SNAP_WINDOW_M`, or the windowed-vs-global distance comparison logic — treated as already correct. The only required change to that surrounding code is the guard condition on its call site.
- No orchestration-layer changes (`frontend/components/Map/useBusMarkers.ts`, `upbus-mobile/lib/useAnimatedBuses.ts`) — both already pass `prev` through generically and read `lat`/`lng`/`bearing` off whatever the engine returns; a held state is just a `BusMotionState` that doesn't change frame to frame, which existing rendering code already handles.
- No backend/DB changes.
- Purple-bus route-switching (`activeColor` change forcing `prev = null` in the orchestration layer) automatically gets the same cold-start hold behavior as a true first-ever observation — this is an intended, automatic consequence of the engine-level fix, not a separate code path to build.

---

### Task 1: Mobile engine — `confirmed` flag, cold-start hold, windowed-snap guard fix

**Files:**
- Modify: `upbus-mobile/lib/busMotionEngine.ts`
- Test: `upbus-mobile/__tests__/pickNearestRoute.test.ts`

**Interfaces:**
- Produces: `BusMotionState.confirmed: boolean` (required field) — consumed by Task 2 (web mirror) and, automatically, by every existing caller of `onGpsUpdate`/`advanceFrame` (no signature changes to either function).

- [ ] **Step 1: Update the existing tests and add the new cold-start tests (single batch — see note below)**

Adding a required field to `BusMotionState` makes every existing object literal of that type a compile error until updated — there's no way to get a meaningful runtime "red" for a required-field type change without first fixing the now-broken literals. Make both edits in the same step: update the 2 existing `state` literals, and add the 3 new tests that exercise the cold-start behavior this task implements.

Replace the full contents of `upbus-mobile/__tests__/pickNearestRoute.test.ts` with:

```ts
import { pickNearestRoute, advanceFrame, onGpsUpdate, BusMotionState, RoutePoint } from '../lib/busMotionEngine';

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
    lat: 19.0, lng: 99.0, bearing: 0, confirmed: true,
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
    lat: 19.0, lng: 99.0, bearing: 0, confirmed: true,
  };
  const moved = advanceFrame(state, routeA, 1000, []);
  expect(moved.lat !== state.lat || moved.lng !== state.lng).toBe(true);
});

test('onGpsUpdate holds at raw GPS and marks unconfirmed on first-ever observation', () => {
  const result = onGpsUpdate(null, routeA, [], 19.0005, 99.0002, 45, 20, Date.now());
  expect(result.confirmed).toBe(false);
  expect(result.lat).toBe(19.0005);
  expect(result.lng).toBe(99.0002);
});

test('advanceFrame never moves an unconfirmed state, regardless of speed or elapsed time', () => {
  const state: BusMotionState = {
    routeIdx: 0, routeT: 0, direction: 1, directionLock: 0,
    speedMs: 20, multiplier: 1, targetMultiplier: 1,
    lat: 19.0005, lng: 99.0002, bearing: 0, confirmed: false,
  };
  const moved = advanceFrame(state, routeA, 5000);
  expect(moved.lat).toBe(state.lat);
  expect(moved.lng).toBe(state.lng);
});

test('the second onGpsUpdate call snaps onto the route and confirms, instead of reusing the placeholder position', () => {
  const firstCall = onGpsUpdate(null, routeA, [], 19.0005, 99.0002, 45, 20, Date.now());
  expect(firstCall.confirmed).toBe(false);

  const secondCall = onGpsUpdate(firstCall, routeA, [], 19.0006, 99.0003, 45, 20, Date.now());
  expect(secondCall.confirmed).toBe(true);
  expect(secondCall.lng).toBeCloseTo(99.0, 5); // snapped onto routeA's vertical segment at lng=99.0
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd upbus-mobile && npx jest pickNearestRoute`
Expected: FAIL — ts-jest compile errors, since `BusMotionState` does not yet declare `confirmed` (e.g. "Object literal may only specify known properties, and 'confirmed' does not exist in type 'BusMotionState'", and "Property 'confirmed' does not exist on type 'BusMotionState'" for the read-side assertions).

- [ ] **Step 3: Add the `confirmed` field to `BusMotionState`**

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
  confirmed:       boolean;   // false until a second poll confirms the first-ever GPS fix — see onGpsUpdate
}
```

- [ ] **Step 4: Add the cold-start branch and fix the windowed-snap guard in `onGpsUpdate`**

Replace:

```ts
  if (route.length < 2) {
    return {
      routeIdx: 0, routeT: 0,
      direction: prev?.direction ?? 1,
      directionLock: prev?.directionLock ?? 0,
      speedMs, multiplier: prev?.multiplier ?? 1, targetMultiplier: 1,
      lat: gpsLat, lng: gpsLng, bearing: gpsBearing,
    };
  }

  // Locality-biased snap: prefer the point near where the bus was last seen,
  // falling back to a global search only when that's a much worse fit (route
  // change, GPS glitch, or first-ever fix). See snapToRouteNear for why.
  const SNAP_WINDOW_M = 300;
  let gpsSnapped = snapToRoute(route, gpsLat, gpsLng);
  if (prev) {
    const windowed  = snapToRouteNear(route, gpsLat, gpsLng, prev.routeIdx, SNAP_WINDOW_M);
    const windowedD = haversine(gpsLat, gpsLng, windowed.lat, windowed.lng);
    const globalD   = haversine(gpsLat, gpsLng, gpsSnapped.lat, gpsSnapped.lng);
    if (windowedD <= globalD + 30) gpsSnapped = windowed;
  }
```

with:

```ts
  if (route.length < 2) {
    return {
      routeIdx: 0, routeT: 0,
      direction: prev?.direction ?? 1,
      directionLock: prev?.directionLock ?? 0,
      speedMs, multiplier: prev?.multiplier ?? 1, targetMultiplier: 1,
      lat: gpsLat, lng: gpsLng, bearing: gpsBearing,
      confirmed: false,
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
  }
```

- [ ] **Step 5: Add `confirmed: true` to `onGpsUpdate`'s final return statement**

Replace:

```ts
  // acc=0 (engine off) → use raw GPS coords (not snapped) so bus shows at actual parking/charging spot
  const usePrevPos = acc === 1 && prev != null;
  return {
    routeIdx:  usePrevPos ? animIdx     : gpsSnapped.idx,
    routeT:    usePrevPos ? animT       : gpsSnapped.t,
    direction,
    directionLock,
    speedMs,
    multiplier:       prev?.multiplier ?? targetMultiplier,
    targetMultiplier,
    lat:     usePrevPos ? prev!.lat     : gpsLat,
    lng:     usePrevPos ? prev!.lng     : gpsLng,
    bearing: usePrevPos ? prev!.bearing : gpsBearing,
  };
}
```

with:

```ts
  // acc=0 (engine off) → use raw GPS coords (not snapped) so bus shows at actual parking/charging spot
  const usePrevPos = acc === 1 && prev != null;
  return {
    routeIdx:  usePrevPos ? animIdx     : gpsSnapped.idx,
    routeT:    usePrevPos ? animT       : gpsSnapped.t,
    direction,
    directionLock,
    speedMs,
    multiplier:       prev?.multiplier ?? targetMultiplier,
    targetMultiplier,
    lat:     usePrevPos ? prev!.lat     : gpsLat,
    lng:     usePrevPos ? prev!.lng     : gpsLng,
    bearing: usePrevPos ? prev!.bearing : gpsBearing,
    confirmed: true,
  };
}
```

- [ ] **Step 6: Add the hold check to `advanceFrame`**

Replace:

```ts
export function advanceFrame(
  state: BusMotionState,
  route: RoutePoint[],
  dtMs:  number,
  intersections?: IntersectionPoint[],
): BusMotionState {
  if (route.length < 2) return state;

  const multiplier = state.multiplier + (state.targetMultiplier - state.multiplier) * 0.04;
```

with:

```ts
export function advanceFrame(
  state: BusMotionState,
  route: RoutePoint[],
  dtMs:  number,
  intersections?: IntersectionPoint[],
): BusMotionState {
  if (route.length < 2) return state;

  // First-ever fix hasn't been confirmed by a second poll yet — hold in
  // place rather than dead-reckoning from a placeholder route position.
  if (!state.confirmed) return state;

  const multiplier = state.multiplier + (state.targetMultiplier - state.multiplier) * 0.04;
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd upbus-mobile && npx jest pickNearestRoute`
Expected: `PASS` — 7 tests passing.

- [ ] **Step 8: Run the full mobile test suite and type-check**

Run: `cd upbus-mobile && npx jest`
Expected: all suites pass.

Run: `cd upbus-mobile && npx tsc --noEmit`
Expected: only the pre-existing `__tests__/stops.test.ts` jest-global errors (TS2304/TS2593) — no new errors.

- [ ] **Step 9: Commit**

```bash
git add upbus-mobile/lib/busMotionEngine.ts upbus-mobile/__tests__/pickNearestRoute.test.ts
git commit -m "$(cat <<'EOF'
feat(mobile): hold bus at raw GPS until a second poll confirms it

BusMotionState gains a required confirmed flag. A bus's first-ever
fix is held in place (no route snap, no animation) until the next
poll arrives, instead of immediately committing to a route position
that the windowed snap (snapToRouteNear) could otherwise anchor on
incorrectly. Fixes the windowed-snap guard to check prev.confirmed
instead of prev's mere existence, so a held placeholder is never used
as a snap anchor.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Web engine — mirror Task 1

**Files:**
- Modify: `frontend/lib/busMotionEngine.ts`

**Interfaces:**
- Produces: same `BusMotionState.confirmed: boolean` as Task 1, byte-for-byte identical engine logic (web's `onGpsUpdate` has no `acc` parameter — apply the equivalent edits at the corresponding lines).

- [ ] **Step 1: Add the `confirmed` field to `BusMotionState`**

In `frontend/lib/busMotionEngine.ts`, update the interface:

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
  confirmed:      boolean;   // false until a second poll confirms the first-ever GPS fix — see onGpsUpdate
}
```

- [ ] **Step 2: Add the cold-start branch and fix the windowed-snap guard in `onGpsUpdate`**

Replace:

```ts
  if (route.length < 2) {
    return {
      routeIdx: 0, routeT: 0,
      direction: prev?.direction ?? 1,
      directionLock: prev?.directionLock ?? 0,
      speedMs, multiplier: prev?.multiplier ?? 1, targetMultiplier: 1,
      lat: gpsLat, lng: gpsLng, bearing: gpsBearing,
    };
  }

  // Locality-biased snap: prefer the point near where the bus was last seen,
  // falling back to a global search only when that's a much worse fit (route
  // change, GPS glitch, or first-ever fix). See snapToRouteNear for why.
  const SNAP_WINDOW_M = 300;
  let gpsSnapped = snapToRoute(route, gpsLat, gpsLng);
  if (prev) {
    const windowed  = snapToRouteNear(route, gpsLat, gpsLng, prev.routeIdx, SNAP_WINDOW_M);
    const windowedD = haversine(gpsLat, gpsLng, windowed.lat, windowed.lng);
    const globalD   = haversine(gpsLat, gpsLng, gpsSnapped.lat, gpsSnapped.lng);
    if (windowedD <= globalD + 30) gpsSnapped = windowed;
  }
```

with:

```ts
  if (route.length < 2) {
    return {
      routeIdx: 0, routeT: 0,
      direction: prev?.direction ?? 1,
      directionLock: prev?.directionLock ?? 0,
      speedMs, multiplier: prev?.multiplier ?? 1, targetMultiplier: 1,
      lat: gpsLat, lng: gpsLng, bearing: gpsBearing,
      confirmed: false,
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
  }
```

- [ ] **Step 3: Add `confirmed: true` to `onGpsUpdate`'s final return statement**

Replace:

```ts
  return {
    routeIdx:  animIdx,
    routeT:    animT,
    direction,
    directionLock,
    speedMs,
    multiplier:       prev?.multiplier       ?? targetMultiplier,
    targetMultiplier,
    lat: prev?.lat ?? gpsNow.lat,
    lng: prev?.lng ?? gpsNow.lng,
    bearing: prev?.bearing ?? gpsBearing,
  };
}
```

with:

```ts
  return {
    routeIdx:  animIdx,
    routeT:    animT,
    direction,
    directionLock,
    speedMs,
    multiplier:       prev?.multiplier       ?? targetMultiplier,
    targetMultiplier,
    lat: prev?.lat ?? gpsNow.lat,
    lng: prev?.lng ?? gpsNow.lng,
    bearing: prev?.bearing ?? gpsBearing,
    confirmed: true,
  };
}
```

- [ ] **Step 4: Add the hold check to `advanceFrame`**

Replace:

```ts
export function advanceFrame(
  state: BusMotionState,
  route: RoutePoint[],
  dtMs:  number,
  intersections?: IntersectionPoint[],
): BusMotionState {
  if (route.length < 2) return state;

  // Lerp multiplier toward target each frame — this is what makes motion smooth
  const multiplier = state.multiplier + (state.targetMultiplier - state.multiplier) * 0.04;
```

with:

```ts
export function advanceFrame(
  state: BusMotionState,
  route: RoutePoint[],
  dtMs:  number,
  intersections?: IntersectionPoint[],
): BusMotionState {
  if (route.length < 2) return state;

  // First-ever fix hasn't been confirmed by a second poll yet — hold in
  // place rather than dead-reckoning from a placeholder route position.
  if (!state.confirmed) return state;

  // Lerp multiplier toward target each frame — this is what makes motion smooth
  const multiplier = state.multiplier + (state.targetMultiplier - state.multiplier) * 0.04;
```

- [ ] **Step 5: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: `TypeScript: No errors found`

- [ ] **Step 6: Verify with a throwaway compiled script**

There is no test runner configured in `frontend/`. Verify by compiling the file (its only import, `IntersectionPoint`, is type-only and erased) and exercising it with Node — this mirrors the verification approach already used for `pickNearestRoute` earlier in this branch's work:

```bash
cd frontend
npx tsc lib/busMotionEngine.ts --module commonjs --target es2020 --outDir /tmp/coldstart-check
node -e "
const { onGpsUpdate, advanceFrame } = require('/tmp/coldstart-check/busMotionEngine.js');

const routeA = [{lat:19.0,lng:99.0},{lat:19.001,lng:99.0}];

const first = onGpsUpdate(null, routeA, [], 19.0005, 99.0002, 45, 20, Date.now());
console.log('first call unconfirmed:', first.confirmed === false ? 'PASS' : 'FAIL');
console.log('first call raw lat/lng:', (first.lat === 19.0005 && first.lng === 99.0002) ? 'PASS' : 'FAIL');

const held = advanceFrame(first, routeA, 5000);
console.log('advanceFrame holds unconfirmed state:', (held.lat === first.lat && held.lng === first.lng) ? 'PASS' : 'FAIL');

const second = onGpsUpdate(first, routeA, [], 19.0006, 99.0003, 45, 20, Date.now());
console.log('second call confirmed:', second.confirmed === true ? 'PASS' : 'FAIL');
console.log('second call snapped onto route (lng~99.0):', Math.abs(second.lng - 99.0) < 1e-5 ? 'PASS' : 'FAIL');
"
rm -rf /tmp/coldstart-check
```

Expected: all five lines print `PASS`.

- [ ] **Step 7: Commit**

```bash
git add frontend/lib/busMotionEngine.ts
git commit -m "$(cat <<'EOF'
feat(web): hold bus at raw GPS until a second poll confirms it

Mirrors the mobile engine change: BusMotionState gains a required
confirmed flag, a bus's first-ever fix is held in place until the
next poll, and the windowed-snap guard now checks prev.confirmed
instead of prev's mere existence.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Post-implementation report (for the user)

After both tasks are complete, summarize for the user:
- Both files modified: `upbus-mobile/lib/busMotionEngine.ts`, `frontend/lib/busMotionEngine.ts`.
- That no orchestration files needed changes (per Global Constraints).
- No backend/DB changes — only `frontend/` and `upbus-mobile/` need redeploying for users to see the fix.
- Manual verification still recommended: reload both apps, confirm a bus visibly holds at its raw position for one poll cycle (~10s) before animating, and that no bus jumps to a depot/route-start position or across a parallel leg.
