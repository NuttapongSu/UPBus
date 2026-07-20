import { useMemo } from 'react';
import GREEN_KML from '../assets/kml/green';
import RED_KML from '../assets/kml/red';
import BLUE_KML from '../assets/kml/blue';

export type RoutePoint = { lat: number; lng: number };
export type RouteMap   = Map<string, RoutePoint[]>;

const KML_SOURCES = [
  { kml: GREEN_KML, lineKey: 'Green' },
  { kml: RED_KML,   lineKey: 'Red'   },
  { kml: BLUE_KML,  lineKey: 'Blue'  },
] as const;

function parseCoords(kmlText: string): RoutePoint[][] {
  const out: RoutePoint[][] = [];
  const re = /<coordinates>([\s\S]*?)<\/coordinates>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(kmlText)) !== null) {
    const pts = m[1].trim().split(/\s+/).map(s => {
      const [lng, lat] = s.split(',').map(Number);
      return { lat, lng };
    }).filter(p => !isNaN(p.lat) && !isNaN(p.lng));
    if (pts.length > 1) out.push(pts);
  }
  return out;
}

export function useRouteMap(): RouteMap {
  return useMemo(() => {
    const bangkokHour = parseInt(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok', hour: 'numeric', hour12: false }),
      10,
    );
    const m: RouteMap = new Map();
    for (const { kml, lineKey } of KML_SOURCES) {
      const segs = parseCoords(kml);
      if (segs.length === 0) continue;
      const combined = segs.flat();

      // Before 14:00 Green turns around at อธิการบดี — clip so route-based
      // logic (e.g. transfer suggestions) doesn't offer stops beyond that point.
      if (lineKey === 'Green' && bangkokHour < 14 && segs.length >= 2) {
        const pkyJunction = segs[0].length - 1;
        const RECTOR_LAT = 19.0290, RECTOR_LNG = 99.8961;
        let fwdIdx = 0, fwdD = Infinity;
        for (let i = 0; i <= pkyJunction; i++) {
          const c = combined[i];
          const d = (c.lat - RECTOR_LAT) ** 2 + (c.lng - RECTOR_LNG) ** 2;
          if (d < fwdD) { fwdD = d; fwdIdx = i; }
        }
        let retIdx = pkyJunction + 1, retD = Infinity;
        for (let i = pkyJunction + 1; i < combined.length; i++) {
          const c = combined[i];
          const d = (c.lat - RECTOR_LAT) ** 2 + (c.lng - RECTOR_LNG) ** 2;
          if (d < retD) { retD = d; retIdx = i; }
        }
        if (fwdIdx > 0 && retIdx > pkyJunction) {
          m.set(lineKey, [...combined.slice(0, fwdIdx + 1), ...combined.slice(retIdx)]);
          continue;
        }
      }

      m.set(lineKey, combined);
    }
    return m;
  }, []);
}
