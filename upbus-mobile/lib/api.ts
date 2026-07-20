const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000';

export type BusColor = 'Red' | 'Green' | 'Blue' | 'Purple' | 'Orange';

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

export const getBuses = () =>
  apiFetch<BusData[]>('/api/buses').then(data => {
    const t = new Date().toLocaleTimeString('th-TH', { hour12: false });
    console.log(`[Poll] buses updated: ${data.length} คัน | ${t}`);
    return data;
  });
export const getKml = (line: string): Promise<string> =>
  fetch(`${BASE}/api/kml/${line}`).then(r => {
    if (!r.ok) throw new Error(`KML ${line} → ${r.status}`);
    return r.text();
  });
export const getStops = () => apiFetch<BusStop[]>('/api/stops');
export const getSustainability = () => apiFetch<SustainabilityData>('/api/sustainability');

export async function postComplaint(form: FormData): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/api/complaints`);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Complaint submit failed: ${xhr.status} ${xhr.responseText}`));
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(form);
  });
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
