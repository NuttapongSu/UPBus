import { useEffect, useRef, useState } from 'react';
import { getBuses, BusData } from '@/lib/api';

export function useBuses() {
  const [buses, setBuses] = useState<BusData[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const data = await getBuses();
        if (alive) { setBuses(data); setError(null); }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e : new Error(String(e)));
      }
    }
    poll();
    timer.current = setInterval(poll, 5000);
    return () => { alive = false; clearInterval(timer.current!); };
  }, []);

  return { buses, error };
}
