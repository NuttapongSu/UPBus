const { parseKmlStops, mergeStops } = require('../data/stops');
const fs = require('fs');
const path = require('path');

test('parseKmlStops extracts Point placemarks from green KML', () => {
  const kml = fs.readFileSync(
    path.join(__dirname, '../../frontend/public/kml/up_bus_transit_green.kml'),
    'utf8'
  );
  const stops = parseKmlStops(kml, 'Green');
  expect(stops.length).toBeGreaterThan(3);
  expect(stops[0]).toMatchObject({
    name: expect.any(String),
    lat: expect.any(Number),
    lng: expect.any(Number),
    lines: ['Green'],
  });
});

test('mergeStops deduplicates stops within 50m and unions lines', () => {
  const a = [{ name: 'ป้าย A', lat: 19.030, lng: 99.924, lines: ['Green'] }];
  const b = [{ name: 'ป้าย A', lat: 19.0300, lng: 99.9240, lines: ['Red'] }];
  const merged = mergeStops([...a, ...b]);
  expect(merged).toHaveLength(1);
  expect(merged[0].lines).toEqual(expect.arrayContaining(['Green', 'Red']));
});
