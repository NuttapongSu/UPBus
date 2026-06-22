const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

export const getBuses = () => apiFetch<BusData[]>('/api/buses');
export const getSustainability = () => apiFetch<SustainabilityData>('/api/sustainability');
export const getBusDetail = (busId: string) => apiFetch<BusDetail>(`/api/buses/${busId}`);

export async function postComplaint(form: FormData) {
  const res = await fetch(`${BASE}/api/complaints`, { method: 'POST', body: form });
  return res.json();
}

export async function adminLogin(username: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export function adminFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';
  return apiFetch<T>(path, {
    ...opts,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...opts?.headers },
  });
}

// Types
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

export interface BusDetail {
  bus_id: string;
  color: BusColor;
  driver: string;
  department: string | null;
  odo_total: number;
  km_today: number;
  speed: number;
  acc: 0 | 1;
  soc: number;
  history: { date: string; km: number }[];
}

export interface SustainabilityData {
  today: {
    co2_saved_kg: number;
    kwh_used: number;
    km_total: number;
    trees_equiv: number;
    ev_co2_kg: number;
    ngv_co2_kg: number;
    buses_active: number;
  };
  weekly: { day: string; co2: number }[];
}
