export interface IntersectionPoint {
  lat:     number;
  lng:     number;
  name:    string;
  radiusM: number;
}

// Points where two or more lines share a stop name in their KML data — confirmed
// against the actual KML files, not derived from raw polyline proximity (the three
// lines run along a shared central corridor for long stretches, so proximity
// clustering alone produces noisy, unusable results).
export const ROUTE_INTERSECTIONS: IntersectionPoint[] = [
  { lat: 19.0300, lng: 99.8977, name: 'หอประชุมพญางำเมือง',       radiusM: 25 },
  { lat: 19.0290, lng: 99.8961, name: 'อธิการบดี',                radiusM: 25 },
  { lat: 19.0296, lng: 99.8958, name: 'ศิลปศาสตร์',                radiusM: 25 },
  { lat: 19.0254, lng: 99.8951, name: 'PKY',                       radiusM: 25 },
  { lat: 19.0306, lng: 99.9012, name: 'วิศวกรรมศาสตร์(ขากลับ)',    radiusM: 25 },
];
