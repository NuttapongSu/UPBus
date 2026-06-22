const {
  calcCO2Saved, calcEVCO2, calcNGVCO2,
  calcKwhUsed, calcTreesEquiv,
  GRID_EF, NGV_EMISSION,
} = require('../services/co2Calculator');

describe('calcEVCO2', () => {
  test('1 kWh × 0.4750 EF = 0.475 kgCO₂e', () => {
    expect(calcEVCO2(1)).toBeCloseTo(0.475, 3);
  });
  test('0 kWh → 0', () => {
    expect(calcEVCO2(0)).toBe(0);
  });
});

describe('calcNGVCO2', () => {
  test('10 km × 0.8835 NGV_EMISSION = 8.835 kgCO₂', () => {
    expect(calcNGVCO2(10)).toBeCloseTo(10 * NGV_EMISSION, 2);
  });
  test('0 km → 0', () => {
    expect(calcNGVCO2(0)).toBe(0);
  });
});

describe('calcCO2Saved', () => {
  test('NGV CO₂ > EV CO₂ → savings > 0', () => {
    // 10 km, 1.5 kWh
    // NGV: 10 × 0.8835 = 8.835, EV: 1.5 × 0.475 = 0.7125, saved = 8.12
    const saved = calcCO2Saved(10, 1.5);
    expect(saved).toBeGreaterThan(0);
    expect(saved).toBeCloseTo(calcNGVCO2(10) - calcEVCO2(1.5), 2);
  });
  test('ระยะทาง 0 km → 0', () => {
    expect(calcCO2Saved(0, 10)).toBe(0);
  });
  test('ระยะทางติดลบ → 0', () => {
    expect(calcCO2Saved(-5, 0)).toBe(0);
  });
  test('ไม่ส่ง kWh → ใช้ 0 (NGV เต็ม)', () => {
    expect(calcCO2Saved(10)).toBeCloseTo(calcNGVCO2(10), 2);
  });
});

describe('calcKwhUsed', () => {
  test('bv=600V, be=10A, 10s → 0.01667 kWh', () => {
    expect(calcKwhUsed(600, 10, 10)).toBeCloseTo(0.01667, 3);
  });
  test('0 → 0', () => {
    expect(calcKwhUsed(0, 0, 10)).toBe(0);
  });
});

describe('calcTreesEquiv', () => {
  test('8.4 kg → 400 ต้น', () => {
    expect(calcTreesEquiv(8.4)).toBeCloseTo(400, 0);
  });
  test('0 → 0', () => {
    expect(calcTreesEquiv(0)).toBe(0);
  });
});
