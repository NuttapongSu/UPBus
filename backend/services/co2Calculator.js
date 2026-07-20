// ค่า Emission Factor อ้างอิง TGO ประเทศไทย
const GRID_EF            = 0.4750;  // kgCO₂e/kWh  — Grid Emission Factor (TGO 2023)
const DIESEL_EF          = 2.679;   // kgCO₂e/L — Diesel B7 (TGO 2023)
const DIESEL_CONSUMPTION = 0.40;    // L/km — รถ 6 ล้อ 40 ที่นั่ง Diesel (40 L/100km ในเขตเมือง)
const DIESEL_EMISSION    = DIESEL_CONSUMPTION * DIESEL_EF; // 1.0716 kgCO₂/km
const TREE_ABSORPTION    = 21;      // grams CO₂/tree/day

function calcEVCO2(kwhUsed) {
  if (!kwhUsed || kwhUsed <= 0) return 0;
  return kwhUsed * GRID_EF;
}

function calcDieselCO2(distanceKm) {
  if (distanceKm <= 0) return 0;
  return distanceKm * DIESEL_EMISSION;
}

function calcCO2Saved(distanceKm, kwhUsed = 0) {
  if (distanceKm <= 0) return 0;
  return Math.max(0, calcDieselCO2(distanceKm) - calcEVCO2(kwhUsed));
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
  calcCO2Saved, calcEVCO2, calcDieselCO2,
  calcKwhUsed, calcTreesEquiv,
  GRID_EF, DIESEL_EMISSION, DIESEL_EF, DIESEL_CONSUMPTION,
};
