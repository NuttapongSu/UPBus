export interface LatLng { lat: number; lng: number }

/**
 * คำนวณตำแหน่ง interpolate ระหว่าง from → to
 * t = 0.0 (ตำแหน่ง from) ถึง 1.0 (ตำแหน่ง to)
 */
export function interpolate(from: LatLng, to: LatLng, t: number): LatLng {
  const clamped = Math.max(0, Math.min(1, t));
  return {
    lat: from.lat + (to.lat - from.lat) * clamped,
    lng: from.lng + (to.lng - from.lng) * clamped,
  };
}

/**
 * หา fraction ที่ผ่านไปนับจาก startTime ถึง now ใน intervalMs
 */
export function elapsed(startTime: number, intervalMs: number): number {
  return Math.min(1, (Date.now() - startTime) / intervalMs);
}

/**
 * หาจุดบน polyline ที่ใกล้กับ point มากที่สุด (route snap)
 * path: array ของ [lat, lng] จาก KML
 */
export function snapToPath(point: LatLng, path: LatLng[]): LatLng {
  if (path.length === 0) return point;
  let best = path[0];
  let bestDist = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const snapped = closestOnSegment(point, path[i], path[i + 1]);
    const d = dist(point, snapped);
    if (d < bestDist) { bestDist = d; best = snapped; }
  }
  return best;
}

function closestOnSegment(p: LatLng, a: LatLng, b: LatLng): LatLng {
  const dx = b.lat - a.lat, dy = b.lng - a.lng;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return a;
  const t = Math.max(0, Math.min(1, ((p.lat - a.lat) * dx + (p.lng - a.lng) * dy) / lenSq));
  return { lat: a.lat + t * dx, lng: a.lng + t * dy };
}

function dist(a: LatLng, b: LatLng): number {
  return Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2);
}
