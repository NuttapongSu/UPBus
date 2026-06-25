'use client';
import { useState } from 'react';
import { BusData } from '@/lib/api';

interface Props {
  buses: BusData[];
  onSelectBus?: (busId: string) => void;
  busFilter?: 'charging' | 'available' | null;
  onFilterBuses?: (filter: 'charging' | 'available') => void;
}

export default function SystemOverview({ buses, onSelectBus, busFilter, onFilterBuses }: Props) {
  const [showReserved, setShowReserved] = useState(false);
  const [showAvailable, setShowAvailable] = useState(false);

  const running       = buses.filter(b => b.color !== 'Purple' && b.latitude !== null).length;
  const charging      = buses.filter(b => b.color === 'Purple' && !b.department).length;
  const reserved      = buses.filter(b => b.department).length;
  const reservedBuses = buses.filter(b => b.department);
  const availableBuses = buses.filter(b => b.color === 'Purple' && !b.department);

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
        <button
          onClick={() => onFilterBuses?.('charging')}
          className={`rounded-lg p-3 text-left transition-colors border ${busFilter === 'charging' ? 'bg-[#1a1a2e] border-white/30' : 'bg-[#111] border-transparent hover:bg-[#1a1a2e] hover:border-white/20'}`}
        >
          <p className="text-2xl font-bold text-white">{charging} <span className="text-base">⚡</span></p>
          <p className="text-xs text-gray-500">จอดชาร์จ</p>
        </button>
        <button
          onClick={() => setShowReserved(v => !v)}
          className="bg-[#111] rounded-lg p-3 text-left transition-colors hover:bg-[#1a1a2e] border border-transparent hover:border-[#f39c1255]"
        >
          <p className="text-2xl font-bold text-[#f39c12]">{reserved}</p>
          <p className="text-xs text-gray-500">ขอใช้รถ</p>
        </button>
      </div>

      {/* รถว่าง */}
      <button
        onClick={() => { onFilterBuses?.('available'); setShowAvailable(v => !v); }}
        className={`mt-2 w-full rounded-lg p-3 text-left transition-colors border flex items-center justify-between ${busFilter === 'available' ? 'bg-[#1a1a2e] border-[#8e44ad55]' : 'bg-[#111] border-transparent hover:bg-[#1a1a2e] hover:border-[#8e44ad33]'}`}
      >
        <div>
          <p className="text-2xl font-bold text-[#8e44ad]">{availableBuses.length}</p>
          <p className="text-xs text-gray-500">ไม่ระบุสาย</p>
        </div>
        <span className="text-[#8e44ad] text-lg">{showAvailable ? '▲' : '▼'}</span>
      </button>

      {showAvailable && (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#8e44ad]">รถที่ว่างและพร้อมใช้งาน</p>
          {availableBuses.length === 0 ? (
            <p className="text-xs text-gray-500">ไม่มีรถว่าง</p>
          ) : (
            availableBuses.map(bus => (
              <button
                key={bus.imei_id}
                onClick={() => onSelectBus?.(bus.imei_id)}
                className="flex items-center gap-2 rounded-lg p-2 border text-left transition-colors hover:bg-[#8e44ad11]"
                style={{ borderColor: '#8e44ad33', background: '#8e44ad0a' }}
              >
                <div className="w-10 h-8 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: '#8e44ad22', color: '#8e44ad' }}>
                  {bus.imei_id}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-white truncate">{bus.imei_id}</p>
                  <p className="text-[9px] text-gray-400 truncate">ไม่มีคนขับ · พร้อมให้บริการ</p>
                </div>
                <span className="text-[9px] shrink-0" style={{ color: '#8e44ad' }}>→</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* รายการรถที่ถูกขอใช้ */}
      {showReserved && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#f39c12]">รถที่หน่วยงานขอใช้วันนี้</p>
          {reservedBuses.length === 0 ? (
            <p className="text-xs text-gray-500">ไม่มีรายการ</p>
          ) : (
            reservedBuses.map(bus => (
              <button
                key={bus.imei_id}
                onClick={() => onSelectBus?.(bus.imei_id)}
                className="flex items-center gap-2 rounded-lg p-2 border text-left transition-colors hover:bg-[#f39c1211]"
                style={{ borderColor: '#f39c1233', background: '#f39c120a' }}
              >
                <div className="w-10 h-8 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: '#f39c1222', color: '#f39c12' }}>
                  {bus.imei_id}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-white truncate">{bus.imei_id}</p>
                  <p className="text-[9px] text-gray-400 truncate">{bus.department}</p>
                </div>
                <span className="text-[9px] shrink-0" style={{ color: '#f39c12' }}>→</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
