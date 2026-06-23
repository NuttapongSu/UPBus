'use client';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { useState, useEffect, useMemo } from 'react';
import { getBuses, BusData } from '@/lib/api';
import SystemOverview from '@/components/Dashboard/SystemOverview';
import SustainabilityPanel from '@/components/Dashboard/SustainabilityPanel';
import BusLineCards from '@/components/Dashboard/BusLineCards';
import NearbyStops from '@/components/Dashboard/NearbyStops';
import BusApproachAlerts from '@/components/Dashboard/BusApproachAlerts';
import BusRequestModal from '@/components/Dashboard/BusRequestModal';
import LineDetailPanel from '@/components/Dashboard/LineDetailPanel';
import BusDetailPanel from '@/components/Dashboard/BusDetailPanel';

const BusMap = dynamic(() => import('@/components/Map/BusMap'), { ssr: false });

const LINES = [
  { key: 'Green', name: 'สายหน้ามอ',    color: '#2ecc71' },
  { key: 'Blue',  name: 'สายประตูสาม',  color: '#3498db' },
  { key: 'Red',   name: 'สายหอพัก',     color: '#e74c3c' },
];

export default function HomePage() {
  const { data: buses = [] } = useSWR<BusData[]>('/api/buses', getBuses, {
    refreshInterval: 10000,
  });

  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [selectedBus,  setSelectedBus]  = useState<string | null>(null);
  const [busFilter, setBusFilter] = useState<'charging' | 'available' | null>(null);
  const [showRequest,     setShowRequest]     = useState(false);
  const [leftDrawerOpen,  setLeftDrawerOpen]  = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);

  function handleBusFilter(filter: 'charging' | 'available') {
    if (busFilter !== filter) setSelectedLine(null);
    setBusFilter(prev => prev === filter ? null : filter);
  }

  // Auto-open right drawer (mobile) when bus/line selected
  useEffect(() => {
    if (selectedBus || selectedLine) setRightDrawerOpen(true);
    else setRightDrawerOpen(false);
  }, [selectedBus, selectedLine]);

  function handleRightDrawerClose() {
    setRightDrawerOpen(false);
    setSelectedBus(null);
    setSelectedLine(null);
  }

  const displayBuses = useMemo(() => {
    let result = buses;
    if (selectedLine) result = result.filter(b => b.color === selectedLine);
    if (busFilter === 'charging')  result = result.filter(b => b.acc === 0);
    if (busFilter === 'available') result = result.filter(b => b.color === 'Purple' && !b.department);
    return result;
  }, [buses, selectedLine, busFilter]);

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

  const rightPanelContent = selectedBus ? (
    <BusDetailPanel busId={selectedBus} onBack={() => setSelectedBus(null)} />
  ) : selectedLine ? (
    <LineDetailPanel
      buses={buses}
      selectedLine={selectedLine}
      onClose={() => setSelectedLine(null)}
      onSelectBus={busId => setSelectedBus(busId)}
    />
  ) : (
    <SustainabilityPanel />
  );

  const leftPanelContent = (
    <>
      <SystemOverview
        buses={buses}
        onSelectBus={busId => setSelectedBus(busId)}
        busFilter={busFilter}
        onFilterBuses={handleBusFilter}
      />
      <NearbyStops />
      <BusApproachAlerts buses={buses} />
    </>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-[#0f0f1a] border-b border-[#1e1e2e] shrink-0">
        <div className="shrink-0">
          <h1 className="text-base md:text-lg font-bold leading-tight">UP Smart Transit</h1>
          <p className="text-[10px] text-gray-400 hidden sm:block">ระบบขนส่งอัจฉริยะเพื่อมหาวิทยาลัยสีเขียว</p>
        </div>
        <input
          className="hidden md:flex flex-1 mx-4 bg-[#1a1a2e] border border-[#2a2a4a] rounded-full px-4 py-2 text-sm outline-none"
          placeholder="ค้นหาเส้นทาง/ป้ายรถ/จุดหมาย..."
        />
        <p className="hidden lg:block text-sm text-gray-300 ml-auto shrink-0">อัปเดต {now}</p>
        <div className="flex items-center gap-2 ml-auto md:ml-0">
          <button
            onClick={() => setShowRequest(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#9b59b6] bg-[#9b59b6] text-white hover:bg-[#8e44ad] transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">ขอรถ</span>
          </button>
          <a
            href="https://bustransit.up.ac.th/admin/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#9b59b6] text-[#9b59b6] hover:bg-[#9b59b6] hover:text-white transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden sm:inline">Admin</span>
          </a>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Left Sidebar — desktop only (in-flow) */}
        <aside className="hidden lg:flex w-64 flex-col gap-3 p-3 overflow-y-auto bg-[#0f0f1a] border-r border-[#1e1e2e] shrink-0">
          {leftPanelContent}
        </aside>

        {/* Map */}
        <main className="flex-1 relative h-full">
          <BusMap buses={displayBuses} selectedLine={selectedLine} selectedBus={selectedBus} />

          {/* Floating line filter — mobile only, top-right of map */}
          <div className="md:hidden absolute top-4 right-4 z-[1050] flex flex-col gap-2">
            <button
              onClick={() => setSelectedLine(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg transition-all border backdrop-blur-sm"
              style={{
                background: selectedLine === null ? '#2a2a4a' : 'rgba(15,15,26,0.85)',
                borderColor: selectedLine === null ? '#888' : '#2a2a4a',
                color:       selectedLine === null ? '#fff'  : '#888',
              }}
            >
              ทุกสาย
            </button>
            {LINES.map(line => (
              <button
                key={line.key}
                onClick={() => setSelectedLine(selectedLine === line.key ? null : line.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg transition-all border backdrop-blur-sm"
                style={{
                  background:  selectedLine === line.key ? `${line.color}22` : 'rgba(15,15,26,0.85)',
                  borderColor: selectedLine === line.key ? line.color : '#2a2a4a',
                  color:       selectedLine === line.key ? line.color : '#888',
                }}
              >
                ● {line.name}
              </button>
            ))}
          </div>

        </main>

        {/* Right Sidebar — tablet+ (in-flow) */}
        <aside className="hidden md:flex w-72 flex-col p-3 overflow-y-auto bg-[#0f0f1a] border-l border-[#1e1e2e] shrink-0">
          {rightPanelContent}
        </aside>

        {/* FAB — outside <main> to avoid Leaflet touch event capture */}
        <button
          onClick={() => setLeftDrawerOpen(true)}
          className="lg:hidden absolute bottom-4 left-4 z-[1050] w-12 h-12 rounded-full bg-[#1a1a2e] border border-[#2a2a4a] shadow-lg flex items-center justify-center text-white hover:bg-[#2a2a4a] transition-colors"
          aria-label="ภาพรวมระบบ"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Backdrop for left drawer (mobile + tablet) */}
        {leftDrawerOpen && (
          <div
            className="lg:hidden absolute inset-0 bg-black/40 z-40"
            onClick={() => setLeftDrawerOpen(false)}
          />
        )}

        {/* Backdrop for right drawer (mobile only) */}
        {rightDrawerOpen && (
          <div
            className="md:hidden absolute inset-0 bg-black/40 z-40"
            onClick={handleRightDrawerClose}
          />
        )}

        {/* Left Drawer — slides from left, mobile + tablet */}
        <aside
          className={`lg:hidden absolute top-0 left-0 h-full w-64 z-50 flex flex-col gap-3 p-3 overflow-y-auto bg-[#0f0f1a] border-r border-[#1e1e2e] transform transition-transform duration-300 ease-out ${
            leftDrawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {leftPanelContent}
        </aside>

        {/* Right Drawer — slides from right, mobile only */}
        <aside
          className={`md:hidden absolute top-0 right-0 h-full w-72 z-50 flex flex-col p-3 overflow-y-auto bg-[#0f0f1a] border-l border-[#1e1e2e] transform transition-transform duration-300 ease-out ${
            rightDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {rightPanelContent}
        </aside>
      </div>

      {/* Bottom Bar — tablet+ only */}
      <div className="hidden md:block shrink-0">
        <BusLineCards buses={buses} selectedLine={selectedLine} onSelectLine={setSelectedLine} />
      </div>

      {/* Modal จองรถ */}
      {showRequest && <BusRequestModal onClose={() => setShowRequest(false)} />}
    </div>
  );
}
