'use client';
import useSWR from 'swr';
import { getBusDetail, getBusHourly, BusDetail, HourlyData } from '@/lib/api';
import { COLORS, LINE_COLORS } from '@/lib/theme';

interface Props {
  busId: string;
  onBack: () => void;
}

const LINE_META: Record<string, { name: string; route: string; color: string }> = {
  Green:  { name: 'สายหน้ามอ',    route: 'หน้ามหาวิทยาลัย → อาคารเรียนรวม', color: LINE_COLORS.Green },
  Blue:   { name: 'สายประตูสาม', route: 'ประตูสาม → คณะ ICT',               color: LINE_COLORS.Blue },
  Red:    { name: 'สายหอพัก',    route: 'อาคาร PKY → โรงเรียนสาธิต',        color: LINE_COLORS.Red },
  Purple: { name: 'ไม่มีสาย',    route: 'ยังไม่ได้กำหนดสาย',                color: LINE_COLORS.Purple },
};

const DAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function MiniBar({ km, max, color }: { km: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (km / max) * 100) : 0;
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-[9px] text-gray-500">{km > 0 ? km.toFixed(1) : '-'}</span>
      <div className="w-full bg-[#1a1a2e] rounded-sm" style={{ height: 48 }}>
        <div
          className="w-full rounded-sm transition-all duration-500"
          style={{ height: `${pct}%`, background: color, marginTop: `${100 - pct}%` }}
        />
      </div>
    </div>
  );
}

const HOUR_SLOTS = Array.from({ length: 17 }, (_, i) => i + 6); // 6..22

