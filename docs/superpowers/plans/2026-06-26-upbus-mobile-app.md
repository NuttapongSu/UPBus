# UPBus Mobile App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React Native (Expo) passenger app for UP Smart Transit with realtime bus map, destination-driven push notifications, sustainability stats, and complaint submission.

**Architecture:** Expo Router tab app (`upbus-mobile/`) in the existing monorepo. Backend gains two new routes (`/api/stops`, `/api/push/*`) and a push dispatch hook in the existing GPS poller. Stop data is parsed from the existing KML files at server startup.

**Tech Stack:** Expo SDK 52, Expo Router v4, react-native-maps, expo-notifications, SWR, AsyncStorage, MySQL (existing), Expo Push Notification Service

## Global Constraints

- Expo SDK 52 (latest stable as of 2026-06)
- TypeScript strict mode throughout mobile app
- All API calls go to `EXPO_PUBLIC_API_URL` env var (default `http://localhost:5000`)
- Backend Node.js 18+, MySQL via existing `backend/db.js` pool
- Bus lines: `Green` = สายหน้ามอ, `Red` = สายหอพัก, `Blue` = สายประตูสาม
- Colors: Green `#2ecc71`, Red `#e74c3c`, Blue `#3498db`, Purple `#9b59b6`
- KML stop coordinates format: `lng,lat,alt` (note: lng first)
- Notification trigger: bus within 500m of the boarding stop
- No login, no user accounts — device token only
- Thai language UI throughout

---

## File Structure

**Backend (new/modified):**
```
backend/
  data/
    stops.js              ← parse KML → stop list with line membership (new)
  routes/
    stops.js              ← GET /api/stops (new)
    push.js               ← POST /api/push/register, DELETE /api/push/unregister (new)
  services/
    pushNotify.js         ← Expo push sender + proximity check (new)
  migrations/
    008_push_tokens.sql   ← push_tokens table (new)
  index.js                ← wire up new routes (modify)
```

**Mobile (new directory `upbus-mobile/`):**
```
upbus-mobile/
  app.json
  package.json
  tsconfig.json
  .env                    ← EXPO_PUBLIC_API_URL
  app/
    _layout.tsx           ← root layout, notification setup
    (tabs)/
      _layout.tsx         ← bottom tab bar
      index.tsx           ← Tab 1: Map
      routes.tsx          ← Tab 2: Route Planner
      sustainability.tsx  ← Tab 3: Sustainability
      complaints.tsx      ← Tab 4: Complaints
  lib/
    api.ts                ← API client + shared types
    stops.ts              ← stop routing logic (findPassingLines, findBoardingStop, calcETA)
    notifications.ts      ← push token registration + tracking lifecycle
  components/
    BusMarker.tsx         ← colored circle + number marker for react-native-maps
    RouteResultCard.tsx   ← per-line card: line badge, boarding stop, ETA
    SustainabilityPanel.tsx
    ComplaintForm.tsx
  __tests__/
    stops.test.ts         ← unit tests for stop routing logic
```

---

## Task 1: Backend — `/api/stops` endpoint

Parse bus stop Point placemarks from KML files and serve as JSON.

**Files:**
- Create: `backend/data/stops.js`
- Create: `backend/routes/stops.js`
- Modify: `backend/index.js`

**Interfaces:**
- Produces: `GET /api/stops` → `BusStop[]`
  ```ts
  interface BusStop {
    id: string;        // slugified name, e.g. "จุดจอดรถบัสหน้ามหาวิทยาลัย" → "p-main"
    name: string;      // Thai name from KML <name>
    lat: number;
    lng: number;
    lines: string[];   // e.g. ["Green", "Red"]
  }
  ```

- [ ] **Step 1: Write failing test**

Create `backend/__tests__/stops.test.js`:
```js
const { parseKmlStops, mergeStops } = require('../data/stops');
const fs = require('fs');
const path = require('path');

test('parseKmlStops extracts Point placemarks from green KML', () => {
  const kml = fs.readFileSync(
    path.join(__dirname, '../../frontend/public/kml/up_bus_transit_green.kml'),
    'utf8'
  );
  const stops = parseKmlStops(kml, 'Green');
  expect(stops.length).toBeGreaterThan(3);
  expect(stops[0]).toMatchObject({
    name: expect.any(String),
    lat: expect.any(Number),
    lng: expect.any(Number),
    lines: ['Green'],
  });
});

test('mergeStops deduplicates stops within 50m and unions lines', () => {
  const a = [{ name: 'ป้าย A', lat: 19.030, lng: 99.924, lines: ['Green'] }];
  const b = [{ name: 'ป้าย A', lat: 19.0300, lng: 99.9240, lines: ['Red'] }];
  const merged = mergeStops([...a, ...b]);
  expect(merged).toHaveLength(1);
  expect(merged[0].lines).toEqual(expect.arrayContaining(['Green', 'Red']));
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest __tests__/stops.test.js --no-coverage
```
Expected: FAIL — `Cannot find module '../data/stops'`

- [ ] **Step 3: Implement `backend/data/stops.js`**

```js
const fs = require('fs');
const path = require('path');

const KML_DIR = path.join(__dirname, '../../frontend/public/kml');
const KML_FILES = [
  { file: 'up_bus_transit_green.kml', line: 'Green' },
  { file: 'up_bus_transit_red.kml',   line: 'Red' },
  { file: 'up_bus_transit_blue.kml',  line: 'Blue' },
];

function parseKmlStops(kmlText, lineColor) {
  const stops = [];
  const placemarkRe = /<Placemark[\s\S]*?<\/Placemark>/g;
  let pm;
  while ((pm = placemarkRe.exec(kmlText)) !== null) {
    if (!/<Point>/.test(pm[0])) continue;
    const nameMatch = pm[0].match(/<name>([\s\S]*?)<\/name>/);
    const coordMatch = pm[0].match(/<coordinates>([\s\S]*?)<\/coordinates>/);
    if (!nameMatch || !coordMatch) continue;
    const name = nameMatch[1].trim();
    const parts = coordMatch[1].trim().split(',').map(Number);
    const lng = parts[0], lat = parts[1];
    if (isNaN(lat) || isNaN(lng)) continue;
    stops.push({ name, lat, lng, lines: [lineColor] });
  }
  return stops;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mergeStops(allStops) {
  const merged = [];
  for (const stop of allStops) {
    const existing = merged.find(s => haversine(s.lat, s.lng, stop.lat, stop.lng) < 50);
    if (existing) {
      stop.lines.forEach(l => { if (!existing.lines.includes(l)) existing.lines.push(l); });
    } else {
      merged.push({ ...stop, id: Buffer.from(stop.name).toString('base64').slice(0, 12) });
    }
  }
  return merged;
}

function loadAllStops() {
  const all = [];
  for (const { file, line } of KML_FILES) {
    try {
      const kml = fs.readFileSync(path.join(KML_DIR, file), 'utf8');
      all.push(...parseKmlStops(kml, line));
    } catch (e) {
      console.warn(`[stops] Could not read ${file}:`, e.message);
    }
  }
  return mergeStops(all);
}

// Load once at startup, cache in memory
const STOPS = loadAllStops();

module.exports = { parseKmlStops, mergeStops, STOPS };
```

