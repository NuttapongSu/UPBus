'use client';
import useSWR from 'swr';
import { getSustainability, SustainabilityData } from '@/lib/api';
import StatCard from '@/components/ui/StatCard';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

function fmtDay(day: string) {
  return String(day).slice(5, 10);
}

export default function SustainabilityPanel() {
  const { data } = useSWR<SustainabilityData>('/api/sustainability', getSustainability, {
    refreshInterval: 30000,
  });

  const today   = data?.today;
  const weekly  = data?.weekly || [];

  const co2Saved    = today?.co2_saved_kg  ?? 0;
  const kwhUsed     = today?.kwh_used      ?? 0;
  const kmTotal     = today?.km_total      ?? 0;
  const trees       = today?.trees_equiv   ?? 0;
  const evCO2       = today?.ev_co2_kg      ?? 0;
  const dieselCO2   = today?.diesel_co2_kg ?? 0;
  const busesActive = today?.buses_active  ?? 0;
  const co2PerKm  = kmTotal > 0 ? co2Saved / kmTotal : 0;

  // % ที่ EV ปล่อยน้อยกว่า NGV (clamp 0–100 กรณีรถชาร์จ/จอดทำให้ EV > NGV)
  const savingPct = dieselCO2 > 0 ? Math.max(0, Math.round((1 - evCO2 / dieselCO2) * 100)) : 0;

  const chartData = {
    labels: weekly.map(w => fmtDay(w.day)),
    datasets: [{
      label: 'CO₂ (kg)',
      data: weekly.map(w => w.co2),
      backgroundColor: '#2ecc71',
      borderRadius: 4,
    }],
  };

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
        Sustainability Dashboard
      </h3>

      {/* CO₂ หลัก */}
      <div className="bg-[#1a3a1a] border border-[#2ecc71] rounded-xl p-4">
        <p className="text-xs text-gray-400">CO₂ ลดได้วันนี้</p>
        <p className="text-4xl font-bold text-[#2ecc71]">
          <AnimatedNumber value={co2Saved} format={(n) => n.toFixed(2)} />
          {' '}<span className="text-lg">kg</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">เป้าหมาย 150 kg/day</p>
      </div>

      {/* stats row */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="ต้นไม้/วัน"  numericValue={trees}  color="#2ecc71" />
        <StatCard label="คัน ลดได้"   numericValue={busesActive} color="#f39c12" />
        <StatCard label="PM2.5"        value="-62%"          color="#3498db" />
      </div>

      {/* Energy + Distance */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          label="พลังงานที่ใช้"
          numericValue={kwhUsed}
          unit="kWh"
          color="#f39c12"
        />
        <StatCard
          label="ระยะทางรวม"
          numericValue={kmTotal}
          unit="km"
          sub={`${co2PerKm.toFixed(4)} kg CO₂/km`}
          color="#3498db"
        />
      </div>

      {/* EV vs NGV comparison */}
      <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-3">
        <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">
          EV UP BUS VS DIESEL UP BUS
        </p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="bg-[#0d1f0d] rounded-lg p-2">
            <p className="text-[10px] text-gray-500 mb-1">EV (ไฟฟ้ากริด)</p>
            <p className="text-lg font-bold text-[#2ecc71]">
              <AnimatedNumber value={evCO2} format={(n) => n.toFixed(2)} />
            </p>
            <p className="text-[10px] text-gray-500">kgCO₂e</p>
          </div>
          <div className="bg-[#1f1400] rounded-lg p-2">
            <p className="text-[10px] text-gray-500 mb-1">Diesel B7 (ระยะเดียวกัน)</p>
            <p className="text-lg font-bold text-[#e67e22]">
              <AnimatedNumber value={dieselCO2} format={(n) => n.toFixed(2)} />
            </p>
            <p className="text-[10px] text-gray-500">kgCO₂e</p>
          </div>
        </div>
        {/* saving bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#2a2a4a] rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-[#2ecc71] rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, savingPct)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-[#2ecc71] w-12 text-right">
            -{savingPct}%
          </span>
        </div>
        <p className="text-[10px] text-gray-600 mt-1">
          EF กริดไทย 0.4750 kgCO₂e/kWh · Diesel B7 0.40 L/km × 2.679 kgCO₂e/L
        </p>
      </div>

      {/* CO₂ chart */}
      <div className="bg-[#1a1a2e] rounded-xl p-3">
        <p className="text-xs text-gray-400 mb-2">CO₂ รายวัน (สัปดาห์นี้)</p>
        <Bar
          data={chartData}
          options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: '#888' } },
              y: { ticks: { color: '#888' } },
            },
          }}
        />
      </div>
    </div>
  );
}
