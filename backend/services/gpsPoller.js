require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const db = require('../db');

const CNAME = 'PHAYAO01';
const API_URL = 'https://api01.sitgps.com/api/get_list_deviceV2';
const POLL_INTERVAL_MS = 10000; // 10 วินาที (ตาม rate limit จริง)
const SNAPSHOT_RETENTION_HOURS = 24;

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBITANBgkqhkiG9w0BAQEFAAOCAQ4AMIIBCQKCAQB8uWdtNOv9wjGz1zYj5f7s
4Vh5dU+ixaWgzyu4TQGEY2HHGuRXS+EPolCk+yZqPuAwUN2U6BlDpyen6Z6ZT+IW
rG0+7LhzGdPQX762CiV3rYm0W17pwdoQFldMJDAQ3YJXcaOEmhknRl12xWbD6Uwy
O+03RrV3CD82cK6zmk9xJxWtmhw3OhTqZ5wOmh/Zv3auhgx+rc1iR+cHxqN2FMcK
cx0+BHNR+4hfM8JrTD215B1/ScMDVA7Ol7QcyTgrQQ4i/OoLBIV9WqFEipgKiipC
j//ZwqN+LOITUsJYi+Ee8FjkuZP0lTlYoKToAd8Sz8viddVhMJoEhRcaK0eLGjfV
AgMBAAE=
-----END PUBLIC KEY-----`;

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
  const token = generateToken();
  if (!token) return;

  try {
    const response = await axios({
      method: 'GET',
      url: API_URL,
      headers: { cname: CNAME, 'Content-Type': 'application/json', token },
      data: BUS_IDS,
      timeout: 8000,
    });

    const rawData = response.data;
    if (!Array.isArray(rawData)) return;

    // อัปเดต RAM cache (เพิ่ม bearing, soc, bv, be, odo, acc)
    cachedBusData = rawData.map(item => ({
      imei_id:   item.id,
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
    }

    console.log(`✅ GPS Updated: ${cachedBusData.length} คัน`);
  } catch (err) {
    console.error('❌ GPS Fetch Error:', err.message);
    if (err.response) console.error('Vendor:', JSON.stringify(err.response.data));
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

function start() {
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

module.exports = { start, getCachedBusData, BUS_IDS };
