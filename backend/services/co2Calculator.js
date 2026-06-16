const DIESEL_EMISSION = 1.0;  // kg CO₂ per km (diesel bus)
const EV_EMISSION = 0.2;      // kg CO₂ per km (EV + Thailand grid)
const TREE_ABSORPTION = 21;   // grams CO₂ per tree per day

function calcCO2Saved(distanceKm) {
  if (distanceKm <= 0) return 0;
  return distanceKm * (DIESEL_EMISSION - EV_EMISSION);
}

function calcKwhUsed(bv, be, intervalSeconds) {
  if (!bv || !be) return 0;
  const hours = intervalSeconds / 3600;
  return (bv * be * hours) / 1000;
}

function calcTreesEquiv(co2Kg) {
  if (co2Kg <= 0) return 0;
  return (co2Kg * 1000) / TREE_ABSORPTION;
}

module.exports = { calcCO2Saved, calcKwhUsed, calcTreesEquiv, DIESEL_EMISSION, EV_EMISSION };
