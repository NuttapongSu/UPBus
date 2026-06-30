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
  // routeA = [{lat:19.0,lng:99.0},{lat:19.001,lng:99.0}] — a single segment.
  // Projecting (19.0006, 99.0003) onto it should land at routeIdx 0, t≈0.6.
  expect(secondCall.routeIdx).toBe(0);
  expect(secondCall.routeT).toBeCloseTo(0.6, 1);
});
