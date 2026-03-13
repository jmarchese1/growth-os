'use client';

interface ModuleStatusProps {
  name: string;
  active: boolean;
  description: string;
  icon: React.ReactNode;
}

export default function ModuleStatus({ name, active, description, icon }: ModuleStatusProps) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
      active
        ? 'bg-emerald-500/5 border-emerald-500/15 hover:border-emerald-500/30'
        : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
    }`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.04] text-slate-600'
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${active ? 'text-white' : 'text-slate-500'}`}>{name}</p>
        <p className="text-xs text-slate-600 mt-0.5">{description}</p>
      </div>
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-slate-700'}`} />
    </div>
  );
}
