import { useState, useEffect, useRef } from 'react';
import type { BusData } from './api';
import { onGpsUpdate, advanceFrame, BusMotionState, RoutePoint } from './busMotionEngine';
import type { BusMarkerHandle } from '../components/BusMarker';

const FRAME_MS = 16;      // ~60 fps

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
  buses:        BusData[],
  routes:       RouteMap,
  stopsByRoute: StopsByRoute,
  markerRefs:   React.RefObject<Map<string, BusMarkerHandle>>,
): {
  positionRef:  React.RefObject<Map<string, AnimBus>>;
  activeBusIds: Set<string>;
} {
  const motionRef   = useRef<Map<string, BusMotionState & { color: string; driver: string }>>(new Map());
  const routesRef   = useRef<RouteMap>(routes);
  const stopsRef    = useRef<StopsByRoute>(stopsByRoute);
  const positionRef = useRef<Map<string, AnimBus>>(new Map());
  const [activeBusIds, setActiveBusIds] = useState<Set<string>>(new Set());

  useEffect(() => { routesRef.current = routes; },       [routes]);
  useEffect(() => { stopsRef.current  = stopsByRoute; }, [stopsByRoute]);

  // ── GPS update: call engine onGpsUpdate ────────────────────────────────────
  useEffect(() => {
    const map = motionRef.current;
    const activeIds = new Set<string>();

    for (const bus of buses) {
      if (bus.latitude == null || bus.longitude == null) continue;
      activeIds.add(bus.imei_id);

      const route = routesRef.current.get(bus.color) ?? [];
      const stops = stopsRef.current.get(bus.color)  ?? [];
      const prev  = map.get(bus.imei_id) ?? null;

      const gpsTs = bus.date
        ? new Date(bus.date.replace(' ', 'T') + '+07:00').getTime()
        : Date.now();
      const motion = onGpsUpdate(
        prev, route, stops,
        bus.latitude, bus.longitude,
        bus.bearing ?? 0,
        bus.speed   ?? 0,
        gpsTs,
        bus.acc ?? 0,
      );

      map.set(bus.imei_id, { ...motion, color: bus.color, driver: bus.driver });
    }

    for (const id of map.keys()) {
      if (!activeIds.has(id)) {
        map.delete(id);
        positionRef.current.delete(id);
      }
    }

    setActiveBusIds(new Set(activeIds));
  }, [buses]);

  // ── 60 fps loop: advanceFrame → imperative marker update (no React re-render) ──
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let lastTs = performance.now();

    const frame = () => {
      const now  = performance.now();
      const dtMs = Math.min(now - lastTs, 200);
      lastTs = now;

      for (const [id, state] of motionRef.current) {
        const route   = routesRef.current.get(state.color) ?? [];
        const updated = advanceFrame(state, route, dtMs);

        motionRef.current.set(id, { ...updated, color: state.color, driver: state.driver });

        // Keep positionRef current for follow-bus feature
        positionRef.current.set(id, {
          lat:     updated.lat,
          lng:     updated.lng,
          color:   state.color,
          driver:  state.driver,
          bearing: updated.bearing,
        });

        // Imperative update — bypasses React reconciler entirely (mirrors web's setLatLng)
        const handle = markerRefs.current?.get(id);
        if (handle) {
          handle.moveTo(updated.lat, updated.lng);
          handle.setBearing(updated.bearing);
        }
      }

      timer = setTimeout(frame, FRAME_MS);
    };

    timer = setTimeout(frame, FRAME_MS);
    return () => clearTimeout(timer);
  }, [markerRefs]);

  return { positionRef, activeBusIds };
}
