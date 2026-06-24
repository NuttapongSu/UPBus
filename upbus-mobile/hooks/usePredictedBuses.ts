import { useState, useEffect, useRef } from 'react';
import { BusData } from '@/lib/api';

interface Snapshot {
  lat: number;
  lng: number;
  speed: number;   // km/h จาก GPS จริง
  bearing: number; // degrees 0–360
  at: number;      // Date.now() เวลา GPS จริงมาถึง
  speedFactor: number; // 0.0–1.0: ลดลงเมื่อ predicted ล้ำหน้า GPS จริง
}

const R = 6371000;

function toRad(d: number) { return d * Math.PI / 180; }

// Dead reckoning: คำนวณตำแหน่งล่วงหน้า
function deadReckon(lat: number, lng: number, speedKmh: number, bearingDeg: number, elapsedMs: number) {
  if (speedKmh < 1) return { lat, lng };
  const d = (speedKmh * 1000 / 3600) * (elapsedMs / 1000);
  const b = toRad(bearingDeg);
  const φ1 = toRad(lat);
  const λ1 = toRad(lng);
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d / R) + Math.cos(φ1) * Math.sin(d / R) * Math.cos(b));
  const λ2 = λ1 + Math.atan2(Math.sin(b) * Math.sin(d / R) * Math.cos(φ1), Math.cos(d / R) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: φ2 * 180 / Math.PI, lng: λ2 * 180 / Math.PI };
}

// คำนวณระยะ (เมตร) ที่ predicted อยู่ล้ำหน้า GPS จริงตามทิศทางของรถ
// + = predicted ล้ำหน้า (overshoot), - = predicted ตามหลัง (ควร warp ไปข้างหน้า)
function forwardOffsetM(predLat: number, predLng: number, gpsLat: number, gpsLng: number, bearingDeg: number): number {
  const dLatM = (predLat - gpsLat) * (Math.PI / 180) * R;
  const dLngM = (predLng - gpsLng) * (Math.PI / 180) * R * Math.cos(toRad(gpsLat));
  const b = toRad(bearingDeg);
  // dot product กับ unit vector ทิศทางการเดินทาง
  return dLatM * Math.cos(b) + dLngM * Math.sin(b);
}

export function usePredictedBuses(buses: BusData[]): BusData[] {
  const snapshots = useRef<Map<string, Snapshot>>(new Map());
  const [predicted, setPredicted] = useState<BusData[]>(buses);

  // เมื่อ GPS จริงมาถึง → reconcile กับ predicted ปัจจุบัน
  useEffect(() => {
    const now = Date.now();
    buses.forEach(bus => {
      if (bus.latitude == null || bus.longitude == null) return;

      const prev = snapshots.current.get(bus.imei_id);

      if (!prev) {
        // รถใหม่ — ตั้ง snapshot ปกติ
        snapshots.current.set(bus.imei_id, {
          lat: bus.latitude, lng: bus.longitude,
          speed: bus.speed ?? 0, bearing: bus.bearing ?? 0,
          at: now, speedFactor: 1.0,
        });
        return;
      }

      // คำนวณตำแหน่ง predicted ณ ปัจจุบัน
      const elapsed = now - prev.at;
      const pred = deadReckon(prev.lat, prev.lng, prev.speed * prev.speedFactor, prev.bearing, elapsed);

      // วัดว่า predicted ล้ำ GPS จริงไปเท่าไหร่ (ตามทิศทางรถ)
      const offset = forwardOffsetM(pred.lat, pred.lng, bus.latitude, bus.longitude, bus.bearing ?? prev.bearing);

      if (offset > 15) {
        // predicted ล้ำหน้า GPS จริง > 15m → ไม่ warp ถอยหลัง, ชะลอแทน
        // คง predicted position ไว้ แต่ลด speedFactor ให้รถค่อยๆ หยุด
        snapshots.current.set(bus.imei_id, {
          lat: pred.lat, lng: pred.lng,
          speed: bus.speed ?? 0, bearing: bus.bearing ?? prev.bearing,
          at: now,
          speedFactor: 0.0, // หยุดรอ GPS ตามทัน
        });
      } else {
        // predicted ยังไม่ถึง GPS จริง หรือใกล้เคียง → warp ไปตาม GPS จริงได้
        snapshots.current.set(bus.imei_id, {
          lat: bus.latitude, lng: bus.longitude,
          speed: bus.speed ?? 0, bearing: bus.bearing ?? 0,
          at: now, speedFactor: 1.0,
        });
      }
    });

    // sync UI ทันที (ใช้ snapshot ล่าสุด)
    setPredicted(prev => prev.map(bus => {
      const snap = snapshots.current.get(bus.imei_id);
      if (!snap) return bus;
      return { ...bus, latitude: snap.lat, longitude: snap.lng };
    }));
  }, [buses]);

  // Dead reckoning ทุก 1 วินาที
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setPredicted(prev => prev.map(bus => {
        const snap = snapshots.current.get(bus.imei_id);
        if (!snap || snap.speedFactor === 0 || snap.speed < 1) return bus;
        const elapsed = now - snap.at;
        if (elapsed > 15000) return bus; // cap 15s
        const { lat, lng } = deadReckon(snap.lat, snap.lng, snap.speed * snap.speedFactor, snap.bearing, elapsed);
        return { ...bus, latitude: lat, longitude: lng };
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return predicted;
}
