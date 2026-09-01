const request = require('supertest');
const express = require('express');

// Mock gpsPoller
jest.mock('../services/gpsPoller', () => ({
  getCachedBusData: () => [
    { imei_id: 'TC001', latitude: 19.029, longitude: 99.894, speed: 30, bearing: 90, soc: 80, date: '2026-06-15 10:00:00' }
  ],
  getCachedBusById: () => ({ imei_id: 'TC001', latitude: 19.029, longitude: 99.894, speed: 30, bearing: 90, soc: 80, odo: 5000 }),
  BUS_IDS: ['TC001'],
}));

// Mock db
jest.mock('../db', () => ({
  query: jest.fn().mockResolvedValue([[
    { bus_number: 1, status_color: 'Green', full_name: 'สมชาย ใจดี' }
  ]])
}));

// Mock gpsIngest (ESP32 position override source)
jest.mock('../routes/gpsIngest', () => ({
  getLatestByDevice: jest.fn(() => null),
  DEVICE_ONLINE_THRESHOLD_MS: 30000,
}));

const busesRouter = require('../routes/buses');
const gpsIngestRouter = require('../routes/gpsIngest');
const app = express();
app.use(express.json());
app.use('/api/buses', busesRouter);

describe('GET /api/buses', () => {
  beforeEach(() => {
    gpsIngestRouter.getLatestByDevice.mockReturnValue(null);
  });

  test('returns merged GPS + DB data', async () => {
    const res = await request(app).get('/api/buses');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('imei_id', 'TC001');
    expect(res.body[0]).toHaveProperty('color');
    expect(res.body[0]).toHaveProperty('driver');
    expect(res.body[0]).toHaveProperty('bearing');
    expect(res.body[0]).toHaveProperty('soc');
  });

  test('overrides position with a fresh ESP32 report, keeps vendor telemetry', async () => {
    gpsIngestRouter.getLatestByDevice.mockReturnValue({
      device_id: 'TC001',
      lat: 19.5,
      lng: 99.5,
      speed: 45,
      bearing: 180,
      recorded_at: new Date().toISOString(),
    });

    const res = await request(app).get('/api/buses');
    expect(res.status).toBe(200);
    expect(res.body[0].latitude).toBe(19.5);
    expect(res.body[0].longitude).toBe(99.5);
    expect(res.body[0].speed).toBe(45);
    expect(res.body[0].bearing).toBe(180);
    expect(res.body[0].soc).toBe(80); // still from vendor mock, not overridden
  });

  test('falls back to vendor position when the ESP32 report is stale', async () => {
    gpsIngestRouter.getLatestByDevice.mockReturnValue({
      device_id: 'TC001',
      lat: 19.5,
      lng: 99.5,
      speed: 45,
      bearing: 180,
      recorded_at: new Date(Date.now() - 60000).toISOString(), // 60s old, > 30s threshold
    });

    const res = await request(app).get('/api/buses');
    expect(res.status).toBe(200);
    expect(res.body[0].latitude).toBe(19.029); // vendor mock value, unchanged
    expect(res.body[0].speed).toBe(30);
  });
});

describe('GET /api/buses/:id/hourly', () => {
  beforeEach(() => {
    const db = require('../db');
    // mock sequence: hourly query
    db.query
      .mockResolvedValueOnce([[
        // gps_snapshots grouped by hour
        { hour: 7, km: 12.3 },
        { hour: 8, km: 18.7 },
        { hour: 9, km:  5.1 },
      ]]);
  });

  test('returns hourly km array', async () => {
    const res = await request(app).get('/api/buses/TC001/hourly');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('hourly');
    expect(Array.isArray(res.body.hourly)).toBe(true);
    expect(res.body.hourly[0]).toHaveProperty('hour');
    expect(res.body.hourly[0]).toHaveProperty('km');
  });

  test('caps km at 150 per hour', async () => {
    const db = require('../db');
    db.query.mockReset();
    db.query.mockResolvedValueOnce([[{ hour: 10, km: 999 }]]);
    const res = await request(app).get('/api/buses/TC001/hourly');
    expect(res.status).toBe(200);
    expect(res.body.hourly[0].km).toBeLessThanOrEqual(150);
  });

  test('returns empty array when no data', async () => {
    const db = require('../db');
    db.query.mockReset();
    db.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/buses/TC001/hourly');
    expect(res.status).toBe(200);
    expect(res.body.hourly).toEqual([]);
  });
});
