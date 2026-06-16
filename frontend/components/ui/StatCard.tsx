interface Props {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  color?: string;
}

export default function StatCard({ label, value, unit, sub, color = '#2ecc71' }: Props) {
  return (
    <div className="bg-[#1a1a2e] rounded-xl p-3 border border-[#2a2a4a]">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>
        {value} <span className="text-sm font-normal text-gray-300">{unit}</span>
      </p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
