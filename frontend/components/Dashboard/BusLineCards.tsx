'use client';
import { BusData } from '@/lib/api';

interface Props {
  buses: BusData[];
  selectedLine: string | null;
  onSelectLine: (line: string | null) => void;
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

export default function BusLineCards({ buses, selectedLine, onSelectLine }: Props) {
  return (
    <div className="flex gap-3 px-4 py-3 items-stretch">
      {/* ทุกสาย button */}
      <button
        onClick={() => onSelectLine(null)}
        className="flex flex-col justify-center items-center px-5 rounded-xl border transition-all"
        style={{
          background: selectedLine === null ? '#2a2a4a' : '#1a1a2e',
          borderColor: selectedLine === null ? '#888' : '#2a2a4a',
          color: selectedLine === null ? '#fff' : '#888',
          fontWeight: selectedLine === null ? 'bold' : 'normal',
          minWidth: 80,
        }}
      >
        <span className="text-sm">ทุกสาย</span>
        <span className="text-xs mt-1">{buses.length} คัน</span>
      </button>

      {LINES.map(line => {
        const count = buses.filter(b => b.color === line.key).length;
        const vacant = line.capacity - count;
        const isSelected = selectedLine === line.key;
        return (
          <button
            key={line.key}
            onClick={() => onSelectLine(isSelected ? null : line.key)}
            className="flex-1 rounded-xl p-4 border text-left transition-all"
            style={{
              background: isSelected ? '#1e1e3a' : '#1a1a2e',
              borderColor: isSelected ? COLOR_HEX[line.key] : '#2a2a4a',
              boxShadow: isSelected ? `0 0 0 2px ${COLOR_HEX[line.key]}44` : 'none',
            }}
          >
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
          </button>
        );
      })}
    </div>
  );
}
