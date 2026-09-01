'use client';
import { useEffect, useRef, useState } from 'react';
import { BusData } from '@/lib/api';
import { LINE_COLORS } from '@/lib/theme';

interface Props {
  buses: BusData[];
}

interface Alert {
  line: 'Green' | 'Blue' | 'Red';
  busId: string;
  etaMin: number;
  atStop: string;
  nextStop: string;
  distanceM: number;
}

const LINE_COLOR = LINE_COLORS;

const LINE_STOPS: Record<string, { name: string; lat: number; lng: number }[]> = {
  Green: [
    // ขากลับ: PKY → ศิลปศาสตร์ → พยาบาล → วิศวะ(ขากลับ) → ทันตะ → หน้ามอ
    // ขาไป:   หน้ามอ → เรือนเอื้องคำ → วิศวะ(ขาไป) → หอประชุม → อธิการ → PKY
    { name: 'จุดจอดรถบัส PKY',                           lat: 19.02562,   lng: 99.895015  },
    { name: 'สถานีหน้าคณะศิลปศาสตร์',                    lat: 19.0294776, lng: 99.8957507 },
    { name: 'สถานีหน้าคณะพยาบาลศาสตร์',                  lat: 19.0306625, lng: 99.897615  },
    { name: 'สถานีหน้าคณะวิศวกรรมศาสตร์',                lat: 19.0307963, lng: 99.9011997 },
    { name: 'สถานีหน้าคณะทันตแพทยศาสตร์',                lat: 19.0298661, lng: 99.9154259 },
    { name: 'จุดจอดรถบัสหน้ามหาวิทยาลัย',               lat: 19.030564,  lng: 99.923098  },
    { name: 'สถานีหน้าเรือนเอื้องคำ',                    lat: 19.028584,  lng: 99.906696  },
    { name: 'สถานีหน้าคณะวิศวกรรมศาสตร์',                lat: 19.0305663, lng: 99.901226  },
    { name: 'สถานีหน้าหอประชุมพญางำเมือง',               lat: 19.0299998, lng: 99.8977114 },
    { name: 'สถานีหน้าอาคารสำนักงานอธิการบดี',           lat: 19.0290339, lng: 99.8960666 },
  ],
  Blue: [
    { name: 'จุดจอดรถบัสประตูสาม',                       lat: 19.02281,   lng: 99.89537   },
    { name: 'สถานีหน้าคณะเทคโนโลยีสารสนเทศและการสื่อสาร', lat: 19.0284949, lng: 99.8998267 },
    { name: 'สถานีหน้าคณะวิศวกรรมศาสตร์',                lat: 19.0305663, lng: 99.901226  },
    { name: 'สถานีหน้าศูนย์การเรียนรู้เศรษฐกิจพอเพียง',  lat: 19.02696,   lng: 99.899542  },
  ],
  Red: [
    { name: 'สถานีหน้าอาคารสงวนเสริมศรี',                lat: 19.0342438, lng: 99.8863112 },
    { name: 'สถานีหน้าอาคาร ๙๙ ปี',                      lat: 19.0320031, lng: 99.8934952 },
    { name: 'สถานีหน้าเวียงพะเยา',                       lat: 19.0331648, lng: 99.8908747 },
    { name: 'สถานีหน้าโรงเรียนสาธิตมหาวิทยาลัยพะเยา',   lat: 19.0344118, lng: 99.8842468 },
    { name: 'จุดจอดรถบัส PKY',                           lat: 19.02562,   lng: 99.895015  },
  ],
};

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


const MAX_BUS_DIST_M = 8000; // ไม่แจ้งเตือนถ้ารถอยู่ไกลกว่า 8 กม.

export default function BusApproachAlerts({ buses }: Props) {
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      pos => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  useEffect(() => {
    if (!userPos) return;

    const newAlerts: Alert[] = [];

    for (const [line, stops] of Object.entries(LINE_STOPS) as [keyof typeof LINE_STOPS, typeof LINE_STOPS[string]][]) {
      const lineBuses = buses.filter(
        b => b.color === line && b.latitude !== null && b.longitude !== null
      );
      if (lineBuses.length === 0) continue;

      // 1. หาป้ายในสายนี้ที่ใกล้ผู้ใช้มากที่สุด
      const userStopIdx = stops.reduce((bestIdx, stop, idx) => {
        const d = haversine(userPos.lat, userPos.lng, stop.lat, stop.lng);
        const best = haversine(userPos.lat, userPos.lng, stops[bestIdx].lat, stops[bestIdx].lng);
        return d < best ? idx : bestIdx;
      }, 0);
      const userStop = stops[userStopIdx];

      // 2. หารถที่ใกล้ป้ายของผู้ใช้มากที่สุด
      let closestBus: BusData | null = null;
      let closestDistToStop = Infinity;
      lineBuses.forEach(bus => {
        const d = haversine(bus.latitude!, bus.longitude!, userStop.lat, userStop.lng);
        if (d < closestDistToStop) { closestDistToStop = d; closestBus = bus; }
      });

      if (!closestBus || closestDistToStop > MAX_BUS_DIST_M) continue;

      const bus = closestBus as BusData;
      const nextStopData = stops[(userStopIdx + 1) % stops.length];
      const speedMps = ((bus.speed || 20) * 1000) / 3600;
      const etaMin = Math.max(1, Math.round(closestDistToStop / speedMps / 60));

      newAlerts.push({
        line: line as Alert['line'],
        busId: bus.imei_id,
        etaMin,
        atStop: userStop.name,
        nextStop: nextStopData.name,
        distanceM: closestDistToStop,
      });
    }

    // เรียงตาม ETA
    newAlerts.sort((a, b) => a.etaMin - b.etaMin);
    setAlerts(newAlerts);
  }, [userPos, buses]);

  if (!userPos) {
    return (
      <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">แจ้งเตือนล่าสุด</h3>
        <p className="text-xs text-gray-500 animate-pulse">รอสัญญาณ GPS…</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">แจ้งเตือนล่าสุด</h3>

      {alerts.length === 0 ? (
        <p className="text-xs text-gray-500">ไม่มีรถในรัศมี 8 กม.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {alerts.map(alert => (
            <li key={alert.line}
              className="rounded-xl p-3 border flex flex-col gap-1"
              style={{ background: `${LINE_COLOR[alert.line]}10`, borderColor: `${LINE_COLOR[alert.line]}40` }}>

              {/* แถว 1: เลขรถ + ETA */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LINE_COLOR[alert.line] }} />
                  <span className="text-xs font-bold text-white">{alert.busId}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: LINE_COLOR[alert.line] }}>
                  ~{alert.etaMin} นาที
                </span>
              </div>

              {/* แถว 2: ป้ายที่รอ */}
              <p className="text-[10px] text-gray-400 truncate">
                รอที่: <span className="text-gray-200">{alert.atStop}</span>
              </p>

              {/* แถว 3: ป้ายถัดไป */}
              <p className="text-[10px] text-gray-500 truncate">
                ถัดไป → <span className="text-gray-300">{alert.nextStop}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
