'use client';
import { useState } from 'react';
import { BusData } from '@/lib/api';
import { isBusCharging, isBusRunning, isBusAvailable } from '@/lib/busStatus';
import { COLORS } from '@/lib/theme';

interface Props {
  buses: BusData[];
  onSelectBus?: (busId: string) => void;
  busFilter?: 'charging' | 'available' | null;
  onFilterBuses?: (filter: 'charging' | 'available') => void;
}

function BusList({ buses, color, subtitle, emptyText, onSelectBus }: {
  buses: BusData[];
  color: string;
  subtitle: (bus: BusData) => string;
  emptyText: string;
  onSelectBus?: (busId: string) => void;
}) {
  if (buses.length === 0) return <p className="text-xs text-gray-500">{emptyText}</p>;
  return (
    <>
      {buses.map(bus => (
        <button
          key={bus.imei_id}
          onClick={() => onSelectBus?.(bus.imei_id)}
          className="flex items-center gap-2 rounded-lg p-2 border text-left transition-all hover:brightness-125"
          style={{ borderColor: `${color}33`, background: `${color}0a` }}
        >
          <div className="w-10 h-8 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{ background: `${color}22`, color }}>
            {bus.imei_id}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-white truncate">{bus.imei_id}</p>
            <p className="text-[9px] text-gray-400 truncate">{subtitle(bus)}</p>
          </div>
          <span className="text-[9px] shrink-0" style={{ color }}>→</span>
        </button>
      ))}
    </>
  );
}

export default function SystemOverview({ buses, onSelectBus, busFilter, onFilterBuses }: Props) {
  const [showReserved, setShowReserved] = useState(false);
  const [showAvailable, setShowAvailable] = useState(false);

  const running       = buses.filter(isBusRunning).length;
  const charging      = buses.filter(b => isBusCharging(b) && !b.department).length;
  const reserved      = buses.filter(b => b.department).length;
  const reservedBuses = buses.filter(b => b.department);
  const availableBuses = buses.filter(isBusAvailable);

  // เศษ = รถที่ถูกจัดหมวดแล้ว (วิ่ง/ชาร์จ/ถูกจอง/ไม่ระบุสาย) ต้องไม่เกินส่วน (รถทั้งหมด)
  const accountedFor = Math.min(running + charging + reserved + availableBuses.length, buses.length);

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">ภาพรวมระบบ</h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#111] rounded-lg p-3">
          <p className="text-2xl font-bold text-white">{accountedFor}<span className="text-base text-gray-500">/{buses.length}</span></p>
          <p className="text-xs text-gray-500">รถทั้งหมด</p>
        </div>
        <div className="bg-[#111] rounded-lg p-3">
          <p className="text-2xl font-bold text-brand-green">{running}</p>
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
          className="bg-[#111] rounded-lg p-3 text-left transition-colors hover:bg-[#1a1a2e] border border-transparent hover:border-brand-orange/30"
        >
          <p className="text-2xl font-bold text-brand-orange">{reserved}</p>
          <p className="text-xs text-gray-500">ขอใช้รถ</p>
        </button>
      </div>

      {/* รถว่าง */}
      <button
        onClick={() => { onFilterBuses?.('available'); setShowAvailable(v => !v); }}
        className={`mt-2 w-full rounded-lg p-3 text-left transition-colors border flex items-center justify-between ${busFilter === 'available' ? 'bg-[#1a1a2e] border-brand-purple-dark/30' : 'bg-[#111] border-transparent hover:bg-[#1a1a2e] hover:border-brand-purple-dark/20'}`}
      >
        <div>
          <p className="text-2xl font-bold text-brand-purple-dark">{availableBuses.length}</p>
          <p className="text-xs text-gray-500">ไม่ระบุสาย</p>
        </div>
        <span className="text-brand-purple-dark text-lg">{showAvailable ? '▲' : '▼'}</span>
      </button>

      {showAvailable && (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-purple-dark">รถที่ว่างและพร้อมใช้งาน</p>
          <BusList
            buses={availableBuses}
            color={COLORS.purpleDark}
            subtitle={() => 'ไม่มีคนขับ · พร้อมให้บริการ'}
            emptyText="ไม่มีรถว่าง"
            onSelectBus={onSelectBus}
          />
        </div>
      )}

      {/* รายการรถที่ถูกขอใช้ */}
      {showReserved && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-orange">รถที่หน่วยงานขอใช้วันนี้</p>
          <BusList
            buses={reservedBuses}
            color={COLORS.orange}
            subtitle={bus => bus.department ?? ''}
            emptyText="ไม่มีรายการ"
            onSelectBus={onSelectBus}
          />
        </div>
      )}
    </div>
  );
}
