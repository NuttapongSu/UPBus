import { useState, useEffect } from 'react';
import { getKml } from './api';

export type RoutePoint = { lat: number; lng: number };
export type RouteMap   = Map<string, RoutePoint[]>;

const KML_SOURCES = [
  { file: 'green', lineKey: 'Green' },
  { file: 'red',   lineKey: 'Red'   },
  { file: 'blue',  lineKey: 'Blue'  },
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
  const [map, setMap] = useState<RouteMap>(new Map());

  useEffect(() => {
    Promise.all(
      KML_SOURCES.map(src =>
        getKml(src.file)
          .then(kml => ({ lineKey: src.lineKey, segs: parseCoords(kml) }))
          .catch(() => ({ lineKey: src.lineKey, segs: [] as RoutePoint[][] }))
      )
    ).then(results => {
      const m: RouteMap = new Map();
      for (const { lineKey, segs } of results) {
        if (segs.length > 0) m.set(lineKey, segs.flat());
      }
      setMap(m);
    });
  }, []);

  return map;
}
