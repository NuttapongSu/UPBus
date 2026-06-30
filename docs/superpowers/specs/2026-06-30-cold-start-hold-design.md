# Cold-Start Position Hold — Design

## Problem

Two related bugs in the bus dead-reckoning engine (`frontend/lib/busMotionEngine.ts`,
`upbus-mobile/lib/busMotionEngine.ts`), both rooted in how a bus's first-ever position is
established:

1. **"Buses pile up at the depot" on app reload (mobile, now partially fixed).** A separate race
   condition (stale `routesRef` vs. live `routes` prop in `upbus-mobile/lib/useAnimatedBuses.ts`)
   was already found and fixed earlier today — but the deeper issue is that the *engine itself*
   has no concept of "this is the bus's first observation, don't assume anything about its
   position on the route yet." Today's fix patched the orchestration-layer symptom; this spec
   closes the gap at the engine level so the same class of bug can't recur via a different path.
2. **Animation snapping onto the wrong leg of a route** (e.g. a Green-line bus near PKY visually
   jumping onto the ขากลับ leg's geometry because it runs a few metres parallel to the ขาไป leg).
   This is **already fixed** by code present in the working tree as of this session — see
   "Existing mechanism" below. This spec does not change that mechanism; it documents it as
   context and adds the one piece it doesn't cover.

## Existing mechanism (already implemented, not part of this spec's changes)

Both engine files already contain `snapToRouteNear(route, lat, lng, nearIdx, windowM)` — a
variant of `snapToRoute` that walks at most `windowM` metres (along the path, not as-the-crow-flies)
in each direction from `nearIdx` before searching for the nearest point, instead of scanning the
whole route array. `onGpsUpdate` calls this when `prev` is available, using `prev.routeIdx` as the
anchor and `SNAP_WINDOW_M = 300`, then keeps the windowed result unless the unconstrained global
search is meaningfully closer (more than 30 m better) — a soft preference that prevents the
windowed search from ever being *worse* than today's behavior.

This already prevents the wrong-leg jump described in bug 2, because a parallel leg's matching
segment sits far away on the route *array* (hundreds of points), even though it's geographically
close — so it falls outside the arc-length window.

What it does **not** handle: the very first time a bus is seen (`prev === null`), there is no
`routeIdx` to anchor a window around, so `onGpsUpdate` snaps globally — a one-time risk, and
separately, nothing stops the engine from immediately treating that first fix as a confirmed
position on the route and dead-reckoning from it.

## What this spec adds: cold-start hold

**Requirement:** On reload or first app open (web and mobile identically), a bus should be placed
exactly at its latest known GPS coordinate and held there — not animated, not route-snapped — until
the *next* poll arrives and the engine has a second, independent fix to confirm against.

### `BusMotionState.confirmed: boolean`

- Branch ordering in `onGpsUpdate`: the existing `route.length < 2` check (Purple bus with no
  route loaded yet) stays first and unchanged — it already returns raw GPS unconditionally,
  regardless of `prev`, so `confirmed` doesn't apply there. The new cold-start check,
  `prev === null`, goes immediately after it, before the windowed/global snap logic.
- `prev === null` (true cold start, first time this bus is seen, and a real route exists): return
  raw `lat`/`lng` (no route snapping), `confirmed: false`. `routeIdx`/`routeT` are not meaningful
  in this state and must not be read by callers.
- `advanceFrame`: if `state.confirmed === false`, force `effectiveDist = 0` every frame,
  regardless of `speedMs`/`multiplier` — the marker stays exactly where the cold-start fix placed
  it.
- Next poll, when `prev.confirmed === false`: this is the first real snap. The cold-start branch
  must still set *some* numeric `routeIdx`/`routeT` (the interface requires it), so a literal
  `prev` object exists — but its `routeIdx` is a meaningless placeholder, not a real position on
  the route. The existing windowed-snap call site currently guards only on `if (prev)`, which
  would treat that placeholder as a real anchor and reintroduce exactly the depot-jump bug this
  spec exists to prevent. **This one condition must change to `if (prev?.confirmed)`** so the
  windowing is skipped and the existing global `snapToRoute` fallback runs instead, establishing
  real `routeIdx`/`routeT` for the first time. `confirmed` is then set to `true`. From this point
  on, the unmodified `snapToRouteNear` windowing takes over for every subsequent poll, anchored on
  this first real `routeIdx`.

### Interaction with existing mechanisms

- **Purple-bus route switching** (`activeColor` change forcing `prev = null`): this already
  re-enters the "no anchor" path and gets a global snap, exactly like a cold start. This spec's
  `confirmed` flag composes with that unchanged — a route switch is treated as a fresh
  reconfirmation (one frame of hold, then resumes), which is a strict improvement (the bus
  briefly holds instead of potentially animating through a wrong-leg snap on the new route)
  over today's immediate-resume behavior, and is in scope as a natural consequence of this change,
  not a new code path.
- **Intersection hold** (`advanceFrame`'s `intersections` param, Purple buses only): orthogonal —
  one freezes based on proximity to a junction point, the other freezes based on confirmation
  state. Both reduce to "freeze this frame," so they compose without conflict.
- **Lost lock / long gap:** not handled by a special case. If a poll arrives far outside the
  300 m window, the existing soft-preference logic already falls back to the global search
  (since the windowed result will be much worse than 30 m off) — this naturally self-corrects
  without needing the engine to detect "lock lost" as a distinct state.

## Scope

- Engine changes: `frontend/lib/busMotionEngine.ts`, `upbus-mobile/lib/busMotionEngine.ts` —
  add the `confirmed` field, the cold-start branch, and the `advanceFrame` hold check. Both files
  stay algorithmically identical, per existing project convention.
- No orchestration-layer changes required: `useBusMarkers.ts` and `useAnimatedBuses.ts` already
  pass `prev` straight through to `onGpsUpdate` and read `lat`/`lng`/`bearing` off whatever the
  engine returns — a held, unconfirmed state is just a `BusMotionState` whose position doesn't
  change frame to frame, which the existing rendering code already handles correctly without
  modification.
- No backend/DB changes.
- Does not touch `snapToRouteNear`'s internals, `SNAP_WINDOW_M`, or the windowed-vs-global
  distance comparison logic — that code is treated as already correct. The one required change
  to existing code is the windowed-snap call site's guard condition, `if (prev)` →
  `if (prev?.confirmed)`, in both engine files (see "Interaction with existing mechanisms" — this
  is not optional, the feature does not work without it).

## Testing

- Mobile: extend `upbus-mobile/__tests__/pickNearestRoute.test.ts` or add a new test file
  exercising `onGpsUpdate(null, ...)` returns `confirmed: false` with raw GPS lat/lng, and
  `advanceFrame` on an unconfirmed state never changes `lat`/`lng` regardless of `dtMs`/`speedMs`.
- Web: no test runner configured (pre-existing limitation) — verify via the same throwaway
  compiled-script approach used for `pickNearestRoute` earlier in this branch's work.
- Manual: reload the web map and the mobile app, confirm a bus visibly holds at its raw position
  for one poll cycle (~10 s) before starting to animate, and that no bus is ever seen jumping to
  a depot/start-of-route position.
