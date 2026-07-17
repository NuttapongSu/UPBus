export interface RunPreloadParams<T> {
  loadRoutes: () => void;
  loadBuses: () => Promise<T>;
  onProgress: (pct: 30 | 100) => void;
  minDelayMs?: number;
  timeoutMs?: number;
}

export interface PreloadResult<T> {
  buses: T | null;
  slowLoad: boolean;
}

const TIMEOUT = Symbol('preload-timeout');

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runPreload<T>({
  loadRoutes,
  loadBuses,
  onProgress,
  minDelayMs = 3000,
  timeoutMs = 10000,
}: RunPreloadParams<T>): Promise<PreloadResult<T>> {
  loadRoutes();
  onProgress(30);

  const dataPromise = Promise.race<T | typeof TIMEOUT>([
    loadBuses(),
    delay(timeoutMs).then(() => TIMEOUT),
  ]);

  const [busesResult] = await Promise.all([dataPromise, delay(minDelayMs)]);

  onProgress(100);

  if (busesResult === TIMEOUT) {
    return { buses: null, slowLoad: true };
  }
  return { buses: busesResult as T, slowLoad: false };
}
