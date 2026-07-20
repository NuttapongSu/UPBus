# Animation Improvements + Hourly Distance Chart — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่ม Conservative DR Decay, Stop Window Detection, Position Blending 500ms และ Hourly Distance Bar Chart (06–22) ใน BusDetailPanel

**Architecture:** Features 1–3 แก้ที่ `busMotionEngine.ts` (physics) และ `useBusMarkers.ts` (render loop) โดยไม่เปลี่ยน interface ของ component อื่น Feature 4 เพิ่ม backend endpoint + frontend chart component ใน BusDetailPanel

**Tech Stack:** Next.js 14 + TypeScript + Leaflet (frontend), Node.js + Express + MySQL (backend), Jest + supertest (backend tests)

## Global Constraints

- ห้าม mutate `BusMotionState` โดยตรง — ใช้ spread `{ ...state, field: value }` เสมอ
- หน่วยระยะทาง: เมตร ใน engine, กิโลเมตร ใน UI
- หน่วยเวลา: วินาที ใน business logic, milliseconds ใน timing/animation
- `DECAY_K = 0.15` — ค่า fixed ไม่ใช้ env var
- `STOP_RADIUS_M = 50`, `STOP_SPEED_MS = 1.39` (≈5 km/h)
- `BLEND_MS = 500`
- Hourly chart slots: ชั่วโมง 6–22 (17 bars), refresh interval 60,000ms
- Frontend ไม่มี test runner — ใช้ manual browser verification แทน
- Backend tests: `cd backend && npm test`

---

## File Map

| ไฟล์ | สิ่งที่เปลี่ยน |
|---|---|
| `frontend/lib/busMotionEngine.ts` | เพิ่ม `msElapsedSinceGps`, blend fields ใน state; DR decay + stop window ใน `advanceFrame`; blend init ใน `onGpsUpdate` |
| `frontend/components/Map/useBusMarkers.ts` | ส่ง `stops` เข้า `advanceFrame`; คำนวณ blend position ก่อน `setLatLng` |
| `frontend/lib/api.ts` | เพิ่ม `HourlyData` interface + `getBusHourly` function |
| `frontend/components/Dashboard/BusDetailPanel.tsx` | เพิ่ม `HourlyChart` component + SWR fetch แสดงเหนือ 7-day chart |
| `backend/routes/buses.js` | เพิ่ม `GET /api/buses/:id/hourly` endpoint |
| `backend/__tests__/buses.test.js` | เพิ่ม test สำหรับ `/hourly` endpoint |

---

## Task 1: Conservative DR Decay

**Files:**
- Modify: `frontend/lib/busMotionEngine.ts`

**Interfaces:**
- Produces: `BusMotionState.msElapsedSinceGps: number` — ms นับจาก GPS poll ล่าสุด (ใช้โดย Task 2 และ Task 3 ด้วย)

- [ ] **Step 1: เพิ่ม `msElapsedSinceGps` ใน `BusMotionState` interface**

ใน `frontend/lib/busMotionEngine.ts` บรรทัด 10–23 เพิ่ม field ใหม่:

```typescript
export interface BusMotionState {
  routeIdx:       number;
  routeT:         number;
  direction:      1 | -1;
  directionLock:  number;
  speedMs:        number;
  multiplier:     number;
  targetMultiplier: number;
  lat:            number;
  lng:            number;
  bearing:        number;
  activeColor?:   string;
  confirmed:      boolean;
  msElapsedSinceGps: number;   // เพิ่ม: ms นับจาก GPS poll ล่าสุด
}
```

- [ ] **Step 2: Reset `msElapsedSinceGps = 0` ใน `onGpsUpdate`**

ใน return statement ของ `onGpsUpdate` (บรรทัด ~368–380) เพิ่ม field:

