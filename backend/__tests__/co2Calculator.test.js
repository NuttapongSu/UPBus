const {
  calcCO2Saved,
  calcKwhUsed,
  calcTreesEquiv,
} = require('../services/co2Calculator');

describe('calcCO2Saved', () => {
  test('คำนวณ CO₂ ที่ประหยัดได้จากระยะทาง', () => {
    // รถ EV วิ่ง 10 km เทียบกับ diesel
    // diesel: 1.0 kg/km, EV: 0.2 kg/km → saved 0.8 kg/km
    expect(calcCO2Saved(10)).toBeCloseTo(8.0, 1);
  });

  test('ระยะทาง 0 km → CO₂ saved = 0', () => {
    expect(calcCO2Saved(0)).toBe(0);
  });

  test('ระยะทางติดลบ → return 0', () => {
    expect(calcCO2Saved(-5)).toBe(0);
  });
});

describe('calcKwhUsed', () => {
  test('คำนวณ kWh จาก voltage × current × เวลา (ชั่วโมง)', () => {
    // bv=600V, be=10A, interval=10 วินาที
    // kWh = 600 × 10 × (10/3600) / 1000 = 0.01667 kWh
    expect(calcKwhUsed(600, 10, 10)).toBeCloseTo(0.01667, 3);
  });

  test('ค่า 0 → return 0', () => {
    expect(calcKwhUsed(0, 0, 10)).toBe(0);
  });
});

describe('calcTreesEquiv', () => {
  test('CO₂ 8.4 kg → ต้นไม้ 400 ต้น (8400g / 21g)', () => {
    expect(calcTreesEquiv(8.4)).toBeCloseTo(400, 0);
  });

  test('CO₂ 0 → 0 ต้น', () => {
    expect(calcTreesEquiv(0)).toBe(0);
  });
});
