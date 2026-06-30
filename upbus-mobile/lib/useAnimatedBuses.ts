import { useState, useEffect, useRef } from 'react';
import type { BusData } from './api';
import { onGpsUpdate, advanceFrame, pickNearestRoute, BusMotionState, RoutePoint } from './busMotionEngine';
import { ROUTE_INTERSECTIONS } from './intersections';
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

      const prev = map.get(bus.imei_id) ?? null;

      let route: RoutePoint[];
      let stops: RoutePoint[];
      let activeColor: string | undefined;

      if (bus.color === 'Purple') {
        // Not locked to one line — pick whichever route is physically closest
        // this poll, falling back to last poll's choice if none is closer.
        activeColor = pickNearestRoute(bus.latitude, bus.longitude, routesRef.current)
          ?? prev?.activeColor;
        route = activeColor ? (routesRef.current.get(activeColor) ?? []) : [];
        stops = activeColor ? (stopsRef.current.get(activeColor)  ?? []) : [];
      } else {
        route = routesRef.current.get(bus.color) ?? [];
        stops = stopsRef.current.get(bus.color)  ?? [];
      }

      // Switching which line a Purple bus follows changes the coordinate frame
      // (routeIdx/routeT are meaningless on a different polyline) — force a
      // fresh snap exactly like a brand-new bus would get.
      const routeChanged = bus.color === 'Purple' && prev?.activeColor !== activeColor;

      const gpsTs = bus.date
        ? new Date(bus.date.replace(' ', 'T') + '+07:00').getTime()
        : Date.now();
      const motion = onGpsUpdate(
        routeChanged ? null : prev,
        route, stops,
        bus.latitude, bus.longitude,
        bus.bearing ?? 0,
        bus.speed   ?? 0,
        gpsTs,
        bus.acc ?? 0,
      );

      map.set(bus.imei_id, { ...motion, activeColor, color: bus.color, driver: bus.driver });
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
        const routeColor = state.activeColor ?? state.color;
        const route = routesRef.current.get(routeColor) ?? [];
        const intersections = state.color === 'Purple' ? ROUTE_INTERSECTIONS : undefined;
        const updated = advanceFrame(state, route, dtMs, intersections);

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