```typescript
  return {
    routeIdx:  animIdx,
    routeT:    animT,
    direction,
    directionLock,
    speedMs,
    multiplier:       prev?.multiplier       ?? targetMultiplier,
    targetMultiplier,
    lat: prev?.lat ?? gpsNow.lat,
    lng: prev?.lng ?? gpsNow.lng,
    bearing: prev?.bearing ?? gpsBearing,
    confirmed: true,
    msElapsedSinceGps: 0,   // reset ทุกครั้งที่ GPS poll มาถึง
  };
```

ใน return ของกรณี `prev === null` (บรรทัด ~258–265) และกรณี `route.length < 2` (บรรทัด ~243–251) เพิ่ม `msElapsedSinceGps: 0` ด้วย:

```typescript
  // กรณี prev === null
  return {
    routeIdx: 0, routeT: 0,
    direction: 1,
    directionLock: 0,
    speedMs, multiplier: 1, targetMultiplier: 1,
    lat: gpsLat, lng: gpsLng, bearing: gpsBearing,
    confirmed: false,
    msElapsedSinceGps: 0,
  };
```

```typescript
  // กรณี route.length < 2
  return {
    routeIdx: 0, routeT: 0,
    direction: prev?.direction ?? 1,
    directionLock: prev?.directionLock ?? 0,
    speedMs, multiplier: prev?.multiplier ?? 1, targetMultiplier: 1,
    lat: gpsLat, lng: gpsLng, bearing: gpsBearing,
    confirmed: false,
    msElapsedSinceGps: 0,
  };
```

- [ ] **Step 3: Apply DR decay ใน `advanceFrame`**

ใน `advanceFrame` (บรรทัด ~383–412) แก้ส่วน effective distance:

```typescript
export function advanceFrame(
  state: BusMotionState,
  route: RoutePoint[],
  dtMs:  number,
  intersections?: IntersectionPoint[],
): BusMotionState {
  if (route.length < 2) return state;
  if (!state.confirmed) return state;

  const multiplier = state.multiplier + (state.targetMultiplier - state.multiplier) * 0.04;

  // อัปเดต elapsed time ก่อนทุกอย่าง
  const msElapsedSinceGps = state.msElapsedSinceGps + dtMs;

  const haltedAtIntersection = !!intersections && intersections.some(
    p => haversine(state.lat, state.lng, p.lat, p.lng) <= p.radiusM
  );
  if (haltedAtIntersection) return { ...state, multiplier, msElapsedSinceGps };

  // Conservative DR decay: ยิ่งเวลาผ่านนาน speed ยิ่งลด
  const DECAY_K = 0.15;
  const elapsedSec = msElapsedSinceGps / 1000;
  const decayedSpeed = state.speedMs * Math.exp(-DECAY_K * elapsedSec);

  const effectiveDist = decayedSpeed * multiplier * (dtMs / 1000);
  if (effectiveDist <= 0) return { ...state, multiplier, msElapsedSinceGps };

  const next = advance(route, state.routeIdx, state.routeT, effectiveDist, state.direction);
  const bearing = bearingOfSegment(route, next.idx, state.direction);
  return {
    ...state,
    multiplier,
    msElapsedSinceGps,
    routeIdx: next.idx,
    routeT: next.t,
    lat: next.lat,
    lng: next.lng,
    bearing,
  };
}
```

- [ ] **Step 4: Manual verification**

