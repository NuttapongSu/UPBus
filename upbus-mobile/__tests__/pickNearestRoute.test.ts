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
