'use client';
import { useState } from 'react';
import { BusData } from '@/lib/api';

interface Props {
  buses: BusData[];
  onSelectBus?: (busId: string) => void;
}

export default function SystemOverview({ buses, onSelectBus }: Props) {
  const [showReserved, setShowReserved] = useState(false);

  const running  = buses.filter(b => b.color !== 'Purple' && b.latitude !== null).length;
  const charging = buses.filter(b => b.color === 'Purple' && !b.department).length;
  const reserved = buses.filter(b => b.department).length;
  const reservedBuses = buses.filter(b => b.department);

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">ภาพรวมระบบ</h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#111] rounded-lg p-3">
          <p className="text-2xl font-bold text-white">{buses.length}</p>
          <p className="text-xs text-gray-500">รถทั้งหมด</p>
        </div>
        <div className="bg-[#111] rounded-lg p-3">
          <p className="text-2xl font-bold text-[#2ecc71]">{running}</p>
          <p className="text-xs text-gray-500">กำลังวิ่ง</p>
        </div>
        <div className="bg-[#111] rounded-lg p-3">
          <p className="text-2xl font-bold text-[#3498db]">{charging}</p>
          <p className="text-xs text-gray-500">จอดชาร์จ</p>
        </div>
        <button
          onClick={() => setShowReserved(v => !v)}
          className="bg-[#111] rounded-lg p-3 text-left transition-colors hover:bg-[#1a1a2e] border border-transparent hover:border-[#9b59b655]"
        >
          <p className="text-2xl font-bold text-[#9b59b6]">{reserved}</p>
          <p className="text-xs text-gray-500">ขอใช้รถ</p>
        </button>
      </div>

      {/* รายการรถที่ถูกขอใช้ */}
      {showReserved && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9b59b6]">รถที่หน่วยงานขอใช้วันนี้</p>
          {reservedBuses.length === 0 ? (
            <p className="text-xs text-gray-500">ไม่มีรายการ</p>
          ) : (
            reservedBuses.map(bus => (
              <button
                key={bus.imei_id}
                onClick={() => onSelectBus?.(bus.imei_id)}
                className="flex items-center gap-2 rounded-lg p-2 border text-left transition-colors hover:bg-[#9b59b611]"
                style={{ borderColor: '#9b59b633', background: '#9b59b60a' }}
              >
                <div className="w-10 h-8 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: '#9b59b622', color: '#9b59b6' }}>
                  {bus.imei_id}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-white truncate">{bus.imei_id}</p>
                  <p className="text-[9px] text-gray-400 truncate">{bus.department}</p>
                </div>
                <span className="text-[9px] shrink-0" style={{ color: '#9b59b6' }}>→</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
