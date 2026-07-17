import { parseKmlCoordinates, parseKmlStops, parseAllKml } from '../lib/kmlParser';

const SAMPLE_KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml>
<Document>
  <Placemark>
    <name>ป้ายทดสอบ</name>
    <Point><coordinates>99.9,19.0,0</coordinates></Point>
  </Placemark>
  <Placemark>
    <name>จุดชาร์จ</name>
    <Point><coordinates>99.91,19.01,0</coordinates></Point>
  </Placemark>
  <Placemark>
    <LineString>
      <coordinates>99.9,19.0,0 99.91,19.01,0 99.92,19.02,0</coordinates>
    </LineString>
  </Placemark>
</Document>
</kml>`;

test('parseKmlCoordinates extracts coordinate blocks with 2+ points', () => {
  const result = parseKmlCoordinates(SAMPLE_KML);
  expect(result).toHaveLength(1);
  expect(result[0]).toEqual([
    { latitude: 19.0, longitude: 99.9 },
    { latitude: 19.01, longitude: 99.91 },
    { latitude: 19.02, longitude: 99.92 },
  ]);
});

test('parseKmlStops extracts Point placemarks and excludes charge-keyword stops', () => {
  const result = parseKmlStops(SAMPLE_KML, 'Green');
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ name: 'ป้ายทดสอบ', lat: 19.0, lng: 99.9, lineKey: 'Green' });
});

test('parseAllKml returns polylines and stops from all three bundled route files', () => {
  const { polylines, stops } = parseAllKml();
  expect(polylines.length).toBeGreaterThan(0);
  expect(stops.length).toBeGreaterThan(0);
  const lineKeys = new Set(polylines.map((p: any) => p.lineKey));
  expect(lineKeys).toEqual(new Set(['Green', 'Red', 'Blue']));
});
