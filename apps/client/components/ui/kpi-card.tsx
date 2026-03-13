'use client';

interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'violet' | 'emerald' | 'sky' | 'amber' | 'rose' | 'teal';
  trend?: { value: string; positive: boolean };
}

const colorMap = {
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200/60',  text: 'text-violet-700',  icon: 'text-violet-500' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200/60', text: 'text-emerald-700', icon: 'text-emerald-500' },
  sky:     { bg: 'bg-sky-50',     border: 'border-sky-200/60',     text: 'text-sky-700',     icon: 'text-sky-500' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200/60',   text: 'text-amber-700',   icon: 'text-amber-500' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200/60',    text: 'text-rose-700',    icon: 'text-rose-500' },
  teal:    { bg: 'bg-teal-50',    border: 'border-teal-200/60',    text: 'text-teal-700',    icon: 'text-teal-500' },
};

export default function KpiCard({ label, value, subtitle, icon, color = 'violet', trend }: KpiCardProps) {
  const c = colorMap[color];
  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-5 glow-card`}>
      <div className="flex items-start justify-between mb-3">
        <span className={`${c.icon}`}>{icon}</span>
        {trend && (
          <span className={`text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend.positive ? '+' : ''}{trend.value}
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}
