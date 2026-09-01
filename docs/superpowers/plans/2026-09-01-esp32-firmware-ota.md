# ESP32 GPS Device Firmware OTA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin upload a new ESP32 GPS-device firmware `.bin` through the existing EJS admin panel, and have each of the ~35 field-deployed boards pull and apply it over WiFi on its own, with a canary-per-device rollout and an automatic revert if the new firmware fails to come up.

**Architecture:** Two new MySQL tables track uploaded releases and per-device version targets. A new session-authenticated admin route group (added to the existing `backend/routes/pages.js`, following that file's established pattern) handles upload/list/promote/target actions and renders a new EJS page. A new device-authenticated route group (`backend/routes/firmwareDevice.js`, mirroring `backend/routes/gpsIngest.js`'s `X-Device-Key` pattern) lets a board check for and download an update. The ESP32 firmware (`esp32-gps/gps_sender/src/main.cpp`) gains a version check on boot and every 24h, downloads+applies via the Arduino `Update` library, then self-tests connectivity before either keeping the new firmware or reverting to the previous one.

**Tech Stack:** Node.js/Express 5, MySQL (`mysql2`), EJS, `multer` (already a dependency), Jest+Supertest (backend tests); PlatformIO/Arduino framework, ESP32 `Update.h` / `esp_ota_ops.h` (device firmware).

**Spec:** `docs/superpowers/specs/2026-09-01-esp32-firmware-ota-design.md`

## Deviations from the spec (found while planning — read before implementing)

