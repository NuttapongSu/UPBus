# Daily Driver Reset at 23:59 — Design Spec

**Date:** 2026-07-02  
**Status:** Approved

## Purpose

รีเซ็ตการจอดรถทุกคืนเวลา 23:59 เพื่อให้รถทุกคันกลับสถานะ Purple (ว่าง) พร้อมให้คนขับมาเลือกสายใหม่ตอนเช้าวันถัดไป

## Scope

- **In scope:** clear `current_driver_id` และ reset `status_color = 'Purple'` สำหรับรถทุกคันที่มีคนขับอยู่, ส่ง LINE notify แจ้ง admin
- **Out of scope:** เคลียร์ข้อมูล GPS cache, เคลียร์ประวัติการเดินทาง, แจ้งเตือนคนขับ

## Architecture

### ไฟล์ใหม่: `backend/services/dailyReset.js`

Service module ที่มี `start()` function — ใช้ `node-cron` schedule `59 23 * * *`

**ขั้นตอนการทำงานเมื่อถึง 23:59:**

1. Query: `UPDATE buses SET current_driver_id = NULL, status_color = 'Purple' WHERE current_driver_id IS NOT NULL`
2. ดึง `affectedRows` จาก result
3. Log ผลลัพธ์ใน console เสมอ
4. ส่ง LINE notify ไปยัง admin (`LINE_ADMIN_USER_ID`) ผ่าน `sendLineMessage` ที่มีอยู่แล้ว

**ข้อความ LINE notify:**
- มีรถที่เคลียร์: `"[Daily Reset] เคลียร์คนขับออกจากรถสำเร็จ {n} คัน — รถพร้อมสำหรับพรุ่งนี้"`
- ไม่มีรถที่ต้องเคลียร์: `"[Daily Reset] ไม่มีรถที่มีคนขับ — ข้ามการเคลียร์"`

**Error handling:** ถ้า DB หรือ LINE API error ให้ log error แต่ไม่ throw (ไม่ crash server)

### แก้ไข: `backend/index.js`

เพิ่ม 2 บรรทัด:

```js
const dailyReset = require('./services/dailyReset');
// ใน app.listen callback:
dailyReset.start();
```

## Dependencies

| Dependency | สถานะ |
|---|---|
| `node-cron` | มีอยู่แล้ว (ใช้ใน co2Aggregator) |
| `lineNotify.sendLineMessage` | มีอยู่แล้ว (`services/lineNotify.js`) |
| `db` connection pool | มีอยู่แล้ว (`db.js`) |

## Data Flow

```
23:59 cron trigger
  → UPDATE buses (clear drivers)
  → log affectedRows
  → sendLineMessage to admin
```

## Environment Variables

ไม่ต้องเพิ่มตัวแปรใหม่ — ใช้ `LINE_CHANNEL_ACCESS_TOKEN` และ `LINE_ADMIN_USER_ID` ที่มีอยู่แล้ว  
ถ้า token ยังไม่ได้ตั้งค่า `lineNotify.js` จะ graceful skip โดยไม่ crash

## Files Changed

| File | Action |
|---|---|
| `backend/services/dailyReset.js` | สร้างใหม่ |
| `backend/index.js` | เพิ่ม 2 บรรทัด (require + start) |
