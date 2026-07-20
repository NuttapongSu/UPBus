# Daily Driver Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่ม cron job รันทุกวันเวลา 23:59 เพื่อเคลียร์คนขับออกจากรถทุกคันโดยอัตโนมัติ และส่ง LINE notify แจ้ง admin

**Architecture:** สร้าง `backend/services/dailyReset.js` module ตาม pattern เดียวกับ `co2Aggregator.js` — export `start()` ที่ register node-cron schedule แล้ว call ใน `index.js` ตอน server เริ่ม

**Tech Stack:** Node.js, node-cron, MySQL (via db pool), LINE Messaging API (via lineNotify.js ที่มีอยู่แล้ว)

## Global Constraints

- ใช้ `node-cron` เท่านั้น (ไม่ติด dependency ใหม่)
- Error จาก DB หรือ LINE API ห้าม throw — ให้ log แล้วจบ (ไม่ crash server)
- SQL ที่ใช้ต้องตรงกับ pattern ใน `/stop-driving`: `UPDATE buses SET current_driver_id = NULL, status_color = 'Purple' WHERE current_driver_id IS NOT NULL`
- ไม่เพิ่ม environment variable ใหม่

---

### Task 1: สร้าง `dailyReset.js` service

**Files:**
- Create: `backend/services/dailyReset.js`

**Interfaces:**
- Produces: `start()` — function ที่ register cron schedule `59 23 * * *`
- Produces: `resetDrivers()` — async function ที่ทำ DB update + LINE notify (export สำหรับ test)

- [ ] **Step 1: สร้างไฟล์ `backend/services/dailyReset.js`**

```js
const cron = require('node-cron');
const db = require('../db');
const { sendLineMessage } = require('./lineNotify');

async function resetDrivers() {
  try {
    const [result] = await db.query(
      'UPDATE buses SET current_driver_id = NULL, status_color = "Purple" WHERE current_driver_id IS NOT NULL'
    );
    const n = result.affectedRows;
    console.log(`🔄 Daily Reset: เคลียร์คนขับ ${n} คัน`);

    const msg = n > 0
      ? `[Daily Reset] เคลียร์คนขับออกจากรถสำเร็จ ${n} คัน — รถพร้อมสำหรับพรุ่งนี้`
      : `[Daily Reset] ไม่มีรถที่มีคนขับ — ข้ามการเคลียร์`;

    await sendLineMessage(msg);
  } catch (err) {
    console.error('❌ Daily Reset error:', err.message);
  }
}

function start() {
  cron.schedule('59 23 * * *', resetDrivers);
  console.log('🔄 Daily Reset scheduled at 23:59 every day');
}

module.exports = { start, resetDrivers };
```

- [ ] **Step 2: ตรวจสอบ syntax ด้วยการ require**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/UPBus/backend
node -e "require('./services/dailyReset'); console.log('OK')"
```

Expected output: `OK` (ไม่มี error)

- [ ] **Step 3: Commit**

```bash
git add backend/services/dailyReset.js
git commit -m "feat: add dailyReset service — clear all drivers at 23:59"
```

---

### Task 2: Register `dailyReset` ใน `index.js`

**Files:**
- Modify: `backend/index.js` (บรรทัด 7-8 บริเวณ require services, และบรรทัด 66-70 บริเวณ app.listen callback)

**Interfaces:**
- Consumes: `dailyReset.start()` จาก Task 1

- [ ] **Step 1: เพิ่ม require ใน `backend/index.js`**

เปิดไฟล์ `backend/index.js` แล้วเพิ่มบรรทัดนี้ต่อจาก `const co2Aggregator = require('./services/co2Aggregator');` (บรรทัดที่ 8):

```js
const dailyReset      = require('./services/dailyReset');
```

- [ ] **Step 2: เรียก `dailyReset.start()` ใน app.listen callback**

ใน `app.listen` callback (บรรทัดประมาณ 66-70) เพิ่มต่อจาก `co2Aggregator.start();`:

```js
  dailyReset.start();
```

ผลลัพธ์ที่ต้องการ:

```js
app.listen(PORT, async () => {
  console.log(`🚀 UP Smart Transit API on port ${PORT}`);
  gpsPoller.start();
  co2Aggregator.start();
  dailyReset.start();
});
```

- [ ] **Step 3: รัน server ตรวจสอบว่า start ได้**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/UPBus/backend
node index.js
```

Expected output ต้องมีบรรทัด:
```
🔄 Daily Reset scheduled at 23:59 every day
```

กด Ctrl+C หยุด server

- [ ] **Step 4: Commit**

```bash
git add backend/index.js
git commit -m "feat: register dailyReset service in server startup"
```
