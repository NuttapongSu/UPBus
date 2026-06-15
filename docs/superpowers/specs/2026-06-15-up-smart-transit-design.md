# UP Smart Transit — System Design Spec

**Date:** 2026-06-15  
**Status:** Approved  
**Replaces:** ระบบ UPBusTransit เดิม (PHP + Node.js hybrid)

---

## 1. Overview

ระบบติดตามรถบัสไฟฟ้าภายในมหาวิทยาลัยพะเยา พร้อม Sustainability Dashboard แสดงผลลด CO₂ แบบ real-time สร้างใหม่ทั้งหมดด้วย Next.js + Express.js API-first เพื่อรองรับ mobile app ในอนาคต

**ชื่อระบบ:** UP Smart Transit  
**รถ:** 30 คัน (EV), 3 สาย (หน้ามอ, ประตูสาม, หอพัก)  
**ผู้ใช้:** นิสิต/ประชาชน (สาธารณะ), Admin (login), คนขับ (LINE LIFF)

---

## 2. Tech Stack

| Layer | Technology | เหตุผล |
|-------|-----------|--------|
| Web Frontend | Next.js (React) | รองรับ mobile (React Native) ในอนาคต, API-first |
| Backend | Express.js + Node.js | ต่อยอดจาก logic เดิม |
| Database | MySQL (db_bustransit) | ใช้ฐานข้อมูลเดิม + 2 ตารางใหม่ |
| Auth | JWT (Admin) + LINE LIFF (Driver) | JWT รองรับ mobile |
| Map | Leaflet.js + KML overlays | เหมือนระบบเดิม |
| Process Manager | PM2 | เหมือนระบบเดิม |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client Layer                      │
│  Next.js Web (/)  │  Next.js Admin (/admin)  │ LINE LIFF (Driver) │
└────────────────────────────┬────────────────────────┘
                             │ REST API (JWT)
