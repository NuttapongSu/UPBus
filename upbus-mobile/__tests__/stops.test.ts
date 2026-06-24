import { LINE_STOPS } from '../constants/stops';

describe('LINE_STOPS', () => {
  it('has Red, Green, Blue', () => {
    expect(LINE_STOPS).toHaveProperty('Red');
    expect(LINE_STOPS).toHaveProperty('Green');
    expect(LINE_STOPS).toHaveProperty('Blue');
  });
  it('each stop has name, lat, lng as numbers', () => {
    for (const stops of Object.values(LINE_STOPS)) {
      for (const s of stops) {
        expect(typeof s.name).toBe('string');
        expect(typeof s.lat).toBe('number');
        expect(typeof s.lng).toBe('number');
      }
    }
  });
});