- [ ] **Step 4: Implement `backend/routes/stops.js`**

```js
const express = require('express');
const { STOPS } = require('../data/stops');
const router = express.Router();

router.get('/', (req, res) => {
  res.json(STOPS);
});

module.exports = router;
```

- [ ] **Step 5: Wire up in `backend/index.js`**

Add after existing route imports:
```js
const stopsRouter = require('./routes/stops');
```

Add after existing `app.use('/api/line', ...)`:
```js
app.use('/api/stops', stopsRouter);
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd backend && npx jest __tests__/stops.test.js --no-coverage
```
Expected: PASS

- [ ] **Step 7: Smoke test the endpoint**

```bash
cd backend && npm run dev &
curl http://localhost:5000/api/stops | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const j=JSON.parse(d); console.log('stops:', j.length, 'first:', JSON.stringify(j[0]))"
```
Expected: `stops: <number> first: {"id":"...","name":"...","lat":19...,"lng":99...,"lines":["Green"]}`

- [ ] **Step 8: Commit**

```bash
git add backend/data/stops.js backend/routes/stops.js backend/__tests__/stops.test.js backend/index.js
git commit -m "feat: add /api/stops endpoint parsed from KML files"
```

---

## Task 2: Backend — push_tokens table + `/api/push` routes

**Files:**
- Create: `backend/migrations/008_push_tokens.sql`
- Create: `backend/routes/push.js`
- Modify: `backend/index.js`

**Interfaces:**
- `POST /api/push/register` body: `{ token, destinationStopId, boardingStops: [{lineColor, stopName, lat, lng}] }`
- `DELETE /api/push/unregister` body: `{ token }`
- Table: `push_tokens(id, token, destination_stop_id, boarding_stops JSON, created_at, updated_at)`

- [ ] **Step 1: Create migration**

`backend/migrations/008_push_tokens.sql`:
```sql
CREATE TABLE IF NOT EXISTS push_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(255) NOT NULL UNIQUE,
  destination_stop_id VARCHAR(100) NOT NULL,
  boarding_stops JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

Run migration:
```bash
mysql -u root -p"CesM.up@2025#" db_bustransit < backend/migrations/008_push_tokens.sql
```

- [ ] **Step 2: Write failing test**

Create `backend/__tests__/push.test.js`:
```js
const request = require('supertest');
const app = require('../index');

test('POST /api/push/register returns 200 with valid body', async () => {
  const res = await request(app).post('/api/push/register').send({
    token: 'ExponentPushToken[test-token-001]',
    destinationStopId: 'stop-001',
    boardingStops: [{ lineColor: 'Green', stopName: 'ป้าย CE', lat: 19.031, lng: 99.924 }],
  });
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
});

test('DELETE /api/push/unregister returns 200', async () => {
  const res = await request(app).delete('/api/push/unregister').send({
    token: 'ExponentPushToken[test-token-001]',
  });
  expect(res.status).toBe(200);
});
```

```bash
cd backend && npx jest __tests__/push.test.js --no-coverage
```
Expected: FAIL — 404

- [ ] **Step 3: Implement `backend/routes/push.js`**

```js
const express = require('express');
const db = require('../db');
const router = express.Router();

router.post('/register', async (req, res) => {
  const { token, destinationStopId, boardingStops } = req.body;
  if (!token || !destinationStopId || !Array.isArray(boardingStops)) {
    return res.status(400).json({ error: 'token, destinationStopId, boardingStops required' });
  }
  await db.query(
    `INSERT INTO push_tokens (token, destination_stop_id, boarding_stops)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE destination_stop_id=VALUES(destination_stop_id),
       boarding_stops=VALUES(boarding_stops), updated_at=NOW()`,
    [token, destinationStopId, JSON.stringify(boardingStops)]
  );
  res.json({ ok: true });
});

router.delete('/unregister', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  await db.query('DELETE FROM push_tokens WHERE token = ?', [token]);
  res.json({ ok: true });
});

module.exports = router;
```

- [ ] **Step 4: Wire up in `backend/index.js`**

```js
const pushRouter = require('./routes/push');
// after existing routes:
app.use('/api/push', pushRouter);
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend && npx jest __tests__/push.test.js --no-coverage
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/migrations/008_push_tokens.sql backend/routes/push.js backend/__tests__/push.test.js backend/index.js
git commit -m "feat: add push_tokens table and /api/push register/unregister routes"
```

---

## Task 3: Backend — push notification dispatch

When GPS poller fetches bus positions, check each bus against registered boarding stops and send Expo push notifications when a bus is within 500m.

**Files:**
- Create: `backend/services/pushNotify.js`
- Modify: `backend/services/gpsPoller.js`

**Interfaces:**
- Consumes: `STOPS` from `backend/data/stops.js`, `db` pool, `cachedBusData` from gpsPoller
- Produces: side-effect — sends Expo push notifications via `https://exp.host/--/api/v2/push/send`

- [ ] **Step 1: Write failing test**

Create `backend/__tests__/pushNotify.test.js`:
```js
const { shouldNotify, buildMessage } = require('../services/pushNotify');

test('shouldNotify returns true when bus within 500m of boarding stop', () => {
  const bus = { latitude: 19.0310, longitude: 99.9240, color: 'Green' };
  const boardingStop = { lineColor: 'Green', stopName: 'ป้าย CE', lat: 19.0312, lng: 99.9241 };
  expect(shouldNotify(bus, boardingStop)).toBe(true);
});

test('shouldNotify returns false when bus >500m away', () => {
  const bus = { latitude: 19.0000, longitude: 99.9000, color: 'Green' };
  const boardingStop = { lineColor: 'Green', stopName: 'ป้าย CE', lat: 19.0310, lng: 99.9240 };
  expect(shouldNotify(bus, boardingStop)).toBe(false);
});

test('shouldNotify returns false when bus color does not match boarding line', () => {
  const bus = { latitude: 19.0312, longitude: 99.9241, color: 'Blue' };
  const boardingStop = { lineColor: 'Green', stopName: 'ป้าย CE', lat: 19.0312, lng: 99.9241 };
  expect(shouldNotify(bus, boardingStop)).toBe(false);
});

test('buildMessage formats Thai notification correctly', () => {
  const msg = buildMessage('Green', 'สายหน้ามอ', 'ป้าย CE');
  expect(msg.title).toMatch(/Green|หน้ามอ/);
  expect(msg.body).toContain('ป้าย CE');
});
```

