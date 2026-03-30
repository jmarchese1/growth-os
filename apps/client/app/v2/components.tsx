'use client';

import Link from 'next/link';

/* ── Shared V2 UI Components ────────────────────────────── */

export function PageShell({ title, subtitle, actions, children }: {
  title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-white">{title}</h2>
      {action}
    </div>
  );
}

export function Badge({ children, color = 'slate' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    violet: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    sky: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
    red: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400',
    slate: 'bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${colors[color] ?? colors.slate}`}>
      {children}
    </span>
  );
}

export function Button({ children, href, onClick, variant = 'primary', size = 'md', className = '' }: {
  children: React.ReactNode; href?: string; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost'; size?: 'sm' | 'md'; className?: string;
}) {
  const base = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200';
  const sizes = { sm: 'px-3 py-1.5 text-xs gap-1.5', md: 'px-4 py-2 text-sm gap-2' };
  const variants = {
    primary: 'bg-violet-600 text-white hover:bg-violet-500 shadow-sm shadow-violet-600/20',
    secondary: 'bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.08]',
    ghost: 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]',
  };
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`;

  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button onClick={onClick} className={cls}>{children}</button>;
}

export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-400 mb-4">{icon}</div>}
      <h3 className="text-sm font-semibold text-slate-700 dark:text-white mb-1">{title}</h3>
      {description && <p className="text-xs text-slate-400 max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
  );
}
