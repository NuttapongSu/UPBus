const request = require('supertest');
const app = require('../index');

test('POST /api/push/register returns 200 with valid body', async () => {
  const res = await request(app).post('/api/push/register').send({
    token: 'ExponentPushToken[test-token-001]',
    destinationStopId: 'stop-001',
    boardingStops: [{ lineColor: 'Green', stopName: 'ป้าย CE', lat: 19.031, lng: 99.924 }],
  });
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
});

test('DELETE /api/push/unregister returns 200', async () => {
  const res = await request(app).delete('/api/push/unregister').send({
    token: 'ExponentPushToken[test-token-001]',
  });
  expect(res.status).toBe(200);
});
