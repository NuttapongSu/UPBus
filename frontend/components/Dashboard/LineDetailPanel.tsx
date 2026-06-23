'use client';
import { useState } from 'react';
import { BusData } from '@/lib/api';

interface Props {
  buses: BusData[];
  selectedLine: string;
  onClose: () => void;
  onSelectBus: (busId: string) => void;
}

const LINES: Record<string, { name: string; route: string; color: string }> = {
  Green: { name: 'สายหน้ามอ',    route: 'หน้ามหาวิทยาลัย → อาคารเรียนรวม', color: '#2ecc71' },
  Blue:  { name: 'สายประตูสาม', route: 'ประตูสาม → คณะ ICT',               color: '#3498db' },
  Red:   { name: 'สายหอพัก',    route: 'อาคาร PKY → โรงเรียนสาธิต',        color: '#e74c3c' },
};

const LINE_STOPS: Record<string, { name: string; lat: number; lng: number }[]> = {
  Green: [
    { name: 'จุดจอดรถบัสหน้ามหาวิทยาลัย',          lat: 19.030564,  lng: 99.923098  },
    { name: 'สถานีหน้าคณะทันตแพทยศาสตร์',           lat: 19.0298661, lng: 99.9154259 },
    { name: 'สถานีหน้าคณะวิศวกรรมศาสตร์',           lat: 19.0307963, lng: 99.9011997 },
    { name: 'สถานีหน้าคณะพยาบาลศาสตร์',             lat: 19.0306625, lng: 99.897615  },
    { name: 'สถานีหน้าอาคารสำนักงานอธิการบดี',      lat: 19.0290339, lng: 99.8960666 },
    { name: 'สถานีหน้าคณะศิลปศาสตร์',               lat: 19.0294776, lng: 99.8957507 },
    { name: 'สถานีหน้าเรือนเอื้องคำ',               lat: 19.028584,  lng: 99.906696  },
    { name: 'จุดจอดรถบัส PKY',                      lat: 19.02562,   lng: 99.895015  },
    { name: 'สถานีหน้าหอประชุมพญางำเมือง',          lat: 19.0299998, lng: 99.8977114 },
  ],
  Blue: [
    { name: 'จุดจอดรถบัสประตูสาม',                  lat: 19.02281,   lng: 99.89537   },
    { name: 'สถานีหน้าคณะเทคโนโลยีสารสนเทศและการสื่อสาร', lat: 19.0284949, lng: 99.8998267 },
    { name: 'สถานีหน้าคณะวิศวกรรมศาสตร์',           lat: 19.0305663, lng: 99.901226  },
    { name: 'สถานีหน้าศูนย์การเรียนรู้เศรษฐกิจพอเพียง', lat: 19.02696, lng: 99.899542 },
  ],
  Red: [
    { name: 'สถานีหน้าอาคารสงวนเสริมศรี',           lat: 19.0342438, lng: 99.8863112 },
    { name: 'สถานีหน้าอาคาร ๙๙ ปี',                 lat: 19.0320031, lng: 99.8934952 },
    { name: 'สถานีหน้าเวียงพะเยา',                  lat: 19.0331648, lng: 99.8908747 },
    { name: 'สถานีหน้าโรงเรียนสาธิตมหาวิทยาลัยพะเยา', lat: 19.0344118, lng: 99.8842468 },
    { name: 'จุดจอดรถบัส PKY',                      lat: 19.02562,   lng: 99.895015  },
  ],
};

type Tab = 'buses' | 'stops' | 'schedule' | 'eco';