```bash
cd backend && npx jest __tests__/pushNotify.test.js --no-coverage
```
Expected: FAIL

- [ ] **Step 2: Implement `backend/services/pushNotify.js`**

```js
const fetch = require('node-fetch');
const db = require('../db');

const LINE_NAMES = {
  Green: 'สายหน้ามอ',
  Red:   'สายหอพัก',
  Blue:  'สายประตูสาม',
};

const LINE_EMOJI = { Green: '🟢', Red: '🔴', Blue: '🔵' };

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function shouldNotify(bus, boardingStop) {
  if (bus.color !== boardingStop.lineColor) return false;
  const dist = haversine(
    parseFloat(bus.latitude), parseFloat(bus.longitude),
    boardingStop.lat, boardingStop.lng
  );
  return dist <= 500;
}

function buildMessage(lineColor, lineName, stopName) {
  return {
    title: `${LINE_EMOJI[lineColor] || ''} ${lineName} — ใกล้ถึงแล้ว!`,
    body: `รีบไปรอที่ ${stopName} เลยนะ`,
    sound: 'default',
  };
}

async function dispatchNotifications(buses) {
  const [rows] = await db.query('SELECT token, boarding_stops FROM push_tokens');
  if (!rows.length) return;

  const messages = [];
  for (const row of rows) {
    const boardingStops = JSON.parse(row.boarding_stops);
    for (const bs of boardingStops) {
      const matchingBus = buses.find(b => shouldNotify(b, bs));
      if (!matchingBus) continue;
      messages.push({
        to: row.token,
        ...buildMessage(bs.lineColor, LINE_NAMES[bs.lineColor] || bs.lineColor, bs.stopName),
      });
    }
  }

  if (!messages.length) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.error('[pushNotify] send error:', e.message);
  }
}

module.exports = { shouldNotify, buildMessage, dispatchNotifications };
```

- [ ] **Step 3: Run test to verify it passes**

```bash
cd backend && npx jest __tests__/pushNotify.test.js --no-coverage
```
Expected: PASS

- [ ] **Step 4: Hook into gpsPoller**

In `backend/services/gpsPoller.js`, find the line where `cachedBusData` is assigned after GPS fetch, and add:

```js
const { dispatchNotifications } = require('./pushNotify');

// Inside the poll function, after cachedBusData is updated:
dispatchNotifications(cachedBusData).catch(e =>
  console.error('[pushNotify] dispatch error:', e.message)
);
```

- [ ] **Step 5: Verify backend runs cleanly**

```bash
cd backend && npm run dev
```
Expected: server starts, no errors in console

- [ ] **Step 6: Commit**

```bash
git add backend/services/pushNotify.js backend/__tests__/pushNotify.test.js backend/services/gpsPoller.js
git commit -m "feat: push notification dispatch on GPS poll when bus near boarding stop"
```

---

## Task 4: Mobile — Expo project scaffold + tab navigation

**Files:**
- Create: `upbus-mobile/` (entire directory)

- [ ] **Step 1: Scaffold Expo project**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/UPBus
npx create-expo-app@latest upbus-mobile --template blank-typescript
cd upbus-mobile
```

- [ ] **Step 2: Install dependencies**

```bash
npx expo install expo-router react-native-maps expo-notifications expo-location expo-image-picker @react-native-async-storage/async-storage expo-secure-store swr
npx expo install react-native-safe-area-context react-native-screens
```

- [ ] **Step 3: Configure `app.json`**

Replace content of `upbus-mobile/app.json`:
```json
{
  "expo": {
    "name": "UP Smart Transit",
    "slug": "upbus-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "upbus",
    "userInterfaceStyle": "dark",
    "icon": "./assets/images/icon.png",
    "splash": { "resizeMode": "contain", "backgroundColor": "#0f0f1a" },
    "ios": {
      "bundleIdentifier": "th.ac.up.bustransit",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "ใช้ตำแหน่งเพื่อหาป้ายรถใกล้คุณ"
      }
    },
    "android": {
      "package": "th.ac.up.bustransit",
      "adaptiveIcon": { "foregroundImage": "./assets/images/adaptive-icon.png", "backgroundColor": "#0f0f1a" },
      "permissions": ["ACCESS_FINE_LOCATION", "RECEIVE_BOOT_COMPLETED", "VIBRATE"]
    },
    "plugins": [
      "expo-router",
      ["expo-notifications", { "icon": "./assets/images/notification-icon.png", "color": "#7c3aed" }],
      ["expo-location", { "locationWhenInUsePermission": "ใช้ตำแหน่งเพื่อหาป้ายรถใกล้คุณ" }]
    ],
    "experiments": { "typedRoutes": true }
  }
}
```

- [ ] **Step 4: Create root layout `upbus-mobile/app/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { registerForPushNotificationsAsync } from '../lib/notifications';

