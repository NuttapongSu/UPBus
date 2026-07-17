import GREEN_KML from '../assets/kml/green';
import RED_KML from '../assets/kml/red';
import BLUE_KML from '../assets/kml/blue';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RoutePolyline {
  color: string;
  lineKey: string;
  coords: LatLng[];
}

export interface StopMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lineKey: string;
}

export function parseKmlCoordinates(kmlText: string): LatLng[][] {
  const results: LatLng[][] = [];
  // Match each <coordinates>…</coordinates> block
  const coordBlockRe = /<coordinates>([\s\S]*?)<\/coordinates>/g;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = coordBlockRe.exec(kmlText)) !== null) {
    const block = blockMatch[1].trim();
    if (!block) continue;
    // Each token is "lng,lat,alt"
    const coords: LatLng[] = [];
    const tokenRe = /(-?\d+\.?\d*),(-?\d+\.?\d*)(?:,-?\d+\.?\d*)?/g;
    let m: RegExpExecArray | null;
    while ((m = tokenRe.exec(block)) !== null) {
      const lng = parseFloat(m[1]);
      const lat = parseFloat(m[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        coords.push({ latitude: lat, longitude: lng });
      }
    }
    if (coords.length > 1) results.push(coords);
  }
  return results;
}

const EXCLUDED_STOP_KEYWORDS = ['ชาร์จ'];

export function parseKmlStops(kmlText: string, lineKey: string): StopMarker[] {
  const stops: StopMarker[] = [];
  const placemarkRe = /<Placemark[\s\S]*?<\/Placemark>/g;
  let pm: RegExpExecArray | null;
  while ((pm = placemarkRe.exec(kmlText)) !== null) {
    if (!/<Point>/.test(pm[0])) continue;
    const nameMatch = pm[0].match(/<name>([\s\S]*?)<\/name>/);
    const coordMatch = pm[0].match(/<coordinates>([\s\S]*?)<\/coordinates>/);
    if (!coordMatch) continue;
    const name = nameMatch ? nameMatch[1].trim() : '';
    if (EXCLUDED_STOP_KEYWORDS.some(kw => name.includes(kw))) continue;
    const parts = coordMatch[1].trim().split(',').map(Number);
    const lng = parts[0], lat = parts[1];
    if (isNaN(lat) || isNaN(lng)) continue;
    stops.push({ id: `${lineKey}-${lng}-${lat}`, name, lat, lng, lineKey });
  }
  return stops;
}

const KML_SOURCES: { kml: string; lineKey: string; color: string }[] = [
  { kml: GREEN_KML, lineKey: 'Green', color: '#2ecc71' },
  { kml: RED_KML,   lineKey: 'Red',   color: '#e74c3c' },
  { kml: BLUE_KML,  lineKey: 'Blue',  color: '#3498db' },
];

export function parseAllKml(): { polylines: RoutePolyline[]; stops: StopMarker[] } {
  const results = KML_SOURCES.map(src => {
    const segments = parseKmlCoordinates(src.kml);
    const kmlStops = parseKmlStops(src.kml, src.lineKey);
    return {
      polylines: segments.map((coords): RoutePolyline => ({ color: src.color, lineKey: src.lineKey, coords })),
      stops: kmlStops,
    };
  });
  return {
    polylines: results.flatMap(r => r.polylines),
    stops: results.flatMap(r => r.stops),
  };
}