export default function LineDetailPanel({ buses, selectedLine, onClose, onSelectBus }: Props) {
  const [tab, setTab] = useState<Tab>('buses');
  const line = LINES[selectedLine];
  const lineBuses = buses.filter(b => b.color === selectedLine);
  const running = lineBuses.filter(b => b.acc === 1 && b.latitude !== null);
  const parked  = lineBuses.filter(b => b.acc !== 1 || b.latitude === null);

  if (!line) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold px-2 py-1 rounded-full border"
          style={{ color: line.color, borderColor: line.color, background: `${line.color}18` }}>
          ● {line.name}
        </span>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xs">✕ ปิด</button>
      </div>

      {/* Line info */}
      <div className="mb-3">
        <p className="font-bold text-sm text-white">{line.name}</p>
        <p className="text-xs text-gray-400">{line.route}</p>
      </div>

      {/* Stats — จำนวนรถ และสถานะ (ไม่มีที่นั่งว่าง/ผู้โดยสาร) */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-[#1a1a2e] rounded-xl p-3 border border-[#2a2a4a]">
          <p className="text-xs text-gray-400 mb-1">รถในสาย</p>
          <p className="text-2xl font-bold" style={{ color: line.color }}>{lineBuses.length}</p>
        </div>
        <div className="bg-[#1a1a2e] rounded-xl p-3 border border-[#2a2a4a]">
          <p className="text-xs text-gray-400 mb-1">กำลังวิ่ง</p>
          <p className="text-2xl font-bold text-white">{running.length}</p>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs text-green-400 font-bold">ปกติ</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2a2a4a] mb-3 text-xs">
        {([['buses','รถในสาย'],['stops','ป้าย'],['schedule','ตาราง'],['eco','Eco']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 py-2 text-center transition-colors"
            style={{
              color: tab === key ? line.color : '#666',
              borderBottom: tab === key ? `2px solid ${line.color}` : '2px solid transparent',
              fontWeight: tab === key ? 'bold' : 'normal',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {tab === 'buses' && (
          <>
            {running.map(bus => (
              <button key={bus.imei_id} onClick={() => onSelectBus(bus.imei_id)}
                className="w-full flex items-center gap-3 bg-[#1a1a2e] rounded-xl p-3 border border-[#2a2a4a] hover:border-opacity-80 transition-colors text-left"
                style={{ '--hover-color': line.color } as React.CSSProperties}>
                <div className="w-12 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: `${line.color}22`, color: line.color, border: `1px solid ${line.color}55` }}>
                  {bus.imei_id}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{bus.imei_id} - กำลังวิ่ง</p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {bus.driver && bus.driver !== 'ไม่ระบุคนขับ' ? `คนขับ: ${bus.driver}` : 'ไม่มีคนขับ'}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: `${line.color}22`, color: line.color }}>
                  {bus.speed > 0 ? `${bus.speed} km/h` : 'จอด'}
                </span>
              </button>
            ))}
            {parked.map(bus => (
              <button key={bus.imei_id} onClick={() => onSelectBus(bus.imei_id)}
                className="w-full flex items-center gap-3 bg-[#1a1a2e] rounded-xl p-3 border border-[#2a2a4a] opacity-60 hover:opacity-80 transition-opacity text-left">
                <div className="w-12 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 bg-[#2a2a4a] text-gray-500">
                  {bus.imei_id}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-400 truncate">{bus.imei_id} - จอดพัก</p>
                  <p className="text-[10px] text-gray-600 truncate">
                    {bus.driver && bus.driver !== 'ไม่ระบุคนขับ' ? `คนขับ: ${bus.driver}` : 'ไม่มีคนขับ'}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0 bg-[#2a2a4a] text-gray-500">
                  จอดพัก
                </span>
              </button>
            ))}
            {lineBuses.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-8">ไม่มีรถในสายนี้</p>
            )}
          </>
        )}
        {tab === 'stops' && (
          <>
            {(LINE_STOPS[selectedLine] ?? []).map((stop, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#1a1a2e] rounded-xl p-3 border border-[#2a2a4a]">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: `${line.color}22`, color: line.color, border: `1px solid ${line.color}55` }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{stop.name}</p>
                  <p className="text-[10px] text-gray-500">{stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}</p>
                </div>
                <span className="text-[10px] shrink-0" style={{ color: line.color }}>●</span>
              </div>
            ))}
          </>
        )}
        {tab === 'schedule' && (
          <p className="text-xs text-gray-500 text-center py-8">ยังไม่มีตารางเวลา</p>
        )}
        {tab === 'eco' && (
          <p className="text-xs text-gray-500 text-center py-8">ข้อมูล Eco ของสายนี้</p>
        )}
      </div>
    </div>
  );
}