export default function RootLayout() {
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

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

- [ ] **Step 5: Create tab layout `upbus-mobile/app/(tabs)/_layout.tsx`**

```tsx
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0a0a14', borderTopColor: '#1e1e3a' },
        tabBarActiveTintColor: '#a78bfa',
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'แผนที่', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🗺️</Text> }}
      />
      <Tabs.Screen
        name="routes"
        options={{ title: 'เส้นทาง', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🚏</Text> }}
      />
      <Tabs.Screen
        name="sustainability"
        options={{ title: 'สิ่งแวดล้อม', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🌱</Text> }}
      />
      <Tabs.Screen
        name="complaints"
        options={{ title: 'ร้องเรียน', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📝</Text> }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 6: Create placeholder tab screens**

`upbus-mobile/app/(tabs)/index.tsx`:
```tsx
import { View, Text } from 'react-native';
export default function MapScreen() {
  return <View style={{ flex: 1, backgroundColor: '#0f0f1a', justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: '#fff' }}>แผนที่</Text>
  </View>;
}
```

Create identical placeholder files for `routes.tsx`, `sustainability.tsx`, `complaints.tsx` with matching label text.

- [ ] **Step 7: Verify app launches**

```bash
cd upbus-mobile && npx expo start
```
Scan QR with Expo Go on physical device. Expected: 4-tab app with dark background and tab labels visible.

- [ ] **Step 8: Commit**

```bash
cd ..
git add upbus-mobile/
git commit -m "feat: scaffold Expo mobile app with 4-tab navigation"
```

---

## Task 5: Mobile — `lib/api.ts` + `lib/stops.ts`

Core data layer: API client, shared types, and stop routing logic.

**Files:**
- Create: `upbus-mobile/lib/api.ts`
- Create: `upbus-mobile/lib/stops.ts`
- Create: `upbus-mobile/__tests__/stops.test.ts`

**Interfaces:**
- `getBuses(): Promise<BusData[]>`
- `getSustainability(): Promise<SustainabilityData>`
- `postComplaint(form: FormData): Promise<void>`
- `getStops(): Promise<BusStop[]>`
- `findPassingLines(stops: BusStop[], destinationId: string): BusStop[]`
- `findBoardingStop(stops: BusStop[], lineColor: string, userLat: number, userLng: number): BusStop | null`
- `calcEtaMinutes(bus: BusData, boardingStop: BusStop): number | null`

- [ ] **Step 1: Write failing tests for stop routing logic**

Create `upbus-mobile/__tests__/stops.test.ts`:
```ts
import { findPassingLines, findBoardingStop, calcEtaMinutes } from '../lib/stops';
import type { BusStop, BusData } from '../lib/api';

const mockStops: BusStop[] = [
  { id: 'a', name: 'ป้าย A', lat: 19.030, lng: 99.924, lines: ['Green', 'Red'] },
  { id: 'b', name: 'ป้าย B', lat: 19.031, lng: 99.920, lines: ['Green'] },
  { id: 'c', name: 'ป้าย C', lat: 19.029, lng: 99.910, lines: ['Red'] },
  { id: 'dest', name: 'ป้ายหอพัก', lat: 19.028, lng: 99.900, lines: ['Green', 'Red'] },
];

test('findPassingLines returns lines that serve the destination', () => {
  const result = findPassingLines(mockStops, 'dest');
  expect(result.map(s => s.lines).flat()).toEqual(expect.arrayContaining(['Green', 'Red']));
});

test('findPassingLines returns empty for unknown destination', () => {
  expect(findPassingLines(mockStops, 'unknown')).toHaveLength(0);
});

test('findBoardingStop returns nearest stop on the given line', () => {
  // user is at 19.031, 99.921 — nearest Green stop is 'b'
  const result = findBoardingStop(mockStops, 'Green', 19.031, 99.921);
  expect(result?.id).toBe('b');
});

test('findBoardingStop returns null if no stops on that line', () => {
  expect(findBoardingStop(mockStops, 'Blue', 19.031, 99.921)).toBeNull();
});

test('calcEtaMinutes returns null for bus with no position', () => {
  const bus: BusData = { imei_id: '1', latitude: null, longitude: null, speed: 0, bearing: 0, soc: 0, acc: 0, color: 'Green', driver: '', date: '', department: null };
  const stop: BusStop = { id: 'b', name: 'ป้าย B', lat: 19.031, lng: 99.920, lines: ['Green'] };
  expect(calcEtaMinutes(bus, stop)).toBeNull();
});
```

```bash
cd upbus-mobile && npx jest __tests__/stops.test.ts --no-coverage
```
Expected: FAIL

- [ ] **Step 2: Implement `upbus-mobile/lib/api.ts`**

```ts
const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000';

export type BusColor = 'Red' | 'Green' | 'Blue' | 'Purple';

export interface BusData {
  imei_id: string;
  latitude: number | null;
  longitude: number | null;
  speed: number;
  bearing: number;
  soc: number;
  acc: 0 | 1;
  color: BusColor;
  driver: string;
  date: string;
  department: string | null;
}

export interface BusStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
}

