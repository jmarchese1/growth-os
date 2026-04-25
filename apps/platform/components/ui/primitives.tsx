/**
 * Embedo design system — shared primitives.
 * Apple-styled clean light theme. Sentence-case labels, no Roman numerals,
 * no italic Fraunces, soft card shadows, rounded corners, generous padding.
 */

import { clsx } from 'clsx';
import type { ReactNode } from 'react';

/* ─────────────────────────────────────────────────────────────
   Section header — title + subtitle + optional action
   (numeral prop kept for backward compat but no longer rendered)
   ───────────────────────────────────────────────────────────── */

export function SectionHeader({
  numeral: _numeral,
  title,
  subtitle,
  action,
  className,
}: {
  numeral?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={clsx('flex items-end justify-between pb-4', className)}>
      <div>
        <h2 className="text-paper text-[22px] font-semibold leading-tight tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-[13px] text-paper-3">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────
   Hero metric — large clean tabular sans
   ───────────────────────────────────────────────────────────── */

export function HeroMetric({
  label,
  value,
  unit,
  caption,
  size = 'lg',
}: {
  label: string;
  value: string | number;
  unit?: string;
  caption?: string;
  size?: 'lg' | 'md' | 'sm';
}) {
  const sizeClass =
    size === 'lg' ? 'text-hero' : size === 'md' ? 'text-hero-sm' : 'text-hero-xs';

  return (
    <div className="flex flex-col gap-2">
      <span className="label">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className={clsx('hero-num text-paper', sizeClass)}>{value}</span>
        {unit && (
          <span className="text-paper-3 text-[20px] font-light tracking-tight">{unit}</span>
        )}
      </div>
      {caption && <span className="text-[12px] text-paper-3">{caption}</span>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Metric block — compact tabular metric
   ───────────────────────────────────────────────────────────── */

export function MetricBlock({
  label,
  value,
  delta,
  trend,
  suffix,
}: {
  label: string;
  value: string | number;
  delta?: string;
  trend?: 'up' | 'down' | 'flat';
  suffix?: string;
}) {
  const trendColor =
    trend === 'up' ? 'text-signal' : trend === 'down' ? 'text-ember' : 'text-paper-3';

  return (
    <div className="flex flex-col gap-1.5 py-5 px-5 border-r border-rule last:border-r-0">
      <span className="label-sm">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-paper nums text-[26px] font-semibold leading-none tracking-tight">
          {value}
        </span>
        {suffix && <span className="text-paper-3 text-[12px]">{suffix}</span>}
      </div>
      {delta && (
        <span className={clsx('text-[12px]', trendColor)}>
          {delta}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Live badge — Apple pill
   ───────────────────────────────────────────────────────────── */

export function LiveBadge({
  active,
  label,
}: {
  active: boolean;
  label?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium',
        active ? 'bg-signal/10 text-signal' : 'bg-ink-2 text-paper-3',
      )}
    >
      <span className="relative inline-flex w-1.5 h-1.5">
        <span
          className={clsx(
            'absolute inset-0 rounded-full',
            active ? 'bg-signal signal-dot' : 'bg-paper-4',
          )}
        />
      </span>
      <span>{label ?? (active ? 'Live' : 'Idle')}</span>
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   Status pill
   ───────────────────────────────────────────────────────────── */

export function StatusDot({
  status,
  children,
}: {
  status: 'active' | 'warn' | 'idle' | 'fire' | 'sky';
  children: ReactNode;
}) {
  return (
    <span className={clsx('status-sq', `status-${status}`)}>
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   Panel — Apple-style card
   ───────────────────────────────────────────────────────────── */

export function Panel({
  children,
  className,
  title,
  numeral: _numeral,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  numeral?: string;
  action?: ReactNode;
}) {
  return (
    <section className={clsx('panel', className)}>
      {title && (
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-rule">
          <span className="text-paper text-[13px] font-semibold tracking-tight">
            {title}
          </span>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Hairline rule
   ───────────────────────────────────────────────────────────── */

export function Hairline({ className }: { className?: string }) {
  return <hr className={clsx('border-0 border-t border-rule', className)} />;
}

/* ─────────────────────────────────────────────────────────────
   Key-value row — clean spaced layout (no dotted line)
   ───────────────────────────────────────────────────────────── */

export function DottedRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-[13px] text-paper-3">
        {label}
      </span>
      <span
        className={clsx(
          'text-[13px] nums',
          accent ? 'text-signal font-semibold' : 'text-paper font-medium',
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Button — Apple-style
   ───────────────────────────────────────────────────────────── */

export function Button({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'ghost';
  size?: 'sm' | 'md';
}) {
  return (
    <button
      className={clsx(
        'btn',
        variant === 'primary' && 'btn-primary',
        variant === 'ghost' && 'btn-ghost',
        size === 'sm' && '!py-1.5 !px-3 !text-[12px]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Funnel bar — clean Apple style
   ───────────────────────────────────────────────────────────── */

export function FunnelBar({
  label,
  value,
  max,
  accent,
}: {
  label: string;
  value: number;
  max: number;
  accent?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <div className="flex items-center gap-4 py-2">
      <span className="w-32 text-[12px] text-paper-3 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full overflow-hidden bg-ink-2">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-700',
            accent ? 'bg-signal' : 'bg-paper-3',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[13px] nums text-paper font-medium w-16 text-right shrink-0">
        {value.toLocaleString()}
      </span>
      <span className="text-[12px] text-paper-3 w-10 text-right shrink-0">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}
