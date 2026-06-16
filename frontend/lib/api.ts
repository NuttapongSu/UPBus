const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

export const getBuses = () => apiFetch<BusData[]>('/api/buses');
export const getSustainability = () => apiFetch<SustainabilityData>('/api/sustainability');

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
export interface BusData {
  imei_id: string;
  latitude: number | null;
  longitude: number | null;
  speed: number;
  bearing: number;
  soc: number;
  color: 'Red' | 'Green' | 'Blue' | 'Purple';
  driver: string;
  date: string;
}

export interface SustainabilityData {
  today: {
    co2_saved_kg: number;
    kwh_used: number;
    km_total: number;
    trees_equiv: number;
  };
  weekly: { day: string; co2: number }[];
}
