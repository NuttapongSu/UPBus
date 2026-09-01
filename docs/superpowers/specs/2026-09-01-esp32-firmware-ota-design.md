# ESP32 GPS Device — Firmware OTA Update — Design Spec

**Date:** 2026-09-01
**Status:** Draft

## Purpose

ตอนนี้อุปกรณ์ ESP32+SIM7600 (GPS sender) ที่ติดตั้งบนรถบัส ~35 คัน อัปเดตเฟิร์มแวร์ได้ทางเดียวคือถอดมาเสียบ USB flash ทีละบอร์ด คาดว่าจะต้องออกเฟิร์มแวร์ใหม่ประมาณเดือนละครั้ง จึงต้องการระบบให้ admin อัปโหลด `.bin` ขึ้น server แล้วให้บอร์ดดึงไปอัปเดตเองผ่าน WiFi (OTA)

## Scope

- **In scope:** อัปโหลด/จัดเก็บเวอร์ชันเฟิร์มแวร์บน backend, endpoint ให้ device เช็ค/ดาวน์โหลด, กลไก apply+verify+auto-rollback บนตัว device, การกำหนดเป้าหมาย per-device (canary) ก่อน promote เป็น stable, หน้า admin (EJS) สำหรับจัดการทั้งหมดนี้
- **Out of scope:** อัปเดต `platformio.ini`/dependency ของ project เอง, การอัปเดตแบบ push ทันที (device เป็นฝ่าย pull เท่านั้น), rollback ผ่าน backend สั่งย้อนเวอร์ชันจากระยะไกล (ถ้า partition ปัจจุบันเสียต้อง USB), การแจ้งเตือน LINE เมื่ออัปเดตสำเร็จ/ล้มเหลว

## Architecture

### Data model (MySQL, `db_bustransit`)

**ตารางใหม่ `firmware_releases`:**

| Column | Type | หมายเหตุ |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `version` | VARCHAR(20) UNIQUE | เช่น `1.1.0`, admin กรอกตอนอัปโหลด |
| `filename` | VARCHAR(255) | ชื่อไฟล์ใน `backend/uploads/firmware/` เช่น `1.1.0.bin` |
| `sha256` | CHAR(64) | คำนวณตอนอัปโหลด |
| `size_bytes` | INT | |
| `notes` | TEXT NULL | changelog ที่ admin กรอก |
| `is_stable` | BOOLEAN DEFAULT FALSE | เวอร์ชันที่ promote แล้ว มีได้ไม่เกิน 1 แถวเป็น TRUE ในเวลาเดียวกัน |
| `uploaded_at` | DATETIME | |

**ตารางใหม่ `firmware_targets`:**

| Column | Type | หมายเหตุ |
|---|---|---|
| `device_id` | VARCHAR(10) PK | `TC001`..`TC035` |
| `target_version` | VARCHAR(20) NULL | ถ้า NULL = ตาม `is_stable` ปัจจุบัน (ค่า default ของทุกคัน); ถ้ามีค่า = ตรึงไว้ที่เวอร์ชันนี้ (ใช้สำหรับตั้ง canary) |
| `updated_at` | DATETIME | |

ไม่ต้อง seed ล่วงหน้า — ไม่มีแถวใน `firmware_targets` ตีความว่า target = NULL (ตาม stable)

### Backend API

ไฟล์ใหม่ `backend/routes/firmwareAdmin.js` (mount ที่ `/api/admin/firmware`, ใช้ middleware auth admin เดิมที่ routes อื่นใน `/api/admin` ใช้อยู่) และ `backend/routes/firmwareDevice.js` (mount ที่ `/api/firmware`, ใช้ middleware `X-Device-Key` เดิมจาก `gpsIngest.js`)

**Admin (session auth):**
- `POST /api/admin/firmware/upload` — multipart `.bin` + `version` + `notes`. ตรวจ magic byte แรกของไฟล์ต้องเป็น `0xE9` (ESP32 image header) ก่อนเก็บ ไม่งั้น reject. คำนวณ sha256, เขียนไฟล์ลง `backend/uploads/firmware/<version>.bin`, insert แถวใน `firmware_releases`
- `GET /api/admin/firmware` — list ประวัติเวอร์ชันทั้งหมด + สถานะ target ปัจจุบันของ 35 คัน (join `firmware_targets`)
- `POST /api/admin/firmware/:version/promote` — set `is_stable=TRUE` ให้แถวนี้, set แถวเก่าที่เคย stable เป็น FALSE (transaction เดียว)
- `POST /api/admin/firmware/target` — body `{device_id, target_version}` (`target_version: null` เพื่อล้าง canary กลับไปตาม stable) — upsert ใน `firmware_targets`

