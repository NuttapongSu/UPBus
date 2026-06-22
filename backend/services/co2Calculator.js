// ค่า Emission Factor อ้างอิง TGO ประเทศไทย
const GRID_EF          = 0.4750;  // kgCO₂e/kWh  — Grid Emission Factor (TGO 2023)
const CNG_EF           = 2.2088;  // kgCO₂e/kg CNG — TGO
const NGV_CONSUMPTION  = 0.40;    // kg CNG/km — รถ 6 ล้อ 40 ที่นั่ง NGV (ค่ากลาง)
const NGV_EMISSION     = NGV_CONSUMPTION * CNG_EF; // 0.8835 kgCO₂/km
const TREE_ABSORPTION  = 21;      // grams CO₂/tree/day

/**
 * CO₂ ที่รถ EV ปล่อยจากการใช้ไฟฟ้าจากกริด
 * kwhUsed × GRID_EF
 */
function calcEVCO2(kwhUsed) {
  if (!kwhUsed || kwhUsed <= 0) return 0;
  return kwhUsed * GRID_EF;
}

/**
 * CO₂ ที่รถ NGV 6 ล้อ 40 ที่นั่งปล่อยในระยะเดียวกัน
 * distanceKm × NGV_EMISSION
 */
function calcNGVCO2(distanceKm) {
  if (distanceKm <= 0) return 0;
  return distanceKm * NGV_EMISSION;
}

/**
 * CO₂ ที่ประหยัดได้เมื่อใช้ EV แทน NGV
 * = NGV_CO2 - EV_CO2
 */
function calcCO2Saved(distanceKm, kwhUsed = 0) {
  if (distanceKm <= 0) return 0;
  return Math.max(0, calcNGVCO2(distanceKm) - calcEVCO2(kwhUsed));
}

function calcKwhUsed(bv, be, intervalSeconds) {
  if (!bv || !be) return 0;
  return Math.max(0, (bv * be * (intervalSeconds / 3600)) / 1000);
}

function calcTreesEquiv(co2Kg) {
  if (co2Kg <= 0) return 0;
  return (co2Kg * 1000) / TREE_ABSORPTION;
}

module.exports = {
  calcCO2Saved, calcEVCO2, calcNGVCO2,
  calcKwhUsed, calcTreesEquiv,
  GRID_EF, NGV_EMISSION, CNG_EF, NGV_CONSUMPTION,
};
