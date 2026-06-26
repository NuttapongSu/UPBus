const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000';

export type BusColor = 'Red' | 'Green' | 'Blue' | 'Purple';

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

export interface BusStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
}

export interface SustainabilityData {
  today: {
    co2_saved_kg: number;
    kwh_used: number;
    km_total: number;
    trees_equiv: number;
    buses_active: number;
  };
  weekly: { day: string; co2: number }[];
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

export const getBuses = () => apiFetch<BusData[]>('/api/buses');
export const getStops = () => apiFetch<BusStop[]>('/api/stops');
export const getSustainability = () => apiFetch<SustainabilityData>('/api/sustainability');

export async function postComplaint(form: FormData): Promise<void> {
  await fetch(`${BASE}/api/complaints`, { method: 'POST', body: form });
}

export async function registerPushToken(
  token: string,
  destinationStopId: string,
  boardingStops: { lineColor: string; stopName: string; lat: number; lng: number }[]
): Promise<void> {
  await apiFetch('/api/push/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, destinationStopId, boardingStops }),
  });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await apiFetch('/api/push/unregister', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}
