# Purple Bus Dynamic Route Following — Design

## Problem

Purple buses (no driver currently assigned, `bus.color === 'Purple'`) are excluded from the
dead-reckoning motion engine entirely. In both `frontend/lib/busMotionEngine.ts` and
`upbus-mobile/lib/busMotionEngine.ts`, `onGpsUpdate` falls into its `route.length < 2` branch for
Purple buses because the per-color route map (`routeMap` / `routesRef`) is only ever built for
`['Green', 'Red', 'Blue']` — there is no `'Purple'` entry. The result: Purple buses snap straight to
raw GPS on every poll and never animate smoothly between polls, unlike colored buses.

Purple buses should get the same smooth dead-reckoning motion as colored buses. Since a Purple bus
isn't assigned to one line, it must pick whichever route polyline is physically closest to its GPS
position at each poll, and — because routes share a common central corridor — pause at known
line-junction points until the next GPS poll confirms which way it actually went, rather than
guessing through a fork.

This is purely a motion/animation change. Bus color/icon stays Purple; this does not reassign or
display a line color for the bus.

## Scope

In scope:
- Web (`frontend/`) and mobile (`upbus-mobile/`) motion engines and their orchestration layers
  (`frontend/components/Map/useBusMarkers.ts`, `upbus-mobile/lib/useAnimatedBuses.ts`).
- A new shared "intersection points" data file per platform.

Out of scope:
- Backend, DB schema, wrong-route detection (`backend/services/routeCheckpoints.js`).
- Any change to how `bus.color` is computed, displayed, or assigned to a driver.
- Handling Purple buses that are genuinely off all three routes (e.g. parked at a depot). They will
  snap to whichever route is nearest, same approximate behavior colored buses already have when GPS
  drifts off their line — not a new regression, just an accepted limitation.

## Design

### 1. Intersection points data

New file, kept in sync between platforms like the motion engine already is:
- `frontend/lib/intersections.ts`
- `upbus-mobile/lib/intersections.ts`

```ts
export interface IntersectionPoint { lat: number; lng: number; name: string; radiusM: number; }

export const ROUTE_INTERSECTIONS: IntersectionPoint[] = [
  { lat: 19.0300, lng: 99.8977, name: 'หอประชุมพญางำเมือง', radiusM: 25 },
  { lat: 19.0290, lng: 99.8961, name: 'อธิการบดี',           radiusM: 25 },
  { lat: 19.0296, lng: 99.8958, name: 'ศิลปศาสตร์',           radiusM: 25 },
  { lat: 19.0254, lng: 99.8951, name: 'PKY',                  radiusM: 25 },
  { lat: 19.0306, lng: 99.9012, name: 'วิศวกรรมศาสตร์(ขากลับ)', radiusM: 25 },
];
```

These five points were identified as stops shared by name across two or more lines' KML files
(confirmed against the actual KML data — see investigation in prior conversation), not by raw
polyline-proximity clustering (the three lines run along a shared central corridor for long
stretches, so proximity clustering alone produces noisy, unusable results).

`radiusM` is a starting value and may need tuning after observing real behavior.

### 2. Picking the nearest route

New exported function in both `busMotionEngine.ts` files:

```ts
export function pickNearestRoute(
  lat: number, lng: number,
  routesByColor: Map<string, RoutePoint[]>,
): string | null
```

For each candidate route, compute the minimum point-to-segment distance from `(lat, lng)` to the
polyline (reusing the same projection math already in `snapToRoute`). Return the color with the
smallest distance, or `null` if `routesByColor` is empty.

### 3. Orchestration changes

In `frontend/components/Map/useBusMarkers.ts` and `upbus-mobile/lib/useAnimatedBuses.ts`, the per-bus
GPS-update step currently does roughly:

```ts
const route = routesRef.current.get(bus.color) ?? [];
const stops = stopsRef.current.get(bus.color) ?? [];
```

For `bus.color === 'Purple'`, this changes to:

```ts
const chosenColor = pickNearestRoute(bus.latitude, bus.longitude, routesRef.current) ?? prevActiveColor;
const route = routesRef.current.get(chosenColor) ?? [];
const stops = stopsRef.current.get(chosenColor) ?? [];
```

`BusMotionState` gains one new optional field, `activeColor?: string`, written only for Purple buses.
If `chosenColor` differs from the previous poll's `activeColor`, `onGpsUpdate` is called with
`prev = null` instead of the carried-over state — `routeIdx`/`routeT` from one polyline are
meaningless on a different polyline, so switching routes must re-snap from scratch exactly like a
brand-new bus would.

Colored buses (Red/Green/Blue) are completely unaffected — they keep using `routesRef.current.get(bus.color)`
directly, unchanged.

### 4. Intersection hold in `advanceFrame`

`advanceFrame` gains an optional fourth parameter:

```ts
export function advanceFrame(
  state: BusMotionState,
  route: RoutePoint[],
  dtMs: number,
  intersections?: IntersectionPoint[],
): BusMotionState
```

Before computing `effectiveDist`, if `intersections` is non-empty, check the haversine distance from
`state.lat/state.lng` to each point. If within `radiusM` of any of them, treat `effectiveDist` as `0`
for this frame (position and bearing unchanged) instead of advancing along the route.

Callers pass `ROUTE_INTERSECTIONS` only for Purple buses; colored buses pass `undefined` (or omit the
argument), so their behavior is byte-for-byte identical to today.

The hold releases naturally: the next `onGpsUpdate` call (~10s poll cadence) recomputes
`targetMultiplier` and, if the route changed, fully re-snaps via the `prev = null` path above. No
separate timer or explicit "waiting" state is needed — the existing poll cycle is the wake-up signal.

## Data flow summary

```
GPS poll (Purple bus)
  → pickNearestRoute(gps, allRoutes) → chosenColor
  → chosenColor != prev.activeColor? → treat prev as null (fresh snap)
  → onGpsUpdate(prev, route[chosenColor], stops[chosenColor], gps...) → new motion state (tagged with activeColor)

Every animation frame (Purple bus)
  → advanceFrame(state, route[state.activeColor], dtMs, ROUTE_INTERSECTIONS)
  → if near an intersection point: freeze this frame
  → else: advance as normal
```

## Testing / verification

- Static: confirm `pickNearestRoute` picks the correct color for sample GPS points near each of the
  three routes (unit-test-style manual check, no existing test runner is set up for these files
  beyond the broken `upbus-mobile/__tests__/stops.test.ts` jest stub).
- Manual: run both web and mobile, find/simulate a Purple bus (or temporarily clear a driver
  assignment) crossing one of the five intersection points, confirm it pauses there and resumes
  after the next poll instead of visibly jumping or cutting through at an angle.
- `tsc --noEmit` clean on both `frontend/` and `upbus-mobile/` after implementation.