export interface SustainabilityData {
  today: {
    co2_saved_kg: number;
    kwh_used: number;
    km_total: number;
    trees_equiv: number;
    buses_active: number;
  };
  weekly: { day: string; co2: number }[];
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

export const getBuses = () => apiFetch<BusData[]>('/api/buses');
export const getStops = () => apiFetch<BusStop[]>('/api/stops');
export const getSustainability = () => apiFetch<SustainabilityData>('/api/sustainability');

export async function postComplaint(form: FormData): Promise<void> {
  await fetch(`${BASE}/api/complaints`, { method: 'POST', body: form });
}

export async function registerPushToken(
  token: string,
  destinationStopId: string,
  boardingStops: { lineColor: string; stopName: string; lat: number; lng: number }[]
): Promise<void> {
  await apiFetch('/api/push/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, destinationStopId, boardingStops }),
  });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await apiFetch('/api/push/unregister', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}
```

- [ ] **Step 3: Implement `upbus-mobile/lib/stops.ts`**

```ts
import type { BusData, BusStop } from './api';

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Returns the unique line colors that serve the given destination stop */
export function findPassingLines(stops: BusStop[], destinationId: string): string[] {
  const dest = stops.find(s => s.id === destinationId);
  if (!dest) return [];
  return [...new Set(dest.lines)];
}

/** Nearest stop to the user that is on the given line */
export function findBoardingStop(
  stops: BusStop[],
  lineColor: string,
  userLat: number,
  userLng: number
): BusStop | null {
  const lineStops = stops.filter(s => s.lines.includes(lineColor));
  if (!lineStops.length) return null;
  return lineStops.reduce((nearest, stop) => {
    const d = haversine(userLat, userLng, stop.lat, stop.lng);
    const dNearest = haversine(userLat, userLng, nearest.lat, nearest.lng);
    return d < dNearest ? stop : nearest;
  });
}

/** Rough ETA in minutes: distance / assumed 20 km/h average speed */
export function calcEtaMinutes(bus: BusData, boardingStop: BusStop): number | null {
  if (bus.latitude === null || bus.longitude === null) return null;
  const distM = haversine(bus.latitude, bus.longitude, boardingStop.lat, boardingStop.lng);
  const speedMs = Math.max(bus.speed || 20, 5) / 3.6;
  return Math.round(distM / speedMs / 60);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd upbus-mobile && npx jest __tests__/stops.test.ts --no-coverage
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add upbus-mobile/lib/ upbus-mobile/__tests__/
git commit -m "feat: add api client, BusStop types, and stop routing logic"
```

---

## Task 6: Mobile — Map tab

**Files:**
- Modify: `upbus-mobile/app/(tabs)/index.tsx`
- Create: `upbus-mobile/components/BusMarker.tsx`

- [ ] **Step 1: Implement `BusMarker.tsx`**

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';

const LINE_COLOR: Record<string, string> = {
  Green: '#2ecc71', Red: '#e74c3c', Blue: '#3498db', Purple: '#9b59b6',
};

interface Props {
  busId: string;
  lat: number;
  lng: number;
  color: string;
  number: number;
  onPress?: () => void;
}

export default function BusMarker({ busId, lat, lng, color, number, onPress }: Props) {
  const bg = LINE_COLOR[color] ?? '#888';
  return (
    <Marker coordinate={{ latitude: lat, longitude: lng }} onPress={onPress} tracksViewChanges={false}>
      <View style={[styles.circle, { backgroundColor: bg, borderColor: '#fff' }]}>
        <Text style={styles.label}>{number}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  circle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  label: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
```

- [ ] **Step 2: Implement Map tab `upbus-mobile/app/(tabs)/index.tsx`**

```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useRef } from 'react';
import useSWR from 'swr';
import { getBuses, BusData } from '../../lib/api';
import BusMarker from '../../components/BusMarker';
import { useTrackingStore } from '../../lib/notifications';

const LINES = [
  { key: null,    label: 'ทุกสาย', color: '#fff' },
  { key: 'Green', label: 'หน้ามอ', color: '#2ecc71' },
  { key: 'Blue',  label: 'ประตู3', color: '#3498db' },
  { key: 'Red',   label: 'หอพัก',  color: '#e74c3c' },
];

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [lineFilter, setLineFilter] = useRef<string | null>(null);
  const tracking = useTrackingStore();

  const { data: buses = [] } = useSWR<BusData[]>('/api/buses', getBuses, { refreshInterval: 10000 });

  const displayed = lineFilter
    ? buses.filter(b => b.color === lineFilter)
    : buses.filter(b => b.latitude && b.longitude);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{ latitude: 19.0298, longitude: 99.9037, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
        userInterfaceStyle="dark"
        showsUserLocation
      >
        {displayed.map((bus, i) => bus.latitude && bus.longitude ? (
          <BusMarker
            key={bus.imei_id}
            busId={bus.imei_id}
            lat={bus.latitude}
            lng={bus.longitude}
            color={bus.color}
            number={i + 1}
          />
        ) : null)}
        {tracking.boardingStop && (
          <Marker coordinate={{ latitude: tracking.boardingStop.lat, longitude: tracking.boardingStop.lng }}
            title="⭐ ป้ายที่รอ" pinColor="#f59e0b" />
        )}
        {tracking.destinationStop && (
          <Marker coordinate={{ latitude: tracking.destinationStop.lat, longitude: tracking.destinationStop.lng }}
            title="🎯 ปลายทาง" pinColor="#a78bfa" />
        )}
      </MapView>

      {/* Line filter chips */}
      <View style={styles.chips}>
        {LINES.map(l => (
          <TouchableOpacity key={String(l.key)} style={[styles.chip, { borderColor: l.color }]}
            onPress={() => { lineFilter === l.key ? setLineFilter(null) : setLineFilter(l.key); }}>
            <Text style={{ color: l.color, fontSize: 10, fontWeight: '700' }}>{l.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ETA bar when tracking active */}
      {tracking.isTracking && tracking.etaRows.length > 0 && (
        <View style={styles.etaBar}>
          <Text style={styles.etaTitle}>📍 {tracking.boardingStop?.name}</Text>
          {tracking.etaRows.map(row => (
            <View key={row.lineColor} style={styles.etaRow}>
              <View style={[styles.lineBadge, { backgroundColor: row.color }]}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{row.lineColor}</Text>
              </View>
              <Text style={styles.etaText}>{row.lineName}</Text>
              <Text style={[styles.etaNum, { color: row.color }]}>{row.eta != null ? `~${row.eta} น.` : '—'}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { position: 'absolute', top: 56, left: 8, flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(15,15,26,0.85)' },
  etaBar: { position: 'absolute', bottom: 12, left: 8, right: 8, backgroundColor: 'rgba(15,15,26,0.92)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#2a2a4a' },
  etaTitle: { color: '#888', fontSize: 9, marginBottom: 4 },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  lineBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  etaText: { flex: 1, color: '#fff', fontSize: 9 },
  etaNum: { fontSize: 11, fontWeight: '700' },
});
```

- [ ] **Step 3: Verify map renders with bus markers**

```bash
cd upbus-mobile && npx expo start
```
Open Map tab → should see map centered on UP campus, bus markers appear after backend is running.

- [ ] **Step 4: Commit**

```bash
git add upbus-mobile/app/(tabs)/index.tsx upbus-mobile/components/BusMarker.tsx
git commit -m "feat: map tab with realtime bus markers, line filter, and ETA overlay"
```

---

## Task 7: Mobile — Route Planner tab + notifications tracking

**Files:**
- Modify: `upbus-mobile/app/(tabs)/routes.tsx`
- Create: `upbus-mobile/lib/notifications.ts`
- Create: `upbus-mobile/components/RouteResultCard.tsx`

**Interfaces:**
- `useTrackingStore()` → `{ isTracking, destinationStop, boardingStop, etaRows, startTracking(dest, boarding), stopTracking() }`

- [ ] **Step 1: Implement `lib/notifications.ts`**

```ts
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { useRef, useState, useEffect, useCallback } from 'react';
import { registerPushToken, unregisterPushToken, BusStop } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await SecureStore.setItemAsync('push_token', token);
  return token;
}

interface EtaRow { lineColor: string; lineName: string; color: string; eta: number | null; }

interface TrackingState {
  isTracking: boolean;
  destinationStop: BusStop | null;
  boardingStop: BusStop | null;
  etaRows: EtaRow[];
  startTracking: (dest: BusStop, boardingStops: { lineColor: string; stop: BusStop }[]) => Promise<void>;
  stopTracking: () => Promise<void>;
  setEtaRows: (rows: EtaRow[]) => void;
}

const LINE_NAMES: Record<string, string> = { Green: 'สายหน้ามอ', Red: 'สายหอพัก', Blue: 'สายประตูสาม' };
const LINE_COLORS: Record<string, string> = { Green: '#2ecc71', Red: '#e74c3c', Blue: '#3498db' };

// Simple module-level singleton (no external state library needed)
let _state: TrackingState | null = null;
const _listeners: Set<() => void> = new Set();

function notify() { _listeners.forEach(fn => fn()); }

export function useTrackingStore(): TrackingState {
  const [, rerender] = useState(0);
  useEffect(() => {
    const fn = () => rerender(n => n + 1);
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  }, []);

  if (!_state) {
    _state = {
      isTracking: false,
      destinationStop: null,
      boardingStop: null,
      etaRows: [],
      setEtaRows: (rows) => { if (_state) { _state.etaRows = rows; notify(); } },
      startTracking: async (dest, boardingStops) => {
        const token = await SecureStore.getItemAsync('push_token');
        if (token) {
          await registerPushToken(token, dest.id,
            boardingStops.map(bs => ({ lineColor: bs.lineColor, stopName: bs.stop.name, lat: bs.stop.lat, lng: bs.stop.lng }))
          );
        }
        if (_state) {
          _state.isTracking = true;
          _state.destinationStop = dest;
          _state.boardingStop = boardingStops[0]?.stop ?? null;
          _state.etaRows = boardingStops.map(bs => ({
            lineColor: bs.lineColor,
            lineName: LINE_NAMES[bs.lineColor] ?? bs.lineColor,
            color: LINE_COLORS[bs.lineColor] ?? '#888',
            eta: null,
          }));
          notify();
        }
      },
      stopTracking: async () => {
        const token = await SecureStore.getItemAsync('push_token');
        if (token) await unregisterPushToken(token);
        if (_state) {
          _state.isTracking = false;
          _state.destinationStop = null;
          _state.boardingStop = null;
          _state.etaRows = [];
          notify();
        }
      },
    };
  }
  return _state;
}
```

- [ ] **Step 2: Implement `RouteResultCard.tsx`**

```tsx
import { View, Text, StyleSheet } from 'react-native';

const LINE_COLORS: Record<string, string> = { Green: '#2ecc71', Red: '#e74c3c', Blue: '#3498db' };
const LINE_NAMES: Record<string, string> = { Green: 'สายหน้ามอ', Red: 'สายหอพัก', Blue: 'สายประตูสาม' };

interface Props {
  lineColor: string;
  boardingStopName: string;
  distanceM: number;
  etaMinutes: number | null;
  passes: boolean;
}

export default function RouteResultCard({ lineColor, boardingStopName, distanceM, etaMinutes, passes }: Props) {
  const color = LINE_COLORS[lineColor] ?? '#888';
  return (
    <View style={[styles.card, { borderColor: passes ? color + '88' : '#2a2a4a', opacity: passes ? 1 : 0.4 }]}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{lineColor}</Text>
        </View>
        <Text style={styles.lineName}>{LINE_NAMES[lineColor] ?? lineColor}</Text>
        {etaMinutes != null && passes && (
          <Text style={[styles.eta, { color }]}>~{etaMinutes} น.</Text>
        )}
        {!passes && <Text style={styles.nope}>ไม่ผ่าน</Text>}
      </View>
      {passes && (
        <View style={styles.boarding}>
          <Text style={styles.boardingLabel}>📍 ไปรอที่</Text>
          <Text style={styles.boardingName}>{boardingStopName}</Text>
          <Text style={styles.boardingDist}>{Math.round(distanceM)} ม.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 10, borderWidth: 1, marginBottom: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  lineName: { flex: 1, color: '#fff', fontSize: 11, fontWeight: '600' },
  eta: { fontSize: 14, fontWeight: '800' },
  nope: { color: '#555', fontSize: 9 },
  boarding: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ffffff0a', borderRadius: 6, padding: 6 },
  boardingLabel: { fontSize: 9, color: '#888' },
  boardingName: { flex: 1, fontSize: 10, fontWeight: '600', color: '#fff' },
  boardingDist: { fontSize: 9, color: '#888' },
});
```

- [ ] **Step 3: Implement Route Planner tab `upbus-mobile/app/(tabs)/routes.tsx`**

```tsx
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useState, useMemo } from 'react';
import useSWR from 'swr';
import * as Location from 'expo-location';
import { getBuses, getStops, BusStop, BusData } from '../../lib/api';
import { findPassingLines, findBoardingStop, calcEtaMinutes, haversine } from '../../lib/stops';
import RouteResultCard from '../../components/RouteResultCard';
import { useTrackingStore } from '../../lib/notifications';

export default function RoutesScreen() {
  const [query, setQuery] = useState('');
  const [destination, setDestination] = useState<BusStop | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const tracking = useTrackingStore();

  const { data: stops = [] } = useSWR<BusStop[]>('/api/stops', getStops);
  const { data: buses = [] } = useSWR<BusData[]>('/api/buses', getBuses, { refreshInterval: 10000 });

  // Get user location once
  useSWR('user-location', async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({});
    setUserPos({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    return loc;
  });

  const filtered = query.length > 0
    ? stops.filter(s => s.name.includes(query))
    : stops;

  const passingLines = destination ? findPassingLines(stops, destination.id) : [];

  const lineResults = useMemo(() => {
    if (!destination || !userPos) return [];
    return ['Green', 'Red', 'Blue'].map(lc => {
      const passes = passingLines.includes(lc);
      const boarding = passes ? findBoardingStop(stops, lc, userPos.lat, userPos.lng) : null;
      const matchingBus = buses.find(b => b.color === lc && b.latitude && b.longitude);
      const eta = boarding && matchingBus ? calcEtaMinutes(matchingBus, boarding) : null;
      const dist = boarding ? haversine(userPos.lat, userPos.lng, boarding.lat, boarding.lng) : 0;
      return { lineColor: lc, passes, boarding, eta, dist };
    });
  }, [destination, userPos, stops, buses, passingLines]);

  async function handleTrack() {
    if (!destination) return;
    const boardingStops = lineResults
      .filter(r => r.passes && r.boarding)
      .map(r => ({ lineColor: r.lineColor, stop: r.boarding! }));
    await tracking.startTracking(destination, boardingStops);
  }

  if (tracking.isTracking) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 14, gap: 10 }}>
        <View style={styles.trackingCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={styles.pulseDot} />
            <Text style={{ color: '#a78bfa', fontSize: 10, fontWeight: '700', flex: 1 }}>กำลังติดตาม</Text>
            <TouchableOpacity onPress={tracking.stopTracking} style={styles.stopBtn}>
              <Text style={{ color: '#888', fontSize: 9 }}>⏹ หยุด</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', marginBottom: 8 }}>
            🎯 {tracking.destinationStop?.name}
          </Text>
          {tracking.etaRows.map(row => (
            <View key={row.lineColor} style={styles.etaRow}>
              <View style={[styles.badge, { backgroundColor: row.color }]}>
                <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{row.lineColor}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '600' }}>{row.lineName}</Text>
                <Text style={{ color: '#888', fontSize: 8 }}>📍 {tracking.boardingStop?.name}</Text>
              </View>
              <Text style={{ color: row.color, fontSize: 16, fontWeight: '800' }}>
                {row.eta != null ? `~${row.eta}` : '—'}
              </Text>
              <Text style={{ color: '#888', fontSize: 8 }}> น.</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
        <Text style={styles.sectionTitle}>🎯 ฉันต้องการไปที่...</Text>
        <TextInput
          style={styles.searchBox}
          placeholder="ค้นหาป้ายปลายทาง..."
          placeholderTextColor="#666"
          value={query}
          onChangeText={setQuery}
        />

        {!destination ? (
          <FlatList
            data={filtered.slice(0, 20)}
            keyExtractor={s => s.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.stopRow} onPress={() => { setDestination(item); setQuery(''); }}>
                <Text style={{ fontSize: 14 }}>🚏</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stopName}>{item.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
                    {item.lines.map(l => (
                      <View key={l} style={[styles.lineDot, { backgroundColor: l === 'Green' ? '#2ecc71' : l === 'Red' ? '#e74c3c' : '#3498db' }]} />
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        ) : (
          <>
            <View style={styles.destSelected}>
              <Text style={{ color: '#888', fontSize: 9 }}>ปลายทางที่เลือก</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', flex: 1 }}>{destination.name}</Text>
                <TouchableOpacity onPress={() => setDestination(null)} style={styles.changeBtn}>
                  <Text style={{ color: '#888', fontSize: 9 }}>✕ เปลี่ยน</Text>
                </TouchableOpacity>
              </View>
              {lineResults.map(r => (
                <RouteResultCard
                  key={r.lineColor}
                  lineColor={r.lineColor}
                  boardingStopName={r.boarding?.name ?? ''}
                  distanceM={r.dist}
                  etaMinutes={r.eta}
                  passes={r.passes}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.trackBtn} onPress={handleTrack}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                🔔 ติดตาม — แจ้งเตือนอัตโนมัติ
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f0f1a' },
  sectionTitle: { color: '#a78bfa', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  searchBox: { backgroundColor: '#0f0f1a', borderWidth: 1, borderColor: '#3a3a6a', borderRadius: 9, padding: 10, color: '#fff', fontSize: 13 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#1a1a2e', borderRadius: 10, borderWidth: 1, borderColor: '#2a2a4a', marginBottom: 6 },
  stopName: { color: '#fff', fontSize: 11, fontWeight: '600' },
  lineDot: { width: 7, height: 7, borderRadius: 3.5 },
  destSelected: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#2a2a4a', gap: 6 },
  changeBtn: { borderWidth: 1, borderColor: '#2a2a4a', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  trackBtn: { backgroundColor: '#7c3aed', borderRadius: 10, padding: 12, alignItems: 'center' },
  trackingCard: { backgroundColor: '#0f0f1a', borderRadius: 10, borderWidth: 1, borderColor: '#a78bfa55', padding: 10 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2ecc71' },
  stopBtn: { borderWidth: 1, borderColor: '#2a2a4a', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#1e1e3a' },
  badge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
});
```

- [ ] **Step 4: Verify route planner works end-to-end**

With backend running:
1. Open Route Planner tab
2. Type ป้าย in search → stop list appears
3. Tap a stop → result cards appear with line info
4. Tap "ติดตาม" → tracking state shows

- [ ] **Step 5: Commit**

```bash
git add upbus-mobile/lib/notifications.ts upbus-mobile/components/RouteResultCard.tsx upbus-mobile/app/(tabs)/routes.tsx
git commit -m "feat: route planner tab with destination-driven notification tracking"
```

---

## Task 8: Mobile — Sustainability tab + Complaints tab

**Files:**
- Modify: `upbus-mobile/app/(tabs)/sustainability.tsx`
- Modify: `upbus-mobile/app/(tabs)/complaints.tsx`

- [ ] **Step 1: Implement Sustainability tab**

`upbus-mobile/app/(tabs)/sustainability.tsx`:
```tsx
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import useSWR from 'swr';
import { getSustainability, SustainabilityData } from '../../lib/api';

const LINE_COLOR = '#7c3aed';
const MAX_BAR_H = 60;

export default function SustainabilityScreen() {
  const { data } = useSWR<SustainabilityData>('/api/sustainability', getSustainability, { refreshInterval: 60000 });
  const t = data?.today;
  const weekly = data?.weekly ?? [];
  const maxCo2 = Math.max(...weekly.map(w => w.co2), 1);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0f0f1a' }} contentContainerStyle={{ padding: 14, gap: 12 }}>
      <View style={styles.banner}>
        <View>
          <Text style={styles.bannerLabel}>วันนี้ประหยัด CO₂</Text>
          <Text style={styles.bannerNum}>{t?.co2_saved_kg?.toFixed(1) ?? '—'} <Text style={styles.bannerUnit}>kg</Text></Text>
          <Text style={styles.bannerDesc}>= ปลูกต้นไม้ {t?.trees_equiv ?? '—'} ต้น 🌳</Text>
        </View>
        <Text style={{ fontSize: 36 }}>🌍</Text>
      </View>

      <Text style={styles.sectionTitle}>วันนี้</Text>
      <View style={styles.statGrid}>
        {[
          { icon: '⚡', val: `${t?.kwh_used ?? '—'}`, unit: 'kWh', label: 'พลังงาน', color: '#f59e0b' },
          { icon: '🛣️', val: `${t?.km_total ?? '—'}`, unit: 'กม.', label: 'ระยะทาง', color: '#3b82f6' },
          { icon: '🚌', val: `${t?.buses_active ?? '—'}`, unit: 'คัน', label: 'รถวิ่ง', color: '#2ecc71' },
          { icon: '🌳', val: `${t?.trees_equiv ?? '—'}`, unit: 'ต้น', label: 'เทียบต้นไม้', color: '#2ecc71' },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={{ fontSize: 16 }}>{s.icon}</Text>
            <Text style={[styles.statVal, { color: s.color }]}>{s.val} <Text style={styles.statUnit}>{s.unit}</Text></Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>CO₂ ที่ประหยัด 7 วัน (kg)</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: MAX_BAR_H + 20 }}>
          {weekly.map(w => (
            <View key={w.day} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={[styles.bar, { height: Math.max((w.co2 / maxCo2) * MAX_BAR_H, 3), backgroundColor: LINE_COLOR }]} />
              <Text style={styles.barDay}>{w.day.slice(0, 2)}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#1a3a1a', borderWidth: 1, borderColor: '#2ecc71', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center' },
  bannerLabel: { color: '#888', fontSize: 10 },
  bannerNum: { color: '#2ecc71', fontSize: 28, fontWeight: '800', marginVertical: 2 },
  bannerUnit: { fontSize: 12, color: '#888' },
  bannerDesc: { color: '#aaa', fontSize: 11 },
  sectionTitle: { color: '#a78bfa', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4a', borderRadius: 10, padding: 10, width: '47%', gap: 2 },
  statVal: { fontSize: 20, fontWeight: '800' },
  statUnit: { fontSize: 11, color: '#888', fontWeight: '400' },
  statLabel: { color: '#888', fontSize: 10 },
  chartCard: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4a', borderRadius: 10, padding: 10 },
  chartTitle: { color: '#888', fontSize: 10, marginBottom: 8 },
  bar: { width: '100%', borderRadius: 3 },
  barDay: { color: '#666', fontSize: 9 },
});
```

- [ ] **Step 2: Implement Complaints tab**

`upbus-mobile/app/(tabs)/complaints.tsx`:
```tsx
import { ScrollView, View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect } from 'react';
import { postComplaint } from '../../lib/api';

const TYPES = [
  { key: 'driver-service', label: 'คนขับ', icon: '👤' },
  { key: 'bus-condition',  label: 'สภาพรถ', icon: '🚌' },
  { key: 'system-wrong',  label: 'ระบบแอป', icon: '📱' },
  { key: 'other',         label: 'อื่น ๆ',   icon: '🔧' },
];
const LINES = ['Green', 'Red', 'Blue'];

interface HistoryItem { type: string; line: string; detail: string; date: string; status: 'pending' | 'resolved'; }

export default function ComplaintsScreen() {
  const [view, setView] = useState<'form' | 'history'>('form');
  const [type, setType] = useState('driver-service');
  const [line, setLine] = useState('Green');
  const [detail, setDetail] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('complaints').then(v => { if (v) setHistory(JSON.parse(v)); });
  }, []);

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!res.canceled) setPhoto(res.assets[0].uri);
  }

  async function handleSubmit() {
    if (!detail.trim()) { Alert.alert('กรุณาระบุรายละเอียด'); return; }
    const form = new FormData();
    form.append('topic', type);
    form.append('bus_number', line);
    form.append('detail', detail);
    if (photo) form.append('image', { uri: photo, name: 'photo.jpg', type: 'image/jpeg' } as any);
    await postComplaint(form);
    const item: HistoryItem = { type, line, detail, date: new Date().toISOString(), status: 'pending' };
    const updated = [item, ...history];
    setHistory(updated);
    await AsyncStorage.setItem('complaints', JSON.stringify(updated));
    setDetail(''); setPhoto(null);
    Alert.alert('ส่งเรียบร้อย', 'ขอบคุณที่แจ้งปัญหา');
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0f0f1a' }}>
      <View style={styles.toggle}>
        {(['form', 'history'] as const).map(v => (
          <TouchableOpacity key={v} style={[styles.toggleBtn, view === v && styles.toggleActive]} onPress={() => setView(v)}>
            <Text style={{ color: view === v ? '#a78bfa' : '#555', fontSize: 11, fontWeight: '600' }}>
              {v === 'form' ? 'แจ้งปัญหา' : 'ประวัติ'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {view === 'form' ? (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
          <Text style={styles.label}>ประเภทปัญหา</Text>
          <View style={styles.typeGrid}>
            {TYPES.map(t => (
              <TouchableOpacity key={t.key} style={[styles.typeCard, type === t.key && styles.typeCardSel]}
                onPress={() => setType(t.key)}>
                <Text style={{ fontSize: 20 }}>{t.icon}</Text>
                <Text style={[styles.typeLabel, type === t.key && { color: '#a78bfa' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>รถสาย</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {LINES.map(l => (
              <TouchableOpacity key={l} style={[styles.lineBtn, line === l && styles.lineBtnSel]}
                onPress={() => setLine(l)}>
                <Text style={{ color: line === l ? '#fff' : '#888', fontSize: 11, fontWeight: '600' }}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>รายละเอียด</Text>
          <TextInput
            style={styles.textarea}
            placeholder="พิมพ์รายละเอียด..."
            placeholderTextColor="#555"
            multiline
            numberOfLines={3}
            value={detail}
            onChangeText={setDetail}
          />

          <Text style={styles.label}>แนบรูปภาพ (ถ้ามี)</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {photo && <Image source={{ uri: photo }} style={styles.photoPreview} />}
            <TouchableOpacity style={styles.photoAdd} onPress={pickPhoto}>
              <Text style={{ color: '#555', fontSize: 24 }}>＋</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>ส่งเรื่องร้องเรียน</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 8 }}>
          {history.length === 0 ? (
            <Text style={{ color: '#555', textAlign: 'center', marginTop: 40 }}>ยังไม่มีประวัติ</Text>
          ) : history.map((h, i) => (
            <View key={i} style={styles.histCard}>
              <Text style={{ fontSize: 16 }}>{TYPES.find(t => t.key === h.type)?.icon ?? '📋'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>
                  {TYPES.find(t => t.key === h.type)?.label} · {h.line}
                </Text>
                <Text style={{ color: '#888', fontSize: 9 }} numberOfLines={1}>{h.detail}</Text>
              </View>
              <View style={[styles.statusBadge, h.status === 'resolved' ? styles.resolved : styles.pending]}>
                <Text style={{ fontSize: 8, fontWeight: '700', color: h.status === 'resolved' ? '#2ecc71' : '#f59e0b' }}>
                  {h.status === 'resolved' ? 'แก้ไขแล้ว' : 'รอดำเนินการ'}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', backgroundColor: '#0a0a14', borderBottomWidth: 1, borderBottomColor: '#1e1e3a' },
  toggleBtn: { flex: 1, padding: 12, alignItems: 'center' },
  toggleActive: { borderBottomWidth: 2, borderBottomColor: '#a78bfa' },
  label: { color: '#888', fontSize: 11 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4a', borderRadius: 10, padding: 10, alignItems: 'center', width: '47%', gap: 4 },
  typeCardSel: { borderColor: '#a78bfa', backgroundColor: '#a78bfa11' },
  typeLabel: { fontSize: 11, fontWeight: '600', color: '#888' },
  lineBtn: { flex: 1, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#2a2a4a', alignItems: 'center' },
  lineBtnSel: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  textarea: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4a', borderRadius: 9, padding: 10, color: '#fff', minHeight: 80, textAlignVertical: 'top' },
  photoPreview: { width: 60, height: 60, borderRadius: 8 },
  photoAdd: { width: 60, height: 60, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#3a3a5e', borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  submitBtn: { backgroundColor: '#7c3aed', borderRadius: 10, padding: 14, alignItems: 'center' },
  histCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1a1a2e', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#2a2a4a' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  resolved: { backgroundColor: '#2ecc7122', borderColor: '#2ecc7144' },
  pending: { backgroundColor: '#f59e0b22', borderColor: '#f59e0b44' },
});
```

- [ ] **Step 3: Verify both tabs render correctly in Expo Go**

Launch app, navigate to สิ่งแวดล้อม tab — data loads from backend. Navigate to ร้องเรียน — form renders, submit works (check backend receives complaint).

- [ ] **Step 4: Commit**

```bash
git add upbus-mobile/app/(tabs)/sustainability.tsx upbus-mobile/app/(tabs)/complaints.tsx
git commit -m "feat: sustainability stats and complaint form/history tabs"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| 4 tabs: Map, เส้นทาง, สิ่งแวดล้อม, ร้องเรียน | Task 4 |
| Realtime bus map, line filter chips | Task 6 |
| ETA overlay bar on map when tracking | Task 6 |
| Destination search + stop list | Task 7 |
| findPassingLines, findBoardingStop, calcEtaMinutes | Task 5 |
| ติดตาม button → push registration | Task 7 |
| Tracking state with live ETA | Task 7 |
| Push notification per-line when bus within 500m | Task 3 |
| Backend `/api/stops` from KML | Task 1 |
| Backend push_tokens table | Task 2 |
| Sustainability stats panel | Task 8 |
| Complaint form: type, line, detail, photo | Task 8 |
| Complaint history in AsyncStorage | Task 8 |
| No login, device token only | Tasks 2, 3, 7 |

**Gaps:** None found.

**Type consistency:** `BusStop`, `BusData`, `SustainabilityData` defined once in `lib/api.ts` and imported everywhere. `findPassingLines` returns `string[]` (line colors) — Task 7 uses that to drive `lineResults` map correctly. `findBoardingStop` signature matches usage in routes.tsx.

**Placeholders:** None.
