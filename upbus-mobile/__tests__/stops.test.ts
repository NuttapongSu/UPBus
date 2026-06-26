import { findPassingLines, findBoardingStop, calcEtaMinutes } from '../lib/stops';
import type { BusStop, BusData } from '../lib/api';

const mockStops: BusStop[] = [
  { id: 'a', name: 'ป้าย A', lat: 19.030, lng: 99.924, lines: ['Green', 'Red'] },
  { id: 'b', name: 'ป้าย B', lat: 19.031, lng: 99.920, lines: ['Green'] },
  { id: 'c', name: 'ป้าย C', lat: 19.029, lng: 99.910, lines: ['Red'] },
  { id: 'dest', name: 'ป้ายหอพัก', lat: 19.028, lng: 99.900, lines: ['Green', 'Red'] },
];

test('findPassingLines returns lines that serve the destination', () => {
  const result = findPassingLines(mockStops, 'dest');
  expect(result).toEqual(expect.arrayContaining(['Green', 'Red']));
});

test('findPassingLines returns empty for unknown destination', () => {
  expect(findPassingLines(mockStops, 'unknown')).toHaveLength(0);
});

test('findBoardingStop returns nearest stop on the given line', () => {
  // user is at 19.031, 99.921 — nearest Green stop is 'b'
  const result = findBoardingStop(mockStops, 'Green', 19.031, 99.921);
  expect(result?.id).toBe('b');
});

test('findBoardingStop returns null if no stops on that line', () => {
  expect(findBoardingStop(mockStops, 'Blue', 19.031, 99.921)).toBeNull();
});

test('calcEtaMinutes returns null for bus with no position', () => {
  const bus: BusData = { imei_id: '1', latitude: null, longitude: null, speed: 0, bearing: 0, soc: 0, acc: 0, color: 'Green', driver: '', date: '', department: null };
  const stop: BusStop = { id: 'b', name: 'ป้าย B', lat: 19.031, lng: 99.920, lines: ['Green'] };
  expect(calcEtaMinutes(bus, stop)).toBeNull();
});
