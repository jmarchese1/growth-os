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
        ? 'bg-emerald-50 border-emerald-200/60 hover:border-emerald-300'
        : 'bg-white border-slate-200/60 hover:border-slate-300'
    }`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${active ? 'text-slate-900' : 'text-slate-500'}`}>{name}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'bg-slate-300'}`} />
    </div>
  );
}
