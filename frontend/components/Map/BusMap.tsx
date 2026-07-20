'use client';
import { useEffect, useRef } from 'react';
import { BusData } from '@/lib/api';
import { useBusMarkers } from './useBusMarkers';
import type { Map as LeafletMap, Marker } from 'leaflet';

interface Props {
  buses: BusData[];
  selectedLine?: string | null;
  selectedBus?: string | null;
}

const UP_CENTER: [number, number] = [19.0320, 99.9050];

const USER_ICON_HTML = `
  <div style="position:relative;width:20px;height:20px">
    <div style="
      position:absolute;inset:0;border-radius:50%;
      background:rgba(52,152,219,0.25);
      animation:user-pulse 1.8s ease-out infinite;
    "></div>
    <div style="
      position:absolute;top:50%;left:50%;
      width:12px;height:12px;
      transform:translate(-50%,-50%);
      border-radius:50%;
      background:#3498db;
      border:2px solid #fff;
      box-shadow:0 0 6px rgba(52,152,219,0.8);
    "></div>
  </div>
  <style>
    @keyframes user-pulse {
      0%   { transform:scale(1);opacity:0.7 }
      100% { transform:scale(3);opacity:0 }
    }
  </style>
`;

export default function BusMap({ buses, selectedLine, selectedBus }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const routeCoordsByColorRef = useRef<Record<string, { lat: number; lng: number }[]>>({});
  const stopsByColorRef = useRef<Record<string, { lat: number; lng: number }[]>>({});
  const junctionByColorRef  = useRef<Record<string, number>>({});
  const terminalByColorRef  = useRef<Record<string, number>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routeLayersRef = useRef<Map<string, any>>(new Map());
  const userMarkerRef = useRef<Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const followingBusRef = useRef<string | null>(null);

  useEffect(() => {
    if (mapRef.current || !mapDivRef.current) return;

    import('leaflet').then(L => {
      if (mapRef.current) return; // guard ป้องกัน Strict Mode double-run
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).L = L.default || L;
      const Leaflet = window.L;

      const map = Leaflet.map(mapDivRef.current!, { center: UP_CENTER, zoom: 14 });
      mapRef.current = map;

      Leaflet.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles © Esri &mdash; Source: Esri, Maxar, Earthstar Geographics' }
      ).addTo(map);

      const kmlFiles = [
        { file: '/kml/up_bus_transit_red.kml',   color: '#e74c3c', key: 'Red' },
        { file: '/kml/up_bus_transit_green.kml',  color: '#2ecc71', key: 'Green' },
        { file: '/kml/up_bus_transit_blue.kml',   color: '#3498db', key: 'Blue' },
      ];

      const stopMarkersList: { marker: Marker; isReturn: boolean }[] = [];

      const makeStopIcon = (sz: number) => Leaflet.icon({
        iconUrl: '/images/bus-stop-1.png',
        iconSize: [sz, sz],
        iconAnchor: [sz / 2, sz / 2],
        popupAnchor: [0, -sz / 2 - 4],
      });

      const getStopSize = (zoom: number) => zoom >= 18 ? 48 : zoom >= 16 ? 36 : 28;

      // Load all KMLs in parallel: add routes immediately, deduplicate stops after all resolve
      const routePromises = kmlFiles.map(({ file, color, key }) =>
        fetch(file).then(r => r.text()).then(kmlText => {
          const coords = parseKmlCoords(kmlText);
          routeCoordsByColorRef.current[key] = coords;
          // Sort by arc length along the full route (both legs concatenated) so
          // stops[idx±1] neighbors used by direction detection are physically
          // adjacent — raw KML Placemark order does not reliably match road order
          // (e.g. ศิลปศาสตร์/พยาบาล are swapped right after PKY in the Green KML,
          // which caused buses to reverse direction shortly after leaving PKY).
          const bangkokHour = parseInt(
            new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok', hour: 'numeric', hour12: false }),
            10,
          );
          // Visual polyline always uses full KML coords
          const polyline = Leaflet.polyline(coords.map(c => [c.lat, c.lng]), { color, weight: 5, opacity: 0.9 }).addTo(map);
          routeLayersRef.current.set(key, polyline);
          const lines = parseKmlLines(kmlText);
          if (lines.length >= 2) {
            const pkyJunction = lines[0].length - 1;
            junctionByColorRef.current[key] = pkyJunction;

            // Before 14:00 Green turns around at อธิการบดี instead of PKY.
            // Clip the motion route so segment 1 ends at อธิการบดี (ขาไป) and
            // segment 2 starts at อธิการบดี (ขากลับ) — identical to how PKY works.
            if (key === 'Green' && bangkokHour < 14) {
              const RECTOR_LAT = 19.0290, RECTOR_LNG = 99.8961;
              let fwdIdx = 0, fwdD = Infinity;
              for (let i = 0; i <= pkyJunction; i++) {
                const c = coords[i];
                const d = (c.lat - RECTOR_LAT) ** 2 + (c.lng - RECTOR_LNG) ** 2;
                if (d < fwdD) { fwdD = d; fwdIdx = i; }
              }
              let retIdx = pkyJunction + 1, retD = Infinity;
              for (let i = pkyJunction + 1; i < coords.length; i++) {
                const c = coords[i];
                const d = (c.lat - RECTOR_LAT) ** 2 + (c.lng - RECTOR_LNG) ** 2;
                if (d < retD) { retD = d; retIdx = i; }
              }
              if (fwdIdx > 0 && retIdx > pkyJunction) {
                const clipped = [...coords.slice(0, fwdIdx + 1), ...coords.slice(retIdx)];
                routeCoordsByColorRef.current[key] = clipped;
                junctionByColorRef.current[key] = fwdIdx;
                stopsByColorRef.current[key] = parseKmlStopsOrdered(kmlText)
                  .map(s => ({ ...s, _order: stopArcLen(s.lat, s.lng, clipped) }))
                  .sort((a, b) => a._order - b._order)
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  .map(({ _order, ...s }) => s);
                return parseKmlStops(kmlText)
                  .map(s => ({ ...s, _order: stopArcLen(s.lat, s.lng, clipped[0] ? clipped : coords) }))
                  .sort((a, b) => a._order - b._order)
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  .map(({ _order, ...s }) => s);
              }
            }

          } else {
            // Single-segment circular route: terminal zone starts at 90% of route
            // length.  Prevents false wrap-back to idx=0 when bus is approaching
            // the terminal whose geographic location matches the route start.
            terminalByColorRef.current[key] = Math.floor(coords.length * 0.9);
          }
          // Default motion-engine stops (full route) — used by Red, Blue, and Green after 14:00
          stopsByColorRef.current[key] = parseKmlStopsOrdered(kmlText)
            .map(s => ({ ...s, _order: stopArcLen(s.lat, s.lng, coords) }))
            .sort((a, b) => a._order - b._order)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .map(({ _order, ...s }) => s);
          const refLine = lines[0] ?? [];
          return parseKmlStops(kmlText)
            .map(s => ({ ...s, _order: refLine.length > 0 ? stopArcLen(s.lat, s.lng, refLine) : 0 }))
            .sort((a, b) => a._order - b._order)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .map(({ _order, ...s }) => s);
        })
      );

      Promise.all(routePromises).then(stopArrays => {
        const allStops = stopArrays.flat();

        // Deduplicate: skip stops within 10 m of an already-kept stop (cross-route same shelter).
        // 10 m catches exact-same-coordinate stops (shared shelters on multiple routes) while
        // preserving ขาไป/ขากลับ pairs that are ~20 m apart on opposite sides of the road.
        const kept: typeof allStops = [];
        allStops.forEach(stop => {
          const c = Math.cos(stop.lat * Math.PI / 180);
          const isDup = kept.some(k => {
            const dlat = (k.lat - stop.lat) * 111000;
            const dlng = (k.lng - stop.lng) * c * 111000;
            return dlat * dlat + dlng * dlng < 100; // 10 m²
          });
          if (!isDup) kept.push(stop);
        });

        const currentZoom = map.getZoom();
        kept.forEach(stop => {
          const isReturn = stop.name.includes('ขากลับ');
          const sz = getStopSize(currentZoom);
          const marker = Leaflet.marker([stop.lat, stop.lng], { icon: makeStopIcon(sz) })
            .addTo(map)
            .bindPopup(`<b>🚏 ${stop.name}</b>`);
          if (isReturn && currentZoom < 17) {
            const el = marker.getElement();
            if (el) el.style.display = 'none';
          }
          stopMarkersList.push({ marker, isReturn });
        });
      });

      map.on('zoomend', () => {
        const z = map.getZoom();
        const sz = getStopSize(z);
        const icon = makeStopIcon(sz);
        stopMarkersList.forEach(({ marker, isReturn }) => {
          marker.setIcon(icon);
          const el = marker.getElement();
          if (el) el.style.display = (isReturn && z < 18) ? 'none' : '';
        });
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // ติดตามตำแหน่งผู้ใช้
  useEffect(() => {
    if (!navigator.geolocation) return;

    const handlePosition = (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      const map = mapRef.current;
      if (!map || !window.L) return;
      const Leaflet = window.L;

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([latitude, longitude]);
      } else {
        const icon = Leaflet.divIcon({
          html: USER_ICON_HTML,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          className: '',
        });
        userMarkerRef.current = Leaflet.marker([latitude, longitude], { icon, zIndexOffset: 1000 })
          .addTo(map)
          .bindPopup('<b>📍 ตำแหน่งของคุณ</b>');
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, undefined, {
      enableHighAccuracy: true,
      maximumAge: 10000,
    });

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      userMarkerRef.current = null;
    };
  }, []);

  // Toggle route polyline visibility when selectedLine changes
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    routeLayersRef.current.forEach((layer, key) => {
      if (selectedLine === null || selectedLine === key) {
        layer.setStyle({ opacity: 0.7 });
      } else {
        layer.setStyle({ opacity: 0 });
      }
    });
  }, [selectedLine]);

  // Zoom + follow selected bus
  useEffect(() => {
    if (!mapRef.current) return;

    if (!selectedBus) {
      followingBusRef.current = null;
      return;
    }

    const bus = buses.find(b => b.imei_id === selectedBus);
    if (!bus || bus.latitude === null) return;

    const map = mapRef.current;

    if (followingBusRef.current !== selectedBus) {
      followingBusRef.current = selectedBus;
      map.flyTo([bus.latitude, bus.longitude!], 19, { duration: 1.2 });
    } else {
      map.panTo([bus.latitude, bus.longitude!], { animate: true, duration: 0.5 });
    }
  }, [selectedBus, buses]);

  useBusMarkers(mapRef, buses, routeCoordsByColorRef.current, stopsByColorRef.current, junctionByColorRef.current, terminalByColorRef.current);

  return <div ref={mapDivRef} style={{ position: 'absolute', inset: 0 }} />;
}

function parseKmlStops(kml: string): { lat: number; lng: number; name: string }[] {
  const placemarks = kml.match(/<Placemark[^>]*>[\s\S]*?<\/Placemark>/g) || [];
  const stops: { lat: number; lng: number; name: string }[] = [];
  placemarks.forEach(pm => {
    if (!/<Point>/.test(pm)) return;
    const nameMatch = pm.match(/<name>([\s\S]*?)<\/name>/);
    const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
    if (!nameMatch || !coordMatch) return;
    const [lng, lat] = coordMatch[1].trim().split(',').map(Number);
    if (!isNaN(lat) && !isNaN(lng)) stops.push({ lat, lng, name: nameMatch[1].trim() });
  });
  return stops;
}

// Returns stops in KML Placemark order — used by direction-detection engine.
// IMPORTANT: do NOT sort these; the engine depends on circular route order.
function parseKmlStopsOrdered(kml: string): { lat: number; lng: number }[] {
  const placemarks = kml.match(/<Placemark[^>]*>[\s\S]*?<\/Placemark>/g) || [];
  const stops: { lat: number; lng: number }[] = [];
  placemarks.forEach(pm => {
    if (!/<Point>/.test(pm)) return;
    const nameMatch = pm.match(/<name>([\s\S]*?)<\/name>/);
    if (nameMatch && nameMatch[1].includes('ชาร์จ')) return;
    const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
    if (!coordMatch) return;
    const [lng, lat] = coordMatch[1].trim().split(',').map(Number);
    if (!isNaN(lat) && !isNaN(lng)) stops.push({ lat, lng });
  });
  return stops;
}

function parseKmlLines(kml: string): { lat: number; lng: number }[][] {
  return (kml.match(/<LineString>[\s\S]*?<\/LineString>/g) || []).map(ls => {
    const m = ls.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
    if (!m) return [];
    return m[1].trim().split(/\s+/).map(pair => {
      const [lng, lat] = pair.split(',').map(Number);
      return { lat, lng };
    }).filter(p => !isNaN(p.lat));
  }).filter(l => l.length > 0);
}

function stopArcLen(lat: number, lng: number, route: { lat: number; lng: number }[]): number {
  const cos = Math.cos(lat * Math.PI / 180);
  let minDist = Infinity, bestLen = 0, cumLen = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i], b = route[i + 1];
    const ax = (lng - a.lng) * cos * 111000, ay = (lat - a.lat) * 111000;
    const bx = (b.lng - a.lng) * cos * 111000, by = (b.lat - a.lat) * 111000;
    const len2 = bx * bx + by * by;
    const segLen = Math.sqrt(len2);
    const t = len2 > 0 ? Math.max(0, Math.min(1, (ax * bx + ay * by) / len2)) : 0;
    const dist = Math.sqrt((ax - t * bx) ** 2 + (ay - t * by) ** 2);
    if (dist < minDist) { minDist = dist; bestLen = cumLen + t * segLen; }
    cumLen += segLen;
  }
  return bestLen;
}

function parseKmlCoords(kml: string): { lat: number; lng: number }[] {
  // เอาเฉพาะ LineString (เส้นทางถนนจริง) ไม่เอา Point (หมุดป้ายจอด) ไม่งั้นเส้นจะกระโดดมั่ว
  const lineStrings = kml.match(/<LineString>[\s\S]*?<\/LineString>/g) || [];
  const coords: { lat: number; lng: number }[] = [];
  lineStrings.forEach(ls => {
    const coordMatch = ls.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
    if (!coordMatch) return;
    coordMatch[1].trim().split(/\s+/).forEach(pair => {
      const [lng, lat] = pair.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) coords.push({ lat, lng });
    });
  });
  return coords;
}