1. เปิด `cd frontend && npm run dev`
2. เปิด browser ที่ `http://localhost:3000`
3. เปิด DevTools → Console → ตรวจ ไม่มี TypeScript error
4. รอ 30+ วินาทีโดยไม่มี GPS update → ตรวจว่า marker ค่อยๆ หยุดแทนที่จะวิ่งต่อ

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/busMotionEngine.ts
git commit -m "feat(web): add conservative DR decay to bus motion engine"
```

---

## Task 2: Stop Window Detection

**Files:**
- Modify: `frontend/lib/busMotionEngine.ts`
- Modify: `frontend/components/Map/useBusMarkers.ts`

**Interfaces:**
- Consumes: `BusMotionState.msElapsedSinceGps` จาก Task 1
- Consumes: `stops: RoutePoint[]` — ส่งเข้า `advanceFrame` จาก `useBusMarkers`
- Produces: `advanceFrame(state, route, dtMs, stops: RoutePoint[], intersections?)` — signature ใหม่

- [ ] **Step 1: เปลี่ยน `advanceFrame` signature และเพิ่ม stop window check**

ใน `frontend/lib/busMotionEngine.ts` แก้ `advanceFrame` — เพิ่ม `stops` parameter และ check ก่อน intersection check:

```typescript
export function advanceFrame(
  state: BusMotionState,
  route: RoutePoint[],
  dtMs:  number,
  stops: RoutePoint[],               // เพิ่ม: ส่งมาจาก useBusMarkers
  intersections?: IntersectionPoint[],
): BusMotionState {
  if (route.length < 2) return state;
  if (!state.confirmed) return state;

  const multiplier = state.multiplier + (state.targetMultiplier - state.multiplier) * 0.04;
  const msElapsedSinceGps = state.msElapsedSinceGps + dtMs;

  // Stop Window: หยุดนิ่งถ้าอยู่ใกล้ป้าย (<50m) และความเร็วต่ำ (<5 km/h)
  const STOP_RADIUS_M = 50;
  const STOP_SPEED_MS = 1.39; // 5 km/h
  if (state.speedMs < STOP_SPEED_MS && stops.length > 0) {
    const nearStop = stops.some(
      s => haversine(state.lat, state.lng, s.lat, s.lng) < STOP_RADIUS_M
    );
    if (nearStop) return { ...state, multiplier, msElapsedSinceGps };
  }

  const haltedAtIntersection = !!intersections && intersections.some(
    p => haversine(state.lat, state.lng, p.lat, p.lng) <= p.radiusM
  );
  if (haltedAtIntersection) return { ...state, multiplier, msElapsedSinceGps };

  const DECAY_K = 0.15;
  const elapsedSec = msElapsedSinceGps / 1000;
  const decayedSpeed = state.speedMs * Math.exp(-DECAY_K * elapsedSec);

  const effectiveDist = decayedSpeed * multiplier * (dtMs / 1000);
  if (effectiveDist <= 0) return { ...state, multiplier, msElapsedSinceGps };

  const next = advance(route, state.routeIdx, state.routeT, effectiveDist, state.direction);
  const bearing = bearingOfSegment(route, next.idx, state.direction);
  return {
    ...state,
    multiplier,
    msElapsedSinceGps,
    routeIdx: next.idx,
    routeT: next.t,
    lat: next.lat,
    lng: next.lng,
    bearing,
  };
}
```

- [ ] **Step 2: อัปเดต call site ใน `useBusMarkers.ts`**

ใน `frontend/components/Map/useBusMarkers.ts` ใน animation loop (บรรทัด ~203–221) แก้การเรียก `advanceFrame`:

```typescript
      markersRef.current.forEach(state => {
        const routeColor = state.motion.activeColor ?? state.color;
        const route = (routeRef.current[routeColor] ?? []) as RoutePoint[];
        if (route.length < 2) return;

        // ดึง stops ของสายนี้สำหรับ stop window check
        const stops = (stopsRef.current[routeColor] ?? []) as RoutePoint[];

        const intersections = state.color === 'Purple' ? ROUTE_INTERSECTIONS : undefined;
        const next = advanceFrame(state.motion, route, dt, stops, intersections);
        state.motion = next;

        const displayed = offsetLeft(
          { lat: next.lat, lng: next.lng } as LatLng,
          next.bearing, 3.5,
        );
        state.marker.setLatLng([displayed.lat, displayed.lng]);

        const goingLeft = next.bearing >= 0 && next.bearing <= 180;
        const imgEl = state.marker.getElement()?.querySelector('img') as HTMLImageElement | null;
        if (imgEl) imgEl.style.transform = goingLeft ? 'scaleX(-1)' : '';
      });
