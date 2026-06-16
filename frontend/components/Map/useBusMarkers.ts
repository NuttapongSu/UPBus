import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { BusData } from '@/lib/api';
import { interpolate, snapToPath, LatLng } from '@/lib/interpolation';

/* eslint-disable no-var, @typescript-eslint/no-unused-vars */
declare var L: typeof import('leaflet');
/* eslint-enable no-var, @typescript-eslint/no-unused-vars */

const COLOR_MAP: Record<string, string> = {
  Red: '#e74c3c', Green: '#2ecc71', Blue: '#3498db', Purple: '#9b59b6',
};

const POLL_INTERVAL = 10000; // 10 วินาที

interface MarkerState {
  from: LatLng;
  to: LatLng;
  startTime: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  marker: any; // L.Marker (typed dynamically at runtime)
}

export function useBusMarkers(
  mapRef: React.MutableRefObject<LeafletMap | null>,
  buses: BusData[],
  routePath: LatLng[]  // จาก KML ของสายที่เกี่ยวข้อง
) {
  const markersRef = useRef<Map<string, MarkerState>>(new Map());
  const animRef = useRef<number | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const Leaflet = window.L;

    buses.forEach(bus => {
      if (bus.latitude === null) return;

      const rawPos: LatLng = { lat: bus.latitude!, lng: bus.longitude! };
      const snapped = routePath.length > 0 ? snapToPath(rawPos, routePath) : rawPos;

      const existing = markersRef.current.get(bus.imei_id);
      if (existing) {
        // อัปเดต target ให้ animate ไป
        existing.from = { lat: existing.marker.getLatLng().lat, lng: existing.marker.getLatLng().lng };
        existing.to = snapped;
        existing.startTime = Date.now();
      } else {
        // สร้าง marker ใหม่
        const icon = Leaflet.divIcon({
          html: `<div style="
            width:28px;height:28px;border-radius:50%;
            background:${COLOR_MAP[bus.color] || '#888'};
            border:2px solid white;
            display:flex;align-items:center;justify-content:center;
            font-size:14px;
            transform:rotate(${bus.bearing}deg);
          ">🚌</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          className: '',
        });

        const marker = Leaflet.marker([snapped.lat, snapped.lng], { icon })
          .addTo(mapRef.current!)
          .bindPopup(`<b>รถ ${bus.imei_id}</b><br>คนขับ: ${bus.driver}<br>สาย: ${bus.color}<br>SOC: ${bus.soc}%`);

        markersRef.current.set(bus.imei_id, {
          from: snapped, to: snapped, startTime: Date.now(), marker,
        });
      }
    });
  }, [buses]);

  // Animation loop — ทำงานตลอด
  useEffect(() => {
    function animate() {
      const now = Date.now();
      markersRef.current.forEach(state => {
        const t = Math.min(1, (now - state.startTime) / POLL_INTERVAL);
        const pos = interpolate(state.from, state.to, t);
        state.marker.setLatLng([pos.lat, pos.lng]);
      });
      animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);
}
