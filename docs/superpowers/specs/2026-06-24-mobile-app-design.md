# UPBus Mobile App — Design Spec

**Date:** 2026-06-24
**Status:** Approved
**สำหรับ:** ผู้โดยสาร (นิสิต/บุคลากร/ประชาชนทั่วไป) — iOS + Android

---

## 1. Overview

Mobile app สำหรับผู้โดยสารติดตามรถบัสไฟฟ้า มหาวิทยาลัยพะเยา แบบ real-time พร้อม push notification แจ้งเตือนเมื่อรถใกล้ถึงป้าย ดูแลโดยศูนย์สิ่งแวดล้อมและการจัดการที่ยั่งยืน

**ผู้ใช้:** ผู้โดยสาร (ไม่ต้อง login)
**Platform:** iOS + Android
**Framework:** Expo (React Native, managed workflow)
**Distribution:** App Store + Google Play (ใช้บัญชีศูนย์ฯ)

**ค่าใช้จ่ายรายปี:**
- Apple Developer Account: ~3,500 บาท/ปี
- Google Play Console: ~900 บาท (ครั้งเดียว)

---

## 2. Architecture

```
┌─────────────────────────────────────────────────┐
│          UP Smart Transit — Expo App             │
│  (iOS + Android, Expo managed workflow)          │
└──────────────────┬──────────────────────────────┘
                   │ REST API (เดิม)
                   ▼
┌─────────────────────────────────────────────────┐
│       Express.js Backend (port 5000)            │
│  /api/buses  /api/sustainability                │
│  + endpoint ใหม่: /api/push/register            │
│  + endpoint ใหม่: /api/push/unregister          │
└──────────────────┬──────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       ▼                       ▼
┌─────────────┐     ┌──────────────────────┐
│ MySQL DB    │     │ Expo Push Service    │
│ (เดิม)      │     │ (free, Expo manages) │
│ + push_     │     └──────────────────────┘
│  tokens     │
└─────────────┘
```

**สิ่งที่ใช้ร่วมกับ web:**
- Express.js API endpoints ทั้งหมด — แอปเรียก endpoint เดิม
- MySQL database เดิม + เพิ่มตาราง `push_tokens`
- Bus stop coordinates (จาก `allBusStops` ใน web)

**สิ่งที่ใหม่:**
- `upbus-mobile/` — Expo project folder ใหม่ใน root repo
- Push notification logic ใน `gpsPoller.js`
- 2 API endpoints ใหม่

---

## 3. Screens & Navigation

```
Tab Navigator (Bottom Tabs)
├── แผนที่ (Map Screen)      ← หน้าหลัก
├── สายรถ (Routes Screen)    ← ตารางเดินรถ / ป้ายหยุด
└── แจ้งเตือน (Alert Screen) ← ตั้งค่า notification
```

### Map Screen
- แผนที่ Google Maps พร้อมตำแหน่งรถ poll ทุก 5 วินาที (`/api/buses`)
- Marker สีตามสาย: แดง / เขียว / น้ำเงิน — ม่วง = ไม่มีสายที่ชัดเจน
- กด Marker → popup ชื่อรถ + สีสาย
- Filter สาย (แดง/เขียว/น้ำเงิน) ด้วย toggle buttons
- Bus stop markers — กด → ชื่อป้าย
- เส้นทาง KML overlay (load จาก backend)

### Routes Screen
- รายชื่อสาย 3 สาย พร้อมป้ายหยุดทั้งหมดของแต่ละสาย
- ข้อมูล static (จาก constants/stops.ts)

### Alert Screen
- Toggle เปิด/ปิด notification แต่ละสาย (แดง/เขียว/น้ำเงิน)
- เลือก threshold "แจ้งเตือนเมื่อรถอยู่ห่าง 1 หรือ 2 ป้าย"
- แสดง notification history

ไม่มี login ทั้งหมด — ใช้งานได้ทันทีโดยไม่ต้อง account

---

## 4. Push Notification Design

### Flow