```

- [ ] **Step 3: เพิ่ม `stopsRef` ใน `useBusMarkers`**

ใน `useBusMarkers` function บรรทัด ~50–56 เพิ่ม ref สำหรับ stops:

```typescript
  const markersRef       = useRef<Map<string, MarkerState>>(new Map());
  const animRef          = useRef<number | null>(null);
  const lastFrameRef     = useRef<number>(0);
  const routeRef         = useRef(routePathByColor);
  const stopsRef         = useRef(stopsByColor);       // เพิ่ม
  const serverOffsetRef  = useRef(0);
  const listenerReadyRef = useRef(false);
```

และเพิ่ม effect ให้ stopsRef sync กับ prop:

```typescript
  useEffect(() => { routeRef.current = routePathByColor; }, [routePathByColor]);
  useEffect(() => { stopsRef.current = stopsByColor; }, [stopsByColor]);  // เพิ่ม
```

- [ ] **Step 4: Manual verification**

1. `npm run dev` (frontend)
2. เปิด browser → เลือกรถที่กำลังวิ่งเข้าป้าย
3. ตรวจว่า marker หยุดนิ่งเมื่อ speed < 5 km/h และอยู่ใกล้ป้าย
4. ตรวจว่า TypeScript compile ไม่มี error (ดู terminal ที่รัน `npm run dev`)

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/busMotionEngine.ts frontend/components/Map/useBusMarkers.ts
git commit -m "feat(web): add stop window detection — halt marker near stops at low speed"
```

---

## Task 3: Position Blending (500ms)

**Files:**
- Modify: `frontend/lib/busMotionEngine.ts`
- Modify: `frontend/components/Map/useBusMarkers.ts`

**Interfaces:**
- Consumes: `BusMotionState.msElapsedSinceGps` จาก Task 1, `advanceFrame` signature จาก Task 2
- Produces: `BusMotionState.blendFromLat?: number`, `BusMotionState.blendFromLng?: number`, `BusMotionState.blendStartMs?: number`

- [ ] **Step 1: เพิ่ม blend fields ใน `BusMotionState`**

ใน `frontend/lib/busMotionEngine.ts` เพิ่มใน interface:

```typescript
export interface BusMotionState {
  routeIdx:       number;
  routeT:         number;
  direction:      1 | -1;
  directionLock:  number;
  speedMs:        number;
  multiplier:     number;
  targetMultiplier: number;
  lat:            number;
  lng:            number;
  bearing:        number;
  activeColor?:   string;
  confirmed:      boolean;
  msElapsedSinceGps: number;
  blendFromLat?:  number;   // เพิ่ม: ตำแหน่ง predicted ก่อน GPS update ใหม่
  blendFromLng?:  number;
  blendStartMs?:  number;   // เพิ่ม: timestamp เริ่ม blend (Date.now())
}
```

- [ ] **Step 2: Set blend state ใน `onGpsUpdate`**

ใน `onGpsUpdate` return statement สุดท้าย (กรณี confirmed) เพิ่ม blend:

```typescript
  // คำนวณระยะห่างระหว่าง prev position กับ GPS snapped ใหม่
  // ถ้า prev confirmed และห่างกัน > 2m → เริ่ม blend
  const prevLat = prev?.lat;
  const prevLng = prev?.lng;
  const shouldBlend = prev?.confirmed === true
    && prevLat !== undefined
    && prevLng !== undefined
    && haversine(prevLat, prevLng, gpsNow.lat, gpsNow.lng) > 2;

  return {
    routeIdx:  animIdx,
    routeT:    animT,
    direction,
    directionLock,
    speedMs,
    multiplier:       prev?.multiplier       ?? targetMultiplier,
    targetMultiplier,
    lat: prev?.lat ?? gpsNow.lat,
    lng: prev?.lng ?? gpsNow.lng,
    bearing: prev?.bearing ?? gpsBearing,
    confirmed: true,
    msElapsedSinceGps: 0,
    blendFromLat: shouldBlend ? prevLat : undefined,
    blendFromLng: shouldBlend ? prevLng : undefined,
    blendStartMs: shouldBlend ? Date.now() : undefined,
  };
```

