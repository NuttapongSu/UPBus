import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { BusData } from '@/lib/api';
import { offsetLeft, LatLng } from '@/lib/interpolation';
import {
  onGpsUpdate, advanceFrame,
  BusMotionState, RoutePoint,
} from '@/lib/busMotionEngine';

/* eslint-disable no-var, @typescript-eslint/no-unused-vars */
declare var L: typeof import('leaflet');
/* eslint-enable no-var, @typescript-eslint/no-unused-vars */

const BUS_IMG: Record<string, string> = {
  Red:    '/images/bus-red-base.png',
  Green:  '/images/bus-green-base.png',
  Blue:   '/images/bus-blue-base.png',
  Purple: '/images/bus-purple-base-2.png',
  Orange: '/images/bus-orange-base.png',
};

interface MarkerState {
  motion:  BusMotionState;
  color:   string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  marker:  any;
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
  const serverOffsetRef  = useRef(0);
  const listenerReadyRef = useRef(false);

  // Keep routeRef current so the animate loop can read fresh route data
  useEffect(() => { routeRef.current = routePathByColor; }, [routePathByColor]);

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

  // ── GPS update: onGpsUpdate per bus ───────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const Leaflet = window.L;

    const activeIds = new Set(buses.map(b => b.imei_id));
    markersRef.current.forEach((state, id) => {
      if (!activeIds.has(id)) { state.marker.remove(); markersRef.current.delete(id); }
    });

    buses.forEach(bus => {
      if (bus.latitude == null) return;

      const route  = (routePathByColor[bus.color] ?? []) as RoutePoint[];
      const stops  = (stopsByColor[bus.color]     ?? []) as RoutePoint[];
      const prev   = markersRef.current.get(bus.imei_id);

      const motion = onGpsUpdate(
        prev?.motion ?? null, route, stops,
        bus.latitude, bus.longitude!,
        bus.bearing ?? 0, bus.speed ?? 0,
      );

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

      if (prev) {
        prev.motion = motion;
        prev.color  = bus.color;
        prev.marker.setPopupContent(popupHtml);
        const imgEl = prev.marker.getElement()?.querySelector('img') as HTMLImageElement | null;
        if (imgEl && imgEl.src !== window.location.origin + imgSrc) imgEl.src = imgSrc;
        const chargeEl = prev.marker.getElement()?.querySelector('.charge-badge') as HTMLElement | null;
        if (chargeEl) chargeEl.style.display = isCharging ? '' : 'none';
      } else {
        const displayed = offsetLeft({ lat: motion.lat, lng: motion.lng }, motion.bearing, 3.5);
        const icon = Leaflet.divIcon({
          html: `<div style="width:84px;height:84px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));position:relative;">${deptLabel}<img src="${imgSrc}" style="width:100%;height:100%;object-fit:contain;" /><span style="position:absolute;top:10px;left:50%;transform:translateX(-50%);color:white;font-weight:bold;font-size:15px;font-family:sans-serif;text-shadow:0 1px 3px rgba(0,0,0,0.6);pointer-events:none;">${bus.imei_id.slice(-2)}</span>${chargeBadge}</div>`,
          iconSize: [84, 84], iconAnchor: [42, 42], className: '',
        });
        const marker = Leaflet.marker([displayed.lat, displayed.lng], { icon })
          .addTo(mapRef.current!)
          .bindPopup(popupHtml);
        markersRef.current.set(bus.imei_id, { motion, color: bus.color, marker });
      }
    });
  }, [buses]);

  // ── 60 fps animation loop ──────────────────────────────────────────────────
  useEffect(() => {
    function animate(ts: number) {
      const dtMs = lastFrameRef.current > 0 ? Math.min(ts - lastFrameRef.current, 200) : 16;
      lastFrameRef.current = ts;

      markersRef.current.forEach(state => {
        const route = (routeRef.current[state.color] ?? []) as RoutePoint[];
        state.motion = advanceFrame(state.motion, route, dtMs);

        // Apply 3.5 m lane offset at render time (not stored in engine state)
        const displayed = offsetLeft(
          { lat: state.motion.lat, lng: state.motion.lng },
          state.motion.bearing, 3.5,
        );
        state.marker.setLatLng([displayed.lat, displayed.lng]);

        // Flip image: bearing 0–180 = going left → scaleX(-1)
        const goingLeft = state.motion.bearing >= 0 && state.motion.bearing <= 180;
        const imgEl = state.marker.getElement()?.querySelector('img') as HTMLImageElement | null;
        if (imgEl) imgEl.style.transform = goingLeft ? 'scaleX(-1)' : '';
      });

      animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);
}
