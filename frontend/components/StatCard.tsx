import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}

export default function StatCard({ label, value, sub, valueClass = "text-white text-xl" }: StatCardProps) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 transition duration-200 hover:border-zinc-700">
      <div className="text-xs text-zinc-400 mb-1 uppercase tracking-wide">{label}</div>
      <div className={`font-semibold tabular-nums ${valueClass}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
}
