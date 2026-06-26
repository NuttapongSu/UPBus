const { shouldNotify, buildMessage } = require('../services/pushNotify');

test('shouldNotify returns true when bus within 500m of boarding stop', () => {
  const bus = { latitude: 19.0310, longitude: 99.9240, color: 'Green' };
  const boardingStop = { lineColor: 'Green', stopName: 'ป้าย CE', lat: 19.0312, lng: 99.9241 };
  expect(shouldNotify(bus, boardingStop)).toBe(true);
});

test('shouldNotify returns false when bus >500m away', () => {
  const bus = { latitude: 19.0000, longitude: 99.9000, color: 'Green' };
  const boardingStop = { lineColor: 'Green', stopName: 'ป้าย CE', lat: 19.0310, lng: 99.9240 };
  expect(shouldNotify(bus, boardingStop)).toBe(false);
});

test('shouldNotify returns false when bus color does not match boarding line', () => {
  const bus = { latitude: 19.0312, longitude: 99.9241, color: 'Blue' };
  const boardingStop = { lineColor: 'Green', stopName: 'ป้าย CE', lat: 19.0312, lng: 99.9241 };
  expect(shouldNotify(bus, boardingStop)).toBe(false);
});

test('buildMessage formats Thai notification correctly', () => {
  const msg = buildMessage('Green', 'สายหน้ามอ', 'ป้าย CE');
  expect(msg.title).toMatch(/Green|หน้ามอ/);
  expect(msg.body).toContain('ป้าย CE');
});
