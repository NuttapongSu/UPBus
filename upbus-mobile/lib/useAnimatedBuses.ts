import { useState, useEffect, useRef } from 'react';
import type { BusData } from './api';
import { onGpsUpdate, advanceFrame, BusMotionState, RoutePoint } from './busMotionEngine';

const FRAME_MS = 16;      // ~60 fps
const POLL_MS  = 10000;   // matches SWR refreshInterval in index.tsx

export type RouteMap     = Map<string, RoutePoint[]>;
export type StopsByRoute = Map<string, RoutePoint[]>;

export interface AnimBus {
  lat:     number;
  lng:     number;
  color:   string;
  driver:  string;
  bearing: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAnimatedBuses(
  buses:         BusData[],
  routes:        RouteMap,
  stopsByRoute:  StopsByRoute,
): Map<string, AnimBus> {
  const motionRef  = useRef<Map<string, BusMotionState & { color: string; driver: string }>>(new Map());
  const routesRef  = useRef<RouteMap>(routes);
  const stopsRef   = useRef<StopsByRoute>(stopsByRoute);
  const [positions, setPositions] = useState<Map<string, AnimBus>>(new Map());

  useEffect(() => { routesRef.current = routes; },       [routes]);
  useEffect(() => { stopsRef.current  = stopsByRoute; }, [stopsByRoute]);

  // ── GPS update: call engine onGpsUpdate ────────────────────────────────────
  useEffect(() => {
    const map = motionRef.current;
    const now = performance.now();
    void now; // suppress unused warning

    for (const bus of buses) {
      if (bus.latitude == null || bus.longitude == null) continue;

      const route = routesRef.current.get(bus.color) ?? [];
      const stops = stopsRef.current.get(bus.color)  ?? [];
      const prev  = map.get(bus.imei_id) ?? null;

      const motion = onGpsUpdate(
        prev, route, stops,
        bus.latitude, bus.longitude,
        bus.bearing ?? 0,
        bus.speed   ?? 0,
      );

      map.set(bus.imei_id, { ...motion, color: bus.color, driver: bus.driver });
    }

    // Remove buses no longer in API response
    for (const id of map.keys()) {
      if (!buses.find(b => b.imei_id === id)) map.delete(id);
    }
  }, [buses]);

  // ── 60 fps loop: advanceFrame ──────────────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let lastTs = performance.now();

    const frame = () => {
      const now  = performance.now();
      const dtMs = Math.min(now - lastTs, 200);
      lastTs = now;

      const next = new Map<string, AnimBus>();

      for (const [id, state] of motionRef.current) {
        const route   = routesRef.current.get(state.color) ?? [];
        const updated = advanceFrame(state, route, dtMs);

        // Persist updated motion back (mutate in place to avoid Map recreation)
        motionRef.current.set(id, { ...updated, color: state.color, driver: state.driver });

        next.set(id, {
          lat:     updated.lat,
          lng:     updated.lng,
          color:   state.color,
          driver:  state.driver,
          bearing: updated.bearing,
        });
      }

      setPositions(new Map(next));
      timer = setTimeout(frame, FRAME_MS);
    };

    timer = setTimeout(frame, FRAME_MS);
    return () => clearTimeout(timer);
  }, []);

  return positions;
}
