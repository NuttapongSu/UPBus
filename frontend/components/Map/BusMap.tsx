'use client';
import { useEffect, useRef } from 'react';
import { BusData } from '@/lib/api';
import { useBusMarkers } from './useBusMarkers';
import type { Map as LeafletMap } from 'leaflet';

interface Props {
  buses: BusData[];
}

const UP_CENTER: [number, number] = [19.0291, 99.8946];

export default function BusMap({ buses }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const routePathRef = useRef<{ lat: number; lng: number }[]>([]);

  useEffect(() => {
    if (mapRef.current || !mapDivRef.current) return;

    // Leaflet ต้อง import ฝั่ง client เท่านั้น
    import('leaflet').then(L => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).L = L.default || L;
      const Leaflet = window.L;

      const map = Leaflet.map(mapDivRef.current!, { center: UP_CENTER, zoom: 15 });
      mapRef.current = map;

      Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      // โหลด KML routes (ใช้ omnivore ถ้ามี หรือ fetch + parse)
      const kmlFiles = [
        { file: '/kml/up_bus_transit_red.kml',   color: '#e74c3c' },
        { file: '/kml/up_bus_transit_green.kml',  color: '#2ecc71' },
        { file: '/kml/up_bus_transit_blue.kml',   color: '#3498db' },
      ];

      kmlFiles.forEach(({ file, color }) => {
        fetch(file)
          .then(r => r.text())
          .then(kmlText => {
            // parse coordinates จาก KML
            const coords = parseKmlCoords(kmlText);
            if (color === '#2ecc71') routePathRef.current = coords; // ใช้ green เป็น default snap path
            Leaflet.polyline(coords.map(c => [c.lat, c.lng]), { color, weight: 3, opacity: 0.7 }).addTo(map);
          });
      });
    });
  }, []);

  useBusMarkers(mapRef, buses, routePathRef.current);

  return <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />;
}

function parseKmlCoords(kml: string): { lat: number; lng: number }[] {
  const match = kml.match(/<coordinates>([\s\S]*?)<\/coordinates>/g) || [];
  const coords: { lat: number; lng: number }[] = [];
  match.forEach(block => {
    const inner = block.replace(/<\/?coordinates>/g, '').trim();
    inner.split(/\s+/).forEach(pair => {
      const [lng, lat] = pair.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) coords.push({ lat, lng });
    });
  });
  return coords;
}