1. **Hash algorithm: MD5, not sha256.** The spec's `sha256` field name assumed a hand-rolled streaming hash on the device. The Arduino `Update` library has a *built-in* MD5 check (`Update.setMD5()` + `Update.end(true)`) that fails the update automatically on mismatch — far less error-prone than manually computing sha256 over a WiFi stream with mbedtls on hardware nobody in this session can test against. Every field/column that the spec calls `sha256` is `md5` in this plan (`firmware_releases.md5`, the `/api/firmware/check` response field, etc). Functionally equivalent (integrity check before flashing), just the concretely safer implementation.
2. **Partition table:** `esp32-gps/gps_sender/platformio.ini` has no `board_build.partitions` set today, which typically means a non-OTA single-app partition table. `Update.h` requires two OTA app partitions. Task 6 adds `board_build.partitions = default_ota.csv` (PlatformIO's built-in OTA-capable scheme) — without this the device code compiles but every OTA write fails at runtime.
3. **Auto-rollback caveat — needs physical verification.** Task 7 uses the standard `esp_ota_mark_app_valid_cancel_rollback()` pattern. Whether the precompiled Arduino-ESP32 bootloader this board uses has app-rollback enabled cannot be confirmed from this session (no hardware access). **Before trusting this for the live fleet, deliberately flash a firmware build that fails its self-test check and confirm on serial monitor that the board actually reverts** rather than boot-looping forever. This is called out again at the end of Task 7.
4. **Admin routes live under `/admin/firmware` (session-auth EJS form routes in `pages.js`), not `/api/admin/firmware` (JSON) as the spec's route names suggested.** This repo already has two separate admin surfaces: `routes/admin.js` mounted at `/api/admin` is JWT-authenticated JSON API for a different client, while every existing EJS admin page (dashboard, complaints, admins, ...) is a session-authenticated GET-renders/POST-redirects route in `routes/pages.js`. Since this feature's admin UI is an EJS page (per your answer during brainstorming), it follows the `pages.js` pattern for consistency with every other admin page in this codebase, not the JWT router. The spec's data model, device API, and overall flow are unchanged — only the concrete admin path/auth mechanism.

## Global Constraints

- Device-facing endpoints authenticate via `X-Device-Key` header compared to `process.env.GPS_DEVICE_API_KEY` (same env var `gpsIngest.js` already uses) — do not introduce a second device key.
- Admin-facing routes use the existing `requireSession` (checks `req.session.admin`) pattern from `backend/routes/pages.js` — do not route firmware admin actions through the JWT-based `/api/admin` router (`backend/routes/admin.js`), that router serves a different (JWT) client and is a separate concern.
- Firmware `.bin` files live in `backend/uploads/firmware/`.
- No LINE notifications, no remote-triggered (push) rollout, no backend-initiated version downgrade — all out of scope per the spec.

---

## Task 1: Database migration — `firmware_releases` and `firmware_targets`

**Files:**
- Create: `backend/migrations/009_firmware_ota.sql`

**Interfaces:**
- Produces tables consumed by Task 2 (`firmwareDevice.js`) and Task 4 (admin routes in `pages.js`):
  - `firmware_releases(id, version, filename, md5, size_bytes, notes, is_stable, uploaded_at)`
  - `firmware_targets(device_id, target_version, updated_at)`

- [ ] **Step 1: Write the migration file**

```sql
CREATE TABLE IF NOT EXISTS firmware_releases (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  version      VARCHAR(20) NOT NULL UNIQUE,
  filename     VARCHAR(255) NOT NULL,
  md5          CHAR(32) NOT NULL,
  size_bytes   INT NOT NULL,
  notes        TEXT,
  is_stable    TINYINT(1) NOT NULL DEFAULT 0,
  uploaded_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS firmware_targets (
  device_id      VARCHAR(10) PRIMARY KEY,
  target_version VARCHAR(20),
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- [ ] **Step 2: Apply it to the local dev database and verify**

Run: `mysql -u root -p db_bustransit < backend/migrations/009_firmware_ota.sql`
Then: `mysql -u root -p db_bustransit -e "DESCRIBE firmware_releases; DESCRIBE firmware_targets;"`
Expected: both `DESCRIBE` outputs print the columns listed above with no error. (Matches this repo's existing migration convention — `backend/migrations/*.sql` files are applied manually, there is no migration runner to invoke.)

- [ ] **Step 3: Commit**

```bash
git add backend/migrations/009_firmware_ota.sql
git commit -m "feat(db): add firmware_releases and firmware_targets tables"
```

---

## Task 2: Device-facing firmware API (`/api/firmware/check`, `/api/firmware/download/:version`)

**Files:**
- Create: `backend/routes/firmwareDevice.js`
- Test: `backend/__tests__/firmwareDevice.test.js`

**Interfaces:**
- Consumes: `firmware_releases`, `firmware_targets` tables from Task 1; `db` from `backend/db.js` (`db.query(sql, params)` returning `[rows]`, same as every other route file); `process.env.GPS_DEVICE_API_KEY`.
- Produces: `module.exports = router` mounted (in Task 3) at `/api/firmware`, giving:
  - `GET /api/firmware/check?device_id=TC001&current_version=1.0.0` → `{ update_available: false }` or `{ update_available: true, version, md5, size_bytes }`
  - `GET /api/firmware/download/:version` → streams the `.bin` file with `Content-Length` set, or 404 if the version doesn't exist.

- [ ] **Step 1: Write the failing tests**

```javascript
// backend/__tests__/firmwareDevice.test.js
const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');

jest.mock('../db', () => ({
  query: jest.fn(),
}));

process.env.GPS_DEVICE_API_KEY = 'test-secret-key';

const firmwareDeviceRouter = require('../routes/firmwareDevice');
const db = require('../db');

const app = express();
app.use(express.json());
app.use('/api/firmware', firmwareDeviceRouter);

describe('GET /api/firmware/check', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('rejects missing device key', async () => {
    const res = await request(app).get('/api/firmware/check?device_id=TC001&current_version=1.0.0');
    expect(res.status).toBe(401);
  });

  test('rejects wrong device key', async () => {
    const res = await request(app)
      .get('/api/firmware/check?device_id=TC001&current_version=1.0.0')
      .set('X-Device-Key', 'wrong-key');
    expect(res.status).toBe(401);
  });

  test('requires device_id and current_version', async () => {
    const res = await request(app)
      .get('/api/firmware/check')
      .set('X-Device-Key', 'test-secret-key');
    expect(res.status).toBe(400);
  });

  test('no target row, no stable release -> update_available false', async () => {
    db.query
      .mockResolvedValueOnce([[]]) // firmware_targets lookup
      .mockResolvedValueOnce([[]]); // firmware_releases stable lookup
    const res = await request(app)
      .get('/api/firmware/check?device_id=TC001&current_version=1.0.0')
      .set('X-Device-Key', 'test-secret-key');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ update_available: false });
  });

  test('target resolves to a newer version -> update_available true with md5', async () => {
    db.query
      .mockResolvedValueOnce([[{ target_version: '1.1.0' }]]) // firmware_targets lookup
      .mockResolvedValueOnce([[{ version: '1.1.0', md5: 'abc123', size_bytes: 900000 }]]); // firmware_releases by version
    const res = await request(app)
      .get('/api/firmware/check?device_id=TC001&current_version=1.0.0')
      .set('X-Device-Key', 'test-secret-key');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      update_available: true,
      version: '1.1.0',
      md5: 'abc123',
      size_bytes: 900000,
    });
  });

  test('resolved version equals current_version -> update_available false', async () => {
    db.query
      .mockResolvedValueOnce([[]]) // no target row -> falls back to stable
      .mockResolvedValueOnce([[{ version: '1.0.0', md5: 'abc123', size_bytes: 900000 }]]); // stable release
    const res = await request(app)
      .get('/api/firmware/check?device_id=TC001&current_version=1.0.0')
      .set('X-Device-Key', 'test-secret-key');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ update_available: false });
  });
});

describe('GET /api/firmware/download/:version', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('rejects missing device key', async () => {
    const res = await request(app).get('/api/firmware/download/1.1.0');
    expect(res.status).toBe(401);
  });

  test('404s on unknown version', async () => {
    db.query.mockResolvedValueOnce([[]]);
    const res = await request(app)
      .get('/api/firmware/download/9.9.9')
      .set('X-Device-Key', 'test-secret-key');
    expect(res.status).toBe(404);
  });

  test('streams the file for a known version', async () => {
    const tmpDir = path.join(__dirname, '..', 'uploads', 'firmware');
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'test-fixture.bin'), Buffer.from([0xe9, 0x01, 0x02]));
    db.query.mockResolvedValueOnce([[{ filename: 'test-fixture.bin' }]]);

    const res = await request(app)
      .get('/api/firmware/download/1.1.0')
      .set('X-Device-Key', 'test-secret-key');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(Buffer.from([0xe9, 0x01, 0x02]));

    fs.unlinkSync(path.join(tmpDir, 'test-fixture.bin'));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx jest __tests__/firmwareDevice.test.js`
Expected: FAIL — `Cannot find module '../routes/firmwareDevice'`

- [ ] **Step 3: Write the implementation**

```javascript
// backend/routes/firmwareDevice.js
const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../db');

const FIRMWARE_DIR = path.join(__dirname, '..', 'uploads', 'firmware');

function requireDeviceKey(req, res, next) {
  const deviceKey = req.header('X-Device-Key');
  if (!deviceKey || deviceKey !== process.env.GPS_DEVICE_API_KEY) {
    return res.status(401).json({ error: 'Invalid device key' });
  }
  next();
}

// GET /api/firmware/check?device_id=TC001&current_version=1.0.0
router.get('/check', requireDeviceKey, async (req, res) => {
  const { device_id, current_version } = req.query;
  if (!device_id || !current_version) {
    return res.status(400).json({ error: 'device_id and current_version are required' });
  }

  try {
    const [targetRows] = await db.query(
      'SELECT target_version FROM firmware_targets WHERE device_id = ?',
      [device_id]
    );
    const pinnedVersion = targetRows[0] && targetRows[0].target_version;

    let releaseRows;
    if (pinnedVersion) {
      [releaseRows] = await db.query(
        'SELECT version, md5, size_bytes FROM firmware_releases WHERE version = ?',
        [pinnedVersion]
      );
    } else {
      [releaseRows] = await db.query(
        'SELECT version, md5, size_bytes FROM firmware_releases WHERE is_stable = 1 LIMIT 1'
      );
    }

    const resolved = releaseRows[0];
    if (!resolved || resolved.version === current_version) {
      return res.json({ update_available: false });
    }

    res.json({
      update_available: true,
      version: resolved.version,
      md5: resolved.md5,
      size_bytes: resolved.size_bytes,
    });
  } catch (err) {
    console.error('firmware/check error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/firmware/download/:version
router.get('/download/:version', requireDeviceKey, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT filename FROM firmware_releases WHERE version = ?',
      [req.params.version]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Unknown version' });
    }
    res.sendFile(path.join(FIRMWARE_DIR, rows[0].filename));
  } catch (err) {
    console.error('firmware/download error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx jest __tests__/firmwareDevice.test.js`
Expected: PASS, all 9 tests green

- [ ] **Step 5: Commit**

```bash
git add backend/routes/firmwareDevice.js backend/__tests__/firmwareDevice.test.js
git commit -m "feat(api): add device-facing firmware check/download endpoints"
```

---

## Task 3: Mount the device firmware router and drop the stale placeholder file

**Files:**
- Modify: `backend/index.js`
- Delete: `backend/uploads/firmware/version.txt` (untracked leftover — superseded by the `firmware_releases` table; nothing reads this file)

**Interfaces:**
- Consumes: `firmwareDeviceRouter` from Task 2 (`module.exports = router` from `backend/routes/firmwareDevice.js`).

- [ ] **Step 1: Mount the router**

In `backend/index.js`, alongside the other route requires (near line 22, after `gpsIngestRouter`):

```javascript
const gpsIngestRouter     = require('./routes/gpsIngest');
const firmwareDeviceRouter = require('./routes/firmwareDevice');
```

And alongside the other `app.use('/api/...')` calls (near line 62, after the `/api/gps` mount):

```javascript
app.use('/api/gps',            gpsIngestRouter);
app.use('/api/firmware',       firmwareDeviceRouter);
```

- [ ] **Step 2: Remove the stale placeholder**

```bash
rm backend/uploads/firmware/version.txt
```

- [ ] **Step 3: Verify the server still boots and the new route responds**

Run: `cd backend && node -e "require('./index.js')" &` then `sleep 1 && curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5000/api/firmware/check` then stop the background process (`kill %1` or `pkill -f "node -e"`).
Expected: prints `401` (missing device key — proves the route is mounted and reachable), not a connection error or a 404 from Express's default handler.

- [ ] **Step 4: Run the full backend test suite**

Run: `cd backend && npm test`
Expected: PASS, no regressions in existing suites.

- [ ] **Step 5: Commit**

```bash
git add backend/index.js
git commit -m "feat(api): mount /api/firmware router, drop stale firmware version.txt"
```

---

## Task 4: Admin firmware management routes (upload, list, promote, per-device target)

**Files:**
- Modify: `backend/routes/pages.js`

**Interfaces:**
- Consumes: `requireSession` (already defined at the top of `pages.js`), `db` (already required at the top of `pages.js`), `firmware_releases`/`firmware_targets` tables from Task 1.
- Produces: page + actions consumed by Task 5's view (`admin_firmware.ejs`, rendered with `{ releases, devices, success, error }` — see Step 1 below for the exact shape) and by the sidebar nav link in Task 5.
- Follows the exact GET-renders / POST-redirects-with-`?success=`/`?error=` pattern already used by the `/admin/admins` section in this same file (see lines 430-485) — do not introduce a different pattern for this feature.

- [ ] **Step 1: Add `multer` setup and the firmware admin routes**

Add near the top of `backend/routes/pages.js`, with the other requires:

```javascript
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FIRMWARE_DIR = path.join(__dirname, '..', 'uploads', 'firmware');
fs.mkdirSync(FIRMWARE_DIR, { recursive: true });

const firmwareUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, FIRMWARE_DIR),
    // Filename must not depend on req.body here: multer's storage callback
    // fires while the multipart stream is still being parsed, so the
    // "version" text field may not be populated on req.body yet if it
    // appears after the file field in the form. Write to a temp name and
    // rename to "<version>.bin" in the route handler once req.body is
    // fully available instead.
    filename: (req, file, cb) => cb(null, 'upload-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + '.bin'),
  }),
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB — generous headroom over a default_ota.csv OTA slot
});
```

Then, at the bottom of the file, before the final `module.exports = router;`:

```javascript
// ─── FIRMWARE OTA ───────────────────────────────────────────────────────────

// GET /admin/firmware
router.get('/admin/firmware', requireSession, async (req, res) => {
  try {
    const [releases] = await db.query(
      'SELECT id, version, md5, size_bytes, notes, is_stable, uploaded_at FROM firmware_releases ORDER BY uploaded_at DESC'
    );
    const [targets] = await db.query('SELECT device_id, target_version FROM firmware_targets');
    const targetByDevice = {};
    targets.forEach((t) => { targetByDevice[t.device_id] = t.target_version; });

    const BUS_COUNT = 35;
    const devices = [];
    for (let i = 1; i <= BUS_COUNT; i++) {
      const device_id = 'TC' + String(i).padStart(3, '0');
      devices.push({ device_id, target_version: targetByDevice[device_id] || null });
    }

    res.render('admin_firmware', {
      releases,
      devices,
      success: req.query.success || null,
      error:   req.query.error   || null,
    });
  } catch (err) {
    console.error('Firmware page error:', err);
    res.status(500).send('Firmware error: ' + err.message);
  }
});

// POST /admin/firmware/upload
router.post('/admin/firmware/upload', requireSession, firmwareUpload.single('firmware'), async (req, res) => {
  const { version, notes } = req.body;
  const uploadedPath = req.file && req.file.path;

  if (!version || !uploadedPath) {
    if (uploadedPath) fs.unlinkSync(uploadedPath);
    return res.redirect('/admin/firmware?error=กรุณาระบุเวอร์ชันและไฟล์ .bin');
  }

  const buf = fs.readFileSync(uploadedPath);
  if (buf.length === 0 || buf.readUInt8(0) !== 0xe9) {
    fs.unlinkSync(uploadedPath);
    return res.redirect('/admin/firmware?error=ไฟล์ไม่ใช่ ESP32 firmware image ที่ถูกต้อง (magic byte ไม่ตรง)');
  }

  const finalFilename = version.trim() + '.bin';
  const finalPath = path.join(FIRMWARE_DIR, finalFilename);
  const md5 = crypto.createHash('md5').update(buf).digest('hex');

  try {
    fs.renameSync(uploadedPath, finalPath);
    await db.query(
      'INSERT INTO firmware_releases (version, filename, md5, size_bytes, notes) VALUES (?, ?, ?, ?, ?)',
      [version.trim(), finalFilename, md5, buf.length, notes || null]
    );
    res.redirect('/admin/firmware?success=อัปโหลดเฟิร์มแวร์ ' + encodeURIComponent(version.trim()) + ' สำเร็จ');
  } catch (err) {
    fs.unlinkSync(finalPath);
    if (err.code === 'ER_DUP_ENTRY') return res.redirect('/admin/firmware?error=เวอร์ชันนี้มีอยู่แล้ว');
    console.error('Firmware upload error:', err);
    res.redirect('/admin/firmware?error=เกิดข้อผิดพลาด');
  }
});

// POST /admin/firmware/:version/promote
router.post('/admin/firmware/:version/promote', requireSession, async (req, res) => {
  try {
    await db.query('UPDATE firmware_releases SET is_stable = 0 WHERE is_stable = 1');
    const [result] = await db.query(
      'UPDATE firmware_releases SET is_stable = 1 WHERE version = ?',
      [req.params.version]
    );
    if (result.affectedRows === 0) {
      return res.redirect('/admin/firmware?error=ไม่พบเวอร์ชันนี้');
    }
    res.redirect('/admin/firmware?success=ตั้ง ' + encodeURIComponent(req.params.version) + ' เป็น stable สำเร็จ');
  } catch (err) {
    console.error('Firmware promote error:', err);
    res.redirect('/admin/firmware?error=เกิดข้อผิดพลาด');
  }
});

// POST /admin/firmware/target — ตั้ง/ล้าง canary ต่อ device
router.post('/admin/firmware/target', requireSession, async (req, res) => {
  const { device_id, target_version } = req.body;
  if (!device_id) return res.redirect('/admin/firmware?error=ไม่พบ device_id');

  try {
    if (!target_version) {
      await db.query('DELETE FROM firmware_targets WHERE device_id = ?', [device_id]);
    } else {
      await db.query(
        'INSERT INTO firmware_targets (device_id, target_version) VALUES (?, ?) ON DUPLICATE KEY UPDATE target_version = VALUES(target_version)',
        [device_id, target_version]
      );
    }
    res.redirect('/admin/firmware?success=อัปเดต target ของ ' + encodeURIComponent(device_id) + ' สำเร็จ');
  } catch (err) {
    console.error('Firmware target error:', err);
    res.redirect('/admin/firmware?error=เกิดข้อผิดพลาด');
  }
});
```

- [ ] **Step 2: Verify manually**

This route group follows the same untested convention as the rest of `pages.js` (no existing route in this file has Jest coverage — session/EJS form flows here are verified by hand, matching the file's established pattern). Verify by hand once Task 5's view exists:

Run: `cd backend && npm run dev`, log in at `/login`, visit `/admin/firmware`.
Expected: page loads with an empty release list and 35 devices listed, no server error in the console.

- [ ] **Step 3: Commit**

```bash
git add backend/routes/pages.js
git commit -m "feat(admin): add firmware upload/promote/target routes"
```

---

## Task 5: Admin firmware page (EJS view + sidebar nav link)

**Files:**
- Create: `backend/views/admin_firmware.ejs`
- Modify: `backend/views/partials/sidebar.ejs`

**Interfaces:**
- Consumes: `{ releases, devices, success, error }` as rendered by `GET /admin/firmware` in Task 4. `releases[i]` has `{ id, version, md5, size_bytes, notes, is_stable, uploaded_at }`. `devices[i]` has `{ device_id, target_version }`.
- Posts to `/admin/firmware/upload` (multipart: `version`, `notes`, `firmware` file), `/admin/firmware/:version/promote`, `/admin/firmware/target` (`device_id`, `target_version`) — all defined in Task 4.

- [ ] **Step 1: Add the sidebar nav link**

In `backend/views/partials/sidebar.ejs`, insert a new `<li>` after the "จัดการรถ" entry (after line 41, before the "จัดการ Admin" `<li>` that starts at line 42):

```html
<li class="relative px-6 py-3">
    <% if (page === 'firmware') { %><span class="absolute inset-y-0 left-0 w-1 bg-purple-600 rounded-tr-lg rounded-br-lg"></span><% } %>
    <a class="inline-flex items-center w-full text-sm font-semibold transition-colors duration-150 hover:text-gray-800 dark:hover:text-gray-200 <%= page==='firmware' ? 'text-gray-800 dark:text-gray-100' : '' %>" href="/admin/firmware">
        <svg class="w-5 h-5" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        <span class="ml-4">เฟิร์มแวร์ GPS</span>
    </a>
</li>
```

- [ ] **Step 2: Create the view**

```html
<!-- backend/views/admin_firmware.ejs -->
<!DOCTYPE html>
<html :class="{ 'theme-dark': dark }" x-data="data()" lang="th">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>UP Bus - เฟิร์มแวร์ GPS</title>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/assets/css/tailwind.output.css" />
    <script src="https://cdn.jsdelivr.net/gh/alpinejs/alpine@v2.x.x/dist/alpine.min.js" defer></script>
    <script src="/assets/js/init-alpine.js"></script>
    <style>body,h1,h2,h3,h4,h5,h6,p,span,a,div,table{font-family:'Kanit',sans-serif!important}</style>
</head>
<body>
<div class="flex h-screen bg-gray-50 dark:bg-gray-900" :class="{ 'overflow-hidden': isSideMenuOpen }">

    <%- include('partials/sidebar', { page: 'firmware' }) %>

    <div class="flex flex-col flex-1 w-full overflow-y-auto">
        <header class="z-10 py-4 bg-white shadow-md dark:bg-gray-800">
            <div class="container flex items-center justify-between h-full px-6 mx-auto">
                <h2 class="text-lg font-semibold text-gray-700 dark:text-gray-200">เฟิร์มแวร์ GPS</h2>
                <a href="/logout" onclick="return confirm('ยืนยันออกจากระบบ?');" class="text-sm text-purple-600 hover:underline">ออกจากระบบ</a>
            </div>
        </header>

        <main class="h-full overflow-y-auto">
            <div class="container px-6 mx-auto py-6">

                <% if (success) { %>
                <div class="mb-4 px-4 py-3 bg-green-100 text-green-800 rounded-lg"><%= success %></div>
                <% } %>
                <% if (error) { %>
                <div class="mb-4 px-4 py-3 bg-red-100 text-red-800 rounded-lg"><%= error %></div>
                <% } %>

                <!-- อัปโหลดเฟิร์มแวร์ใหม่ -->
                <div class="mb-6 p-6 bg-white rounded-lg shadow-xs dark:bg-gray-800">
                    <h3 class="text-base font-semibold text-gray-700 dark:text-gray-200 mb-4">อัปโหลดเฟิร์มแวร์ใหม่</h3>
                    <form method="POST" action="/admin/firmware/upload" enctype="multipart/form-data" class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">เวอร์ชัน</label>
                            <input type="text" name="version" required placeholder="เช่น 1.1.0"
                                class="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:border-purple-400" />
                        </div>
                        <div>
                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">Changelog</label>
                            <input type="text" name="notes" placeholder="(ไม่บังคับ)"
                                class="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:border-purple-400" />
                        </div>
                        <div>
                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">ไฟล์ .bin</label>
                            <input type="file" name="firmware" accept=".bin" required
                                class="w-full text-sm text-gray-600 dark:text-gray-300" />
                        </div>
                        <div class="flex items-end">
                            <button type="submit"
                                class="w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors">
                                อัปโหลด
                            </button>
                        </div>
                    </form>
                </div>

                <!-- ประวัติเวอร์ชัน -->
                <div class="mb-6 bg-white rounded-lg shadow-xs dark:bg-gray-800 overflow-hidden">
                    <div class="px-6 py-4 border-b dark:border-gray-700">
                        <h3 class="text-base font-semibold text-gray-700 dark:text-gray-200">ประวัติเวอร์ชัน (<%= releases.length %>)</h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="text-xs font-semibold tracking-wide text-left text-gray-500 uppercase border-b dark:border-gray-700 bg-gray-50 dark:text-gray-400 dark:bg-gray-800">
                                    <th class="px-4 py-3">เวอร์ชัน</th>
                                    <th class="px-4 py-3">ขนาด</th>
                                    <th class="px-4 py-3">MD5</th>
                                    <th class="px-4 py-3">Changelog</th>
                                    <th class="px-4 py-3">อัปโหลดเมื่อ</th>
                                    <th class="px-4 py-3">สถานะ</th>
                                    <th class="px-4 py-3">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y dark:divide-gray-700 dark:bg-gray-800">
                                <% releases.forEach(function(r) { %>
                                <tr class="text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td class="px-4 py-3 font-semibold"><%= r.version %></td>
                                    <td class="px-4 py-3 text-xs"><%= (r.size_bytes / 1024).toFixed(0) %> KB</td>
                                    <td class="px-4 py-3 text-xs font-mono"><%= r.md5.slice(0, 12) %>...</td>
                                    <td class="px-4 py-3 text-xs"><%= r.notes || '-' %></td>
                                    <td class="px-4 py-3 text-xs text-gray-500"><%= new Date(r.uploaded_at).toLocaleString('th-TH') %></td>
                                    <td class="px-4 py-3">
                                        <% if (r.is_stable) { %>
                                        <span class="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Stable</span>
                                        <% } else { %>
                                        <span class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">-</span>
                                        <% } %>
                                    </td>
                                    <td class="px-4 py-3">
                                        <% if (!r.is_stable) { %>
                                        <form method="POST" action="/admin/firmware/<%= r.version %>/promote" onsubmit="return confirm('ตั้ง <%= r.version %> เป็น stable สำหรับทุกคันที่ไม่ได้ตั้ง canary?');">
                                            <button type="submit" class="px-3 py-1 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors">Promote to stable</button>
                                        </form>
                                        <% } %>
                                    </td>
                                </tr>
                                <% }); %>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Target ต่อคัน (canary) -->
                <div class="bg-white rounded-lg shadow-xs dark:bg-gray-800 overflow-hidden">
                    <div class="px-6 py-4 border-b dark:border-gray-700">
                        <h3 class="text-base font-semibold text-gray-700 dark:text-gray-200">Target ต่อคัน (<%= devices.length %> คัน)</h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="text-xs font-semibold tracking-wide text-left text-gray-500 uppercase border-b dark:border-gray-700 bg-gray-50 dark:text-gray-400 dark:bg-gray-800">
                                    <th class="px-4 py-3">Device ID</th>
                                    <th class="px-4 py-3">Target ปัจจุบัน</th>
                                    <th class="px-4 py-3">ตั้งค่า</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y dark:divide-gray-700 dark:bg-gray-800">
                                <% devices.forEach(function(d) { %>
                                <tr class="text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td class="px-4 py-3 font-mono"><%= d.device_id %></td>
                                    <td class="px-4 py-3">
                                        <% if (d.target_version) { %>
                                        <span class="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">canary: <%= d.target_version %></span>
                                        <% } else { %>
                                        <span class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">(stable)</span>
                                        <% } %>
                                    </td>
                                    <td class="px-4 py-3">
                                        <form method="POST" action="/admin/firmware/target" class="flex items-center gap-2">
                                            <input type="hidden" name="device_id" value="<%= d.device_id %>">
                                            <select name="target_version" class="px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                                                <option value="">(stable)</option>
                                                <% releases.forEach(function(r) { %>
                                                <option value="<%= r.version %>" <%= d.target_version === r.version ? 'selected' : '' %>><%= r.version %></option>
                                                <% }); %>
                                            </select>
                                            <button type="submit" class="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors">ตั้งค่า</button>
                                        </form>
                                    </td>
                                </tr>
                                <% }); %>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    </div>
</div>
</body>
</html>
```

- [ ] **Step 3: Verify manually**

Run: `cd backend && npm run dev`, log in, click "เฟิร์มแวร์ GPS" in the sidebar.
Expected: `/admin/firmware` renders with the upload form, an empty release table, and 35 rows (`TC001`..`TC035`) all showing `(stable)`. Upload a small dummy file starting with byte `0xE9` (e.g. `printf '\xe9\x00\x00' > /tmp/test.bin`) with version `0.0.1-test` — it should appear in the release table with a size and MD5. Then delete that test row from `firmware_releases` and the corresponding file in `backend/uploads/firmware/` before moving on (this was just a manual smoke test, not real firmware).

- [ ] **Step 4: Commit**

```bash
git add backend/views/admin_firmware.ejs backend/views/partials/sidebar.ejs
git commit -m "feat(admin): add firmware management page"
```

---

## Task 6: Enable an OTA-capable partition table

**Files:**
- Modify: `esp32-gps/gps_sender/platformio.ini`
- Modify (mirror the same change): `/Users/nuttapongsupakon/Documents/PlatformIO/Projects/gps_sender/platformio.ini` — this is the actual PlatformIO project directory the device is built and flashed from; `esp32-gps/gps_sender/` in the UPBus repo is a tracked mirror of it. Keep both in sync for every step in Tasks 6 and 7.

**Interfaces:**
- Produces the `ota_0`/`ota_1`/`otadata` partitions that `Update.h` (used in Task 7) requires to exist at runtime.

- [ ] **Step 1: Add the partition scheme to the `esp32doit-devkit-v1` env**

In both `platformio.ini` files, add one line to the `[env:esp32doit-devkit-v1]` section:

```ini
[env:esp32doit-devkit-v1]
platform = espressif32
board = esp32doit-devkit-v1
framework = arduino
monitor_speed = 115200
board_build.partitions = default_ota.csv
build_src_filter = +<*> -<pin_test.cpp>
lib_deps =
    tzapu/WiFiManager@^2.0.17
```

(Only `board_build.partitions = default_ota.csv` is new; everything else in that block is unchanged.)

- [ ] **Step 2: Verify it builds and the new table is what's flashed**

Run (from the actual PlatformIO project dir, not the repo mirror): `cd "/Users/nuttapongsupakon/Documents/PlatformIO/Projects/gps_sender" && pio run -e esp32doit-devkit-v1 -v 2>&1 | grep -i partition`
Expected: build output references `default_ota.csv` (not the board's default partition file) and the build succeeds. If it fails with an overflow/size error, the app image no longer fits a `default_ota.csv` OTA slot (~1.25MB each on this board) — stop and report that back rather than picking a different partition scheme unilaterally, since a smaller OTA slot may need trimming dependencies.

- [ ] **Step 3: Copy the change into the repo mirror and commit**

```bash
cp "/Users/nuttapongsupakon/Documents/PlatformIO/Projects/gps_sender/platformio.ini" "/Applications/XAMPP/xamppfiles/htdocs/UPBus/esp32-gps/gps_sender/platformio.ini"
cd /Applications/XAMPP/xamppfiles/htdocs/UPBus
git add esp32-gps/gps_sender/platformio.ini
git commit -m "feat(esp32-gps): enable OTA-capable partition table"
```

---

## Task 7: Device-side OTA client (check, download, apply, self-test, revert)

**Files:**
- Modify: `/Users/nuttapongsupakon/Documents/PlatformIO/Projects/gps_sender/src/main.cpp` (the real, buildable/flashable source)
- Modify (mirror the same change): `esp32-gps/gps_sender/src/main.cpp` in the UPBus repo

**Interfaces:**
- Consumes: `GET /api/firmware/check?device_id=&current_version=` and `GET /api/firmware/download/:version` from Task 2, using `SERVER_URL`'s host (existing `const char* SERVER_URL` at line 28) and the existing `deviceId`/`deviceKey` globals already populated by `loadDeviceConfig()`/`runWifiSetup()`.
- Produces: no new interface consumed elsewhere — this is the terminal piece of the feature.

- [ ] **Step 1: Add includes, the version constant, and OTA state helpers**

Near the top of `main.cpp`, after the existing includes (after line 26 `#include <Preferences.h>`):

```cpp
#include <Update.h>
#include <esp_ota_ops.h>
#include <esp_partition.h>
```

After `const char* SERVER_URL = ...` (line 28), add:

```cpp
// Bump this before building a new release and uploading it via the admin
// firmware page. This is what the device reports as its "current_version"
// on every /api/firmware/check call.
const char* FIRMWARE_VERSION = "1.0.0";

const unsigned long FIRMWARE_CHECK_INTERVAL_MS = 24UL * 60UL * 60UL * 1000UL; // 24h
const unsigned long FIRMWARE_SELFTEST_TIMEOUT_MS = 120000; // 2 min budget to prove the new build is good
unsigned long lastFirmwareCheckMs = 0;
```

After `Preferences prefs;` (line 52), add a second `Preferences` handle dedicated to OTA bookkeeping so it doesn't collide with the `"upbus-gps"` namespace used for WiFi/device config:

```cpp
Preferences otaPrefs;
```

- [ ] **Step 2: Add the self-test / mark-valid-or-revert function**

Add this new function after `saveDeviceConfig()` (after line 137):

```cpp
// Runs once per boot, right after WiFi connects. If the previous boot
// applied an OTA update, this proves the new firmware can actually reach
// the server before committing to it; otherwise it reverts to whichever
// firmware was running before the update.
//
// Mechanism: esp_ota_mark_app_valid_cancel_rollback() relies on the
// bootloader's own pending-verify/rollback feature, which may or may not
// be enabled in this board's precompiled Arduino-ESP32 bootloader -- that
// could not be confirmed without physical hardware. So this also does its
// own explicit revert: before applying an update (see
// checkAndApplyFirmwareUpdate() below) the running partition's address is
// saved to Preferences; if self-test fails here, that exact partition is
// set as the boot target directly via esp_ota_set_boot_partition(),
// independent of whether bootloader-level rollback is active.
void runOtaSelfTestOrRevert() {
  otaPrefs.begin("upbus-ota", false);
  bool otaPending = otaPrefs.getBool("pending", false);
  if (!otaPending) {
    otaPrefs.end();
    return;
  }

  Serial.println("[DBG-ota] booted after an OTA update -- running self-test...");
  unsigned long start = millis();
  bool selfTestOk = false;
  while (millis() - start < FIRMWARE_SELFTEST_TIMEOUT_MS) {
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      WiFiClientSecure client;
      client.setInsecure();
      http.setConnectTimeout(5000);
      http.setTimeout(5000);
      String url = String(SERVER_URL);
      url.replace("/ingest", ""); // SERVER_URL points at .../api/gps/ingest
      url += "/../firmware/check?device_id=" + String(deviceId) + "&current_version=" + String(FIRMWARE_VERSION);
      http.begin(client, url);
      http.addHeader("X-Device-Key", deviceKey);
      int status = http.GET();
      http.end();
      if (status >= 200 && status < 300) {
        selfTestOk = true;
        break;
      }
    }
    delay(2000);
  }

  if (selfTestOk) {
    Serial.println("[DBG-ota] self-test passed -- keeping this firmware");
    esp_ota_mark_app_valid_cancel_rollback();
    otaPrefs.putBool("pending", false);
    otaPrefs.end();
    return;
  }

  Serial.println("[DBG-ota] self-test FAILED -- reverting to previous firmware");
  uint32_t prevAddr = otaPrefs.getUInt("prev_addr", 0);
  otaPrefs.putBool("pending", false);
  otaPrefs.end();

  if (prevAddr == 0) {
    Serial.println("[DBG-ota] no previous partition address saved -- cannot auto-revert, staying on current firmware");
    return;
  }

  esp_partition_iterator_t it = esp_partition_find(ESP_PARTITION_TYPE_APP, ESP_PARTITION_SUBTYPE_ANY, NULL);
  while (it != NULL) {
    const esp_partition_t* part = esp_partition_get(it);
    if (part->address == prevAddr) {
      esp_ota_set_boot_partition(part);
      Serial.println("[DBG-ota] boot partition reverted, restarting...");
      esp_partition_iterator_release(it);
      ESP.restart();
    }
    it = esp_partition_next(it);
  }
  esp_partition_iterator_release(it);
  Serial.println("[DBG-ota] previous partition not found -- cannot auto-revert, staying on current firmware");
}
```

Note the URL-building line above is deliberately explicit rather than introducing a second base-URL constant: `SERVER_URL` is `".../api/gps/ingest"`, so stripping `/ingest` and appending `/../firmware/check...` lands on `.../api/firmware/check...`. This keeps a single source of truth for the host/path prefix instead of duplicating it.

- [ ] **Step 3: Add the check-and-apply-update function**

Add this after `runOtaSelfTestOrRevert()`:

```cpp
// Checks the backend for a newer firmware target for this device and, if
// one exists, downloads and flashes it. Records the currently-running
// partition first so runOtaSelfTestOrRevert() can revert to it on the next
// boot if the new firmware doesn't pass its self-test.
void checkAndApplyFirmwareUpdate() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure checkClient;
  checkClient.setInsecure();
  HTTPClient checkHttp;
  checkHttp.setConnectTimeout(5000);
  checkHttp.setTimeout(5000);
  String checkUrl = String(SERVER_URL);
  checkUrl.replace("/ingest", "");
  checkUrl += "/../firmware/check?device_id=" + String(deviceId) + "&current_version=" + String(FIRMWARE_VERSION);
  checkHttp.begin(checkClient, checkUrl);
  checkHttp.addHeader("X-Device-Key", deviceKey);
  int checkStatus = checkHttp.GET();
  if (checkStatus < 200 || checkStatus >= 300) {
    Serial.printf("[DBG-ota] firmware check failed, HTTP %d\n", checkStatus);
    checkHttp.end();
    return;
  }
  String body = checkHttp.getString();
  checkHttp.end();

  if (body.indexOf("\"update_available\":true") == -1) {
    return; // up to date
  }

  int vStart = body.indexOf("\"version\":\"") + 11;
  int vEnd = body.indexOf('"', vStart);
  String newVersion = body.substring(vStart, vEnd);

  int mStart = body.indexOf("\"md5\":\"") + 7;
  int mEnd = body.indexOf('"', mStart);
  String newMd5 = body.substring(mStart, mEnd);

  int sStart = body.indexOf("\"size_bytes\":") + 13;
  int sEnd = sStart;
  while (sEnd < (int)body.length() && isDigit(body[sEnd])) sEnd++;
  long newSize = body.substring(sStart, sEnd).toInt();

  if (newVersion.length() == 0 || newMd5.length() == 0 || newSize <= 0) {
    Serial.println("[DBG-ota] malformed /firmware/check response, aborting");
    return;
  }

  Serial.printf("[DBG-ota] update available: %s (%ld bytes), downloading...\n", newVersion.c_str(), newSize);

  WiFiClientSecure dlClient;
  dlClient.setInsecure();
  HTTPClient dlHttp;
  dlHttp.setConnectTimeout(5000);
  dlHttp.setTimeout(20000);
  String dlUrl = String(SERVER_URL);
  dlUrl.replace("/ingest", "");
  dlUrl += "/../firmware/download/" + newVersion;
  dlHttp.begin(dlClient, dlUrl);
  dlHttp.addHeader("X-Device-Key", deviceKey);
  int dlStatus = dlHttp.GET();
  if (dlStatus != 200) {
    Serial.printf("[DBG-ota] download failed, HTTP %d\n", dlStatus);
    dlHttp.end();
    return;
  }

  if (!Update.begin(newSize)) {
    Serial.printf("[DBG-ota] Update.begin failed: %s\n", Update.errorString());
    dlHttp.end();
    return;
  }
  Update.setMD5(newMd5.c_str());

  WiFiClient* stream = dlHttp.getStreamPtr();
  size_t written = Update.writeStream(*stream);
  dlHttp.end();

  if (written != (size_t)newSize) {
    Serial.printf("[DBG-ota] wrote %u of %ld bytes, aborting\n", (unsigned)written, newSize);
    Update.abort();
    return;
  }

  if (!Update.end(true)) {
    Serial.printf("[DBG-ota] Update.end failed (likely MD5 mismatch): %s\n", Update.errorString());
    return;
  }

  // Record where we're booting from now so a failed self-test on the next
  // boot knows exactly which partition to fall back to.
  otaPrefs.begin("upbus-ota", false);
  otaPrefs.putUInt("prev_addr", (uint32_t)esp_ota_get_running_partition()->address);
  otaPrefs.putBool("pending", true);
  otaPrefs.end();

  Serial.println("[DBG-ota] update applied, restarting...");
  ESP.restart();
}
```

- [ ] **Step 4: Wire both functions into `setup()` and `loop()`**

In `setup()`, immediately after `runWifiSetup(forcePortal);` (after line 427):

```cpp
  runOtaSelfTestOrRevert();
  checkAndApplyFirmwareUpdate();
  lastFirmwareCheckMs = millis();
```

In `loop()`, add a periodic re-check alongside the existing GPS-rearm timer block (after the closing brace of the `if (!gpsFixed) { ... }` block, i.e. after line 458, before the `if (millis() - lastGpsPollMs ...)` block):

```cpp
  if (millis() - lastFirmwareCheckMs >= FIRMWARE_CHECK_INTERVAL_MS) {
    lastFirmwareCheckMs = millis();
    checkAndApplyFirmwareUpdate();
  }
```

- [ ] **Step 5: Compile-verify**

Run (from the real PlatformIO project dir): `cd "/Users/nuttapongsupakon/Documents/PlatformIO/Projects/gps_sender" && pio run -e esp32doit-devkit-v1`
Expected: build succeeds with no errors. This cannot be verified further without hardware — there is no ESP32 attached to this session.

- [ ] **Step 6: Copy into the repo mirror and commit**

```bash
cp "/Users/nuttapongsupakon/Documents/PlatformIO/Projects/gps_sender/src/main.cpp" "/Applications/XAMPP/xamppfiles/htdocs/UPBus/esp32-gps/gps_sender/src/main.cpp"
cd /Applications/XAMPP/xamppfiles/htdocs/UPBus
git add esp32-gps/gps_sender/src/main.cpp
git commit -m "feat(esp32-gps): add OTA check/apply/self-test/revert logic"
```

- [ ] **Step 7: Physical hardware verification (do not skip before trusting this on the live fleet)**

1. Flash the new firmware (with `FIRMWARE_VERSION = "1.0.0"`) to one test board via USB as normal.
2. Bump `FIRMWARE_VERSION` to `"1.0.1"` in a *deliberately broken* build (e.g. add `while(true) delay(1000);` right after `runWifiSetup()` so it can never reach the self-test's HTTP check), upload that `.bin` via the admin page, set it as that one board's canary target.
3. Confirm on serial monitor that the board downloads `1.0.1`, restarts, and — because it can never pass self-test — **reverts back to `1.0.0` and resumes normal operation**, rather than boot-looping forever on the broken build. This is the auto-revert path the whole design depends on; per the deviation note at the top of this plan, it has not been exercised on real hardware in this session.
4. Only after that passes, repeat with a genuinely good `1.0.1` build and confirm it stays on `1.0.1` (self-test passes, `esp_ota_mark_app_valid_cancel_rollback()` runs, no revert on next reboot).
