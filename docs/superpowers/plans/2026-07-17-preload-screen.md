# Mobile Preload Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a branded preload screen (mascot + welcome message + progress bar) shown after font-load and before the map tab mounts, so the user never sees a blank map on cold launch.

**Architecture:** A pure, unit-tested orchestration function (`lib/preloadGate.ts`) races a bus-data fetch against a 10s timeout while enforcing a fixed 3s minimum display time. `app/_layout.tsx` renders `components/PreloadScreen.tsx` until that function resolves, then primes the SWR cache with whatever bus data it fetched (avoiding a duplicate request from the map screen) and mounts `(tabs)` as before. KML route/stop parsing — currently duplicated inline in `index.tsx` — is extracted to `lib/kmlParser.ts` so both the preload screen and the map screen call the same parser.

**Tech Stack:** Expo Router, React Native, `swr` v2 (global `mutate` for cache priming), `jest` + `ts-jest` (existing config, `__tests__/**/*.test.ts`, node environment — no RN rendering support, so only pure-logic modules get automated tests; RN components are verified manually per existing codebase convention).

## Global Constraints

- Minimum preload display time: exactly 3000ms, always, regardless of load speed.
- Data-load timeout: exactly 10000ms — after this, proceed into the app regardless of whether bus data arrived.
- Progress bar has exactly 2 discrete steps: 30% (routes parsed) → 100% (buses loaded or timed out).
- Mascot asset: `upbus-mobile/assets/images/nongcabon.png` (already added and committed).
- Speech bubble copy: "ยินดีต้อนรับสู่ UP SMART TRANSIT BY UP-CESM", tail pointing down toward the mascot's head.
- Progress bar and status text sit **below** the mascot image.
- Slow-load banner copy: "โหลดข้อมูลรถช้ากว่าปกติ กำลังลองใหม่..." — shown for ~4s, no retry button, no persistence across launches.
- SWR cache key used by both the priming call and the map screen's `useSWR` call must be the literal string `'/api/buses'`.
- No backend/API changes. No changes to `BusMarker.tsx` / `BusMarker.android.tsx`.

---

### Task 1: Extract KML parsing into `lib/kmlParser.ts`

**Files:**
- Create: `upbus-mobile/lib/kmlParser.ts`
- Create: `upbus-mobile/__tests__/kmlParser.test.ts`

**Interfaces:**
- Produces: `LatLng { latitude: number; longitude: number }`, `RoutePolyline { color: string; lineKey: string; coords: LatLng[] }`, `StopMarker { id: string; name: string; lat: number; lng: number; lineKey: string }`, `parseKmlCoordinates(kmlText: string): LatLng[][]`, `parseKmlStops(kmlText: string, lineKey: string): StopMarker[]`, `parseAllKml(): { polylines: RoutePolyline[]; stops: StopMarker[] }` — all exported from `lib/kmlParser.ts`.

- [ ] **Step 1: Write the failing test**

Create `upbus-mobile/__tests__/kmlParser.test.ts`:

```ts
import { parseKmlCoordinates, parseKmlStops, parseAllKml } from '../lib/kmlParser';

const SAMPLE_KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml>
<Document>
  <Placemark>
    <name>ป้ายทดสอบ</name>
    <Point><coordinates>99.9,19.0,0</coordinates></Point>
  </Placemark>
  <Placemark>
    <name>จุดชาร์จ</name>
    <Point><coordinates>99.91,19.01,0</coordinates></Point>
  </Placemark>
  <Placemark>
    <LineString>
      <coordinates>99.9,19.0,0 99.91,19.01,0 99.92,19.02,0</coordinates>
    </LineString>
  </Placemark>
</Document>
</kml>`;

test('parseKmlCoordinates extracts coordinate blocks with 2+ points', () => {
  const result = parseKmlCoordinates(SAMPLE_KML);
  expect(result).toHaveLength(1);
  expect(result[0]).toEqual([
    { latitude: 19.0, longitude: 99.9 },
    { latitude: 19.01, longitude: 99.91 },
    { latitude: 19.02, longitude: 99.92 },
  ]);
});

