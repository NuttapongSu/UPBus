# UPBus Mobile App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Expo React Native mobile app for UP Smart Transit passengers on iOS + Android with real-time bus tracking and push notifications.

**Architecture:** Expo managed workflow app (`upbus-mobile/`) reuses the existing Express.js backend API on port 5000. New backend: `push_tokens` DB table, two push API endpoints, and notification dispatch added to `gpsPoller.js`. Mobile polls `/api/buses` every 5s for the map and registers device tokens for push notifications.

**Tech Stack:** Expo SDK 51+ (managed), TypeScript, react-native-maps (Google Maps), expo-notifications, expo-router (file-based tabs), @react-native-async-storage/async-storage, Express.js + MySQL (existing)

## Global Constraints

- Expo SDK 51+, managed workflow (no bare/ejected)
- TypeScript strict mode throughout
- No login — anonymous passenger usage
- Backend base URL: `http://localhost:5000` dev, configurable via `EXPO_PUBLIC_API_URL`
- Push notifications: only Red/Green/Blue buses, speed > 2 km/h, cooldown 3 min per token-bus-stop
- Purple/Orange buses: never trigger push notifications
- `upbus-mobile/` at repo root (sibling to `backend/`, `frontend/`)
- Google Maps API Key required — get from Google Cloud Console → APIs & Services → Credentials

---

### Task 1: DB Migration — push_tokens table

**Files:**
- Create: `backend/migrations/008_push_tokens.sql`

**Interfaces:**
- Produces: `push_tokens(token VARCHAR(255) PK, lines JSON, created_at, updated_at)`

- [ ] **Step 1: Write migration**

```sql
-- backend/migrations/008_push_tokens.sql
CREATE TABLE IF NOT EXISTS push_tokens (
  token      VARCHAR(255) NOT NULL PRIMARY KEY,
  lines      JSON         NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- [ ] **Step 2: Apply migration**

```bash
mysql -u root -p"CesM.up@2025#" db_bustransit < backend/migrations/008_push_tokens.sql
```

- [ ] **Step 3: Verify**

```bash
mysql -u root -p"CesM.up@2025#" db_bustransit -e "DESCRIBE push_tokens;"
```

Expected: 4 columns — token (PRI), lines, created_at, updated_at

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/008_push_tokens.sql
git commit -m "feat: add push_tokens migration"
```

---

### Task 2: Backend — /api/push routes

**Files:**
- Create: `backend/routes/push.js`
- Modify: `backend/index.js` (mount router)
- Test: `backend/__tests__/push.test.js`

**Interfaces:**
- Consumes: `db` from `../db`, `push_tokens` table (Task 1)
- Produces:
  - `POST /api/push/register` body `{ token: string, lines: string[] }` → `{ ok: true }`
  - `DELETE /api/push/unregister` body `{ token: string }` → `{ ok: true }`

- [ ] **Step 1: Write failing test**

```js
// backend/__tests__/push.test.js
const request = require('supertest');
const express = require('express');

jest.mock('../db', () => ({ query: jest.fn() }));
const db = require('../db');
const pushRouter = require('../routes/push');

const app = express();
app.use(express.json());
app.use('/api/push', pushRouter);

describe('POST /api/push/register', () => {
  it('returns 400 when token missing', async () => {
    const res = await request(app).post('/api/push/register').send({ lines: ['Red'] });
    expect(res.status).toBe(400);
  });
  it('returns 400 when lines missing', async () => {
    const res = await request(app).post('/api/push/register').send({ token: 'abc' });
    expect(res.status).toBe(400);
  });
  it('upserts and returns ok', async () => {
    db.query.mockResolvedValue([{}]);
    const res = await request(app).post('/api/push/register')
      .send({ token: 'ExponentPushToken[xxx]', lines: ['Red', 'Green'] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO push_tokens'),
      ['ExponentPushToken[xxx]', '["Red","Green"]', '["Red","Green"]']
    );
  });
});

describe('DELETE /api/push/unregister', () => {
  it('returns 400 when token missing', async () => {
    const res = await request(app).delete('/api/push/unregister').send({});
    expect(res.status).toBe(400);
  });
  it('deletes and returns ok', async () => {
    db.query.mockResolvedValue([{}]);
    const res = await request(app).delete('/api/push/unregister').send({ token: 'ExponentPushToken[xxx]' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
cd backend && npx jest push.test.js --no-coverage
```

Expected: FAIL "Cannot find module '../routes/push'"

- [ ] **Step 3: Create routes/push.js**

