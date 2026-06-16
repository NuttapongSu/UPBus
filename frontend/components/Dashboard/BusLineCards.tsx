'use client';
import { BusData } from '@/lib/api';

interface Props {
  buses: BusData[];
}

const LINES = [
  { key: 'Green', name: 'สายหน้ามอ', route: 'หน้า มอ → อาคารเรียนรวม', capacity: 20 },
  { key: 'Blue', name: 'สายประตูสาม', route: 'ประตูสาม → คณะ ICT', capacity: 15 },
  { key: 'Red', name: 'สายหอพัก', route: 'อาคาร PKY → โรงเรียนสาธิต', capacity: 25 },
];

const COLOR_HEX: Record<string, string> = {
  Green: '#2ecc71',
  Blue: '#3498db',
  Red: '#e74c3c',
};

export default function BusLineCards({ buses }: Props) {
  return (
    <div className="flex gap-3 px-4 py-3">
      {LINES.map(line => {
        const count = buses.filter(b => b.color === line.key).length;
        const vacant = line.capacity - count;
        return (
          <div key={line.key} className="flex-1 bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm" style={{ color: COLOR_HEX[line.key] }}>
                ● {line.name}
              </span>
              <span className="font-bold text-lg" style={{ color: COLOR_HEX[line.key] }}>
                {count} คัน
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-2">{line.route}</p>
            <div className="w-full bg-[#111] rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${Math.min(100, (count / line.capacity) * 100)}%`, background: COLOR_HEX[line.key] }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">ว่าง {vacant} ที่นั่ง</p>
          </div>
        );
      })}
    </div>
  );
}