**Device (`X-Device-Key` auth, เทียบ key เดียวกับที่ `gpsIngest.js` ใช้เช็ค `GPS_DEVICE_API_KEY`):**
- `GET /api/firmware/check?device_id=TC001&current_version=1.0.0` — resolve เวอร์ชันเป้าหมายของ device นี้ (target ถ้ามี, ไม่งั้น stable ปัจจุบัน) เทียบกับ `current_version` ที่ device ส่งมา ถ้าต่างกันคืน `{update_available:true, version, sha256, size_bytes}` ถ้าเหมือนกันคืน `{update_available:false}`
- `GET /api/firmware/download/:version` — stream ไฟล์ `.bin` ตรง ๆ (`res.sendFile` หรือ pipe stream), ใส่ header `Content-Length`

### Device-side logic (`esp32-gps/gps_sender/src/main.cpp`)

เพิ่ม `const char* FIRMWARE_VERSION = "1.0.0";` ที่ต้น flie (bump มือทุกครั้งก่อน build เพื่ออัปโหลด)

**เช็คอัปเดต:** เรียกครั้งเดียวใน `setup()` หลัง `runWifiSetup()` สำเร็จ และซ้ำใน `loop()` ทุก 24 ชม. (reuse pattern ตัวจับเวลาแบบ `lastGpsRearmMs` ที่มีอยู่แล้ว) — ฟังก์ชันใหม่ `checkAndApplyFirmwareUpdate()`:

1. `GET /api/firmware/check?device_id=..&current_version=..`
2. ถ้า `update_available=false` → return ทันที
3. ถ้า `true` → `GET /api/firmware/download/:version`, สตรีมเข้า `Update.begin(size)` / `Update.write()` เป็น chunk พร้อมคำนวณ sha256 ระหว่างทาง (mbedtls sha256 context)
4. หลัง `Update.end()` สำเร็จ **ตรวจ sha256 ที่คำนวณได้ตรงกับค่าที่ server ส่งมาก่อน** — ถ้าไม่ตรง `Update.abort()`, ไม่ reboot, log error แล้วปล่อยผ่าน (ลองใหม่รอบถัดไป)
5. ถ้าตรง → `ESP.restart()`

**Self-test หลัง boot เข้าเฟิร์มแวร์ใหม่:** ต้น `setup()` (หลัง WiFi connect สำเร็จ) เรียก `GET /api/firmware/check` ครั้งหนึ่งเป็น connectivity probe ภายใน timeout รวม ~2 นาที (นับจาก boot) — ถ้าสำเร็จเรียก `esp_ota_mark_app_valid_cancel_rollback()` ถ้าไม่สำเร็จภายใน timeout **ไม่เรียก** ฟังก์ชันนี้ ปล่อยให้ ESP32 bootloader native rollback เองในรอบ boot ถัดไป (พฤติกรรม native ของ esp_ota เมื่อแอปไม่ mark ตัวเอง valid และเกิด reset ซ้ำ — ไม่ต้องเขียน logic ย้อนกลับเอง)

หมายเหตุ: การเช็คอัปเดตใหม่ (ข้อ "เช็คอัปเดต" ด้านบน) ต้องรันหลังจาก mark valid แล้วเท่านั้น เพื่อไม่ให้ปนกับ self-test check ครั้งแรก

### Admin UI

เพิ่มหน้าใหม่ในกลุ่ม EJS admin ที่มีอยู่ (`backend/views/admin/`) เช่น `firmware.ejs` + route ผูกกับ `firmwareAdmin.js`:
- ฟอร์มอัปโหลด `.bin` (version, notes)
- ตารางประวัติเวอร์ชัน พร้อมปุ่ม "Promote to stable"
- ตาราง 35 คัน (`TC001`..`TC035`) แสดง target ปัจจุบันของแต่ละคัน พร้อม dropdown เลือกเวอร์ชัน หรือ "(stable)" เพื่อตั้ง/ล้าง canary ต่อคัน