- [ ] **Step 3: คำนวณ blend position ใน animation loop (`useBusMarkers.ts`)**

ใน animation loop แก้ส่วนที่คำนวณ `displayed` position:

```typescript
        const next = advanceFrame(state.motion, route, dt, stops, intersections);
        state.motion = next;

        // Blend: lerp จาก predicted → actual ใน 500ms หลัง GPS update
        const BLEND_MS = 500;
        let displayLat = next.lat;
        let displayLng = next.lng;
        if (next.blendFromLat !== undefined && next.blendStartMs !== undefined) {
          const t = Math.min(1, (Date.now() - next.blendStartMs) / BLEND_MS);
          displayLat = next.blendFromLat + (next.lat - next.blendFromLat) * t;
          displayLng = next.blendFromLng! + (next.lng - next.blendFromLng!) * t;
          // เมื่อ blend เสร็จ → clear blend fields เพื่อไม่ให้ compute ซ้ำ
          if (t >= 1) {
            state.motion = {
              ...next,
              blendFromLat: undefined,
              blendFromLng: undefined,
              blendStartMs: undefined,
            };
          }
        }

        const displayed = offsetLeft(
          { lat: displayLat, lng: displayLng } as LatLng,
          next.bearing, 3.5,
        );
        state.marker.setLatLng([displayed.lat, displayed.lng]);
```

- [ ] **Step 4: Manual verification**

1. `npm run dev` (frontend)
2. เปิด browser → ดู marker ที่กำลังวิ่ง
3. รอ GPS poll ใหม่ (ทุก 10 วิ) → ตรวจว่า marker เลื่อนแบบ smooth ไม่กระโดด
4. ตรวจ TypeScript ไม่มี error ใน terminal

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/busMotionEngine.ts frontend/components/Map/useBusMarkers.ts
git commit -m "feat(web): smooth blend marker position 500ms on GPS update"
```

---

## Task 4: Backend Hourly Distance Endpoint

**Files:**
- Modify: `backend/routes/buses.js`
- Modify: `backend/__tests__/buses.test.js`

**Interfaces:**
- Produces: `GET /api/buses/:id/hourly` → `{ hourly: [{ hour: number, km: number }] }`
  - `hour`: 0–23 (integer)
  - `km`: ระยะทาง (กม., ทศนิยม 1 ตำแหน่ง, cap 150 กม./ชั่วโมง)
  - คืนเฉพาะชั่วโมงที่มีข้อมูล (frontend fill ช่องว่างด้วย 0)

- [ ] **Step 1: เขียน test ก่อน**

ใน `backend/__tests__/buses.test.js` เพิ่ม test สำหรับ `/hourly`:

```javascript
// เพิ่มที่ท้ายไฟล์ (ใต้ describe block เดิม)

describe('GET /api/buses/:id/hourly', () => {
  beforeEach(() => {
    const db = require('../db');
    // mock sequence: hourly query
    db.query
      .mockResolvedValueOnce([[
        // gps_snapshots grouped by hour
        { hour: 7, km: 12.3 },
        { hour: 8, km: 18.7 },
        { hour: 9, km:  5.1 },
      ]]);
  });

  test('returns hourly km array', async () => {
    const res = await request(app).get('/api/buses/TC001/hourly');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('hourly');
    expect(Array.isArray(res.body.hourly)).toBe(true);
    expect(res.body.hourly[0]).toHaveProperty('hour');
    expect(res.body.hourly[0]).toHaveProperty('km');
  });

  test('caps km at 150 per hour', async () => {
    const db = require('../db');
    db.query.mockResolvedValueOnce([[{ hour: 10, km: 999 }]]);
    const res = await request(app).get('/api/buses/TC001/hourly');
    expect(res.status).toBe(200);
    expect(res.body.hourly[0].km).toBeLessThanOrEqual(150);
  });

  test('returns empty array when no data', async () => {
    const db = require('../db');
    db.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/buses/TC001/hourly');
    expect(res.status).toBe(200);
    expect(res.body.hourly).toEqual([]);
  });
});
```

- [ ] **Step 2: รัน test ให้ fail ก่อน**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/UPBus/backend
npm test -- --testPathPattern=buses
```

