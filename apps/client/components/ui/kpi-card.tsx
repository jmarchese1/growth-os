'use client';

interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'violet' | 'emerald' | 'sky' | 'amber' | 'rose' | 'teal';
  trend?: { value: string; positive: boolean };
}

// Full static classes for Tailwind JIT to detect
const colorMap = {
  violet:  { card: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200/60 dark:border-violet-500/20', text: 'text-violet-700 dark:text-violet-300', icon: 'text-violet-500 dark:text-violet-400' },
  emerald: { card: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/60 dark:border-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300', icon: 'text-emerald-500 dark:text-emerald-400' },
  sky:     { card: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200/60 dark:border-sky-500/20', text: 'text-sky-700 dark:text-sky-300', icon: 'text-sky-500 dark:text-sky-400' },
  amber:   { card: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200/60 dark:border-amber-500/20', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-500 dark:text-amber-400' },
  rose:    { card: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200/60 dark:border-rose-500/20', text: 'text-rose-700 dark:text-rose-300', icon: 'text-rose-500 dark:text-rose-400' },
  teal:    { card: 'bg-teal-50 dark:bg-teal-500/10 border-teal-200/60 dark:border-teal-500/20', text: 'text-teal-700 dark:text-teal-300', icon: 'text-teal-500 dark:text-teal-400' },
};

export default function KpiCard({ label, value, subtitle, icon, color = 'violet', trend }: KpiCardProps) {
  const c = colorMap[color];
  return (
    <div className={`${c.card} border rounded-xl p-5 glow-card dark:backdrop-blur-sm`}>
      <div className="flex items-start justify-between mb-3">
        <span className={c.icon}>{icon}</span>
        {trend && (
          <span className={`text-xs font-medium ${trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {trend.positive ? '+' : ''}{trend.value}
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
      {subtitle && <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}