┌────────────────────────────▼────────────────────────┐
│               Express.js API Backend                 │
│  /api/buses  /api/sustainability  /api/complaints    │
│  /api/auth   /api/admin/*         /api/driver/*      │
└──────────────┬─────────────────────────┬────────────┘
               │                         │
    ┌──────────▼──────────┐   ┌──────────▼──────────┐
    │  Background Services │   │   MySQL Database     │
    │  - GPS Poller (10s)  │   │   - buses            │
    │  - CO₂ Aggregator    │   │   - drivers          │
    │    (cron hourly)     │   │   - admins           │
    │  - Route Snapper     │   │   - complaints       │
    └──────────┬──────────┘   │   - evaluations_*    │
               │              │   - gps_snapshots ✨  │
    ┌──────────▼──────────┐   │   - sustainability_  │
    │  GPS Vendor API      │   │     log ✨           │
    │  api01.sitgps.com    │   └─────────────────────┘
    │  rate limit: 10s     │
    └─────────────────────┘
```

---

## 4. Pages & Access

### 4.1 Public Dashboard — `upbus.up.ac.th/`
ทุกคนเข้าได้ ไม่ต้อง login

**Left Panel**
- ภาพรวมระบบ: รถทั้งหมด / กำลังวิ่ง / จอดพัก / ผู้ใช้วันนี้
- ป้ายใกล้ฉัน (ใช้ Geolocation API)
- แจ้งเตือนล่าสุด

**Center — แผนที่ Leaflet**
- แสดงเส้นทาง KML ทั้ง 3 สาย
- Bus marker เคลื่อนที่ด้วย Linear Interpolation + Snap to KML Route
- Icon รถหมุนตาม `bearing` จาก GPS vendor
- poll `/api/buses` ทุก 10 วินาที

**Right Panel — Sustainability Dashboard**
- CO₂ ลดได้วันนี้ (kg) — คำนวณอัตโนมัติ
- ต้นไม้เทียบเท่า / คัน PM2.5 ลดได้ / %PM2.5
- พลังงานที่ใช้ (kWh) + ระยะทางรวม (km)
- กราฟ CO₂ รายวัน (สัปดาห์ล่าสุด)
- กราฟผู้ใช้รายชั่วโมง

**Bottom Bar**
- Card 3 สาย: จำนวนรถ, เส้นทาง, ที่นั่งว่าง

### 4.2 Admin Panel — `upbus.up.ac.th/admin`
ต้อง login (JWT) — UI แยกจาก dashboard หลัก

- Dashboard สรุปภาพรวม + กราฟร้องเรียน
- จัดการร้องเรียน (pagination, อัปเดตสถานะ)
- ดูผลประเมิน (app + travel)
- จัดการรถ/คนขับ

### 4.3 Driver Interface — LINE LIFF
- เปิดผ่าน LINE OA
- ระบุตัวตนด้วย `line_user_id`
- เลือกรถ + สาย → เริ่มงาน/เลิกงาน

---

## 5. Real-time Bus Movement

### GPS Polling
- Backend poll vendor API ทุก **10 วินาที** (แก้จาก 5 → 10 ตาม rate limit จริง)
- เก็บใน RAM (`cachedBusData`) + write to `gps_snapshots`

### Smooth Movement — Linear Interpolation + Route Snap
1. Frontend รับ lat/lng ใหม่ทุก 10 วิ
2. Animate marker จากตำแหน่งเก่าไปใหม่ใน 10 วิ (Linear Interpolation)
3. Snap ตำแหน่งไปบน KML route path ที่ใกล้ที่สุด (ไม่ตัดทุ่ง)
4. หมุน icon รถตาม `bearing` จาก GPS vendor

**ไม่ใช้ Dead Reckoning** — error สะสมใน 10 วิบน campus ที่มีทางโค้ง ทำให้ต้องกระโดดแก้ตำแหน่ง

---

## 6. Sustainability — การคำนวณ CO₂

### Data Source
ดึงจาก GPS Vendor API (field ที่ระบบเดิมไม่ได้ใช้):

| Field | ใช้ทำ |
|-------|-------|
| `soc` | ประจุแบต % → ประเมิน kWh ที่ใช้ |
| `bv` + `be` | แรงดัน × กระแส → power (kW) |
| `odo` | ระยะทางสะสม (km) |
| `acc` | รถติดเครื่อง/ดับ |

### สูตรคำนวณ
```
kWh_used     = bv × be × interval_hours
CO₂_saved_kg = odo_delta × (diesel_emission_factor - ev_emission_factor)
               diesel_emission_factor = 1.0 kg CO₂/km (รถเมล์ diesel)
               ev_emission_factor     = 0.2 kg CO₂/km (EV + grid Thailand)
trees_equiv  = CO₂_saved_kg / 0.021  (ต้นไม้ดูด 21g CO₂/วัน)
```

constants เก็บใน config (ปรับได้ใน Admin ภายหลัง)

---

## 7. Database

### ตารางใหม่

**`gps_snapshots`** — ข้อมูล GPS raw
```sql
CREATE TABLE gps_snapshots (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  bus_id      VARCHAR(10) NOT NULL,  -- TC001-TC030
  lat         DECIMAL(10,6),
  lng         DECIMAL(10,6),
  speed       FLOAT,
  bearing     FLOAT,
  soc         FLOAT,
  bv          FLOAT,
  be          FLOAT,
  odo         INT,
  recorded_at DATETIME NOT NULL,
  INDEX idx_recorded (recorded_at),
  INDEX idx_bus (bus_id)
);
-- Cron ลบข้อมูลเก่ากว่า 24 ชั่วโมงทุกวัน → ~1 MB/วัน
```

**`sustainability_log`** — aggregate รายชั่วโมง
```sql
CREATE TABLE sustainability_log (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  logged_at    DATETIME NOT NULL,  -- ต้นชั่วโมง เช่น 2026-06-15 14:00:00
  co2_saved_kg FLOAT,
  kwh_used     FLOAT,
  km_total     FLOAT,
  passengers   INT,
  INDEX idx_logged (logged_at)
);
-- ~20 MB/ปี
```

### ตารางเดิม (ไม่เปลี่ยน)
`buses`, `drivers`, `admins`, `complaints`, `evaluations_app`, `evaluations_travel`

---

## 8. API Endpoints

### Public
```
GET  /api/buses              → GPS + color + driver (merge RAM + DB)
GET  /api/sustainability      → CO₂ วันนี้, กราฟสัปดาห์, kWh, km
GET  /api/stops               → รายการป้ายทั้งหมด
POST /api/complaints          → ส่งเรื่องร้องเรียน (multipart/form-data)
POST /api/evaluate/app        → ส่งแบบประเมิน app
POST /api/evaluate/travel     → ส่งแบบประเมินการเดินทาง
```

### Auth
```
POST /api/auth/login          → { username, password } → JWT token
POST /api/auth/logout
```

### Admin (JWT required)
```
GET  /api/admin/complaints    → paginated list
POST /api/admin/complaints/:id/status → update status
GET  /api/admin/evaluations   → app + travel stats
GET  /api/admin/buses         → bus list + driver assignment
GET  /api/admin/sustainability → historical data
```

### Driver (LINE LIFF)
```
GET  /api/driver/check?line_id=   → is_driver + driver info
POST /api/driver/register         → { line_user_id, full_name }
GET  /api/driver/buses            → bus list
POST /api/driver/update-status    → { bus_id, driver_id, color }
POST /api/driver/stop             → { driver_id }
GET  /api/driver/current-job      → { driver_id }
```

---

## 9. Project Structure (เป้าหมาย)

```
UPBus/
├── frontend/                 # Next.js app
│   ├── app/
│   │   ├── page.tsx          # Public dashboard
│   │   ├── admin/            # Admin panel
│   │   └── driver/           # Driver LIFF page
│   ├── components/
│   │   ├── Map/              # Leaflet + interpolation + route snap
│   │   ├── SustainabilityDashboard/
│   │   └── AdminPanel/
│   └── lib/
│       ├── interpolation.ts  # Linear interpolation logic
│       └── routeSnap.ts      # KML route snap logic
├── backend/                  # Express.js (ตำแหน่งเดิม)
│   ├── index.js              # Entry point
│   ├── routes/               # แยก route ออกจาก index
│   │   ├── buses.js
│   │   ├── sustainability.js
│   │   ├── complaints.js
│   │   ├── auth.js
│   │   └── driver.js
│   ├── services/
│   │   ├── gpsPoller.js      # poll vendor ทุก 10 วิ
│   │   ├── co2Aggregator.js  # cron hourly
│   │   └── co2Calculator.js  # สูตรคำนวณ
│   └── db.js
├── public/                   # KML files, assets
│   └── *.kml
└── docs/superpowers/specs/
    └── 2026-06-15-up-smart-transit-design.md
```

---

## 10. Migration จากระบบเดิม

| สิ่งที่ **คง** ไว้ | สิ่งที่ **เปลี่ยน** |
|-------------------|-------------------|
| MySQL `db_bustransit` | PHP files → Next.js |
| GPS vendor API + key | Poll interval 5s → 10s |
| LINE LIFF driver flow | Session auth → JWT |
| KML route files | กระตุก → interpolation |
| PM2 process manager | เพิ่ม gps_snapshots + sustainability_log |
| phpMyAdmin จัดการ DB | เพิ่ม CO₂ calculation |

---

## 11. ออกแบบไว้รองรับ Mobile

- Backend เป็น REST API + JWT ตั้งแต่แรก
- ไม่มี server-side session dependency
- React Native app ในอนาคตเรียก `/api/*` เดียวกันได้เลย
- phpMyAdmin ยังใช้ได้ตามปกติ
