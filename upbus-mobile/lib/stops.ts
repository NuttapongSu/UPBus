import type { BusData, BusStop } from './api';

export const BOARDING_MAX_DIST_M = 500;

/** Arc-length position of a lat/lng point projected onto a route polyline. */
function arcLen(lat: number, lng: number, route: { lat: number; lng: number }[]): number {
  let bestSeg = 0, bestT = 0, bestD = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const p1 = route[i], p2 = route[i + 1];
    const dx = p2.lng - p1.lng, dy = p2.lat - p1.lat;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0
      ? Math.max(0, Math.min(1, ((lng - p1.lng) * dx + (lat - p1.lat) * dy) / len2))
      : 0;
    const d = haversine(lat, lng, p1.lat + t * dy, p1.lng + t * dx);
    if (d < bestD) { bestD = d; bestSeg = i; bestT = t; }
  }
  let arc = 0;
  for (let i = 0; i < bestSeg; i++) {
    arc += haversine(route[i].lat, route[i].lng, route[i + 1].lat, route[i + 1].lng);
  }
  return arc + bestT * haversine(
    route[bestSeg].lat, route[bestSeg].lng,
    route[bestSeg + 1].lat, route[bestSeg + 1].lng,
  );
}

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Returns unique line colors that serve the destination */
export function findPassingLines(stops: BusStop[], destinationId: string): string[] {
  const dest = stops.find(s => s.id === destinationId);
  if (!dest) return [];
  return [...new Set(dest.lines)];
}

/** Nearest stop to the user on the given line, within BOARDING_MAX_DIST_M. Returns null if too far. */
export function findBoardingStop(
  stops: BusStop[],
  lineColor: string,
  userLat: number,
  userLng: number
): BusStop | null {
  const lineStops = stops.filter(s => s.lines.includes(lineColor));
  if (!lineStops.length) return null;
  const nearest = lineStops.reduce((n, s) =>
    haversine(userLat, userLng, s.lat, s.lng) < haversine(userLat, userLng, n.lat, n.lng) ? s : n
  );
  return haversine(userLat, userLng, nearest.lat, nearest.lng) <= BOARDING_MAX_DIST_M ? nearest : null;
}

/** Bus on the given line that is closest to the boarding stop (approaching bus). */
export function findApproachingBus(
  buses: BusData[],
  lineColor: string,
  stop: BusStop
): BusData | null {
  const onLine = buses.filter(b => b.color === lineColor && b.latitude !== null && b.longitude !== null);
  if (!onLine.length) return null;
  return onLine.reduce((closest, bus) => {
    const d = haversine(bus.latitude!, bus.longitude!, stop.lat, stop.lng);
    const dc = haversine(closest.latitude!, closest.longitude!, stop.lat, stop.lng);
    return d < dc ? bus : closest;
  });
}

export interface TransferRoute {
  firstLine: string;
  boardingStop: BusStop;
  boardingDistM: number;
  transferStop: BusStop;
  secondLine: string;
  etaToBoarding: number | null;
  firstBusId: string | null;
}

/**
 * Find transfer routes for lines the user can't directly board.
 * Looks for stops served by both an accessible line (within 500m) and
 * a destination-serving line — these are transfer points.
 */
export function findTransferRoutes(
  stops: BusStop[],
  buses: BusData[],
  destinationId: string,
  userLat: number,
  userLng: number,
  routeMap?: Map<string, { lat: number; lng: number }[]>,
): TransferRoute[] {
  const dest = stops.find(s => s.id === destinationId);
  if (!dest) return [];

  const transfers: TransferRoute[] = [];

  for (const secondLine of dest.lines) {
    // Skip if user can already directly board this line
    if (findBoardingStop(stops, secondLine, userLat, userLng)) continue;

    for (const firstLine of ['Green', 'Red', 'Blue']) {
      if (firstLine === secondLine) continue;
      const boardingStop = findBoardingStop(stops, firstLine, userLat, userLng);
      if (!boardingStop) continue;

      // Transfer stops must be served by BOTH firstLine and secondLine
      const transferStops = stops.filter(
        s => s.lines.includes(firstLine) && s.lines.includes(secondLine)
      );
      if (!transferStops.length) continue;

      // Pick transfer stop: latest on line 2's route that still comes BEFORE
      // the destination (highest arc-length < destination arc-length).
      // This avoids stops the line 2 bus would loop past before reaching
      // destination (e.g. prefer PKY over หอประชุม when Red turns at PKY).
      // Falls back to closest-to-user when route data is unavailable.
      let transferStop: BusStop;
      const line2Route = routeMap?.get(secondLine);
      if (line2Route && line2Route.length > 1) {
        const destArc = arcLen(dest.lat, dest.lng, line2Route);
        const beforeDest = transferStops.filter(
          s => arcLen(s.lat, s.lng, line2Route) < destArc
        );
        const pool = beforeDest.length > 0 ? beforeDest : transferStops;
        transferStop = pool.reduce((best, s) =>
          arcLen(s.lat, s.lng, line2Route) > arcLen(best.lat, best.lng, line2Route) ? s : best
        );
      } else {
        transferStop = transferStops.reduce((best, s) =>
          haversine(s.lat, s.lng, userLat, userLng) <
          haversine(best.lat, best.lng, userLat, userLng) ? s : best
        );
      }

      const approachingBus = findApproachingBus(buses, firstLine, boardingStop);
      const eta = approachingBus ? calcEtaMinutes(approachingBus, boardingStop) : null;
      const boardingDistM = haversine(userLat, userLng, boardingStop.lat, boardingStop.lng);

      transfers.push({
        firstLine,
        boardingStop,
        boardingDistM,
        transferStop,
        secondLine,
        etaToBoarding: eta,
        firstBusId: approachingBus?.imei_id ?? null,
      });
    }
  }

  return transfers;
}

/** Rough ETA in minutes: distance / max(speed, 20 km/h) */
export function calcEtaMinutes(bus: BusData, boardingStop: BusStop): number | null {
  if (bus.latitude === null || bus.longitude === null) return null;
  const distM = haversine(bus.latitude, bus.longitude, boardingStop.lat, boardingStop.lng);
  const speedMs = Math.max(bus.speed || 20, 5) / 3.6;
  return Math.round(distM / speedMs / 60);
}
