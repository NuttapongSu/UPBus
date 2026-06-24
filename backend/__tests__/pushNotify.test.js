jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('axios');
const { haversineM, shouldNotify } = require('../services/pushNotify');

describe('haversineM', () => {
  it('returns 0 for same point', () => {
    expect(haversineM(19.0256, 99.895, 19.0256, 99.895)).toBeCloseTo(0, 0);
  });
  it('returns ~200m for points ~200m apart', () => {
    const d = haversineM(19.0256, 99.895, 19.0274, 99.895);
    expect(d).toBeGreaterThan(150);
    expect(d).toBeLessThan(300);
  });
});

describe('shouldNotify', () => {
  it('false for Purple', () => expect(shouldNotify({ speed: 10, color: 'Purple' })).toBe(false));
  it('false for speed < 2', () => expect(shouldNotify({ speed: 1, color: 'Red' })).toBe(false));
  it('true for moving Red bus', () => expect(shouldNotify({ speed: 10, color: 'Red' })).toBe(true));
  it('false for Orange', () => expect(shouldNotify({ speed: 10, color: 'Orange' })).toBe(false));
});
