import { useMemo } from 'react';
import type { BusStop } from './api';
import GREEN_KML from '../assets/kml/green';
import RED_KML from '../assets/kml/red';
import BLUE_KML from '../assets/kml/blue';

const EXCLUDED_KEYWORDS = ['ชาร์จ'];
const KML_SOURCES = [
  { kml: GREEN_KML, lineKey: 'Green' },
  { kml: RED_KML,   lineKey: 'Red'   },
  { kml: BLUE_KML,  lineKey: 'Blue'  },
] as const;

function dist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parsePoints(kmlText: string, lineKey: string) {
  const out: { name: string; lat: number; lng: number; lineKey: string }[] = [];
  const re = /<Placemark[\s\S]*?<\/Placemark>/g;
  let pm: RegExpExecArray | null;
  while ((pm = re.exec(kmlText)) !== null) {
    if (!/<Point>/.test(pm[0])) continue;
    const nameM = pm[0].match(/<name>([\s\S]*?)<\/name>/);
    const coordM = pm[0].match(/<coordinates>([\s\S]*?)<\/coordinates>/);
    if (!coordM) continue;
    const name = nameM ? nameM[1].trim() : '';
    if (EXCLUDED_KEYWORDS.some(kw => name.includes(kw))) continue;
    const parts = coordM[1].trim().split(',').map(Number);
    if (isNaN(parts[0]) || isNaN(parts[1])) continue;
    out.push({ name, lat: parts[1], lng: parts[0], lineKey });
  }
  return out;
}

export function useKmlStops(): BusStop[] {
  return useMemo(() => {
    const allPoints = KML_SOURCES.flatMap(src => parsePoints(src.kml, src.lineKey));
    const merged: BusStop[] = [];
    for (const s of allPoints) {
      const dir = s.name.includes('ขาไป') ? 'go' : s.name.includes('ขากลับ') ? 'back' : null;
      const existing = merged.find(m => {
        if (dist(m.lat, m.lng, s.lat, s.lng) >= 50) return false;
        const mDir = m.name.includes('ขาไป') ? 'go' : m.name.includes('ขากลับ') ? 'back' : null;
        if (dir !== null && mDir !== null && dir !== mDir) return false;
        return true;
      });
      if (existing) {
        if (!existing.lines.includes(s.lineKey)) existing.lines.push(s.lineKey);
      } else {
        merged.push({ id: s.name.slice(0, 30), name: s.name, lat: s.lat, lng: s.lng, lines: [s.lineKey] });
      }
    }
    return merged;
  }, []);
}
