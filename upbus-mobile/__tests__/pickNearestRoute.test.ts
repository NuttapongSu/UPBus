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
    lat: 19.0, lng: 99.0, bearing: 0, confirmed: true, msElapsedSinceGps: 0, stopsVisited: 0,
  };
  const intersections = [{ lat: 19.0, lng: 99.0, name: 'test', radiusM: 50 }];
  const halted = advanceFrame(state, routeA, 1000, [], intersections);
  expect(halted.lat).toBe(state.lat);
  expect(halted.lng).toBe(state.lng);
});

test('advanceFrame moves normally when no intersections are passed', () => {
  const state: BusMotionState = {
    routeIdx: 0, routeT: 0, direction: 1, directionLock: 0,
    speedMs: 5, multiplier: 1, targetMultiplier: 1,
    lat: 19.0, lng: 99.0, bearing: 0, confirmed: true, msElapsedSinceGps: 0, stopsVisited: 0,
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
    lat: 19.0005, lng: 99.0002, bearing: 0, confirmed: false, msElapsedSinceGps: 0, stopsVisited: 0,
  };
  const moved = advanceFrame(state, routeA, 5000, []);
  expect(moved.lat).toBe(state.lat);
  expect(moved.lng).toBe(state.lng);
});

test('the second onGpsUpdate call snaps onto the route and confirms, instead of reusing the placeholder position', () => {
  const firstCall = onGpsUpdate(null, routeA, [], 19.0005, 99.0002, 45, 20, Date.now());
  expect(firstCall.confirmed).toBe(false);

  const secondCall = onGpsUpdate(firstCall, routeA, [], 19.0006, 99.0003, 45, 20, Date.now());
  expect(secondCall.confirmed).toBe(true);
  // routeA = [{lat:19.0,lng:99.0},{lat:19.001,lng:99.0}] — a single segment.
  // Projecting (19.0006, 99.0003) onto it should land at routeIdx 0, t≈0.6.
  expect(secondCall.routeIdx).toBe(0);
  expect(secondCall.routeT).toBeCloseTo(0.6, 1);
});

test('animIdx/animT use the freshly snapped position, not a placeholder routeIdx, on first confirmation', () => {
  const longRoute: RoutePoint[] = [
    { lat: 19.0,   lng: 99.0 },
    { lat: 19.001, lng: 99.0 },
    { lat: 19.002, lng: 99.0 },
    { lat: 19.003, lng: 99.0 },
    { lat: 19.004, lng: 99.0 },
  ];
  // acc:1 (driving) on both calls — speedMs must be > 0 for this test to
  // actually exercise directedAheadM/targetMultiplier, the code path
  // animIdx/animT feeds into. Without acc:1, speedMs is always 0 and the
  // targetMultiplier branch short-circuits before animIdx/animT are ever
  // consumed, making the test pass regardless of whether the fix exists.

  // First call: cold start, far down the route (near the end, not index 0).
  const firstCall = onGpsUpdate(null, longRoute, [], 19.0035, 99.0, 0, 20, Date.now(), 1);
  expect(firstCall.confirmed).toBe(false);

  // Second call: confirms. If animIdx incorrectly used the placeholder
  // routeIdx:0 instead of the real snapped position near index 3, the
  // multiplier math computes a bogus "rawAhead" distance from the wrong
  // end of the route — on this route/GPS geometry that lands at ~0.36
  // (slow down), not the naive expectation of "speeds up toward 2.0".
  // Either direction away from 1.0 is the bug; only a tight band around
  // 1.0 (genuinely "on target") proves animIdx/animT used the real
  // snapped position instead of the placeholder. A loose bound like
  // `toBeLessThan(1.5)` would NOT catch this — 0.36 also satisfies it.
  const secondCall = onGpsUpdate(firstCall, longRoute, [], 19.0036, 99.0, 0, 20, Date.now(), 1);
  expect(secondCall.confirmed).toBe(true);
  expect(Math.abs(secondCall.targetMultiplier - 1.0)).toBeLessThan(0.1);
});