test('parseKmlStops extracts Point placemarks and excludes charge-keyword stops', () => {
  const result = parseKmlStops(SAMPLE_KML, 'Green');
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ name: 'ป้ายทดสอบ', lat: 19.0, lng: 99.9, lineKey: 'Green' });
});

test('parseAllKml returns polylines and stops from all three bundled route files', () => {
  const { polylines, stops } = parseAllKml();
  expect(polylines.length).toBeGreaterThan(0);
  expect(stops.length).toBeGreaterThan(0);
  const lineKeys = new Set(polylines.map(p => p.lineKey));
  expect(lineKeys).toEqual(new Set(['Green', 'Red', 'Blue']));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `upbus-mobile/`): `npx jest kmlParser`
Expected: FAIL — `Cannot find module '../lib/kmlParser'`

- [ ] **Step 3: Create `lib/kmlParser.ts`**

Move `parseKmlCoordinates`, `parseKmlStops`, the `LatLng`/`RoutePolyline`/`StopMarker` interfaces, `EXCLUDED_STOP_KEYWORDS`, and `KML_SOURCES` out of `app/(tabs)/index.tsx` verbatim (they are not modified, only relocated), and add `parseAllKml`:

```ts
import GREEN_KML from '../assets/kml/green';
import RED_KML from '../assets/kml/red';
import BLUE_KML from '../assets/kml/blue';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RoutePolyline {
  color: string;
  lineKey: string;
  coords: LatLng[];
}

export interface StopMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lineKey: string;
}

export function parseKmlCoordinates(kmlText: string): LatLng[][] {
  const results: LatLng[][] = [];
  // Match each <coordinates>…</coordinates> block
  const coordBlockRe = /<coordinates>([\s\S]*?)<\/coordinates>/g;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = coordBlockRe.exec(kmlText)) !== null) {
    const block = blockMatch[1].trim();
    if (!block) continue;
    // Each token is "lng,lat,alt"
    const coords: LatLng[] = [];
    const tokenRe = /(-?\d+\.?\d*),(-?\d+\.?\d*)(?:,-?\d+\.?\d*)?/g;
    let m: RegExpExecArray | null;
    while ((m = tokenRe.exec(block)) !== null) {
      const lng = parseFloat(m[1]);
      const lat = parseFloat(m[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        coords.push({ latitude: lat, longitude: lng });
      }
    }
    if (coords.length > 1) results.push(coords);
  }
  return results;
}

const EXCLUDED_STOP_KEYWORDS = ['ชาร์จ'];

export function parseKmlStops(kmlText: string, lineKey: string): StopMarker[] {
  const stops: StopMarker[] = [];
  const placemarkRe = /<Placemark[\s\S]*?<\/Placemark>/g;
  let pm: RegExpExecArray | null;
  while ((pm = placemarkRe.exec(kmlText)) !== null) {
    if (!/<Point>/.test(pm[0])) continue;
    const nameMatch = pm[0].match(/<name>([\s\S]*?)<\/name>/);
    const coordMatch = pm[0].match(/<coordinates>([\s\S]*?)<\/coordinates>/);
    if (!coordMatch) continue;
    const name = nameMatch ? nameMatch[1].trim() : '';
    if (EXCLUDED_STOP_KEYWORDS.some(kw => name.includes(kw))) continue;
    const parts = coordMatch[1].trim().split(',').map(Number);
    const lng = parts[0], lat = parts[1];
    if (isNaN(lat) || isNaN(lng)) continue;
    stops.push({ id: `${lineKey}-${lng}-${lat}`, name, lat, lng, lineKey });
  }
  return stops;
}

const KML_SOURCES: { kml: string; lineKey: string; color: string }[] = [
  { kml: GREEN_KML, lineKey: 'Green', color: '#2ecc71' },
  { kml: RED_KML,   lineKey: 'Red',   color: '#e74c3c' },
  { kml: BLUE_KML,  lineKey: 'Blue',  color: '#3498db' },
];

export function parseAllKml(): { polylines: RoutePolyline[]; stops: StopMarker[] } {
  const results = KML_SOURCES.map(src => {
    const segments = parseKmlCoordinates(src.kml);
    const kmlStops = parseKmlStops(src.kml, src.lineKey);
    return {
      polylines: segments.map((coords): RoutePolyline => ({ color: src.color, lineKey: src.lineKey, coords })),
      stops: kmlStops,
    };
  });
  return {
    polylines: results.flatMap(r => r.polylines),
    stops: results.flatMap(r => r.stops),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest kmlParser`
Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add upbus-mobile/lib/kmlParser.ts upbus-mobile/__tests__/kmlParser.test.ts
git commit -m "refactor: extract KML parsing into lib/kmlParser.ts"
```

---

### Task 2: Update `index.tsx` to consume `lib/kmlParser.ts`

**Files:**
- Modify: `upbus-mobile/app/(tabs)/index.tsx:1-142` (imports, types, parser functions, KML_SOURCES)
- Modify: `upbus-mobile/app/(tabs)/index.tsx:269-281` (KML-parse `useEffect`)

**Interfaces:**
- Consumes: `parseAllKml`, `LatLng`, `RoutePolyline`, `StopMarker` from `../../lib/kmlParser` (Task 1).

- [ ] **Step 1: Remove the now-duplicated imports, types, and functions**

In `app/(tabs)/index.tsx`:

Remove lines 8-10 (`import GREEN_KML ...` / `RED_KML` / `BLUE_KML`), replace with:

```ts
import { parseAllKml, LatLng, RoutePolyline, StopMarker } from '../../lib/kmlParser';
```

Remove lines 19-36 (the local `LatLng` / `RoutePolyline` / `StopMarker` interfaces — now imported instead).

Remove lines 38-62 (the `// ─── KML parser ───` comment and `parseKmlCoordinates` function — moved to `lib/kmlParser.ts`).

Remove lines 101-120 (`EXCLUDED_STOP_KEYWORDS` and `parseKmlStops` — moved to `lib/kmlParser.ts`).

Remove lines 131-135 (`const KML_SOURCES = [...]` — moved to `lib/kmlParser.ts`).

Leave `hav` and `stopArcLen` in place (still used locally for `stopsByRoute` sorting, not parsing).

- [ ] **Step 2: Replace the KML-parse `useEffect` body**

Find:

```ts
  // Parse all KML files once at startup — polylines and stops from bundled assets
  useEffect(() => {
    const results = KML_SOURCES.map(src => {
      const segments = parseKmlCoordinates(src.kml);
      const kmlStops = parseKmlStops(src.kml, src.lineKey);
      return {
        polylines: segments.map((coords): RoutePolyline => ({ color: src.color, lineKey: src.lineKey, coords })),
        stops: kmlStops,
      };
    });
    setPolylines(results.flatMap(r => r.polylines));
    setStops(results.flatMap(r => r.stops));
  }, []);
```

Replace with:

```ts
  // Parse all KML files once at startup — polylines and stops from bundled assets
  useEffect(() => {
    const { polylines, stops } = parseAllKml();
    setPolylines(polylines);
    setStops(stops);
  }, []);
```

- [ ] **Step 3: Verify the app still typechecks**

Run (from `upbus-mobile/`): `npx tsc --noEmit -p . 2>&1 | grep -v __tests__`
Expected: Same baseline as before this task (only the two pre-existing `__tests__` jest-type errors — this task must not introduce any new ones; `index.tsx` should report zero errors).

- [ ] **Step 4: Run the full test suite to confirm nothing else broke**

Run: `npx jest`
Expected: PASS — all existing suites plus `kmlParser.test.ts` from Task 1.

- [ ] **Step 5: Commit**

```bash
git add upbus-mobile/app/\(tabs\)/index.tsx
git commit -m "refactor: use lib/kmlParser.ts in map screen instead of inline parsing"
```

---

### Task 3: Create `lib/preloadGate.ts` — preload orchestration logic

**Files:**
- Create: `upbus-mobile/lib/preloadGate.ts`
- Create: `upbus-mobile/__tests__/preloadGate.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (fully generic/pure).
- Produces: `runPreload<T>(params: RunPreloadParams<T>): Promise<PreloadResult<T>>` where:
  ```ts
  interface RunPreloadParams<T> {
    loadRoutes: () => void;
    loadBuses: () => Promise<T>;
    onProgress: (pct: 30 | 100) => void;
    minDelayMs?: number;  // default 3000
    timeoutMs?: number;   // default 10000
  }
  interface PreloadResult<T> {
    buses: T | null;
    slowLoad: boolean;
  }
  ```
  Used by Task 5 (`PreloadScreen.tsx`).

- [ ] **Step 1: Write the failing tests**

Create `upbus-mobile/__tests__/preloadGate.test.ts`:

```ts
import { runPreload } from '../lib/preloadGate';

test('runPreload resolves with data before timeout and reports slowLoad=false', async () => {
  const progressCalls: number[] = [];
  const result = await runPreload({
    loadRoutes: () => {},
    loadBuses: () => Promise.resolve(['bus1', 'bus2']),
    onProgress: (pct) => progressCalls.push(pct),
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
    onProgress: (pct) => order.push(`progress:${pct}`),
    minDelayMs: 0,
    timeoutMs: 100,
  });
  expect(order[0]).toBe('routes');
  expect(order[1]).toBe('progress:30');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest preloadGate`
Expected: FAIL — `Cannot find module '../lib/preloadGate'`

- [ ] **Step 3: Create `lib/preloadGate.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest preloadGate`
Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add upbus-mobile/lib/preloadGate.ts upbus-mobile/__tests__/preloadGate.test.ts
git commit -m "feat: add runPreload orchestration (min-delay + timeout race)"
```

---

### Task 4: Create `lib/slowLoadContext.tsx`

**Files:**
- Create: `upbus-mobile/lib/slowLoadContext.tsx`

**Interfaces:**
- Produces: `SlowLoadContext: React.Context<boolean>` (default `false`) — consumed by Task 6 (`_layout.tsx`, as `.Provider`) and Task 7 (`index.tsx`, as `useContext`).

No test for this task: it is a single `createContext` call with no branching logic to verify — consistent with this codebase's convention of not unit-testing trivial config/wiring files.

- [ ] **Step 1: Create the file**

```tsx
import { createContext } from 'react';

export const SlowLoadContext = createContext<boolean>(false);
```

- [ ] **Step 2: Verify it typechecks**

Run (from `upbus-mobile/`): `npx tsc --noEmit -p . 2>&1 | grep -v __tests__`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add upbus-mobile/lib/slowLoadContext.tsx
git commit -m "feat: add SlowLoadContext for preload timeout notice"
```

---

### Task 5: Create `components/PreloadScreen.tsx`

**Files:**
- Create: `upbus-mobile/components/PreloadScreen.tsx`

**Interfaces:**
- Consumes: `runPreload` from `../lib/preloadGate` (Task 3), `parseAllKml` from `../lib/kmlParser` (Task 1), `getBuses` from `../lib/api` (existing), `mutate` from `swr` (existing dependency).
- Produces: `export default function PreloadScreen({ onReady }: { onReady: (result: { slowLoad: boolean }) => void }): JSX.Element` — consumed by Task 6.

No automated test: this project's jest config (`ts-jest`, `testEnvironment: node`) has no React Native rendering support (no `jest-expo`/RNTL setup), so component-level tests aren't feasible here — same as every other `.tsx` component in this codebase (`BusMarker.tsx`, `BusDetailSheet.tsx`, etc.). Verified manually in Task 8.

- [ ] **Step 1: Create the component**

```tsx
import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { mutate } from 'swr';
import { getBuses, BusData } from '../lib/api';
import { parseAllKml } from '../lib/kmlParser';
import { runPreload } from '../lib/preloadGate';

const MASCOT_IMAGE = require('../assets/images/nongcabon.png');

interface Props {
  onReady: (result: { slowLoad: boolean }) => void;
}

export default function PreloadScreen({ onReady }: Props) {
  const [statusText, setStatusText] = useState('กำลังโหลดเส้นทาง...');
  const barWidth = useRef(new Animated.Value(0)).current;
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    runPreload<BusData[]>({
      loadRoutes: () => { parseAllKml(); },
      loadBuses: () => getBuses(),
      onProgress: (pct) => {
        setStatusText(pct === 30 ? 'กำลังโหลดเส้นทาง...' : 'กำลังโหลดข้อมูลรถ...');
        Animated.timing(barWidth, {
          toValue: pct,
          duration: 300,
          useNativeDriver: false,
        }).start();
      },
    }).then(({ buses, slowLoad }) => {
      if (buses) mutate('/api/buses', buses, false);
      onReady({ slowLoad });
    });
  }, [barWidth, onReady]);

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>ยินดีต้อนรับสู่</Text>
        <Text style={styles.bubbleTextBold}>UP SMART TRANSIT</Text>
        <Text style={styles.bubbleText}>BY UP-CESM</Text>
        <View style={styles.bubbleTail} />
      </View>
      <Image source={MASCOT_IMAGE} style={styles.mascot} resizeMode="contain" />
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: barWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.statusText}>{statusText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a14',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  bubble: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 18,
    alignItems: 'center',
  },
  bubbleText: {
    color: '#1a1a2e',
    fontSize: 14,
  },
  bubbleTextBold: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: '900',
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -10,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ffffff',
  },
  mascot: {
    width: 180,
    height: 180,
    marginBottom: 24,
  },
  barTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1e1e3a',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 4,
  },
  statusText: {
    marginTop: 10,
    color: '#a78bfa',
    fontSize: 13,
  },
});
```

- [ ] **Step 2: Verify it typechecks**

Run (from `upbus-mobile/`): `npx tsc --noEmit -p . 2>&1 | grep -v __tests__`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add upbus-mobile/components/PreloadScreen.tsx
git commit -m "feat: add PreloadScreen component (mascot, welcome bubble, progress bar)"
```

