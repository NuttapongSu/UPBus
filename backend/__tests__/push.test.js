// backend/__tests__/push.test.js
const request = require('supertest');
const express = require('express');

jest.mock('../db', () => ({ query: jest.fn() }));
const db = require('../db');
const pushRouter = require('../routes/push');

const app = express();
app.use(express.json());
app.use('/api/push', pushRouter);

describe('POST /api/push/register', () => {
  it('returns 400 when token missing', async () => {
    const res = await request(app).post('/api/push/register').send({ lines: ['Red'] });
    expect(res.status).toBe(400);
  });
  it('returns 400 when lines missing', async () => {
    const res = await request(app).post('/api/push/register').send({ token: 'abc' });
    expect(res.status).toBe(400);
  });
  it('upserts and returns ok', async () => {
    db.query.mockResolvedValue([{}]);
    const res = await request(app).post('/api/push/register')
      .send({ token: 'ExponentPushToken[xxx]', lines: ['Red', 'Green'] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO push_tokens'),
      ['ExponentPushToken[xxx]', '["Red","Green"]', '["Red","Green"]']
    );
  });
});

describe('DELETE /api/push/unregister', () => {
  it('returns 400 when token missing', async () => {
    const res = await request(app).delete('/api/push/unregister').send({});
    expect(res.status).toBe(400);
  });
  it('deletes and returns ok', async () => {
    db.query.mockResolvedValue([{}]);
    const res = await request(app).delete('/api/push/unregister').send({ token: 'ExponentPushToken[xxx]' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