```js
// backend/routes/push.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/register', async (req, res) => {
  const { token, lines } = req.body;
  if (!token || !Array.isArray(lines)) {
    return res.status(400).json({ error: 'token and lines[] required' });
  }
  const linesJson = JSON.stringify(lines);
  await db.query(
    `INSERT INTO push_tokens (token, lines) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE lines = ?, updated_at = NOW()`,
    [token, linesJson, linesJson]
  );
  res.json({ ok: true });
});

router.delete('/unregister', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  await db.query(`DELETE FROM push_tokens WHERE token = ?`, [token]);
  res.json({ ok: true });
});

module.exports = router;
```

- [ ] **Step 4: Mount in index.js**

In `backend/index.js`, add after existing route mounts (~line 50):

```js
const pushRouter = require('./routes/push');
app.use('/api/push', pushRouter);
```

- [ ] **Step 5: Run — verify PASS**

```bash
npx jest push.test.js --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/routes/push.js backend/index.js backend/__tests__/push.test.js
git commit -m "feat: /api/push register and unregister endpoints"
```

---

### Task 3: Backend — Push notification dispatch (pushNotify.js)

**Files:**
- Create: `backend/services/pushNotify.js`
- Modify: `backend/services/gpsPoller.js` (add dispatch call after GPS update)
- Test: `backend/__tests__/pushNotify.test.js`

**Interfaces:**
- Consumes: `db`, `axios` (existing in gpsPoller), `cachedBusData` (from gpsPoller), `push_tokens` table
- Produces: `haversineM(lat1,lng1,lat2,lng2): number`, `shouldNotify(bus): boolean`, `dispatch(busesWithColor): Promise<void>`

- [ ] **Step 1: Write failing test**

```js
// backend/__tests__/pushNotify.test.js
jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('axios');
const { haversineM, shouldNotify } = require('../services/pushNotify');

describe('haversineM', () => {
  it('returns 0 for same point', () => {
    expect(haversineM(19.0256, 99.895, 19.0256, 99.895)).toBeCloseTo(0, 0);
  });
  it('returns ~200m for points ~200m apart', () => {
    const d = haversineM(19.0256, 99.895, 19.0274, 99.895);
    expect(d).toBeGreaterThan(150);
    expect(d).toBeLessThan(300);
  });
});

describe('shouldNotify', () => {
  it('false for Purple', () => expect(shouldNotify({ speed: 10, color: 'Purple' })).toBe(false));
  it('false for speed < 2', () => expect(shouldNotify({ speed: 1, color: 'Red' })).toBe(false));
  it('true for moving Red bus', () => expect(shouldNotify({ speed: 10, color: 'Red' })).toBe(true));
  it('false for Orange', () => expect(shouldNotify({ speed: 10, color: 'Orange' })).toBe(false));
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npx jest pushNotify.test.js --no-coverage
```

Expected: FAIL "Cannot find module '../services/pushNotify'"

- [ ] **Step 3: Create services/pushNotify.js**

