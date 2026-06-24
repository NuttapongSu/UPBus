const request = require('supertest');
const express = require('express');

jest.mock('../db', () => ({
  query: jest.fn()
    .mockResolvedValueOnce([[  // 1. sustainability_log (today co2/kwh)
      { co2_saved_kg: 120, kwh_used: 842 }
    ]])
    .mockResolvedValueOnce([[  // 2. bus_daily_stats (km_total)
      { km_total: 1240000 }    // metres
    ]])
    .mockResolvedValueOnce([[  // 3. gps_snapshots (live current hour)
    ]])
    .mockResolvedValueOnce([[  // 4. gps_snapshots COUNT (buses_active)
      { cnt: 5 }
    ]])
    .mockResolvedValueOnce([[  // 5. sustainability_daily_summary (weekly)
      { day: '2026-06-09', co2: 80 },
      { day: '2026-06-10', co2: 95 },
    ]])
}));

const sustainabilityRouter = require('../routes/sustainability');
const app = express();
app.use(express.json());
app.use('/api/sustainability', sustainabilityRouter);

describe('GET /api/sustainability', () => {
  test('returns today summary + weekly chart', async () => {
    const res = await request(app).get('/api/sustainability');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('today');
    expect(res.body.today).toHaveProperty('co2_saved_kg');
    expect(res.body.today).toHaveProperty('kwh_used');
    expect(res.body.today).toHaveProperty('km_total');
    expect(res.body).toHaveProperty('weekly');
    expect(Array.isArray(res.body.weekly)).toBe(true);
  });
});
