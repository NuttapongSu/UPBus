# Design Spec: Animation Improvements + Hourly Distance Chart

**Date:** 2026-07-01  
**Branch:** feat/mobile-app  
**Scope:** Web frontend (`frontend/`) + backend (`backend/routes/buses.js`)

---

## Overview

4 features เพิ่มเข้า UPBus web frontend:

1. **Conservative DR Decay** — bus marker ค่อยๆ ช้าลงเมื่อ GPS data เก่า แทนที่จะวิ่งด้วยความเร็วคงที่
2. **Stop Window Detection** — marker หยุดนิ่งเมื่อรถอยู่ใกล้ป้าย (<50m) และความเร็วต่ำ (<5 km/h)
3. **Position Blending** — เมื่อ GPS poll ใหม่มาถึง ค่อยๆ blend ตำแหน่งจาก predicted → actual ใน 500ms
4. **Hourly Distance Chart** — แสดง km ที่แต่ละคันวิ่งต่อชั่วโมง 06:00–22:00 ใน BusDetailPanel (เหนือ 7-day chart)

---

## Feature 1 — Conservative DR Decay

### เหตุผล

`advanceFrame` ปัจจุบันใช้ `speedMs × multiplier × dtSec` แบบ linear — รถวิ่งด้วยความเร็วคงที่ระหว่าง GPS poll แม้เวลาจะผ่านไปนานแล้ว  
Conservative DR decay ทำให้ความเร็วลดลงตามสูตรเอกซ์โพเนนเชียล เพื่อสะท้อนว่ายิ่งนานยิ่งไม่มั่นใจตำแหน่ง

### สูตร

```
decayedSpeed = speedMs × e^(−k × elapsedSec)    k = 0.15
effectiveDist = decayedSpeed × multiplier × dtSec
```

เมื่อ `elapsedSec = 0` (เพิ่ง poll) → `decayedSpeed = speedMs` (เต็ม)  
เมื่อ `elapsedSec = 10` (ครบ poll interval) → `decayedSpeed ≈ 0.22 × speedMs`

### การเปลี่ยนแปลง

**`BusMotionState`** — เพิ่ม field:
```typescript
msElapsedSinceGps: number  // ms นับจาก GPS poll ล่าสุด
```

**`onGpsUpdate`** — reset `msElapsedSinceGps = 0` ทุกครั้ง

**`advanceFrame`** — เพิ่ม elapsed ทุก frame แล้วคำนวณ `decayedSpeed`:
```typescript
const elapsedSec = (state.msElapsedSinceGps + dtMs) / 1000
const DECAY_K = 0.15
const decayedSpeed = state.speedMs * Math.exp(-DECAY_K * elapsedSec)
const effectiveDist = decayedSpeed * multiplier * (dtMs / 1000)
```

---

## Feature 2 — Stop Window Detection

### เหตุผล

ถ้า GPS บอกว่ารถอยู่ใกล้ป้าย และความเร็วต่ำ → รถกำลังจอดรับ-ส่งผู้โดยสาร  
Animation ควรหยุดนิ่งที่ป้ายแทนที่จะพยายาม dead-reckon ต่อ

### เงื่อนไข

```
state.speedMs < 1.39 m/s  (≈5 km/h)
AND haversine(state.lat, state.lng, stop.lat, stop.lng) < 50m
```

ถ้าจริง → return state เดิม (ไม่ advance)

### การเปลี่ยนแปลง

**`advanceFrame`** signature เปลี่ยนเป็น:
```typescript
export function advanceFrame(
  state: BusMotionState,
  route: RoutePoint[],
  dtMs: number,
  stops: RoutePoint[],              // เพิ่ม
  intersections?: IntersectionPoint[],
): BusMotionState
```

ตรวจ stop window **ก่อน** ตรวจ intersection และ advance

**`useBusMarkers.ts`** — ส่ง `stops` เข้า `advanceFrame` (มีข้อมูลอยู่แล้วใน `stopsByColor`)

---

