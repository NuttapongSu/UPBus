import type { BusData, BusStop } from './api';

export const BOARDING_MAX_DIST_M = 500;

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

      // Pick transfer stop closest to USER (board line 2 as early as possible,
      // avoids cases where "closest to destination" picks a stop the line 2 bus
      // has already looped past before reaching destination)
      const transferStop = transferStops.reduce((best, s) =>
        haversine(s.lat, s.lng, userLat, userLng) <
        haversine(best.lat, best.lng, userLat, userLng) ? s : best
      );

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