---

### Task 6: Wire `app/_layout.tsx` to gate on `PreloadScreen`

**Files:**
- Modify: `upbus-mobile/app/_layout.tsx` (entire file — small, shown in full below)

**Interfaces:**
- Consumes: `PreloadScreen` (Task 5), `SlowLoadContext` (Task 4).
- Produces: wraps `<Stack>` in `<SlowLoadContext.Provider value={slowLoad}>` — consumed by Task 7.

- [ ] **Step 1: Replace the file contents**

Current `app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, TextInput } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Mitr_300Light, Mitr_400Regular, Mitr_500Medium, Mitr_600SemiBold, Mitr_700Bold } from '@expo-google-fonts/mitr';
import { registerForPushNotificationsAsync } from '../lib/notifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Mitr_300Light,
    Mitr_400Regular,
    Mitr_500Medium,
    Mitr_600SemiBold,
    Mitr_700Bold,
  });

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  // Apply Mitr as default font for all Text and TextInput globally
  const defaultStyle = { fontFamily: 'Mitr_400Regular' };
  (Text as any).defaultProps = (Text as any).defaultProps ?? {};
  (Text as any).defaultProps.style = defaultStyle;
  (TextInput as any).defaultProps = (TextInput as any).defaultProps ?? {};
  (TextInput as any).defaultProps.style = defaultStyle;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
```