function HourlyChart({ busId, color }: { busId: string; color: string }) {
  const { data } = useSWR<HourlyData>(
    busId ? `/api/buses/${busId}/hourly` : null,
    () => getBusHourly(busId),
    { refreshInterval: 60_000 }
  );

  const kmByHour = new Map<number, number>();
  data?.hourly.forEach(h => kmByHour.set(h.hour, h.km));
  const maxKm = Math.max(...HOUR_SLOTS.map(h => kmByHour.get(h) ?? 0), 1);

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-3 border border-[#2a2a4a] mb-3">
      <p className="text-[10px] text-gray-500 mb-3">ระยะทางรายชั่วโมง (กม.)</p>
      <div className="flex gap-0.5 items-end overflow-x-auto pb-1">
        {HOUR_SLOTS.map(h => {
          const km = kmByHour.get(h) ?? 0;
          const pct = maxKm > 0 ? Math.min(100, (km / maxKm) * 100) : 0;
          const isNow = new Date().getHours() === h;
          return (
            <div key={h} className="flex flex-col items-center gap-0.5 min-w-[13px] flex-1">
              <span className="text-[7px] text-gray-500 leading-none">
                {km > 0 ? km.toFixed(1) : ''}
              </span>
              <div className="w-full bg-[#0d0d1a] rounded-sm" style={{ height: 40 }}>
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${pct}%`,
                    background: isNow ? color : `${color}88`,
                    marginTop: `${100 - pct}%`,
                    transition: 'height 0.3s ease',
                  }}
                />
              </div>
              <span className={`text-[7px] leading-none ${isNow ? 'text-white font-bold' : 'text-gray-600'}`}>
                {h}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BusDetailPanel({ busId, onBack }: Props) {
  const { data } = useSWR<BusDetail>(
    busId ? `/api/buses/${busId}` : null,
    () => getBusDetail(busId),
    { refreshInterval: 5000 }
  );

  const line = LINE_META[data?.color ?? 'Purple'];
  const maxKm = data ? Math.max(...data.history.map(h => h.km), data.km_today, 1) : 1;

  // build last-7-day slots: fill missing dates with 0
  const slots: { label: string; km: number }[] = [];
  if (data) {
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dayLabel = i === 0 ? 'วันนี้' : DAYS_TH[d.getDay()];
      const found = data.history.find(h => h.date === iso);
      const km = i === 0 ? data.km_today : (found?.km ?? 0);
      slots.push({ label: dayLabel, km });
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
          ← กลับ
        </button>
        <span className="text-xs text-gray-500">รายละเอียดรถ</span>
      </div>

      {!data ? (
        <p className="text-xs text-gray-500 text-center py-12">กำลังโหลด...</p>
      ) : (
        <>
          {/* Bus ID badge */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-16 h-14 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: `${line.color}22`, color: line.color, border: `2px solid ${line.color}55` }}
            >
              {data.bus_id}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{data.bus_id}</p>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${line.color}22`, color: line.color }}
              >
                {line.name}
              </span>
              <p className="text-[10px] text-gray-500 mt-0.5">{line.route}</p>
            </div>
          </div>

          {/* Status row */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`w-2 h-2 rounded-full ${data.acc === 1 ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
            <span className={`text-xs font-bold ${data.acc === 1 ? 'text-green-400' : 'text-gray-500'}`}>
              {data.acc === 1 ? 'กำลังวิ่ง' : 'จอดพัก'}
            </span>
            {data.acc === 1 && data.speed > 0 && (
              <span className="text-xs text-gray-400 ml-auto">{data.speed} km/h</span>
            )}
          </div>

          {/* แบนเนอร์หน่วยงานที่ขอใช้รถ */}
          {data.department && (
            <div className="mb-4 rounded-xl p-3 border flex items-start gap-3"
              style={{ background: `${COLORS.purple}14`, borderColor: `${COLORS.purple}55` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${COLORS.purple}22` }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={COLORS.purple} strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 mb-0.5">หน่วยงานที่ขอใช้รถวันนี้</p>
                <p className="text-xs font-bold" style={{ color: COLORS.purple }}>{data.department}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">รถคันนี้ถูกนำออกจากทุกสายชั่วคราว</p>
              </div>
            </div>
          )}

          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-[#1a1a2e] rounded-xl p-3 border border-[#2a2a4a]">
              <p className="text-[10px] text-gray-500 mb-1">คนขับ</p>
              <p className="text-xs font-bold text-white truncate">{data.driver}</p>
            </div>
            <div className="bg-[#1a1a2e] rounded-xl p-3 border border-[#2a2a4a]">
              <p className="text-[10px] text-gray-500 mb-1">แบตเตอรี่</p>
              <p className="text-sm font-bold" style={{ color: data.soc > 20 ? line.color : COLORS.red }}>
                {data.soc}%
              </p>
            </div>
            <div className="bg-[#1a1a2e] rounded-xl p-3 border border-[#2a2a4a]">
              <p className="text-[10px] text-gray-500 mb-1">วันนี้วิ่งแล้ว</p>
              <p className="text-lg font-bold" style={{ color: line.color }}>
                {data.km_today.toFixed(1)}
                <span className="text-[10px] text-gray-400 ml-1">กม.</span>
              </p>
            </div>
            <div className="bg-[#1a1a2e] rounded-xl p-3 border border-[#2a2a4a]">
              <p className="text-[10px] text-gray-500 mb-1">ไมล์สะสม</p>
              <p className="text-sm font-bold text-white">
                {data.odo_total.toLocaleString()}
                <span className="text-[10px] text-gray-400 ml-1">กม.</span>
              </p>
            </div>
          </div>

          {/* Hourly distance chart — เหนือ 7-day */}
          <HourlyChart busId={data.bus_id} color={line.color} />

          {/* 7-day history chart */}
          <div className="bg-[#1a1a2e] rounded-xl p-3 border border-[#2a2a4a]">
            <p className="text-[10px] text-gray-500 mb-3">ระยะทาง 7 วันที่ผ่านมา</p>
            <div className="flex gap-1 items-end">
              {slots.map((s, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <MiniBar km={s.km} max={maxKm} color={i === 6 ? line.color : `${line.color}88`} />
                  <span className="text-[9px] text-gray-500">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live badge */}
          <div className="mt-3 flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-green-400">อัปเดตทุก 5 วินาที</span>
          </div>
        </>
      )}
    </div>
  );
}
