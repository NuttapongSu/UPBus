'use client';
import { BusData } from '@/lib/api';

interface Props {
  buses: BusData[];
}

export default function SystemOverview({ buses }: Props) {
  const running = buses.filter(b => b.color !== 'Purple' && b.latitude !== null).length;
  const parked = buses.filter(b => b.color === 'Purple').length;

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">ภาพรวมระบบ</h3>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'รถทั้งหมด', value: buses.length, color: 'text-white' },
          { label: 'กำลังวิ่ง', value: running, color: 'text-[#2ecc71]' },
          { label: 'จอดพัก', value: parked, color: 'text-[#e74c3c]' },
          { label: 'ผู้ใช้วันนี้', value: '—', color: 'text-[#f39c12]' },
        ].map(item => (
          <div key={item.label} className="bg-[#111] rounded-lg p-3">
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-gray-500">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