```js
// backend/services/pushNotify.js
const axios = require('axios');
const db = require('../db');

const LINE_STOPS = {
  Green: [
    { name: 'จุดจอดรถบัส PKY',                            lat: 19.02562,   lng: 99.895015  },
    { name: 'สถานีหน้าคณะศิลปศาสตร์',                     lat: 19.0294776, lng: 99.8957507 },
    { name: 'สถานีหน้าคณะพยาบาลศาสตร์',                   lat: 19.0306625, lng: 99.897615  },
    { name: 'สถานีหน้าคณะวิศวกรรมศาสตร์',                 lat: 19.0307963, lng: 99.9011997 },
    { name: 'สถานีหน้าคณะทันตแพทยศาสตร์',                 lat: 19.0298661, lng: 99.9154259 },
    { name: 'จุดจอดรถบัสหน้ามหาวิทยาลัย',                lat: 19.030564,  lng: 99.923098  },
    { name: 'สถานีหน้าเรือนเอื้องคำ',                     lat: 19.028584,  lng: 99.906696  },
    { name: 'สถานีหน้าคณะวิศวกรรมศาสตร์ (ขากลับ)',        lat: 19.0305663, lng: 99.901226  },
    { name: 'สถานีหน้าหอประชุมพญางำเมือง',                lat: 19.0299998, lng: 99.8977114 },
    { name: 'สถานีหน้าอาคารสำนักงานอธิการบดี',            lat: 19.0290339, lng: 99.8960666 },
  ],
  Blue: [
    { name: 'จุดจอดรถบัสประตูสาม',                        lat: 19.02281,   lng: 99.89537   },
    { name: 'สถานีหน้าคณะเทคโนโลยีสารสนเทศและการสื่อสาร', lat: 19.0284949, lng: 99.8998267 },
    { name: 'สถานีหน้าคณะวิศวกรรมศาสตร์',                 lat: 19.0305663, lng: 99.901226  },
    { name: 'สถานีหน้าศูนย์การเรียนรู้เศรษฐกิจพอเพียง',   lat: 19.02696,   lng: 99.899542  },
  ],
  Red: [
    { name: 'สถานีหน้าอาคารสงวนเสริมศรี',                 lat: 19.0342438, lng: 99.8863112 },
    { name: 'สถานีหน้าอาคาร ๙๙ ปี',                       lat: 19.0320031, lng: 99.8934952 },
    { name: 'สถานีหน้าเวียงพะเยา',                        lat: 19.0331648, lng: 99.8908747 },
    { name: 'สถานีหน้าโรงเรียนสาธิตมหาวิทยาลัยพะเยา',    lat: 19.0344118, lng: 99.8842468 },
    { name: 'จุดจอดรถบัส PKY',                            lat: 19.02562,   lng: 99.895015  },
  ],
};

const NOTIFY_RADIUS_M = 200;
const COOLDOWN_MS = 3 * 60 * 1000;
const cooldownMap = new Map();

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function shouldNotify(bus) {
  if (!bus.color || bus.color === 'Purple' || bus.color === 'Orange') return false;
  return (bus.speed || 0) >= 2 && ['Red', 'Green', 'Blue'].includes(bus.color);
}

async function dispatch(busesWithColor) {
  try {
    const [tokenRows] = await db.query(`SELECT token, lines FROM push_tokens`);
    if (tokenRows.length === 0) return;

    const now = Date.now();
    const messages = [];

    for (const bus of busesWithColor) {
      if (!bus.latitude || !bus.longitude || !shouldNotify(bus)) continue;
      const stops = LINE_STOPS[bus.color];
      if (!stops) continue;

      for (const stop of stops) {
        if (haversineM(bus.latitude, bus.longitude, stop.lat, stop.lng) > NOTIFY_RADIUS_M) continue;

        for (const row of tokenRows) {
          const lines = JSON.parse(row.lines);
          if (!lines.includes(bus.color)) continue;

          const key = `${row.token}:${bus.imei_id}:${stop.name}`;
          if (now - (cooldownMap.get(key) || 0) < COOLDOWN_MS) continue;
          cooldownMap.set(key, now);

          const emoji = { Red: '🔴', Green: '🟢', Blue: '🔵' }[bus.color];
          messages.push({
            to: row.token,
            title: 'UP Smart Transit',
            body: `รถสาย${emoji} กำลังเข้าป้าย ${stop.name}`,
            data: { busId: bus.imei_id, stopName: stop.name, line: bus.color },
          });
        }
      }
    }

    if (messages.length === 0) return;

    for (let i = 0; i < messages.length; i += 100) {
      await axios.post('https://exp.host/--/api/v2/push/send', messages.slice(i, i + 100), {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        timeout: 5000,
      });
    }
    console.log(`📲 Sent ${messages.length} push notifications`);
  } catch (err) {
    console.error('❌ Push dispatch error:', err.message);
  }
}

module.exports = { haversineM, shouldNotify, dispatch };
```

- [ ] **Step 4: Run — verify PASS**

```bash
npx jest pushNotify.test.js --no-coverage
```

Expected: PASS (6 tests)

- [ ] **Step 5: Wire into gpsPoller.js**

At the top of `backend/services/gpsPoller.js` add:
```js
const pushNotify = require('./pushNotify');
```

At the end of `fetchAndStore()`, after `console.log('✅ GPS Updated...')` add:
```js
    db.query(`SELECT bus_number, status_color FROM buses`).then(([rows]) => {
      const colorMap = new Map(rows.map(r => [
        'TC' + String(r.bus_number).padStart(3, '0'),
        r.status_color,
      ]));
      const busesWithColor = cachedBusData.map(b => ({
        ...b,
        color: colorMap.get(b.imei_id) || 'Purple',
      }));
      pushNotify.dispatch(busesWithColor);
    }).catch(err => console.error('❌ Push color fetch:', err.message));
```

- [ ] **Step 6: Restart backend — verify no errors**

```bash
cd backend && npm run dev
```

Expected log: `✅ GPS Updated: 30 คัน` — no error lines. (No notifications yet — push_tokens empty.)

- [ ] **Step 7: Commit**

```bash
git add backend/services/pushNotify.js backend/services/gpsPoller.js backend/__tests__/pushNotify.test.js
git commit -m "feat: push notification dispatch in gpsPoller"
```

---

### Task 4: Expo — Project Scaffold & Configuration

**Files:**
- Create: `upbus-mobile/` (via create-expo-app)
- Modify: `upbus-mobile/app.json`
- Modify: `upbus-mobile/package.json` (jest config)

**Interfaces:**
- Produces: runnable Expo project at `upbus-mobile/` with TypeScript, expo-router, react-native-maps, expo-notifications

**Prerequisite:** Google Maps API Key from Google Cloud Console → Credentials → Create API Key → restrict to "Maps SDK for iOS" + "Maps SDK for Android"

