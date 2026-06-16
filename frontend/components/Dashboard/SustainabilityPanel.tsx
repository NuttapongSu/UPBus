'use client';
import useSWR from 'swr';
import { getSustainability, SustainabilityData } from '@/lib/api';
import StatCard from '@/components/ui/StatCard';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

export default function SustainabilityPanel() {
  const { data } = useSWR<SustainabilityData>('/api/sustainability', getSustainability, {
    refreshInterval: 60000, // refresh ทุก 1 นาที
  });

  const today = data?.today;
  const weekly = data?.weekly || [];

  const chartData = {
    labels: weekly.map(w => w.day.slice(5)), // MM-DD
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
          {today?.co2_saved_kg?.toFixed(0) ?? '—'} <span className="text-lg">kg</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">เป้าหมาย 150 kg/day</p>
      </div>

      {/* stats row */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="ต้นไม้/วัน" value={today?.trees_equiv?.toFixed(0) ?? '—'} color="#2ecc71" />
        <StatCard label="คัน ลดได้" value="80" color="#f39c12" />
        <StatCard label="PM2.5" value="-62%" color="#3498db" />
      </div>

      {/* Energy */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          label="พลังงานที่ใช้"
          value={today?.kwh_used?.toFixed(0) ?? '—'}
          unit="kWh"
          sub="67% โซลาร์เซลล์"
          color="#f39c12"
        />
        <StatCard
          label="ระยะทางรวม"
          value={today?.km_total?.toFixed(0) ?? '—'}
          unit="km"
          sub={`${((today?.co2_saved_kg ?? 0) / Math.max(1, today?.km_total ?? 1)).toFixed(2)} kg CO₂/km`}
          color="#3498db"
        />
      </div>

      {/* CO₂ chart */}
      <div className="bg-[#1a1a2e] rounded-xl p-3">
        <p className="text-xs text-gray-400 mb-2">CO₂ รายวัน (สัปดาห์นี้)</p>
        <Bar data={chartData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#888' } }, y: { ticks: { color: '#888' } } } }} />
      </div>
    </div>
  );
}
