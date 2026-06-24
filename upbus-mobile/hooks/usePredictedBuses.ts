import { useState, useEffect, useRef } from 'react';
import { BusData } from '@/lib/api';

interface Snapshot {
  lat: number;
  lng: number;
  speed: number;  // km/h
  bearing: number; // degrees 0–360
  at: number;     // Date.now()
}

// Dead reckoning: project position forward by elapsedMs using speed + bearing
function deadReckon(
  lat: number, lng: number,
  speedKmh: number, bearingDeg: number,
  elapsedMs: number
): { lat: number; lng: number } {
  if (speedKmh < 2) return { lat, lng }; // stationary — don't drift
  const R = 6371000;
  const d = (speedKmh * 1000 / 3600) * (elapsedMs / 1000);
  const b = bearingDeg * Math.PI / 180;
  const φ1 = lat * Math.PI / 180;
  const λ1 = lng * Math.PI / 180;
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(d / R) +
    Math.cos(φ1) * Math.sin(d / R) * Math.cos(b)
  );
  const λ2 = λ1 + Math.atan2(
    Math.sin(b) * Math.sin(d / R) * Math.cos(φ1),
    Math.cos(d / R) - Math.sin(φ1) * Math.sin(φ2)
  );
  return { lat: φ2 * 180 / Math.PI, lng: λ2 * 180 / Math.PI };
}

// Takes real GPS data (updated every ~10s) and returns positions predicted every 1s
export function usePredictedBuses(buses: BusData[]): BusData[] {
  const snapshots = useRef<Map<string, Snapshot>>(new Map());
  const [predicted, setPredicted] = useState<BusData[]>(buses);

  // When real GPS arrives, update snapshots (reset dead reckoning origin)
  useEffect(() => {
    buses.forEach(bus => {
      if (bus.latitude != null && bus.longitude != null) {
        snapshots.current.set(bus.imei_id, {
          lat: bus.latitude,
          lng: bus.longitude,
          speed: bus.speed ?? 0,
          bearing: bus.bearing ?? 0,
          at: Date.now(),
        });
      }
    });
    // Immediately sync predicted to real position on GPS update
    setPredicted(buses);
  }, [buses]);

  // Predict position every 1 second between GPS updates
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setPredicted(prev =>
        prev.map(bus => {
          const snap = snapshots.current.get(bus.imei_id);
          if (!snap || snap.speed < 2) return bus;
          const elapsed = now - snap.at;
          // Cap prediction to 15s to avoid large drift if bus stops
          if (elapsed > 15000) return bus;
          const { lat, lng } = deadReckon(snap.lat, snap.lng, snap.speed, snap.bearing, elapsed);
          return { ...bus, latitude: lat, longitude: lng };
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return predicted;
}