```
[App เปิดครั้งแรก]
       │
       ▼
ขอ permission notification (iOS popup)
       │
       ▼
ได้ Expo Push Token (unique ต่อ device)
       │
       ▼
POST /api/push/register
{ token, subscribedLines: ["red","green","blue"] }
       │
       ▼
บันทึกลง push_tokens table (MySQL)

─────────────────────────────────────

[GPS Poller ทุก 10 วินาที — backend]
       │
       ▼
คำนวณระยะรถแต่ละคันกับป้ายหยุดทุกป้าย
       │
       ├── รถใกล้ป้าย (< threshold) + สีไม่ใช่ Purple + เคลื่อนที่?
       │         │
       │         ▼
       │   ดึง push_tokens ที่ subscribe สายนั้น
       │         │
       │         ▼
       │   ส่งผ่าน Expo Push API (HTTPS, ฟรี)
       │   "รถสาย🔴 กำลังเข้าป้าย [ชื่อป้าย]"
       │
       └── ไม่ตรงเงื่อนไข → ข้ามไป
```

### กฎการส่ง Notification

**ส่งเมื่อ:**
- รถสี Red / Green / Blue เท่านั้น (มีสายชัดเจน)
- รถเคลื่อนที่จริง (speed > 2 km/h)

**ไม่ส่งเมื่อ:**
- รถสี Purple — ไม่รู้สาย แม้จะมีคนขับก็ตาม (คนขับยังไม่เลือกสาย)
- รถจอดนิ่ง
- cooldown 3 นาที ต่อ token-ป้าย-สาย (ป้องกัน spam, เก็บใน memory)

### ตาราง `push_tokens` (MySQL ใหม่)

```sql
CREATE TABLE push_tokens (
  token      VARCHAR(255) PRIMARY KEY,
  lines      JSON         NOT NULL,  -- ["red","green","blue"]
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### API Endpoints ใหม่

```
POST /api/push/register
Body: { token: string, lines: string[] }

DELETE /api/push/unregister
Body: { token: string }
```

---

## 5. Tech Stack

| ส่วน | เทคโนโลยี | หมายเหตุ |
|------|-----------|---------|
| Framework | Expo SDK 51+ (managed workflow) | |
| Language | TypeScript | เหมือน web frontend |
| Map | `react-native-maps` + Google Maps | ต้องขอ Google Maps API Key |
| Navigation | `expo-router` (file-based) | เหมือน Next.js App Router |
| Push Notification | `expo-notifications` | ส่งผ่าน Expo Push Service (ฟรี) |
| Polling | `setInterval` + `fetch` | poll `/api/buses` ทุก 5 วิ |
| Build | Local Mac (Xcode + Android Studio) | EAS เฉพาะ submit Store |

---

## 6. Project Structure

```
upbus-mobile/               ← folder ใหม่ใน root repo
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx       ← Map Screen
│   │   ├── routes.tsx      ← Routes Screen
│   │   └── alerts.tsx      ← Alert Screen
│   └── _layout.tsx         ← Tab Navigator
├── components/
│   ├── BusMarker.tsx
│   ├── BusStopMarker.tsx
│   └── RouteOverlay.tsx
├── hooks/
│   ├── useBuses.ts         ← poll /api/buses
│   └── usePushToken.ts     ← register device token
├── constants/
│   └── stops.ts            ← bus stop coordinates
├── app.json                ← Expo config (bundle ID, icons)
└── package.json
```

---

## 7. Build & Distribution

**Development:**
- Build และ test บน Mac (Xcode + Android Studio)
- ใช้ Expo Go app สำหรับ dev preview

**Production:**
- iOS: build ด้วย `xcodebuild` → submit ด้วย `eas submit`
- Android: build ด้วย `./gradlew` → submit ด้วย `eas submit`
- Google Maps API Key: ขอจาก Google Cloud Console (ฟรี tier เพียงพอ)

---

## 8. Out of Scope

- Driver interface (ยังคงใช้ LINE LIFF บน browser)
- Admin panel (ยังคงใช้ web admin)
- Offline mode
- Dark mode
- Multi-language (EN)
