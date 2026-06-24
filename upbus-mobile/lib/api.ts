const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000';

export type BusColor = 'Red' | 'Green' | 'Blue' | 'Purple' | 'Orange' | 'Yellow' | 'White';

export interface BusData {
  imei_id: string;
  latitude: number | null;
  longitude: number | null;
  speed: number;
  bearing: number;
  soc: number;
  acc: 0 | 1;
  color: BusColor;
  driver: string;
  date: string;
  department: string | null;
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export const getBuses = () => apiFetch<BusData[]>('/api/buses');

export async function registerPushToken(token: string, lines: string[]): Promise<void> {
  await apiFetch('/api/push/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, lines }),
  });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await apiFetch('/api/push/unregister', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}
