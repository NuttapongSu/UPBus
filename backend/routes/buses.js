const express = require('express');
const router = express.Router();
const db = require('../db');
const { getCachedBusData, getCachedBusById, BUS_IDS } = require('../services/gpsPoller');
const { getWrongRouteState } = require('../services/routeCheckpoints');
const gpsIngestRouter = require('./gpsIngest');

// Vendor GPS polls on a ~10s cycle; a bus with its own ESP32 GPS device pushes
// far more often. When a bus has a recent ESP32 report, use it for the
// position fields only (lat/lng/speed/bearing) to cut that lag -- every other
// field (soc/bv/be/odo/acc/color/driver) still comes from vendor+DB as before.
function withEsp32PositionOverride(vendorGps, busId) {
  const esp32 = gpsIngestRouter.getLatestByDevice(busId);
  if (!esp32) return { ...vendorGps, source: 'vendor' };

  const ageMs = Date.now() - new Date(esp32.recorded_at).getTime();
  if (ageMs > gpsIngestRouter.DEVICE_ONLINE_THRESHOLD_MS) return { ...vendorGps, source: 'vendor' };

  return {
    ...vendorGps,
    latitude: esp32.lat,
    longitude: esp32.lng,
    speed: esp32.speed,
    bearing: esp32.bearing,
    source: 'esp32',
  };
}

// GET /api/buses — merge RAM cache + DB + today's reservations
router.get('/', async (req, res) => {
  try {
    const [dbBuses] = await db.query(`
      SELECT buses.bus_number, buses.status_color, drivers.full_name
      FROM buses
      LEFT JOIN drivers ON buses.current_driver_id = drivers.id
    `);

    const [reservations] = await db.query(
      `SELECT bus_number, department FROM bus_reservations WHERE reserved_date = CURDATE() AND status = 'approved'`
    );

    const dbMap = new Map();
    dbBuses.forEach(bus => {
      const gpsId = 'TC' + String(bus.bus_number).padStart(3, '0');
      dbMap.set(gpsId, bus);
    });

    const reserveMap = new Map();
    reservations.forEach(r => reserveMap.set(r.bus_number, r.department));

    const gpsMap = new Map(getCachedBusData().map(b => [b.imei_id, b]));
    const wrongRoutes = getWrongRouteState();

    const finalData = BUS_IDS.map(tc => {
      const vendorGps = gpsMap.get(tc) || { imei_id: tc, latitude: null, longitude: null, speed: 0, bearing: 0, soc: 0 };
      const gps = withEsp32PositionOverride(vendorGps, tc);
      const dbInfo = dbMap.get(tc) || { status_color: 'Purple', full_name: 'ไม่ระบุคนขับ' };
      const department = reserveMap.get(tc) || null;
      // มี reservation → สีส้ม
      // ตรวจพบผิดสาย (streak ≥ threshold) → override เป็นสายที่ตรวจจับได้
      // ปกติ → ใช้สีจาก DB
      const baseColor = wrongRoutes[tc]?.detectedRoute ?? dbInfo.status_color;
      const color = department ? 'Orange' : baseColor;
      return { ...gps, color, driver: dbInfo.full_name, department };
    });

    res.json(finalData);
  } catch (err) {
    console.error('Buses route error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

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

// GET /api/buses/:id — detail for one bus (real-time + daily stats)
router.get('/:id', async (req, res) => {
  const busId = req.params.id.toUpperCase();
  try {
    const [[dbBus]] = await db.query(`
      SELECT buses.bus_number, buses.status_color, drivers.full_name
      FROM buses
      LEFT JOIN drivers ON buses.current_driver_id = drivers.id
      WHERE buses.bus_number = ?
    `, [parseInt(busId.replace('TC', ''), 10)]);

    const [[reservation]] = await db.query(
      `SELECT department FROM bus_reservations WHERE bus_number = ? AND reserved_date = CURDATE() AND status = 'approved'`,
      [busId]
    );

    const gps = getCachedBusById(busId);

    // today's km from bus_daily_stats
    const [[today]] = await db.query(
      `SELECT km_today FROM bus_daily_stats WHERE bus_id = ? AND stat_date = CURDATE()`,
      [busId]
    );

    // last 7 days history — km_today = current_odo - start_odo (first odo of day)
    const [history] = await db.query(`
      SELECT stat_date AS date, km_today AS km
      FROM bus_daily_stats
      WHERE bus_id = ?
        AND stat_date >= CURDATE() - INTERVAL 6 DAY
      ORDER BY stat_date ASC
    `, [busId]);

    const department = reservation?.department || null;
    const color = department ? 'Orange' : (dbBus?.status_color || 'Purple');

    // odo from vendor is in metres — convert to km for display
    const odoToKm = v => Math.round((v || 0) / 1000 * 10) / 10;

    res.json({
      bus_id:    busId,
      color,
      driver:    dbBus?.full_name || 'ไม่มีคนขับ',
      department,
      odo_total: odoToKm(gps?.odo),
      km_today:  odoToKm(today?.km_today),
      speed:     gps?.speed       || 0,
      acc:       gps?.acc         ?? 0,
      soc:       gps?.soc         || 0,
      history:   history.map(h => ({ ...h, km: odoToKm(h.km) })),
    });
  } catch (err) {
    console.error('Bus detail error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
