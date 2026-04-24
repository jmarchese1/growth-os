/**
 * Operator design system — shared primitives.
 *
 * Usage patterns baked in:
 *   <SectionHeader numeral="I" title="Overview" meta="Live" />
 *   <MetricBlock label="Prospects" value={862} delta="+24" />
 *   <HeroMetric label="Reply rate" value="8.4" unit="%" />
 *   <StatusDot status="active" />
 *   <LiveBadge active />
 *   <Panel>...</Panel>
 */

import { clsx } from 'clsx';
import type { ReactNode } from 'react';

/* ─────────────────────────────────────────────────────────────
   Section header — Roman numeral + title + optional meta right
   ───────────────────────────────────────────────────────────── */

export function SectionHeader({
  numeral,
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
    <header className={clsx('flex items-end justify-between pb-5 border-b border-rule', className)}>
      <div className="flex items-end gap-5">
        {numeral && (
          <span className="font-mono text-[10px] tracking-mega text-paper-4 leading-none pb-1.5">
            § {numeral.padStart(2, '0')}
          </span>
        )}
        <div>
          <h2 className="font-display text-[34px] leading-none tracking-tight text-paper font-light">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1.5 font-mono text-[11px] tracking-micro uppercase text-paper-3">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────
   Hero metric — large italic serif number
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
    <div className="flex flex-col gap-3">
      <span className="label">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className={clsx('hero-num text-paper', sizeClass)}>{value}</span>
        {unit && (
          <span className="font-display italic text-paper-3 text-3xl font-light">{unit}</span>
        )}
      </div>
      {caption && <span className="font-mono text-[11px] text-paper-4 tracking-micro">{caption}</span>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Metric block — compact tabular metric, dense layouts
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
    trend === 'up' ? 'text-signal' : trend === 'down' ? 'text-ember' : 'text-paper-4';

  return (
    <div className="flex flex-col gap-1.5 py-4 px-5 hairline-b border-0 border-r border-rule last:border-r-0">
      <span className="label-sm">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display italic font-light text-paper nums text-[32px] leading-none tracking-tight">
          {value}
        </span>
        {suffix && <span className="font-mono text-paper-3 text-xs">{suffix}</span>}
      </div>
      {delta && (
        <span className={clsx('font-mono text-[10px] tracking-micro', trendColor)}>
          {delta}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Live badge — pulsing dot + mono label
   ───────────────────────────────────────────────────────────── */

export function LiveBadge({
  active,
  label,
}: {
  active: boolean;
  label?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[10px] tracking-mega uppercase">
      <span className="relative inline-flex w-2 h-2">
        <span className={clsx('absolute inset-0', active ? 'bg-signal signal-dot' : 'bg-paper-4')} />
      </span>
      <span className={active ? 'text-signal' : 'text-paper-3'}>
        {label ?? (active ? 'Live' : 'Idle')}
      </span>
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   Status dot — colored square + mono text
   ───────────────────────────────────────────────────────────── */

export function StatusDot({
  status,
  children,
}: {
  status: 'active' | 'warn' | 'idle' | 'fire' | 'sky';
  children: ReactNode;
}) {
  return (
    <span className={clsx('status-sq', `status-${status}`, 'text-paper-2')}>
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   Panel — a raised surface with hairline border
   ───────────────────────────────────────────────────────────── */

export function Panel({
  children,
  className,
  title,
  numeral,
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
        <header className="flex items-center justify-between px-5 py-3.5 hairline-b">
          <div className="flex items-center gap-3.5">
            {numeral && (
              <span className="font-mono text-[10px] tracking-mega text-paper-4">
                § {numeral.padStart(2, '0')}
              </span>
            )}
            <span className="font-mono text-[11px] tracking-micro uppercase text-paper-2">
              {title}
            </span>
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Hairline — horizontal rule
   ───────────────────────────────────────────────────────────── */

export function Hairline({ className }: { className?: string }) {
  return <hr className={clsx('border-0 border-t border-rule', className)} />;
}

/* ─────────────────────────────────────────────────────────────
   Dotted row — label on left, value on right, dotted leader
   Used for compact key-value lists (financial-report style).
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
    <div className="dotted-leader py-2">
      <span className="font-mono text-[11px] tracking-micro uppercase text-paper-3 shrink-0">
        {label}
      </span>
      <span
        className={clsx(
          'font-mono text-sm nums shrink-0',
          accent ? 'text-signal font-semibold' : 'text-paper'
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Button — terminal-style
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
        size === 'sm' && '!py-1.5 !px-3 !text-[10px]',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Funnel bar — horizontal progress bar with mono count
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
      <span className="w-28 font-mono text-[10px] tracking-micro uppercase text-paper-3 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-6 border border-rule relative overflow-hidden bg-ink-2">
        <div
          className={clsx(
            'h-full transition-all duration-700',
            accent ? 'bg-signal' : 'bg-paper-3'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-sm nums text-paper w-16 text-right shrink-0">
        {value.toLocaleString()}
      </span>
      <span className="font-mono text-[10px] text-paper-4 w-10 text-right shrink-0">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}
