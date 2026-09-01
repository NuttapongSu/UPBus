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
