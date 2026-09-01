import { BusData } from './api';

// Green-line buses park and charge at PKY station before 14:00 — the vendor
// GPS feed still reports acc=1 while this happens, so acc alone can't tell.
const PKY_LAT = 19.02548, PKY_LNG = 99.89511;
const PKY_RADIUS_SQ = 5e-7;

export function isBusCharging(bus: BusData): boolean {
  if (bus.latitude == null) return bus.acc === 0;

  const bangkokHour = parseInt(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok', hour: 'numeric', hour12: false }), 10,
  );
  const dlat = bus.latitude - PKY_LAT, dlng = (bus.longitude ?? 0) - PKY_LNG;
  const atPkyCharging = bus.color === 'Green' && bangkokHour < 14 && dlat * dlat + dlng * dlng < PKY_RADIUS_SQ;

  return atPkyCharging || bus.acc === 0;
}

// ความเร็ว > 5 กม./ชม. = กำลังวิ่งจริง แม้คนขับจะยังไม่ล็อกอินเข้าระบบ (สีม่วง) ก็ตาม
export function isBusRunning(bus: BusData): boolean {
  return bus.latitude !== null && bus.speed > 5;
}

export function isBusAvailable(bus: BusData): boolean {
  return bus.color === 'Purple' && !bus.department && bus.speed <= 5;
}
