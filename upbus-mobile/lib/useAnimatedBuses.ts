import { useState, useEffect, useRef } from 'react';
import type { BusData } from './api';
import { onGpsUpdate, advanceFrame, pickNearestRoute, BusMotionState, RoutePoint } from './busMotionEngine';
import { ROUTE_INTERSECTIONS } from './intersections';
import type { BusMarkerHandle } from '../components/BusMarker';

const FRAME_MS = 16;      // ~60 fps
const BLEND_MS = 500;

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

export type JunctionMap  = Map<string, number>; // color → junctionIdx in concatenated route
export type TerminalMap  = Map<string, number>; // color → terminalIdx for circular loops

export function useAnimatedBuses(
  buses:        BusData[],
  routes:       RouteMap,
  stopsByRoute: StopsByRoute,
  markerRefs:   React.RefObject<Map<string, BusMarkerHandle>>,
  junctionMap?: JunctionMap,
  terminalMap?: TerminalMap,
): {
  positionRef:   React.RefObject<Map<string, AnimBus>>;
  activeBusIds:  Set<string>;
  chargingBusIds: Set<string>;
} {
  const motionRef   = useRef<Map<string, BusMotionState & { color: string; driver: string }>>(new Map());
  const routesRef   = useRef<RouteMap>(routes);
  const stopsRef    = useRef<StopsByRoute>(stopsByRoute);
  const positionRef = useRef<Map<string, AnimBus>>(new Map());
  const [activeBusIds, setActiveBusIds]     = useState<Set<string>>(new Set());
  const [chargingBusIds, setChargingBusIds] = useState<Set<string>>(new Set());

  useEffect(() => { routesRef.current = routes; },       [routes]);
  useEffect(() => { stopsRef.current  = stopsByRoute; }, [stopsByRoute]);

  // ── GPS update: call engine onGpsUpdate ────────────────────────────────────
  // Reads the `routes`/`stopsByRoute` props directly here, not `routesRef`/
  // `stopsRef` — this effect only re-runs when `buses` changes, but whenever
  // it does run it must see the current route data, not a value captured at
  // an earlier render. The refs exist only for the 60fps loop below, which
  // intentionally avoids re-subscribing on every route change for perf.
  useEffect(() => {
    const map = motionRef.current;
    const activeIds = new Set<string>();
    const chargingIds = new Set<string>();

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
        activeColor = pickNearestRoute(bus.latitude, bus.longitude, routes)
          ?? prev?.activeColor;
        route = activeColor ? (routes.get(activeColor) ?? []) : [];
        stops = activeColor ? (stopsByRoute.get(activeColor)  ?? []) : [];
      } else {
        route = routes.get(bus.color) ?? [];
        stops = stopsByRoute.get(bus.color)  ?? [];
      }

      // Switching which line a Purple bus follows changes the coordinate frame
      // (routeIdx/routeT are meaningless on a different polyline) — force a
      // fresh snap exactly like a brand-new bus would get. The route-not-yet-
      // loaded race that previously needed a separate routeIsReady flag here
      // is now covered by BusMotionState.confirmed, set false in onGpsUpdate's
      // route.length<2 branch and checked by every downstream guard.
      const routeChanged = bus.color === 'Purple' && prev?.activeColor !== activeColor;

      const gpsTs = bus.date
        ? new Date(bus.date.replace(' ', 'T') + '+07:00').getTime()
        : Date.now();
      const routeColor = bus.color === 'Purple' ? (activeColor ?? bus.color) : bus.color;
      const junction   = junctionMap?.get(routeColor);
      const terminal   = terminalMap?.get(routeColor);

      // Green bus at PKY before 14:00 = charging, not in service
      const bangkokHour = parseInt(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok', hour: 'numeric', hour12: false }), 10,
      );
      const PKY_LAT = 19.02548, PKY_LNG = 99.89511;
      const dlat = bus.latitude - PKY_LAT, dlng = bus.longitude - PKY_LNG;
      const atPkyCharging = bus.color === 'Green' && bangkokHour < 14
        && dlat * dlat + dlng * dlng < 5e-7;
      if (atPkyCharging) chargingIds.add(bus.imei_id);
      const effectiveAcc = (atPkyCharging ? 0 : (bus.acc ?? 0)) as 0 | 1;

      // Charging at PKY before 14:00 — empty route holds bus at actual GPS coords
      const motionRoute = atPkyCharging ? [] : route;
      const motionStops = atPkyCharging ? [] : stops;
      const motion = onGpsUpdate(
        routeChanged ? null : prev,
        motionRoute, motionStops,
        bus.latitude, bus.longitude,
        bus.bearing ?? 0,
        bus.speed   ?? 0,
        gpsTs,
        effectiveAcc,
        junction,
        terminal,
      );

      // DEBUG — remove after diagnosing reversal
      if (bus.speed > 0) {
        const dirFlipped = prev && prev.direction !== motion.direction;
        const legByTerminal = motion.lastDepartedTerminal === 'junction' ? 'ขากลับ'
          : motion.lastDepartedTerminal === 'start' ? 'ขาไป' : null;
        const leg = junction !== undefined
          ? (legByTerminal ?? (motion.routeIdx <= junction ? 'ขาไป(idx)' : 'ขากลับ(idx)'))
          : '?';
        const terminal = terminalMap?.get(routeColor);
        const stopInfo = terminal !== undefined
          ? ` stops=${motion.stopsVisited}`
          : '';
        console.log(
          `[DIR] ${bus.imei_id}(${bus.color}) bear=${bus.bearing?.toFixed(0)}° spd=${bus.speed?.toFixed(1)} acc=${bus.acc}` +
          ` idx=${motion.routeIdx}${junction !== undefined ? `/${junction}` : ''} leg=${leg} dir=${motion.direction > 0 ? '+1' : '-1'} lock=${motion.directionLock}` +
          ` confirmed=${motion.confirmed}${stopInfo}` +
          (dirFlipped ? ' *** FLIPPED ***' : ''),
        );
      }

      map.set(bus.imei_id, { ...motion, activeColor, color: bus.color, driver: bus.driver });
    }

    for (const id of map.keys()) {
      if (!activeIds.has(id)) {
        map.delete(id);
        positionRef.current.delete(id);
      }
    }

    setActiveBusIds(new Set(activeIds));
    setChargingBusIds(chargingIds);
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
        const stops = stopsRef.current.get(routeColor) ?? [];
        const intersections = state.color === 'Purple' ? ROUTE_INTERSECTIONS : undefined;
        const updated = advanceFrame(state, route, dtMs, stops, intersections);

        // Compute blend-corrected display position
        let displayLat = updated.lat, displayLng = updated.lng;
        let motionToStore = updated;
        if (updated.blendFromLat !== undefined && updated.blendStartMs !== undefined) {
          const t = Math.min(1, (Date.now() - updated.blendStartMs) / BLEND_MS);
          displayLat = updated.blendFromLat + (updated.lat - updated.blendFromLat) * t;
          displayLng = updated.blendFromLng! + (updated.lng - updated.blendFromLng!) * t;
          if (t >= 1) {
            motionToStore = { ...updated, blendFromLat: undefined, blendFromLng: undefined, blendStartMs: undefined };
          }
        }

        motionRef.current.set(id, { ...motionToStore, color: state.color, driver: state.driver });

        // Keep positionRef current for follow-bus feature
        positionRef.current.set(id, {
          lat:     displayLat,
          lng:     displayLng,
          color:   state.color,
          driver:  state.driver,
          bearing: updated.bearing,
        });

        // Imperative update — bypasses React reconciler entirely (mirrors web's setLatLng)
        const handle = markerRefs.current?.get(id);
        if (handle) {
          handle.moveTo(displayLat, displayLng);
          handle.setBearing(updated.bearing);
        }
      }

      timer = setTimeout(frame, FRAME_MS);
    };

    timer = setTimeout(frame, FRAME_MS);
    return () => clearTimeout(timer);
  }, [markerRefs]);

  return { positionRef, activeBusIds, chargingBusIds };
}
