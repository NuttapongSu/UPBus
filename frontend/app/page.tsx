'use client';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { getBuses, BusData } from '@/lib/api';
import SystemOverview from '@/components/Dashboard/SystemOverview';
import SustainabilityPanel from '@/components/Dashboard/SustainabilityPanel';
import BusLineCards from '@/components/Dashboard/BusLineCards';

// Dynamic import เพราะ Leaflet ต้องการ window
const BusMap = dynamic(() => import('@/components/Map/BusMap'), { ssr: false });

export default function HomePage() {
  const { data: buses = [] } = useSWR<BusData[]>('/api/buses', getBuses, {
    refreshInterval: 10000,
  });

  const now = new Date().toLocaleString('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-3 bg-[#0f0f1a] border-b border-[#1e1e2e]">
        <div>
          <h1 className="text-lg font-bold">UP Smart Transit</h1>
          <p className="text-xs text-gray-400">ระบบขนส่งอัจฉริยะเพื่อมหาวิทยาลัยสีเขียว</p>
        </div>
        <input
          className="flex-1 mx-8 bg-[#1a1a2e] border border-[#2a2a4a] rounded-full px-4 py-2 text-sm outline-none"
          placeholder="ค้นหาเส้นทาง/ป้ายรถ/จุดหมาย..."
        />
        <p className="text-sm text-gray-300 ml-auto">อัปเดต {now}</p>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Panel */}
        <aside className="w-64 flex flex-col gap-3 p-3 overflow-y-auto bg-[#0f0f1a] border-r border-[#1e1e2e]">
          <SystemOverview buses={buses} />
          <div className="bg-[#1a1a2e] rounded-xl p-4 border border-[#2a2a4a]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">ป้ายใกล้ฉัน</h3>
            <p className="text-xs text-gray-500">เปิดใช้ Location เพื่อดูป้ายใกล้เคียง</p>
          </div>
        </aside>

        {/* Map */}
        <main className="flex-1 relative">
          <BusMap buses={buses} />
        </main>

        {/* Right Panel */}
        <aside className="w-72 p-3 overflow-y-auto bg-[#0f0f1a] border-l border-[#1e1e2e]">
          <SustainabilityPanel />
        </aside>
      </div>

      {/* Bottom Bar */}
      <BusLineCards buses={buses} />
    </div>
  );
}
