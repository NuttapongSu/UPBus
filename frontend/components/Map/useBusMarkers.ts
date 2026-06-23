import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { BusData } from '@/lib/api';
import { interpolate, snapToPath, LatLng } from '@/lib/interpolation';

/* eslint-disable no-var, @typescript-eslint/no-unused-vars */
declare var L: typeof import('leaflet');
/* eslint-enable no-var, @typescript-eslint/no-unused-vars */

const BUS_IMG: Record<string, string> = {
  Red:    '/images/bus-red-base.png',
  Green:  '/images/bus-green-base.png',
  Blue:   '/images/bus-blue-base.png',
  Purple: '/images/bus-purple-base-2.png',
};

// CSS filter ที่ทำให้รูป Red กลายเป็นสีส้ม (hue shift ~20deg)
const ORANGE_FILTER = 'hue-rotate(20deg) saturate(1.3) brightness(1.05)';

const POLL_INTERVAL = 10000;

interface MarkerState {
  from: LatLng;
  to: LatLng;
  startTime: number;
  bearing: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  marker: any;
}

function parseBusDateMs(dateStr: string): number {
  if (!dateStr) return 0;
  // GPS vendor returns Bangkok time (UTC+7), not UTC
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
  mapRef: React.MutableRefObject<LeafletMap | null>,
  buses: BusData[],
  routePath: LatLng[]
) {
  const markersRef = useRef<Map<string, MarkerState>>(new Map());
  const animRef = useRef<number | null>(null);
  const serverOffsetRef = useRef(0);
  const listenerReadyRef = useRef(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const Leaflet = window.L;

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

    // ลบ marker ของรถที่ไม่อยู่ใน buses list ที่ส่งมา (เช่น เมื่อกรองสาย)
    const activeIds = new Set(buses.map(b => b.imei_id));
    markersRef.current.forEach((state, id) => {
      if (!activeIds.has(id)) {
        state.marker.remove();
        markersRef.current.delete(id);
      }
    });

    buses.forEach(bus => {
      if (bus.latitude === null) return;

      const rawPos: LatLng = { lat: bus.latitude!, lng: bus.longitude! };
      const snapped = routePath.length > 0 ? snapToPath(rawPos, routePath) : rawPos;

      const accLabel = bus.acc === 1 ? '🟢 ทำงาน' : '🔴 กำลังชาร์จ';
      const popupHtml =
        `<b>รถ ${bus.imei_id}</b><br>` +
        `คนขับ: ${bus.driver || '-'}<br>` +
        `สาย: ${bus.color}<br>` +
        `สถานะ: ${accLabel}<br>` +
        `ความเร็ว: ${bus.speed} km/h<br>` +
        `SOC: ${bus.soc}%<br>` +
        `เวลา: <span class="bus-popup-time">...</span>`;

      const isOffRoute  = bus.color === 'Orange';
      const isReserved  = !!bus.department;
      const isCharging  = bus.acc === 0;

      // รถจอง → ภาพ Red + filter ส้ม, รถนอกเส้นทาง/ทั่วไป → ภาพตามสาย
      const imgSrc   = BUS_IMG[bus.color] || BUS_IMG.Purple;
      const imgFilter = isReserved ? ORANGE_FILTER : '';

      // ⚡ overlay เมื่อรถกำลังชาร์จ (acc === 0)
      const chargeBadge = `<div class="charge-badge" style="position:absolute;bottom:6px;right:4px;font-size:16px;line-height:1;pointer-events:none;filter:drop-shadow(0 0 2px rgba(0,0,0,0.6));display:${isCharging ? '' : 'none'};">⚡</div>`;

      // label แสดงเหนือรถ
      const shortDept = (s: string) => s.length > 14 ? s.slice(0, 13) + '…' : s;
      const deptLabel = isOffRoute
        ? `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(230,126,34,0.92);color:#fff;font-size:10px;font-family:sans-serif;font-weight:bold;padding:2px 6px;border-radius:6px;pointer-events:none;max-width:140px;overflow:hidden;text-overflow:ellipsis;">🟠 ${bus.department ? shortDept(bus.department) : 'นอกเส้นทาง'}</div>`
        : isReserved
        ? `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(230,126,34,0.92);color:#fff;font-size:10px;font-family:sans-serif;font-weight:bold;padding:2px 6px;border-radius:6px;pointer-events:none;max-width:140px;overflow:hidden;text-overflow:ellipsis;">🟠 ${shortDept(bus.department!)}</div>`
        : '';

      const existing = markersRef.current.get(bus.imei_id);
      if (existing) {
        existing.from = { lat: existing.marker.getLatLng().lat, lng: existing.marker.getLatLng().lng };
        existing.to = snapped;
        existing.startTime = Date.now();
        existing.bearing = bus.bearing;
        existing.marker.setPopupContent(popupHtml);
        // อัปเดตรูปและ filter ถ้าสีหรือสถานะเปลี่ยน
        const imgEl = existing.marker.getElement()?.querySelector('img') as HTMLImageElement | null;
        if (imgEl) {
          if (imgEl.src !== window.location.origin + imgSrc) imgEl.src = imgSrc;
          imgEl.style.filter = imgFilter;
        }
        // อัปเดต charge badge
        const chargeEl = existing.marker.getElement()?.querySelector('.charge-badge') as HTMLElement | null;
        if (chargeEl) chargeEl.style.display = isCharging ? '' : 'none';
        // อัปเดต dept label
        const deptEl = existing.marker.getElement()?.querySelector('.dept-label') as HTMLElement | null;
        if (deptEl) deptEl.innerHTML = bus.department
          ? (bus.department.length > 14 ? bus.department.slice(0, 13) + '…' : bus.department)
          : '';
      } else {
        const icon = Leaflet.divIcon({
          html: `<div style="width:84px;height:84px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));position:relative;">${deptLabel}<img src="${imgSrc}" style="width:100%;height:100%;object-fit:contain;filter:${imgFilter};" /><span style="position:absolute;top:10px;left:50%;transform:translateX(-50%);color:white;font-weight:bold;font-size:15px;font-family:sans-serif;text-shadow:0 1px 3px rgba(0,0,0,0.6);pointer-events:none;">${bus.imei_id.slice(-2)}</span>${chargeBadge}</div>`,
          iconSize: [84, 84],
          iconAnchor: [42, 42],
          className: '',
        });

        const marker = Leaflet.marker([snapped.lat, snapped.lng], { icon })
          .addTo(mapRef.current!)
          .bindPopup(popupHtml);

        markersRef.current.set(bus.imei_id, {
          from: snapped, to: snapped, startTime: Date.now(), bearing: bus.bearing, marker,
        });
      }
    });
  }, [buses]);

  // Animation loop — อัปเดต position + หมุนรูปตามทิศเคลื่อนที่จริง (from→to)
  useEffect(() => {
    function animate() {
      const now = Date.now();
      markersRef.current.forEach(state => {
        const t = Math.min(1, (now - state.startTime) / POLL_INTERVAL);
        const pos = interpolate(state.from, state.to, t);
        state.marker.setLatLng([pos.lat, pos.lng]);

      });
      // flip รูปตามทิศ: ซ้าย (bearing 180–360) → scaleX(-1), ขวา → ปกติ
      markersRef.current.forEach(state => {
        const goingLeft = state.bearing >= 0 && state.bearing <= 180;
        const imgEl = state.marker.getElement()?.querySelector('img') as HTMLImageElement | null;
        if (imgEl) imgEl.style.transform = goingLeft ? 'scaleX(-1)' : '';
      });
      animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);
}