- [ ] **Step 1: Scaffold**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/UPBus
npx create-expo-app@latest upbus-mobile --template tabs
```

- [ ] **Step 2: Install packages**

```bash
cd upbus-mobile
npx expo install react-native-maps expo-notifications @react-native-async-storage/async-storage
npx expo install --save-dev jest jest-expo @testing-library/react-native
```

- [ ] **Step 3: Add jest config to package.json**

In `upbus-mobile/package.json`, add at root level:
```json
"jest": {
  "preset": "jest-expo",
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*)"
  ]
}
```

- [ ] **Step 4: Configure app.json**

Replace the content of `upbus-mobile/app.json` (substitute `YOUR_GOOGLE_MAPS_API_KEY`):

```json
{
  "expo": {
    "name": "UP Smart Transit",
    "slug": "upbus-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "upbus",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "th.ac.up.smarttransit",
      "config": {
        "googleMapsApiKey": "YOUR_GOOGLE_MAPS_API_KEY"
      }
    },
    "android": {
      "package": "th.ac.up.smarttransit",
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "config": {
        "googleMaps": { "apiKey": "YOUR_GOOGLE_MAPS_API_KEY" }
      }
    },
    "plugins": [
      "expo-router",
      ["expo-notifications", { "color": "#5c2d91" }]
    ],
    "experiments": { "typedRoutes": true }
  }
}
```

- [ ] **Step 5: Verify app starts**

```bash
npx expo start
```

Expected: QR code + no build errors. Press `i` for iOS simulator.

- [ ] **Step 6: Commit**

```bash
cd ..
git add upbus-mobile/
git commit -m "feat: scaffold Expo app (upbus-mobile)"
```

---

### Task 5: Constants & API Layer

**Files:**
- Create: `upbus-mobile/constants/stops.ts`
- Create: `upbus-mobile/lib/api.ts`
- Test: `upbus-mobile/__tests__/stops.test.ts`

**Interfaces:**
- Produces:
  - `Stop { name: string; lat: number; lng: number }`
  - `LINE_STOPS: Record<'Red'|'Green'|'Blue', Stop[]>`
  - `LINE_COLORS: Record<'Red'|'Green'|'Blue', string>`
  - `BusData`, `BusColor` types
  - `getBuses(): Promise<BusData[]>`
  - `registerPushToken(token, lines): Promise<void>`
  - `unregisterPushToken(token): Promise<void>`

- [ ] **Step 1: Write failing test**

```ts
// upbus-mobile/__tests__/stops.test.ts
import { LINE_STOPS } from '../constants/stops';

