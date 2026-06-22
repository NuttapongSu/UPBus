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
  const allRouteCoordsRef = useRef<{ lat: number; lng: number }[]>([]);
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

      kmlFiles.forEach(({ file, color, key }) => {
        fetch(file)
          .then(r => r.text())
          .then(kmlText => {
            const coords = parseKmlCoords(kmlText);
            allRouteCoordsRef.current = [...allRouteCoordsRef.current, ...coords];
            const polyline = Leaflet.polyline(coords.map(c => [c.lat, c.lng]), { color, weight: 8, opacity: 0.8 }).addTo(map);
            routeLayersRef.current.set(key, polyline);

            // เพิ่มหมุดป้ายจอดรถจาก Point placemarks
            parseKmlStops(kmlText).forEach(stop => {
              const stopIcon = Leaflet.icon({
                iconUrl: '/images/bus-stop-1.png',
                iconSize: [48, 48],
                iconAnchor: [24, 48],
                popupAnchor: [0, -50],
              });
              Leaflet.marker([stop.lat, stop.lng], { icon: stopIcon })
                .addTo(map)
                .bindPopup(`<b>🚏 ${stop.name}</b>`);
            });
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

  useBusMarkers(mapRef, buses, allRouteCoordsRef.current);

  return <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />;
}

function parseKmlStops(kml: string): { lat: number; lng: number; name: string }[] {
  const placemarks = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
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
