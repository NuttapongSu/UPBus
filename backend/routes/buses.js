const express = require('express');
const router = express.Router();
const db = require('../db');
const { getCachedBusData, BUS_IDS } = require('../services/gpsPoller');

// GET /api/buses — merge RAM cache + DB
router.get('/', async (req, res) => {
  try {
    const [dbBuses] = await db.query(`
      SELECT buses.bus_number, buses.status_color, drivers.full_name
      FROM buses
      LEFT JOIN drivers ON buses.current_driver_id = drivers.id
    `);

    const dbMap = new Map();
    dbBuses.forEach(bus => {
      const gpsId = 'TC' + String(bus.bus_number).padStart(3, '0');
      dbMap.set(gpsId, bus);
    });

    const gpsMap = new Map(getCachedBusData().map(b => [b.imei_id, b]));

    const finalData = BUS_IDS.map(tc => {
      const gps = gpsMap.get(tc) || { imei_id: tc, latitude: null, longitude: null, speed: 0, bearing: 0, soc: 0 };
      const dbInfo = dbMap.get(tc) || { status_color: 'Purple', full_name: 'ไม่ระบุคนขับ' };
      return { ...gps, color: dbInfo.status_color, driver: dbInfo.full_name };
    });

    res.json(finalData);
  } catch (err) {
    console.error('Buses route error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
