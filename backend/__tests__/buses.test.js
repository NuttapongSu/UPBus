const request = require('supertest');
const express = require('express');

// Mock gpsPoller
jest.mock('../services/gpsPoller', () => ({
  getCachedBusData: () => [
    { imei_id: 'TC001', latitude: 19.029, longitude: 99.894, speed: 30, bearing: 90, soc: 80, date: '2026-06-15 10:00:00' }
  ],
  BUS_IDS: ['TC001'],
}));

// Mock db
jest.mock('../db', () => ({
  query: jest.fn().mockResolvedValue([[
    { bus_number: 1, status_color: 'Green', full_name: 'สมชาย ใจดี' }
  ]])
}));

const busesRouter = require('../routes/buses');
const app = express();
app.use(express.json());
app.use('/api/buses', busesRouter);

describe('GET /api/buses', () => {
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
});