## Data Flow

```
Admin upload .bin → firmware_releases (is_stable=false)
Admin ตั้ง target_version=1.1.0 ให้ TC001 (canary)
  → TC001 boot/loop เช็ค /firmware/check → เห็นเวอร์ชันต่าง → ดาวน์โหลด+verify sha256 → apply → restart
  → boot ใหม่ self-test ผ่าน → mark valid
Admin เฝ้าดู TC001 วิ่งปกติ 1-2 วัน
Admin กด Promote 1.1.0 → is_stable=true
  → คันอื่นๆ (target=NULL) เช็ครอบถัดไปเจอ stable ใหม่ → ทยอยอัปเดตเองตามรอบ 24 ชม. ของแต่ละคัน
Admin ล้าง target ของ TC001 กลับเป็น NULL (ตอนนี้ตาม stable พอดีอยู่แล้ว)
```

## Error Handling

- ดาวน์โหลดขาดหาย / sha256 ไม่ตรง → ไม่ apply, ลองใหม่รอบเช็คถัดไป, ไม่ crash/ไม่ reboot
- Self-test หลัง apply ไม่ผ่านภายใน timeout → ESP32 native rollback กลับ partition เดิม เฟิร์มแวร์เก่ากลับมาทำงานเหมือนไม่มีอะไรเกิดขึ้น (device ยังคง current_version เดิม)
- `/api/admin/firmware/upload` ที่ magic byte ไม่ใช่ `0xE9` → 400 reject ไม่เขียนไฟล์/ไม่ insert DB
- Backend เก็บทุกเวอร์ชันที่เคยอัปโหลดไว้เสมอ (ไม่ auto-delete) เผื่อ canary คันหนึ่งค้างอยู่เวอร์ชันเก่ากว่า stable

## Security

- Device endpoints ใช้ `X-Device-Key` เดิม (ผ่าน `GPS_DEVICE_API_KEY`) เหมือน `gpsIngest.js`
- Admin endpoints ใช้ session auth middleware เดิมของ `/api/admin`
- ตรวจ magic byte ก่อนเก็บไฟล์อัปโหลด กัน upload ไฟล์ที่ไม่ใช่ ESP32 image
- จำกัดขนาดไฟล์อัปโหลด (เช่น 4MB ตาม partition size ทั่วไปของบอร์ดนี้)
- sha256 verify ฝั่ง device ก่อน apply กันไฟล์เสียหายระหว่างดาวน์โหลดผ่าน WiFi ที่อาจไม่เสถียร

## Dependencies

| Dependency | สถานะ |
|---|---|
| ESP32 Arduino `Update.h`, `esp_ota_ops.h` | มากับ `framework = arduino` (espressif32 platform) อยู่แล้ว ไม่ต้องเพิ่ม `lib_deps` |
| mbedtls sha256 (ฝั่ง ESP32) | มากับ ESP-IDF/Arduino core อยู่แล้ว |
| Node `crypto` (sha256 ฝั่ง backend) | built-in |
| `multer` (multipart upload) | มีอยู่แล้วใน `backend/package.json` (`^2.0.2`) |

## Files Changed / Added

| File | Action |
|---|---|
| `backend/routes/firmwareAdmin.js` | สร้างใหม่ |
| `backend/routes/firmwareDevice.js` | สร้างใหม่ |
| `backend/index.js` | mount 2 router ใหม่ |
| `backend/views/admin/firmware.ejs` (+ route ที่ render มัน) | สร้างใหม่ |
| DB migration: `firmware_releases`, `firmware_targets` | สร้างตารางใหม่ |
| `esp32-gps/gps_sender/src/main.cpp` (และไฟล์ต้นทางจริงใน PlatformIO project) | เพิ่ม `FIRMWARE_VERSION`, `checkAndApplyFirmwareUpdate()`, self-test+mark-valid logic ใน `setup()` |
| `backend/uploads/firmware/version.txt` | ลบทิ้ง (เศษเดิม ไม่ได้ใช้ในดีไซน์นี้ — ใช้ตาราง `firmware_releases` แทน) |