Replace with:

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, TextInput } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Mitr_300Light, Mitr_400Regular, Mitr_500Medium, Mitr_600SemiBold, Mitr_700Bold } from '@expo-google-fonts/mitr';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import PreloadScreen from '../components/PreloadScreen';
import { SlowLoadContext } from '../lib/slowLoadContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Mitr_300Light,
    Mitr_400Regular,
    Mitr_500Medium,
    Mitr_600SemiBold,
    Mitr_700Bold,
  });
  const [appReady, setAppReady] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  // Apply Mitr as default font for all Text and TextInput globally
  const defaultStyle = { fontFamily: 'Mitr_400Regular' };
  (Text as any).defaultProps = (Text as any).defaultProps ?? {};
  (Text as any).defaultProps.style = defaultStyle;
  (TextInput as any).defaultProps = (TextInput as any).defaultProps ?? {};
  (TextInput as any).defaultProps.style = defaultStyle;

  if (!appReady) {
    return (
      <>
        <StatusBar style="light" />
        <PreloadScreen
          onReady={({ slowLoad }) => {
            setSlowLoad(slowLoad);
            setAppReady(true);
          }}
        />
      </>
    );
  }

  return (
    <SlowLoadContext.Provider value={slowLoad}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SlowLoadContext.Provider>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run (from `upbus-mobile/`): `npx tsc --noEmit -p . 2>&1 | grep -v __tests__`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add upbus-mobile/app/_layout.tsx
git commit -m "feat: gate app entry on PreloadScreen before mounting tabs"
```

---

### Task 7: Add slow-load banner to `index.tsx`

**Files:**
- Modify: `upbus-mobile/app/(tabs)/index.tsx:4` (React import)
- Modify: `upbus-mobile/app/(tabs)/index.tsx` (add import, hook, and JSX near the top of the returned tree)
- Modify: `upbus-mobile/app/(tabs)/index.tsx` (add 2 style entries to `StyleSheet.create`)

**Interfaces:**
- Consumes: `SlowLoadContext` from `../../lib/slowLoadContext` (Task 4).

- [ ] **Step 1: Add `useContext` to the React import**

Find:
```ts
import { useRef, useState, useEffect, useMemo } from 'react';
```
Replace with:
```ts
import { useRef, useState, useEffect, useMemo, useContext } from 'react';
```

- [ ] **Step 2: Import `SlowLoadContext`**

Add alongside the other local imports (after the `BusDetailSheet` import):
```ts
import { SlowLoadContext } from '../../lib/slowLoadContext';
```

- [ ] **Step 3: Read the context and manage the banner's visibility**

Inside `MapScreen`, near the other `useState` declarations at the top of the component, add:

```ts
  const slowLoad = useContext(SlowLoadContext);
  const [showSlowBanner, setShowSlowBanner] = useState(slowLoad);

  useEffect(() => {
    if (!slowLoad) return;
    const id = setTimeout(() => setShowSlowBanner(false), 4000);
    return () => clearTimeout(id);
  }, [slowLoad]);
```

- [ ] **Step 4: Render the banner**

Find (the start of the returned tree):
```tsx
  return (
    <View style={styles.container}>
      {/* ─── Header bar ─────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
```

Replace with:
```tsx
  return (
    <View style={styles.container}>
      {showSlowBanner && (
        <View style={[styles.slowBanner, { top: insets.top + 4 }]}>
          <Text style={styles.slowBannerText}>โหลดข้อมูลรถช้ากว่าปกติ กำลังลองใหม่...</Text>
        </View>
      )}
      {/* ─── Header bar ─────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
```

- [ ] **Step 5: Add the banner styles**

Find:
```ts
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
```
Replace with:
```ts
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slowBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(124,58,237,0.95)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  slowBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
```

- [ ] **Step 6: Verify it typechecks**

Run (from `upbus-mobile/`): `npx tsc --noEmit -p . 2>&1 | grep -v __tests__`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add upbus-mobile/app/\(tabs\)/index.tsx
git commit -m "feat: show slow-load banner on map screen when preload timed out"
```

---

### Task 8: Manual end-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full automated test suite**

Run (from `upbus-mobile/`): `npx jest`
Expected: PASS — all suites (existing `pickNearestRoute`, `stops`, plus new `kmlParser`, `preloadGate`).

- [ ] **Step 2: Run the full typecheck**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v __tests__`
Expected: no output (zero errors outside the pre-existing jest-typed test files).

- [ ] **Step 3: Launch the app in the iOS Simulator (fast-network path)**

Run: `npx expo start -c` then press `i`, or `npx expo run:ios` if a dev build is required.
Drive it: on cold launch, confirm — mascot + speech bubble ("ยินดีต้อนรับสู่ UP SMART TRANSIT BY UP-CESM") appear, progress bar animates 30% → 100%, screen stays visible for at least ~3 seconds even though `/api/buses` on a normal network responds in well under a second, then the map tab appears with routes and bus markers already populated (no blank-map flash).
Take a screenshot during the preload screen and one immediately after transition; look at both.

- [ ] **Step 4: Simulate the slow/timeout path**

Temporarily point `EXPO_PUBLIC_API_URL` (in `.env` or shell) at an unreachable host (e.g. `http://localhost:9`), relaunch the app.
Drive it: confirm the preload screen holds for ~10 seconds (not indefinitely), then the map tab appears with the slow-load banner ("โหลดข้อมูลรถช้ากว่าปกติ กำลังลองใหม่...") visible for ~4 seconds before disappearing on its own.
Restore `EXPO_PUBLIC_API_URL` to its real value afterward.

- [ ] **Step 5: Report findings**

If any step in Steps 3-4 doesn't match the expected behavior, stop and treat it as a bug against this plan (use `superpowers:systematic-debugging`) rather than adjusting the acceptance criteria.

---

### Task 9: Fix infinite render loop on the timeout/empty-buses path

**Context:** Manual verification (Task 8, Step 4) found that the slow-load timeout path — where `/api/buses` never resolves and `buses` stays `undefined` forever — crashes with `Maximum update depth exceeded`. Root cause: `app/(tabs)/index.tsx:105` destructures `const { data: buses = [] } = useSWR<BusData[]>(...)`. When `data` is `undefined`, the `= []` default expression evaluates to a **brand-new array literal on every render**. `lib/useAnimatedBuses.ts`'s `useEffect(..., [buses])` (around line 152) sees a new array reference every render, re-runs every render, calls `setActiveBusIds(new Set(activeIds))`, which triggers a re-render, which evaluates a new `[]` again — infinite loop. This is pre-existing behavior in `index.tsx`/`useAnimatedBuses.ts`, not introduced by this plan's other tasks, but the preload timeout path is the first scenario where `buses` can stay `undefined` indefinitely, which is what exposes it.

**Files:**
- Modify: `upbus-mobile/app/(tabs)/index.tsx` (the `useSWR` destructure, ~line 105)

**Interfaces:**
- No new exports. This only changes an internal default-value expression so its identity is stable across renders.

- [ ] **Step 1: Add a stable empty-array constant and use it as the default**

Find, near the top of the file (after the existing imports, before the component or alongside other module-level constants like `LINE_CONFIG`):

```ts
const EMPTY_BUSES: BusData[] = [];
```

Find:
```ts
  const { data: buses = [] } = useSWR<BusData[]>('/api/buses', getBuses, { refreshInterval: 10000 });
```

Replace with:
```ts
  const { data: buses = EMPTY_BUSES } = useSWR<BusData[]>('/api/buses', getBuses, { refreshInterval: 10000 });
```

This keeps the exact same fallback behavior (an empty array when there's no data yet) but now every render that falls back gets the *same* array reference, so `useEffect(..., [buses])` in `useAnimatedBuses.ts` only re-runs when `buses` actually changes (a real fetch resolving), not on every render.

- [ ] **Step 2: Verify it typechecks**

Run (from `upbus-mobile/`): `npx tsc --noEmit -p . 2>&1 | grep -v __tests__`
Expected: no new errors.

- [ ] **Step 3: Run the full test suite**

Run: `npx jest`
Expected: PASS — all suites, same count as before this change.

- [ ] **Step 4: Manually re-verify the timeout path**

Temporarily point `EXPO_PUBLIC_API_URL` at an unreachable host (e.g. `http://127.0.0.1:9`), restart Metro so the env change takes effect, cold-launch the app in the simulator.
Drive it: confirm the preload screen holds ~10s, transitions to the map with the slow-load banner, and — this is the regression check — confirm the red "Maximum update depth exceeded" error no longer appears (check the Metro log / in-app error overlay).
Restore `EXPO_PUBLIC_API_URL` to its real value afterward, and restart Metro again.

- [ ] **Step 5: Commit**

```bash
git add "upbus-mobile/app/(tabs)/index.tsx"
git commit -m "$(cat <<'EOF'
fix(mobile): stabilize empty-buses array reference to prevent infinite render loop

useSWR's `data: buses = []` default created a new array on every
render whenever data was undefined (e.g. the preload timeout path,
where /api/buses never resolves). useAnimatedBuses.ts's
useEffect(..., [buses]) saw a new reference each render and re-ran
every time, calling setActiveBusIds() in a loop until React aborted
with "Maximum update depth exceeded". A module-level EMPTY_BUSES
constant keeps the fallback reference stable across renders.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
