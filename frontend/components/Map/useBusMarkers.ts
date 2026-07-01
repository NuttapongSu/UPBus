import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { BusData } from '@/lib/api';
import { offsetLeft, LatLng } from '@/lib/interpolation';
import {
  onGpsUpdate, advanceFrame, pickNearestRoute,
  BusMotionState, RoutePoint,
} from '@/lib/busMotionEngine';
import { ROUTE_INTERSECTIONS } from '@/lib/intersections';

/* eslint-disable no-var, @typescript-eslint/no-unused-vars */
declare var L: typeof import('leaflet');
/* eslint-enable no-var, @typescript-eslint/no-unused-vars */

const BLEND_MS = 500;

const BUS_IMG: Record<string, string> = {
  Red:    '/images/bus-red-base.png',
  Green:  '/images/bus-green-base.png',
  Blue:   '/images/bus-blue-base.png',
  Purple: '/images/bus-purple-base-2.png',
  Orange: '/images/bus-orange-base.png',
};

interface MarkerState {
  motion: BusMotionState;
  color:  string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  marker: any;
}

function parseBusDateMs(dateStr: string): number {
  if (!dateStr) return 0;
  return new Date(dateStr.replace(' ', 'T') + '+07:00').getTime();
}

function fmtThai(ms: number): string {
  return new Date(ms).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

export function useBusMarkers(
  mapRef:           React.MutableRefObject<LeafletMap | null>,
  buses:            BusData[],
  routePathByColor: Record<string, LatLng[]>,
  stopsByColor:     Record<string, RoutePoint[]>,
) {
  const markersRef       = useRef<Map<string, MarkerState>>(new Map());
  const animRef          = useRef<number | null>(null);
  const lastFrameRef     = useRef<number>(0);
  const routeRef         = useRef(routePathByColor);
  const stopsRef         = useRef(stopsByColor);
  const serverOffsetRef  = useRef(0);
  const listenerReadyRef = useRef(false);

  // Keep routeRef and stopsRef current so the animation loop reads fresh data
  useEffect(() => { routeRef.current = routePathByColor; }, [routePathByColor]);
  useEffect(() => { stopsRef.current = stopsByColor; }, [stopsByColor]);

  // ── Popup clock ────────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    const refBus = buses.find(b => b.date);
    if (refBus?.date) {
      const serverMs = parseBusDateMs(refBus.date);
      if (serverMs > 0) serverOffsetRef.current = serverMs - Date.now();
    }

    if (!listenerReadyRef.current) {
      listenerReadyRef.current = true;
      let tickTimer: ReturnType<typeof setInterval> | null = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mapRef.current.on('popupopen', (e: any) => {
        const timeEl: HTMLElement | null = e.popup.getElement()?.querySelector('.bus-popup-time');
        if (!timeEl) return;
        const tick = () => { timeEl.textContent = fmtThai(Date.now() + serverOffsetRef.current); };
        tick();
        tickTimer = setInterval(tick, 1000);
      });
      mapRef.current.on('popupclose', () => {
        if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
      });
    }
  }, [buses]);

  // ── GPS update (every 10 s poll) ──────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const Leaflet = window.L;

    const activeIds = new Set(buses.map(b => b.imei_id));
    markersRef.current.forEach((state, id) => {
      if (!activeIds.has(id)) { state.marker.remove(); markersRef.current.delete(id); }
    });

    const routesMapForPicking = new Map(Object.entries(routePathByColor)) as Map<string, RoutePoint[]>;

    buses.forEach(bus => {
      if (bus.latitude == null) return;

      const prev = markersRef.current.get(bus.imei_id);

      let route: RoutePoint[];
      let stops: RoutePoint[];
      let activeColor: string | undefined;

      if (bus.color === 'Purple') {
        // Not locked to one line — pick whichever route is physically closest
        // this poll, falling back to last poll's choice if none is closer.
        activeColor = pickNearestRoute(bus.latitude, bus.longitude!, routesMapForPicking)
          ?? prev?.motion.activeColor;
        route = activeColor ? ((routePathByColor[activeColor] ?? []) as RoutePoint[]) : [];
        stops = activeColor ? ((stopsByColor[activeColor]     ?? []) as RoutePoint[]) : [];
      } else {
        route = (routePathByColor[bus.color] ?? []) as RoutePoint[];
        stops = (stopsByColor[bus.color]     ?? []) as RoutePoint[];
      }

      // Switching which line a Purple bus follows changes the coordinate frame
      // (routeIdx/routeT are meaningless on a different polyline) — force a
      // fresh snap exactly like a brand-new bus would get.
      const routeChanged = bus.color === 'Purple' && prev?.motion.activeColor !== activeColor;

      const motion = {
        ...onGpsUpdate(
          routeChanged ? null : (prev?.motion ?? null), route, stops,
          bus.latitude, bus.longitude!,
          bus.bearing ?? 0, bus.speed ?? 0,
          parseBusDateMs(bus.date ?? ''),
        ),
        activeColor,
      };

      const accLabel = bus.acc === 1 ? '🟢 ทำงาน' : '🔴 กำลังชาร์จ';
      const popupHtml =
        `<b>รถ ${bus.imei_id}</b><br>` +
        `คนขับ: ${bus.driver || '-'}<br>` +
        `สาย: ${bus.color}<br>` +
        `สถานะ: ${accLabel}<br>` +
        `ความเร็ว: ${bus.speed} km/h<br>` +
        `SOC: ${bus.soc}%<br>` +
        `เวลา: <span class="bus-popup-time">...</span>`;

      const isOffRoute = bus.color === 'Orange';
      const isReserved = !!bus.department;
      const isCharging = bus.acc === 0;
      const imgSrc     = (isReserved || isOffRoute) ? BUS_IMG.Orange : (BUS_IMG[bus.color] || BUS_IMG.Purple);
      const chargeBadge = `<div class="charge-badge" style="position:absolute;bottom:6px;right:4px;font-size:16px;line-height:1;pointer-events:none;filter:drop-shadow(0 0 2px rgba(0,0,0,0.6));display:${isCharging ? '' : 'none'};">⚡</div>`;
      const shortDept   = (s: string) => s.length > 14 ? s.slice(0, 13) + '…' : s;
      const deptLabel   = isOffRoute
        ? `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(230,126,34,0.92);color:#fff;font-size:10px;font-family:sans-serif;font-weight:bold;padding:2px 6px;border-radius:6px;pointer-events:none;max-width:140px;overflow:hidden;text-overflow:ellipsis;">🟠 ${bus.department ? shortDept(bus.department) : 'นอกเส้นทาง'}</div>`
        : isReserved
        ? `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(230,126,34,0.92);color:#fff;font-size:10px;font-family:sans-serif;font-weight:bold;padding:2px 6px;border-radius:6px;pointer-events:none;max-width:140px;overflow:hidden;text-overflow:ellipsis;">🟠 ${shortDept(bus.department!)}</div>`
        : '';

      const displayed = offsetLeft(
        { lat: motion.lat, lng: motion.lng } as LatLng,
        motion.bearing, 3.5,
      );
      const goingLeft = motion.bearing >= 0 && motion.bearing <= 180;

      if (prev) {
        prev.motion = motion;
        prev.color  = bus.color;
        prev.marker.setPopupContent(popupHtml);
        // Purple / no route: animation loop won't advance → set position here
        if (route.length < 2) {
          prev.marker.setLatLng([displayed.lat, displayed.lng]);
        }
        const imgEl = prev.marker.getElement()?.querySelector('img') as HTMLImageElement | null;
        if (imgEl) {
          if (imgEl.src !== window.location.origin + imgSrc) imgEl.src = imgSrc;
          imgEl.style.transform = goingLeft ? 'scaleX(-1)' : '';
        }
        const chargeEl = prev.marker.getElement()?.querySelector('.charge-badge') as HTMLElement | null;
        if (chargeEl) chargeEl.style.display = isCharging ? '' : 'none';
      } else {
        const icon = Leaflet.divIcon({
          html: `<div style="width:84px;height:84px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));position:relative;">${deptLabel}<img src="${imgSrc}" style="width:100%;height:100%;object-fit:contain;transform:${goingLeft ? 'scaleX(-1)' : ''};" /><span style="position:absolute;top:10px;left:50%;transform:translateX(-50%);color:white;font-weight:bold;font-size:15px;font-family:sans-serif;text-shadow:0 1px 3px rgba(0,0,0,0.6);pointer-events:none;">${bus.imei_id.slice(-2)}</span>${chargeBadge}</div>`,
          iconSize: [84, 84], iconAnchor: [42, 42], className: '',
        });
        const marker = Leaflet.marker([displayed.lat, displayed.lng], { icon })
          .addTo(mapRef.current!)
          .bindPopup(popupHtml);
        markersRef.current.set(bus.imei_id, { motion, color: bus.color, marker });
      }
    });
  }, [buses]);

  // ── 60 fps animation loop ─────────────────────────────────────────────────
  // Starts on mount. mapRef.current may be null for first few frames — just skip those.
  useEffect(() => {
    function animate(now: number) {
      animRef.current = requestAnimationFrame(animate);
      if (!mapRef.current) return;

      const dt = lastFrameRef.current ? Math.min(now - lastFrameRef.current, 200) : 16;
      lastFrameRef.current = now;

      markersRef.current.forEach(state => {
        const routeColor = state.motion.activeColor ?? state.color;
        const route = (routeRef.current[routeColor] ?? []) as RoutePoint[];
        if (route.length < 2) return; // No route resolved yet → skip

        const stops = (stopsRef.current[routeColor] ?? []) as RoutePoint[];
        const intersections = state.color === 'Purple' ? ROUTE_INTERSECTIONS : undefined;
        const next = advanceFrame(state.motion, route, dt, stops, intersections);
        state.motion = next;

        // Blend: lerp from predicted position → actual route position over 500ms after GPS update
        let displayLat = next.lat;
        let displayLng = next.lng;
        if (next.blendFromLat !== undefined && next.blendStartMs !== undefined) {
          const t = Math.min(1, (Date.now() - next.blendStartMs) / BLEND_MS);
          displayLat = next.blendFromLat + (next.lat - next.blendFromLat) * t;
          displayLng = next.blendFromLng! + (next.lng - next.blendFromLng!) * t;
          // When blend completes → clear blend fields to avoid redundant computation
          if (t >= 1) {
            state.motion = {
              ...next,
              blendFromLat: undefined,
              blendFromLng: undefined,
              blendStartMs: undefined,
            };
          }
        }

        const displayed = offsetLeft(
          { lat: displayLat, lng: displayLng } as LatLng,
          next.bearing, 3.5,
        );
        state.marker.setLatLng([displayed.lat, displayed.lng]);

        const goingLeft = next.bearing >= 0 && next.bearing <= 180;
        const imgEl = state.marker.getElement()?.querySelector('img') as HTMLImageElement | null;
        if (imgEl) imgEl.style.transform = goingLeft ? 'scaleX(-1)' : '';
      });
    }

    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