## Feature 3 — Position Blending (500ms)

### เหตุผล

เมื่อ GPS poll ใหม่มาถึง ตำแหน่งจริง (snapped) อาจต่างจากตำแหน่ง predicted — ปัจจุบัน marker กระโดดทันที  
Blending ทำให้เปลี่ยนแปลงแบบ smooth ใน 500ms

### การเปลี่ยนแปลง

**`BusMotionState`** — เพิ่ม fields:
```typescript
blendFromLat?: number
blendFromLng?: number
blendStartMs?: number
```

**`onGpsUpdate`** — เมื่อ prev confirmed และตำแหน่ง predicted ≠ GPS snapped:
```typescript
blendFromLat: prev.lat,
blendFromLng: prev.lng,
blendStartMs: Date.now(),
```

**`advanceFrame`** — ถ้า blend ยังไม่ครบ 500ms: lerp rendered position
```typescript
const BLEND_MS = 500
if (state.blendFromLat !== undefined && state.blendStartMs !== undefined) {
  const t = Math.min(1, (Date.now() - state.blendStartMs) / BLEND_MS)
  // ใช้ lerp lat/lng สำหรับ setLatLng เท่านั้น — routeIdx/routeT ไม่เปลี่ยน
  renderedLat = lerp(state.blendFromLat, state.lat, t)
  renderedLng = lerp(state.blendFromLng, state.lng, t)
  // เมื่อ t = 1 → clear blend fields
}
```

Rendered position ส่งกลับผ่าน state fields ใหม่ `renderedLat` / `renderedLng`  
`useBusMarkers` ใช้ `renderedLat/Lng` สำหรับ `setLatLng` แทน `lat/lng`

---

## Feature 4 — Hourly Distance Chart

### ข้อมูล

Table `gps_snapshots` มี `bus_id`, `odo` (เมตร), `recorded_at` — รันทุก ~10 วิ  
คำนวณ km ต่อชั่วโมง = `(MAX(odo) - MIN(odo)) / 1000` ต่อ hour slot

### Backend — endpoint ใหม่

```
GET /api/buses/:id/hourly
```

Query:
```sql
SELECT
  HOUR(recorded_at) AS hour,
  (MAX(odo) - MIN(odo)) / 1000 AS km
FROM gps_snapshots
WHERE bus_id = ?
  AND DATE(recorded_at) = CURDATE()
  AND odo > 0
GROUP BY HOUR(recorded_at)
ORDER BY hour ASC
```

Response: `{ hourly: [{ hour: 6, km: 12.3 }, ...] }` — เฉพาะชั่วโมงที่มีข้อมูล (frontend fill ช่องว่างด้วย 0)

### Frontend

**`api.ts`** — เพิ่ม:
```typescript
export interface HourlyData {
  hourly: { hour: number; km: number }[]
}
export const getBusHourly = (busId: string) =>
  apiFetch<HourlyData>(`/api/buses/${busId}/hourly`)
```

**`BusDetailPanel.tsx`** — เพิ่ม SWR fetch + `HourlyChart` component  
แสดง **เหนือ** 7-day chart, slot 06–22 (17 bars), refresh ทุก 60 วินาที

`HourlyChart` reuse `MiniBar` component ที่มีอยู่แล้ว

---

## ไฟล์ที่แตะ

| ไฟล์ | Feature |
|---|---|
| `frontend/lib/busMotionEngine.ts` | 1, 2, 3 |
| `frontend/components/Map/useBusMarkers.ts` | 2, 3 |
| `frontend/components/Dashboard/BusDetailPanel.tsx` | 4 |
| `frontend/lib/api.ts` | 4 |
| `backend/routes/buses.js` | 4 |

---

## สิ่งที่ไม่ทำ (out of scope)

- ไม่เพิ่ม Historical Stop Profile JSON (ใช้ speed threshold แทน)
- ไม่เปลี่ยน map library (ยังคง Leaflet)
- ไม่เพิ่ม DB migration — `gps_snapshots` มีอยู่แล้ว
