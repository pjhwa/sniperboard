import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}

export default function StatCard({ label, value, sub, valueClass = "text-white text-xl" }: StatCardProps) {
  // Parse dynamic color states from valueClass to set custom accent lines and shadows
  let borderAccent = "border-t-[3px] border-t-zinc-700/60";
  let glowEffect = "";

  if (valueClass.includes("text-emerald-400") || valueClass.includes("text-green-400")) {
    borderAccent = "border-t-[3px] border-t-emerald-500";
    glowEffect = "glow-green";
  } else if (valueClass.includes("text-red-400") || valueClass.includes("text-rose-500")) {
    borderAccent = "border-t-[3px] border-t-red-500";
    glowEffect = "glow-red";
  } else if (valueClass.includes("text-orange-400") || valueClass.includes("text-amber-500")) {
    borderAccent = "border-t-[3px] border-t-orange-500";
    glowEffect = "glow-amber";
  } else if (valueClass.includes("text-amber-400") || valueClass.includes("text-yellow-400")) {
    borderAccent = "border-t-[3px] border-t-amber-400";
    glowEffect = "glow-amber";
  } else if (valueClass.includes("text-blue-400") || valueClass.includes("text-cyan-400") || valueClass.includes("text-indigo-400")) {
    borderAccent = "border-t-[3px] border-t-blue-500";
  }

  return (
    <div className={`glass-card glass-card-hover rounded-2xl p-4.5 transition-all duration-300 ${borderAccent} ${glowEffect}`}>
      <div className="text-[11px] font-bold text-zinc-500 mb-1.5 uppercase tracking-widest">{label}</div>
      <div className={`font-bold tabular-nums tracking-tight ${valueClass}`}>{value}</div>
      {sub && (
        <div className="text-xs text-zinc-400 font-medium mt-1 flex items-center gap-1">
          {sub.includes("⚠") && <span className="text-orange-500">▲</span>}
          <span>{sub}</span>
        </div>
      )}
    </div>
  );
}
