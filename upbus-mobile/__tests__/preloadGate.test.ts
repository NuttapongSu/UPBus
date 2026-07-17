import { runPreload } from '../lib/preloadGate';

test('runPreload resolves with data before timeout and reports slowLoad=false', async () => {
  const progressCalls: number[] = [];
  const result = await runPreload({
    loadRoutes: () => {},
    loadBuses: () => Promise.resolve(['bus1', 'bus2']),
    onProgress: (pct: 30 | 100) => progressCalls.push(pct),
    minDelayMs: 10,
    timeoutMs: 1000,
  });
  expect(result).toEqual({ buses: ['bus1', 'bus2'], slowLoad: false });
  expect(progressCalls).toEqual([30, 100]);
});

test('runPreload times out and reports slowLoad=true when loadBuses never resolves', async () => {
  const result = await runPreload({
    loadRoutes: () => {},
    loadBuses: () => new Promise(() => {}), // never resolves
    onProgress: () => {},
    minDelayMs: 5,
    timeoutMs: 15,
  });
  expect(result).toEqual({ buses: null, slowLoad: true });
});

test('runPreload always waits at least minDelayMs even if data loads instantly', async () => {
  const start = Date.now();
  await runPreload({
    loadRoutes: () => {},
    loadBuses: () => Promise.resolve([]),
    onProgress: () => {},
    minDelayMs: 50,
    timeoutMs: 1000,
  });
  expect(Date.now() - start).toBeGreaterThanOrEqual(45);
});

test('runPreload calls loadRoutes synchronously before the first progress update', () => {
  const order: string[] = [];
  runPreload({
    loadRoutes: () => order.push('routes'),
    loadBuses: () => Promise.resolve([]),
    onProgress: (pct: 30 | 100) => order.push(`progress:${pct}`),
    minDelayMs: 0,
    timeoutMs: 100,
  });
  expect(order[0]).toBe('routes');
  expect(order[1]).toBe('progress:30');
});