Expected: FAIL — `Cannot GET /api/buses/TC001/hourly`

- [ ] **Step 3: เพิ่ม endpoint ใน `backend/routes/buses.js`**

เพิ่มก่อน `module.exports = router;`:

```javascript
// GET /api/buses/:id/hourly — km per hour today (06:00-22:00)
router.get('/:id/hourly', async (req, res) => {
  const busId = req.params.id.toUpperCase();
  try {
    const [rows] = await db.query(
      `SELECT
         HOUR(recorded_at) AS hour,
         GREATEST(0, (MAX(odo) - MIN(odo)) / 1000) AS km
       FROM gps_snapshots
       WHERE bus_id = ?
         AND DATE(recorded_at) = CURDATE()
         AND odo > 0
       GROUP BY HOUR(recorded_at)
       ORDER BY hour ASC`,
      [busId]
    );

    const MAX_KM_PER_HOUR = 150;
    const hourly = rows.map(r => ({
      hour: r.hour,
      km: Math.min(parseFloat(r.km) || 0, MAX_KM_PER_HOUR),
    }));

    res.json({ hourly });
  } catch (err) {
    console.error('Bus hourly error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});
```

**สำคัญ:** endpoint `/:id/hourly` ต้องอยู่ **ก่อน** `/:id` เพื่อไม่ให้ Express match `hourly` เป็น `:id`

ตรวจลำดับ route ใน `buses.js`:
1. `GET /` — list all buses
2. `GET /:id/hourly` — **ต้องอยู่ก่อน**
3. `GET /:id` — detail

- [ ] **Step 4: รัน test ให้ผ่าน**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/UPBus/backend
npm test -- --testPathPattern=buses
```

Expected: PASS — 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/routes/buses.js backend/__tests__/buses.test.js
git commit -m "feat(api): add GET /api/buses/:id/hourly endpoint"
```

---

## Task 5: Frontend Hourly Distance Chart

**Files:**
- Modify: `frontend/lib/api.ts`
- Modify: `frontend/components/Dashboard/BusDetailPanel.tsx`

**Interfaces:**
- Consumes: `GET /api/buses/:id/hourly` จาก Task 4
- Produces: `HourlyChart` component แสดงเหนือ 7-day chart ใน `BusDetailPanel`

- [ ] **Step 1: เพิ่ม type + fetch function ใน `api.ts`**

ใน `frontend/lib/api.ts` เพิ่มก่อน `export interface SustainabilityData`:

```typescript
export interface HourlyData {
  hourly: { hour: number; km: number }[];
}
export const getBusHourly = (busId: string) =>
  apiFetch<HourlyData>(`/api/buses/${busId}/hourly`);
```

- [ ] **Step 2: เพิ่ม `HourlyChart` component และ SWR fetch ใน `BusDetailPanel.tsx`**

เพิ่ม import ที่หัวไฟล์:

```typescript
import useSWR from 'swr';
import { getBusDetail, getBusHourly, BusDetail, HourlyData } from '@/lib/api';
```

เพิ่ม `HourlyChart` component ก่อน `export default function BusDetailPanel`:

