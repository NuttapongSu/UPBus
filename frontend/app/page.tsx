'use client';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { getBuses, BusData } from '@/lib/api';
import SystemOverview from '@/components/Dashboard/SystemOverview';
import SustainabilityPanel from '@/components/Dashboard/SustainabilityPanel';
import BusLineCards from '@/components/Dashboard/BusLineCards';
import NearbyStops from '@/components/Dashboard/NearbyStops';
import BusApproachAlerts from '@/components/Dashboard/BusApproachAlerts';
import BusRequestModal from '@/components/Dashboard/BusRequestModal';
import LineDetailPanel from '@/components/Dashboard/LineDetailPanel';
import BusDetailPanel from '@/components/Dashboard/BusDetailPanel';

// Dynamic import เพราะ Leaflet ต้องการ window
const BusMap = dynamic(() => import('@/components/Map/BusMap'), { ssr: false });

export default function HomePage() {
  const { data: buses = [] } = useSWR<BusData[]>('/api/buses', getBuses, {
    refreshInterval: 10000,
  });

  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [selectedBus, setSelectedBus] = useState<string | null>(null);
  const [showRequest, setShowRequest] = useState(false);
  const [now, setNow] = useState('');
  useEffect(() => {
    const fmt = () => new Date().toLocaleString('th-TH', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    setNow(fmt());
    const id = setInterval(() => setNow(fmt()), 1000);
    return () => clearInterval(id);
  }, []);

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
        <button
          onClick={() => setShowRequest(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-[#9b59b6] bg-[#9b59b6] text-white hover:bg-[#8e44ad] transition-colors shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          ขอรถ
        </button>
        <a
          href="http://localhost:5000/admin/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-[#9b59b6] text-[#9b59b6] hover:bg-[#9b59b6] hover:text-white transition-colors shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Admin
        </a>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Panel */}
        <aside className="w-64 flex flex-col gap-3 p-3 overflow-y-auto bg-[#0f0f1a] border-r border-[#1e1e2e]">
          <SystemOverview buses={buses} onSelectBus={busId => setSelectedBus(busId)} />
          <NearbyStops />
          <BusApproachAlerts buses={buses} />
        </aside>

        {/* Map */}
        <main className="flex-1 relative h-full">
          <BusMap buses={selectedLine ? buses.filter(b => b.color === selectedLine) : buses} selectedLine={selectedLine} selectedBus={selectedBus} />
        </main>

        {/* Right Panel */}
        <aside className="w-72 p-3 overflow-y-auto bg-[#0f0f1a] border-l border-[#1e1e2e]">
          {selectedBus ? (
            <BusDetailPanel
              busId={selectedBus}
              onBack={() => setSelectedBus(null)}
            />
          ) : selectedLine ? (
            <LineDetailPanel
              buses={buses}
              selectedLine={selectedLine}
              onClose={() => setSelectedLine(null)}
              onSelectBus={busId => setSelectedBus(busId)}
            />
          ) : (
            <SustainabilityPanel />
          )}
        </aside>
      </div>

      {/* Bottom Bar */}
      <BusLineCards buses={buses} selectedLine={selectedLine} onSelectLine={setSelectedLine} />

      {/* Modal จองรถ */}
      {showRequest && <BusRequestModal onClose={() => setShowRequest(false)} />}
    </div>
  );
}