describe('LINE_STOPS', () => {
  it('has Red, Green, Blue', () => {
    expect(LINE_STOPS).toHaveProperty('Red');
    expect(LINE_STOPS).toHaveProperty('Green');
    expect(LINE_STOPS).toHaveProperty('Blue');
  });
  it('each stop has name, lat, lng as numbers', () => {
    for (const stops of Object.values(LINE_STOPS)) {
      for (const s of stops) {
        expect(typeof s.name).toBe('string');
        expect(typeof s.lat).toBe('number');
        expect(typeof s.lng).toBe('number');
      }
    }
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
cd upbus-mobile && npx jest __tests__/stops.test.ts --no-coverage
```

Expected: FAIL "Cannot find module '../constants/stops'"

- [ ] **Step 3: Create constants/stops.ts**

```ts
// upbus-mobile/constants/stops.ts
export interface Stop { name: string; lat: number; lng: number; }

export const LINE_STOPS: Record<'Red' | 'Green' | 'Blue', Stop[]> = {
  Green: [
    { name: 'จุดจอดรถบัส PKY',                            lat: 19.02562,   lng: 99.895015  },
    { name: 'สถานีหน้าคณะศิลปศาสตร์',                     lat: 19.0294776, lng: 99.8957507 },
    { name: 'สถานีหน้าคณะพยาบาลศาสตร์',                   lat: 19.0306625, lng: 99.897615  },
    { name: 'สถานีหน้าคณะวิศวกรรมศาสตร์',                 lat: 19.0307963, lng: 99.9011997 },
    { name: 'สถานีหน้าคณะทันตแพทยศาสตร์',                 lat: 19.0298661, lng: 99.9154259 },
    { name: 'จุดจอดรถบัสหน้ามหาวิทยาลัย',                lat: 19.030564,  lng: 99.923098  },
    { name: 'สถานีหน้าเรือนเอื้องคำ',                     lat: 19.028584,  lng: 99.906696  },
    { name: 'สถานีหน้าคณะวิศวกรรมศาสตร์ (ขากลับ)',        lat: 19.0305663, lng: 99.901226  },
    { name: 'สถานีหน้าหอประชุมพญางำเมือง',                lat: 19.0299998, lng: 99.8977114 },
    { name: 'สถานีหน้าอาคารสำนักงานอธิการบดี',            lat: 19.0290339, lng: 99.8960666 },
  ],
  Blue: [
    { name: 'จุดจอดรถบัสประตูสาม',                        lat: 19.02281,   lng: 99.89537   },
    { name: 'สถานีหน้าคณะเทคโนโลยีสารสนเทศและการสื่อสาร', lat: 19.0284949, lng: 99.8998267 },
    { name: 'สถานีหน้าคณะวิศวกรรมศาสตร์',                 lat: 19.0305663, lng: 99.901226  },
    { name: 'สถานีหน้าศูนย์การเรียนรู้เศรษฐกิจพอเพียง',   lat: 19.02696,   lng: 99.899542  },
  ],
  Red: [
    { name: 'สถานีหน้าอาคารสงวนเสริมศรี',                 lat: 19.0342438, lng: 99.8863112 },
    { name: 'สถานีหน้าอาคาร ๙๙ ปี',                       lat: 19.0320031, lng: 99.8934952 },
    { name: 'สถานีหน้าเวียงพะเยา',                        lat: 19.0331648, lng: 99.8908747 },
    { name: 'สถานีหน้าโรงเรียนสาธิตมหาวิทยาลัยพะเยา',    lat: 19.0344118, lng: 99.8842468 },
    { name: 'จุดจอดรถบัส PKY',                            lat: 19.02562,   lng: 99.895015  },
  ],
};

export const LINE_COLORS: Record<'Red' | 'Green' | 'Blue', string> = {
  Red:   '#e74c3c',
  Green: '#2ecc71',
  Blue:  '#3498db',
};

export const LINE_NAMES: Record<'Red' | 'Green' | 'Blue', string> = {
  Red:   'สายหอพัก',
  Green: 'สายหน้ามอ',
  Blue:  'สายประตูสาม',
};
```

- [ ] **Step 4: Create lib/api.ts**

```ts
// upbus-mobile/lib/api.ts
const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000';

export type BusColor = 'Red' | 'Green' | 'Blue' | 'Purple' | 'Orange' | 'Yellow' | 'White';

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

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export const getBuses = () => apiFetch<BusData[]>('/api/buses');

export async function registerPushToken(token: string, lines: string[]): Promise<void> {
  await apiFetch('/api/push/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, lines }),
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

- [ ] **Step 5: Run — verify PASS**

```bash
npx jest __tests__/stops.test.ts --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
cd ..
git add upbus-mobile/constants/ upbus-mobile/lib/ upbus-mobile/__tests__/stops.test.ts
git commit -m "feat: stops constants and API layer"
```

---

### Task 6: Hooks — useBuses & usePushToken

**Files:**
- Create: `upbus-mobile/hooks/useBuses.ts`
- Create: `upbus-mobile/hooks/usePushToken.ts`
- Test: `upbus-mobile/__tests__/useBuses.test.ts`

**Interfaces:**
- Consumes: `getBuses`, `registerPushToken` from `lib/api.ts` (Task 5)
- Produces:
  - `useBuses(): { buses: BusData[]; error: Error | null }` — polls every 5s
  - `usePushToken(): { token: string | null; updateLines(lines: string[]): Promise<void> }`

- [ ] **Step 1: Write failing test**

```ts
// upbus-mobile/__tests__/useBuses.test.ts
import { renderHook, act } from '@testing-library/react-native';

jest.mock('../lib/api', () => ({ getBuses: jest.fn() }));
import { getBuses } from '../lib/api';
const mockGetBuses = getBuses as jest.MockedFunction<typeof getBuses>;

// Import after mock
const { useBuses } = require('../hooks/useBuses');

describe('useBuses', () => {
  beforeEach(() => { jest.useFakeTimers(); mockGetBuses.mockResolvedValue([]); });
  afterEach(() => jest.useRealTimers());

  it('returns empty array initially', () => {
    const { result } = renderHook(() => useBuses());
    expect(result.current.buses).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('populates buses after fetch', async () => {
    const fakeBus = { imei_id: 'TC001', latitude: 19.02, longitude: 99.89, speed: 10, bearing: 0, soc: 80, acc: 1 as const, color: 'Green' as const, driver: 'Test', date: '', department: null };
    mockGetBuses.mockResolvedValue([fakeBus]);
    const { result } = renderHook(() => useBuses());
    await act(async () => { await Promise.resolve(); });
    expect(result.current.buses).toEqual([fakeBus]);
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
cd upbus-mobile && npx jest __tests__/useBuses.test.ts --no-coverage
```

Expected: FAIL "Cannot find module '../hooks/useBuses'"

- [ ] **Step 3: Create hooks/useBuses.ts**

```ts
// upbus-mobile/hooks/useBuses.ts
import { useEffect, useRef, useState } from 'react';
import { getBuses, BusData } from '@/lib/api';

export function useBuses() {
  const [buses, setBuses] = useState<BusData[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const data = await getBuses();
        if (alive) { setBuses(data); setError(null); }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e : new Error(String(e)));
      }
    }
    poll();
    timer.current = setInterval(poll, 5000);
    return () => { alive = false; clearInterval(timer.current!); };
  }, []);

  return { buses, error };
}
```

- [ ] **Step 4: Create hooks/usePushToken.ts**

```ts
// upbus-mobile/hooks/usePushToken.ts
import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerPushToken } from '@/lib/api';

const TOKEN_KEY  = '@upbus/pushToken';
const LINES_KEY  = '@upbus/subscribedLines';
const ALL_LINES  = ['Red', 'Green', 'Blue'];

export function usePushToken() {
  const [token, setToken] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;

      const { data } = await Notifications.getExpoPushTokenAsync();
      tokenRef.current = data;
      setToken(data);
      await AsyncStorage.setItem(TOKEN_KEY, data);

      const raw = await AsyncStorage.getItem(LINES_KEY);
      const lines = raw ? JSON.parse(raw) : ALL_LINES;
      await registerPushToken(data, lines);
    })().catch(console.error);
  }, []);

  async function updateLines(lines: string[]) {
    await AsyncStorage.setItem(LINES_KEY, JSON.stringify(lines));
    if (tokenRef.current) await registerPushToken(tokenRef.current, lines);
  }

  return { token, updateLines };
}
```

- [ ] **Step 5: Run — verify PASS**

```bash
npx jest __tests__/useBuses.test.ts --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
cd ..
git add upbus-mobile/hooks/ upbus-mobile/__tests__/useBuses.test.ts
git commit -m "feat: useBuses polling hook and usePushToken"
```

---

### Task 7: Map Screen

**Files:**
- Modify: `upbus-mobile/app/(tabs)/index.tsx`
- Create: `upbus-mobile/components/BusMarker.tsx`
- Create: `upbus-mobile/components/BusStopMarker.tsx`

**Interfaces:**
- Consumes: `useBuses` (Task 6), `LINE_STOPS`, `LINE_COLORS` (Task 5), `BusData`, `BusColor` (Task 5)
- Produces: Map Screen component

- [ ] **Step 1: Create components/BusMarker.tsx**

```tsx
// upbus-mobile/components/BusMarker.tsx
import { Marker } from 'react-native-maps';
import { BusData, BusColor } from '@/lib/api';

const COLOR_HEX: Record<BusColor, string> = {
  Red: '#e74c3c', Green: '#2ecc71', Blue: '#3498db',
  Purple: '#9b59b6', Orange: '#e67e22', Yellow: '#f1c40f', White: '#bdc3c7',
};

export default function BusMarker({ bus }: { bus: BusData }) {
  if (!bus.latitude || !bus.longitude) return null;
  return (
    <Marker
      coordinate={{ latitude: bus.latitude, longitude: bus.longitude }}
      title={bus.imei_id}
      description={`สาย: ${bus.color} | ${bus.driver}`}
      pinColor={COLOR_HEX[bus.color] ?? '#9b59b6'}
    />
  );
}
```

- [ ] **Step 2: Create components/BusStopMarker.tsx**

```tsx
// upbus-mobile/components/BusStopMarker.tsx
import { Marker } from 'react-native-maps';
import { Stop } from '@/constants/stops';

export default function BusStopMarker({ stop, color }: { stop: Stop; color: string }) {
  return (
    <Marker
      coordinate={{ latitude: stop.lat, longitude: stop.lng }}
      title={stop.name}
      pinColor={color}
      anchor={{ x: 0.5, y: 0.5 }}
    />
  );
}
```

- [ ] **Step 3: Replace app/(tabs)/index.tsx**

```tsx
// upbus-mobile/app/(tabs)/index.tsx
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { useBuses } from '@/hooks/useBuses';
import { LINE_STOPS, LINE_COLORS } from '@/constants/stops';
import BusMarker from '@/components/BusMarker';
import BusStopMarker from '@/components/BusStopMarker';

type LineKey = 'Red' | 'Green' | 'Blue';
const ALL_LINES: LineKey[] = ['Red', 'Green', 'Blue'];
const UP_REGION = { latitude: 19.029, longitude: 99.903, latitudeDelta: 0.04, longitudeDelta: 0.04 };

export default function MapScreen() {
  const { buses, error } = useBuses();
  const [active, setActive] = useState<Set<LineKey>>(new Set(ALL_LINES));

  function toggle(line: LineKey) {
    setActive(prev => { const n = new Set(prev); n.has(line) ? n.delete(line) : n.add(line); return n; });
  }

  const visible = buses.filter(b =>
    b.color === 'Purple' || (ALL_LINES.includes(b.color as LineKey) && active.has(b.color as LineKey))
  );

  return (
    <View style={s.container}>
      <MapView style={s.map} provider={PROVIDER_GOOGLE} initialRegion={UP_REGION} showsUserLocation>
        {ALL_LINES.filter(l => active.has(l)).map(line => (
          <Polyline key={line}
            coordinates={LINE_STOPS[line].map(st => ({ latitude: st.lat, longitude: st.lng }))}
            strokeColor={LINE_COLORS[line]} strokeWidth={3} />
        ))}
        {ALL_LINES.filter(l => active.has(l)).flatMap(line =>
          LINE_STOPS[line].map(stop =>
            <BusStopMarker key={`${line}-${stop.name}`} stop={stop} color={LINE_COLORS[line]} />
          )
        )}
        {visible.map(bus => <BusMarker key={bus.imei_id} bus={bus} />)}
      </MapView>

      <View style={s.filters}>
        {ALL_LINES.map(line => (
          <TouchableOpacity key={line} style={[s.btn, { backgroundColor: active.has(line) ? LINE_COLORS[line] : '#ccc' }]} onPress={() => toggle(line)}>
            <Text style={s.btnText}>{line}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && (
        <View style={s.errBanner}><Text style={s.errText}>ไม่สามารถโหลดข้อมูลรถได้</Text></View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  map:       { flex: 1 },
  filters:   { position: 'absolute', bottom: 32, left: 16, right: 16, flexDirection: 'row', justifyContent: 'center', gap: 12 },
  btn:       { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  errBanner: { position: 'absolute', top: 60, left: 16, right: 16, backgroundColor: '#e74c3c', padding: 8, borderRadius: 8 },
  errText:   { color: '#fff', textAlign: 'center' },
});
```

- [ ] **Step 4: Test on iOS Simulator**

```bash
cd upbus-mobile && npx expo run:ios
```

Expected: Map centered on มหาวิทยาลัยพะเยา. Bus markers appear within 5s. Filter buttons toggle lines. Stop markers visible per line.

- [ ] **Step 5: Commit**

```bash
cd ..
git add upbus-mobile/app/\(tabs\)/index.tsx upbus-mobile/components/
git commit -m "feat: Map Screen with bus/stop markers and line filter"
```

---

### Task 8: Routes Screen + Alert Screen + Tab Navigator

**Files:**
- Delete: `upbus-mobile/app/(tabs)/explore.tsx`
- Create: `upbus-mobile/app/(tabs)/routes.tsx`
- Create: `upbus-mobile/app/(tabs)/alerts.tsx`
- Modify: `upbus-mobile/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `LINE_STOPS`, `LINE_COLORS`, `LINE_NAMES` (Task 5), `usePushToken` (Task 6)
- Produces: 3-tab navigation (แผนที่ / สายรถ / แจ้งเตือน)

- [ ] **Step 1: Delete default explore tab**

```bash
cd upbus-mobile && rm app/\(tabs\)/explore.tsx
```

- [ ] **Step 2: Create app/(tabs)/routes.tsx**

```tsx
// upbus-mobile/app/(tabs)/routes.tsx
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LINE_STOPS, LINE_COLORS, LINE_NAMES } from '@/constants/stops';

type LineKey = 'Red' | 'Green' | 'Blue';

export default function RoutesScreen() {
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>เส้นทางและป้ายหยุด</Text>
      {(['Red', 'Green', 'Blue'] as LineKey[]).map(line => (
        <View key={line} style={s.card}>
          <View style={[s.header, { backgroundColor: LINE_COLORS[line] }]}>
            <Text style={s.headerText}>{LINE_NAMES[line]}</Text>
          </View>
          {LINE_STOPS[line].map((stop, i) => (
            <View key={i} style={s.row}>
              <View style={[s.dot, { backgroundColor: LINE_COLORS[line] }]} />
              <Text style={s.stopName}>{stop.name}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content:   { padding: 16 },
  title:     { fontSize: 22, fontWeight: '700', marginBottom: 16, marginTop: 8 },
  card:      { marginBottom: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  header:    { padding: 12 },
  headerText:{ color: '#fff', fontWeight: '700', fontSize: 16 },
  row:       { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  dot:       { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  stopName:  { fontSize: 14, color: '#333' },
});
```

- [ ] **Step 3: Create app/(tabs)/alerts.tsx**

```tsx
// upbus-mobile/app/(tabs)/alerts.tsx
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePushToken } from '@/hooks/usePushToken';
import { LINE_COLORS, LINE_NAMES } from '@/constants/stops';

type LineKey = 'Red' | 'Green' | 'Blue';
const ALL_LINES: LineKey[] = ['Red', 'Green', 'Blue'];
const LINES_KEY = '@upbus/subscribedLines';

export default function AlertsScreen() {
  const { token, updateLines } = usePushToken();
  const [subscribed, setSubscribed] = useState<Set<LineKey>>(new Set(ALL_LINES));

  useEffect(() => {
    AsyncStorage.getItem(LINES_KEY).then(raw => {
      if (raw) setSubscribed(new Set(JSON.parse(raw) as LineKey[]));
    });
  }, []);

  async function toggle(line: LineKey) {
    setSubscribed(prev => {
      const next = new Set(prev);
      next.has(line) ? next.delete(line) : next.add(line);
      updateLines([...next]);
      return next;
    });
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>ตั้งค่าการแจ้งเตือน</Text>
      <Text style={s.sub}>แจ้งเตือนเมื่อรถอยู่ห่างจากป้าย &lt; 200 เมตร</Text>

      {ALL_LINES.map(line => (
        <View key={line} style={s.row}>
          <View style={[s.dot, { backgroundColor: LINE_COLORS[line] }]} />
          <Text style={s.name}>{LINE_NAMES[line]}</Text>
          <Switch value={subscribed.has(line)} onValueChange={() => toggle(line)}
            trackColor={{ true: LINE_COLORS[line] }} />
        </View>
      ))}

      {!token && (
        <View style={s.notice}>
          <Text style={s.noticeText}>กรุณาอนุญาตการแจ้งเตือนในการตั้งค่าอุปกรณ์</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content:   { padding: 16 },
  title:     { fontSize: 22, fontWeight: '700', marginBottom: 4, marginTop: 8 },
  sub:       { fontSize: 13, color: '#666', marginBottom: 24 },
  row:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  dot:       { width: 14, height: 14, borderRadius: 7, marginRight: 12 },
  name:      { flex: 1, fontSize: 16, fontWeight: '500' },
  notice:    { marginTop: 16, padding: 12, backgroundColor: '#fef3cd', borderRadius: 8, borderWidth: 1, borderColor: '#ffc107' },
  noticeText:{ color: '#856404', fontSize: 13 },
});
```

- [ ] **Step 4: Update app/(tabs)/_layout.tsx**

```tsx
// upbus-mobile/app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#5c2d91' }}>
      <Tabs.Screen name="index"
        options={{ title: 'แผนที่', headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} /> }} />
      <Tabs.Screen name="routes"
        options={{ title: 'สายรถ',
          tabBarIcon: ({ color, size }) => <Ionicons name="bus" size={size} color={color} /> }} />
      <Tabs.Screen name="alerts"
        options={{ title: 'แจ้งเตือน',
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} /> }} />
    </Tabs>
  );
}
```

- [ ] **Step 5: Test all tabs on iOS Simulator**

```bash
cd upbus-mobile && npx expo run:ios
```

Expected: 3 tabs at bottom bar (แผนที่ / สายรถ / แจ้งเตือน). Notification permission popup on first launch. Routes screen shows stops per line. Alert screen shows toggles.

- [ ] **Step 6: Test on Android Emulator**

```bash
npx expo run:android
```

Expected: identical behavior on Android. Push token registered to backend (check backend logs for `POST /api/push/register 200`).

- [ ] **Step 7: Commit**

```bash
cd ..
git add upbus-mobile/app/
git commit -m "feat: Routes Screen, Alert Screen, and Tab Navigator"
```

---

## Self-Review

**Spec coverage:**
| Requirement | Task |
|---|---|
| Expo managed workflow iOS+Android | Task 4 |
| Real-time map polling 5s | Task 6, 7 |
| Bus markers colored by line | Task 7 |
| Bus stop markers per line | Task 7 |
| Route polylines (line path) | Task 7 |
| Line filter toggle | Task 7 |
| push_tokens DB table | Task 1 |
| POST /api/push/register | Task 2 |
| DELETE /api/push/unregister | Task 2 |
| Notification dispatch in gpsPoller | Task 3 |
| Only Red/Green/Blue trigger notif | Task 3 |
| Purple excluded (no line) | Task 3 |
| speed > 2 km/h check | Task 3 |
| Cooldown 3 min | Task 3 |
| App Store bundle IDs configured | Task 4 |
| Google Maps API Key wired | Task 4 |
| No login | Tasks 7, 8 |
| Routes Screen (stops list) | Task 8 |
| Alert Screen (toggle per line) | Task 8 |
| 3-tab navigation | Task 8 |

**Placeholder scan:** None found — all steps have full code.

**Type consistency:**
- `BusData`, `BusColor` defined in Task 5, consumed in Tasks 6, 7 ✓
- `Stop`, `LINE_STOPS`, `LINE_COLORS`, `LINE_NAMES` defined in Task 5, consumed in Tasks 7, 8 ✓
- `useBuses()` → `{ buses, error }` — consistent Task 6 → Task 7 ✓
- `usePushToken()` → `{ token, updateLines }` — consistent Task 6 → Task 8 ✓
- `registerPushToken(token, lines)` — consistent Task 5 → Task 6 ✓