```typescript
const HOUR_SLOTS = Array.from({ length: 17 }, (_, i) => i + 6); // 6..22

function HourlyChart({ busId, color }: { busId: string; color: string }) {
  const { data } = useSWR<HourlyData>(
    busId ? `/api/buses/${busId}/hourly` : null,
    () => getBusHourly(busId),
    { refreshInterval: 60_000 }
  );

  const kmByHour = new Map<number, number>();
  data?.hourly.forEach(h => kmByHour.set(h.hour, h.km));
  const maxKm = Math.max(...HOUR_SLOTS.map(h => kmByHour.get(h) ?? 0), 1);

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-3 border border-[#2a2a4a] mb-3">
      <p className="text-[10px] text-gray-500 mb-3">ระยะทางรายชั่วโมง (กม.)</p>
      <div className="flex gap-0.5 items-end overflow-x-auto pb-1">
        {HOUR_SLOTS.map(h => {
          const km = kmByHour.get(h) ?? 0;
          const pct = maxKm > 0 ? Math.min(100, (km / maxKm) * 100) : 0;
          const isNow = new Date().getHours() === h;
          return (
            <div key={h} className="flex flex-col items-center gap-0.5 min-w-[13px] flex-1">
              <span className="text-[7px] text-gray-500 leading-none">
                {km > 0 ? km.toFixed(1) : ''}
              </span>
              <div className="w-full bg-[#0d0d1a] rounded-sm" style={{ height: 40 }}>
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${pct}%`,
                    background: isNow ? color : `${color}88`,
                    marginTop: `${100 - pct}%`,
                    transition: 'height 0.3s ease',
                  }}
                />
              </div>
              <span className={`text-[7px] leading-none ${isNow ? 'text-white font-bold' : 'text-gray-600'}`}>
                {h}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: แสดง `HourlyChart` เหนือ 7-day chart ใน render**

ใน `BusDetailPanel` หา section `{/* 7-day history chart */}` (บรรทัด ~149) และเพิ่ม `HourlyChart` ด้านบน:

```typescript
          {/* Hourly distance chart — เหนือ 7-day */}
          <HourlyChart busId={data.bus_id} color={line.color} />

          {/* 7-day history chart */}
          <div className="bg-[#1a1a2e] rounded-xl p-3 border border-[#2a2a4a]">
            ...
          </div>
```

- [ ] **Step 4: Manual verification**

1. `npm run dev` (frontend) และ `npm run dev` (backend)
2. เปิด browser → คลิกรถในแผนที่ → ดู BusDetailPanel
3. ตรวจว่า Hourly chart แสดงด้านบน 7-day chart
4. ตรวจว่า bars มี label ชั่วโมง 6–22
5. ตรวจว่าชั่วโมงปัจจุบัน bar สีเข้มกว่า
6. รอ 60 วิ → ตรวจว่า refresh ทำงาน (ไม่มี error ใน console)

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/api.ts frontend/components/Dashboard/BusDetailPanel.tsx
git commit -m "feat(web): add hourly distance bar chart in bus detail panel"
```

---

## Self-Review Checklist

- [x] **Feature 1 (DR Decay):** Task 1 cover ครบ — `msElapsedSinceGps` reset ใน `onGpsUpdate`, decay ใน `advanceFrame`
- [x] **Feature 2 (Stop Window):** Task 2 cover — `stops` parameter ใน `advanceFrame`, `stopsRef` ใน `useBusMarkers`
- [x] **Feature 3 (Blending):** Task 3 cover — blend fields ใน state, set ใน `onGpsUpdate`, compute ใน animation loop
- [x] **Feature 4 (Hourly Chart):** Task 4 (backend) + Task 5 (frontend) cover ครบ
- [x] **Route ordering:** `/:id/hourly` อยู่ก่อน `/:id` — explicit ใน Task 4 Step 3
- [x] **Type consistency:** `HourlyData`, `getBusHourly` define ใน Task 5 Step 1 ก่อนใช้ใน Step 2
- [x] **Signature consistency:** `advanceFrame(state, route, dtMs, stops, intersections?)` define ใน Task 2 Step 1 และใช้ใน Task 2 Step 2, Task 3 Step 3
- [x] **No placeholders:** ทุก step มี code จริง
