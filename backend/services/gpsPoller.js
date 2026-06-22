require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const db = require('../db');
const mockGps = require('./mockGps');

const CNAME = 'PHAYAO01';
const API_URL = 'https://api01.sitgps.com/api/get_list_deviceV2';
const POLL_INTERVAL_MS = 10000; // 10 วินาที (ตาม rate limit จริง)
const SNAPSHOT_RETENTION_HOURS = 24;
const USE_MOCK_GPS = process.env.USE_MOCK_GPS === 'true';

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBITANBgkqhkiG9w0BAQEFAAOCAQ4AMIIBCQKCAQB8uWdtNOv9wjGz1zYj5f7s
4Vh5dU+ixaWgzyu4TQGEY2HHGuRXS+EPolCk+yZqPuAwUN2U6BlDpyen6Z6ZT+IW
rG0+7LhzGdPQX762CiV3rYm0W17pwdoQFldMJDAQ3YJXcaOEmhknRl12xWbD6Uwy
O+03RrV3CD82cK6zmk9xJxWtmhw3OhTqZ5wOmh/Zv3auhgx+rc1iR+cHxqN2FMcK
cx0+BHNR+4hfM8JrTD215B1/ScMDVA7Ol7QcyTgrQQ4i/OoLBIV9WqFEipgKiipC
j//ZwqN+LOITUsJYi+Ee8FjkuZP0lTlYoKToAd8Sz8viddVhMJoEhRcaK0eLGjfV
AgMBAAE=
-----END PUBLIC KEY-----`;

// mapping: vendor chassis ID → internal TC ID
const DEVICE_MAP = {
  'MRSABREM9PZM00104': 'TC001',
  'MRSABREM8PZM00126': 'TC002',
  'MRSABREM2PZM00154': 'TC003',
  'MRSABREM8PZM00160': 'TC004',
  'MRSABREM5PZM00164': 'TC005',
  'MRSABREM2PZM00168': 'TC006',
  'MRSABREM4PZM00172': 'TC007',
  'MRSABREM8PZM00174': 'TC008',
  'MRSABREM7PZM00179': 'TC009',
  'MRSABREMXPZM00192': 'TC010',
  'MRSABREM6PZM00108': 'TC011',
  'MRSABREM4PZM00138': 'TC012',
  'MRSABREM0PZM00170': 'TC013',
  'MRSABREM6PZM00173': 'TC014',
  'MRSABREM3PZM00180': 'TC015',
  'MRSABREM2PZM00185': 'TC016',
  'MRSABREM3PZM00194': 'TC017',
  'MRSABREM7PZM00196': 'TC018',
  'MRSABREM2PZM00199': 'TC019',
  'MRSABREM6PZM00206': 'TC020',
  'MRSABREMXPZM00161': 'TC021',
  'MRSABREM4PZM00169': 'TC022',
  'MRSABREM9PZM00183': 'TC023',
  'MRSABREMXPZM00208': 'TC024',
  'MRSABREMXPZM00211': 'TC025',
  'MRSABREM6PZM00156': 'TC026',
  'MRSABREM0PZM00198': 'TC027',
  'MRSABREM8PZM00207': 'TC028',
  'MRSABREM1PZM00131': 'TC029',
  'MRSABREM8PZM00210': 'TC030',
};

const VENDOR_DEVICE_IDS = Object.keys(DEVICE_MAP); // ใช้ใน mock GPS
const BUS_IDS = Array.from({ length: 30 }, (_, i) => 'TC' + String(i + 1).padStart(3, '0'));

// RAM cache — shared กับ routes/buses.js
let cachedBusData = [];

function getCachedBusData() {
  return cachedBusData;
}

function generateToken() {
  try {
    const buf = crypto.publicEncrypt(
      { key: PUBLIC_KEY, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha1' },
      Buffer.from(CNAME)
    );
    return buf.toString('base64');
  } catch (err) {
    console.error('❌ Token gen error:', err.message);
    return null;
  }
}

async function fetchAndStore() {
  try {
    let rawData;

    if (USE_MOCK_GPS) {
      rawData = mockGps.generate(VENDOR_DEVICE_IDS);
    } else {
      const token = generateToken();
      if (!token) return;

      const response = await axios({
        method: 'GET',
        url: API_URL,
        headers: { cname: CNAME, 'Content-Type': 'application/json', token },
        data: BUS_IDS,
        timeout: 8000,
      });
      rawData = response.data;
      console.log('🔍 Vendor raw response:', JSON.stringify(rawData).slice(0, 300));
    }

    if (!Array.isArray(rawData)) {
      console.log('⚠️  rawData ไม่ใช่ Array:', typeof rawData, JSON.stringify(rawData).slice(0, 200));
      return;
    }
    if (rawData.length > 0) console.log('🔍 item ตัวอย่าง:', JSON.stringify(rawData[0]));

    // อัปเดต RAM cache (เพิ่ม bearing, soc, bv, be, odo, acc)
    cachedBusData = rawData.map(item => ({
      imei_id:   DEVICE_MAP[item.id] || item.id,
      latitude:  Number(item.lat) || null,
      longitude: Number(item.lng) || null,
      speed:     Number(item.speed) || 0,
      bearing:   Number(item.bearing) || 0,
      soc:       Number(item.soc) || 0,
      bv:        Number(item.bv) || 0,
      be:        Number(item.be) || 0,
      odo:       Number(item.odo) || 0,
      acc:       item.acc === '1' ? 1 : 0,
      date:      item.datetime,
    }));

    // เขียน snapshot ลง DB (batch insert)
    if (cachedBusData.length > 0) {
      const values = cachedBusData
        .filter(b => b.latitude !== null)
        .map(b => [b.imei_id, b.latitude, b.longitude, b.speed, b.bearing, b.soc, b.bv, b.be, b.odo, b.acc]);

      if (values.length > 0) {
        await db.query(
          `INSERT INTO gps_snapshots (bus_id, lat, lng, speed, bearing, soc, bv, be, odo, acc)
           VALUES ?`,
          [values]
        );
      }

      // อัปเดตระยะทางรายวัน
      const busesWithOdo = cachedBusData.filter(b => b.odo > 0 && b.latitude !== null);
      await updateDailyStats(busesWithOdo);
    }

    console.log(`✅ GPS Updated: ${cachedBusData.length} คัน`);
  } catch (err) {
    console.error('❌ GPS Fetch Error:', err.message || err.code || String(err));
    if (err.response) console.error('Vendor:', JSON.stringify(err.response.data));
    if (err.sql) console.error('SQL:', err.sql);
    if (err.sqlMessage) console.error('SQLMessage:', err.sqlMessage);
  }
}

// ลบ snapshot เก่ากว่า 24 ชั่วโมง (รัน 1 ครั้ง/วัน)
async function cleanOldSnapshots() {
  try {
    const [result] = await db.query(
      `DELETE FROM gps_snapshots WHERE recorded_at < NOW() - INTERVAL ? HOUR`,
      [SNAPSHOT_RETENTION_HOURS]
    );
    console.log(`🗑️  Cleaned ${result.affectedRows} old snapshots`);
  } catch (err) {
    console.error('❌ Clean snapshots error:', err.message);
  }
}

async function ensureDailyStatsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS bus_daily_stats (
      id         BIGINT AUTO_INCREMENT PRIMARY KEY,
      bus_id     VARCHAR(10) NOT NULL,
      stat_date  DATE NOT NULL,
      start_odo  FLOAT NOT NULL DEFAULT 0,
      km_today   FLOAT NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_bus_date (bus_id, stat_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function updateDailyStats(busesWithOdo) {
  if (busesWithOdo.length === 0) return;
  try {
    for (const bus of busesWithOdo) {
      // INSERT first record of day (start_odo = current odo, km_today = 0)
      // ON DUPLICATE KEY: update km_today = max(0, current_odo - start_odo)
      await db.query(
        `INSERT INTO bus_daily_stats (bus_id, stat_date, start_odo, km_today)
         VALUES (?, CURDATE(), ?, 0)
         ON DUPLICATE KEY UPDATE
           km_today = GREATEST(0, ? - start_odo)`,
        [bus.imei_id, bus.odo, bus.odo]
      );
    }
  } catch (err) {
    console.error('❌ updateDailyStats error:', err.message);
  }
}

function start() {
  ensureDailyStatsTable().catch(err => console.error('❌ ensureDailyStatsTable:', err.message));

  fetchAndStore();
  setInterval(fetchAndStore, POLL_INTERVAL_MS);

  // ลบ snapshot เก่าทุกเที่ยงคืน
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const msToMidnight = midnight - Date.now();
  setTimeout(() => {
    cleanOldSnapshots();
    setInterval(cleanOldSnapshots, 24 * 60 * 60 * 1000);
  }, msToMidnight);
}

function getCachedBusById(busId) {
  return cachedBusData.find(b => b.imei_id === busId) || null;
}

module.exports = { start, getCachedBusData, getCachedBusById, BUS_IDS };
