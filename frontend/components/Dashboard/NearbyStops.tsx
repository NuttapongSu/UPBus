'use client';
import { useEffect, useRef, useState } from 'react';
import { LINE_COLORS } from '@/lib/theme';

interface Stop {
  name: string;
  lat: number;
  lng: number;
  distance: number; // เมตร
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseKmlStops(kml: string) {
  const placemarks = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
  const stops: { name: string; lat: number; lng: number }[] = [];
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

const LINE_COLOR = LINE_COLORS;

const KML_FILES = [
  { file: '/kml/up_bus_transit_red.kml',   line: 'Red' },
  { file: '/kml/up_bus_transit_green.kml',  line: 'Green' },
  { file: '/kml/up_bus_transit_blue.kml',   line: 'Blue' },
];

export default function NearbyStops() {
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [stops, setStops] = useState<(Stop & { line: string })[]>([]);
  const [allStops, setAllStops] = useState<{ name: string; lat: number; lng: number; line: string }[]>([]);
  const watchIdRef = useRef<number | null>(null);

  // ขอ location อัตโนมัติตอน mount
  useEffect(() => { requestLocation(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // โหลด stops จาก KML ครั้งเดียว
  useEffect(() => {
    Promise.all(
      KML_FILES.map(({ file, line }) =>
        fetch(file).then(r => r.text()).then(kml =>
          parseKmlStops(kml).map(s => ({ ...s, line }))
        )
      )
    ).then(results => setAllStops(results.flat()));
  }, []);

  // คำนวณระยะห่าง — เลือกป้ายใกล้สุด 1 ป้ายต่อสาย (สูงสุด 3 สาย)
  useEffect(() => {
    if (!userPos || allStops.length === 0) return;
    const withDist = allStops.map(s => ({
      ...s,
      distance: haversine(userPos.lat, userPos.lng, s.lat, s.lng),
    }));
    // หาป้ายใกล้ที่สุดของแต่ละสาย
    const nearestPerLine: Record<string, typeof withDist[0]> = {};
    withDist.forEach(s => {
      if (!nearestPerLine[s.line] || s.distance < nearestPerLine[s.line].distance) {
        nearestPerLine[s.line] = s;
      }
    });
    setStops(Object.values(nearestPerLine).sort((a, b) => a.distance - b.distance));
  }, [userPos, allStops]);

  function requestLocation() {
    if (!navigator.geolocation) {
      setPermission('denied');
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        setPermission('granted');
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setPermission('denied'),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
  }

  useEffect(() => () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
  }, []);

  function fmtDist(m: number) {
    return m < 1000 ? `${Math.round(m)} ม.` : `${(m / 1000).toFixed(1)} กม.`;
  }

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">ป้ายใกล้ฉัน</h3>

      {permission === 'denied' && (
        <p className="text-xs text-red-400">ไม่สามารถเข้าถึง Location ได้</p>
      )}

      {permission === 'prompt' && (
        <p className="text-xs text-gray-500 animate-pulse">กำลังขอสิทธิ์ Location…</p>
      )}

      {permission === 'granted' && stops.length === 0 && (
        <p className="text-xs text-gray-500 animate-pulse">กำลังหาป้ายใกล้เคียง…</p>
      )}

      {permission === 'granted' && stops.length > 0 && (
        <ul className="flex flex-col gap-2">
          {stops.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: LINE_COLOR[s.line] ?? '#888' }}
              />
              <span className="flex-1 text-xs text-gray-200 truncate">{s.name}</span>
              <span className="text-xs font-mono text-gray-400 flex-shrink-0">{fmtDist(s.distance)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
