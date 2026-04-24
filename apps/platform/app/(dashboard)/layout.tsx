'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard, Building2, BarChart3, Calendar, Crosshair,
  Mail, Users, Instagram, FileText, Download, Globe, Settings as SettingsIcon,
  Plug, LogOut, ChevronLeft, Command,
} from 'lucide-react';
import NotificationBell from '../../components/NotificationBell';
import { useSession } from '../../components/auth/session-provider';
import { CubeyChat } from '../../components/ui/cubey-chat';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';

const PLATFORM_API = process.env['NEXT_PUBLIC_API_URL'] ?? 'https://embedoapi-production.up.railway.app';

type NavItemT = { href: string; label: string; code: string; icon: React.ComponentType<{ className?: string }> };
type NavSection = { numeral: string; section: string; items: NavItemT[] };

const NAV: NavSection[] = [
  {
    numeral: 'I',
    section: 'Overview',
    items: [
      { href: '/',           label: 'Dashboard',  code: 'DSH', icon: LayoutDashboard },
      { href: '/businesses', label: 'Businesses', code: 'BIZ', icon: Building2 },
      { href: '/analytics',  label: 'Analytics',  code: 'ANL', icon: BarChart3 },
      { href: '/calendar',   label: 'Calendar',   code: 'CAL', icon: Calendar },
    ],
  },
  {
    numeral: 'II',
    section: 'Outbound',
    items: [
      { href: '/campaigns', label: 'Campaigns', code: 'CMP', icon: Crosshair },
      { href: '/emails',    label: 'Emails',    code: 'EML', icon: Mail },
      { href: '/leads',     label: 'Leads',     code: 'LED', icon: Users },
      { href: '/instagram', label: 'Instagram', code: 'IG',  icon: Instagram },
    ],
  },
  {
    numeral: 'III',
    section: 'Tools',
    items: [
      { href: '/email-templates', label: 'Templates', code: 'TPL', icon: FileText },
      { href: '/export',          label: 'Export',    code: 'EXP', icon: Download },
      { href: '/domains',         label: 'Domains',   code: 'DOM', icon: Globe },
    ],
  },
  {
    numeral: 'IV',
    section: 'Account',
    items: [
      { href: '/settings',     label: 'Settings',     code: 'STG', icon: SettingsIcon },
      { href: '/integrations', label: 'Integrations', code: 'INT', icon: Plug },
    ],
  },
];

const DEFAULT_WIDTH = 248;
const COLLAPSED_WIDTH = 60;
const MIN_EXPANDED = 200;
const MAX_WIDTH = 340;
const SNAP_THRESHOLD = 130;

function NavItem({
  href, label, code, icon: Icon, isActive, collapsed,
}: NavItemT & { isActive: boolean; collapsed: boolean }) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center transition-all duration-150 ${
        collapsed ? 'justify-center h-10 w-10 mx-auto' : 'h-9 pl-4 pr-3 gap-3'
      } ${
        isActive
          ? 'text-paper bg-ink-2'
          : 'text-paper-3 hover:text-paper hover:bg-ink-2/60'
      }`}
    >
      {/* Active left rail */}
      {isActive && !collapsed && (
        <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-signal" />
      )}
      <Icon className={`w-[14px] h-[14px] shrink-0 ${isActive ? 'text-signal' : ''}`} />
      {!collapsed && (
        <>
          <span className="text-[13px] tracking-tight">{label}</span>
          <span className={`ml-auto font-mono text-[9px] tracking-mega ${isActive ? 'text-paper-3' : 'text-paper-4'}`}>
            {code}
          </span>
        </>
      )}
    </Link>
  );
}

function Sidebar({
  width, collapsed, onDragStart, onToggle, userEmail, userInitial, onLogout,
}: {
  width: number;
  collapsed: boolean;
  onDragStart: (e: React.MouseEvent) => void;
  onToggle: () => void;
  userEmail: string | null;
  userInitial: string;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className="flex-shrink-0 hairline-r flex flex-col h-screen sticky top-0 bg-ink-0 select-none relative"
      style={{ width }}
    >
      {/* Wordmark */}
      <div className={`hairline-b flex items-center ${collapsed ? 'justify-center h-16' : 'h-16 px-5 gap-3'}`}>
        {/* Mark */}
        <div className="relative w-7 h-7 shrink-0 border border-paper flex items-center justify-center">
          <span className="font-display italic font-light text-paper text-[15px] leading-none">E</span>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="font-display italic font-light text-paper text-[17px] leading-none">
              Embedo
            </p>
            <p className="font-mono text-[9px] tracking-mega text-paper-4 mt-1 uppercase">
              Operator · v0.1
            </p>
          </div>
        )}
        {!collapsed && (
          <span className="font-mono text-[9px] tracking-mega text-paper-4 uppercase shrink-0">
            NYC
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        {NAV.map((group, i) => (
          <div key={group.section} className={i > 0 ? 'mt-6' : ''}>
            {!collapsed && (
              <div className="px-5 mb-2 flex items-baseline gap-2">
                <span className="font-mono text-[9px] tracking-mega text-paper-4 leading-none">
                  §{group.numeral}
                </span>
                <span className="font-mono text-[9px] tracking-mega text-paper-4 uppercase leading-none">
                  {group.section}
                </span>
              </div>
            )}
            <div>
              {group.items.map((item) => {
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <NavItem key={item.href} {...item} isActive={isActive} collapsed={collapsed} />
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={`hairline-t ${collapsed ? 'h-14 flex items-center justify-center' : 'px-5 py-4 flex items-center gap-3'}`}>
        <div className="relative w-7 h-7 shrink-0 bg-signal flex items-center justify-center">
          <span className="font-display italic font-semibold text-ink-0 text-xs">{userInitial}</span>
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="font-ui text-[12px] font-medium text-paper leading-none truncate">
                {userEmail?.split('@')[0] ?? 'operator'}
              </p>
              <p className="font-mono text-[9px] tracking-micro text-paper-4 mt-1 uppercase">
                Owner
              </p>
            </div>
            <button
              onClick={onLogout}
              title="Sign out"
              className="shrink-0 w-7 h-7 flex items-center justify-center text-paper-4 hover:text-ember hairline transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute top-[52px] -right-3 w-6 h-6 bg-ink-0 hairline flex items-center justify-center text-paper-3 hover:text-signal hover:border-signal transition z-50"
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        <ChevronLeft className={`w-3 h-3 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>

      {/* Drag handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-signal/20 transition-colors z-40"
        onMouseDown={onDragStart}
      />
    </aside>
  );
}

/* ─── Header bar ─────────────────────────────────────────────── */

function TopBar({ path }: { path: string }) {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateString = now.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).toUpperCase();

  const breadcrumb = path === '/' ? 'DASHBOARD' : path.slice(1).split('/')[0]?.toUpperCase();

  return (
    <header className="flex-shrink-0 h-14 hairline-b flex items-center justify-between px-8 bg-ink-0/90 backdrop-blur-sm sticky top-0 z-30">
      {/* Left — breadcrumb */}
      <div className="flex items-center gap-5">
        <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
          Embedo / {breadcrumb}
        </span>
      </div>

      {/* Center — ticker */}
      <div className="hidden lg:flex items-center gap-6 font-mono text-[10px] tracking-micro uppercase text-paper-3">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-signal signal-dot relative" />
          <span>All systems nominal</span>
        </span>
      </div>

      {/* Right — time + actions */}
      <div className="flex items-center gap-5">
        <div className="hidden md:flex items-baseline gap-3 font-mono text-[10px] tracking-micro text-paper-3 uppercase">
          <span>{dateString}</span>
          <span className="text-paper nums">{timeString} ET</span>
        </div>
        <button
          className="hidden md:inline-flex items-center gap-1.5 hairline px-2.5 py-1 font-mono text-[10px] tracking-mega text-paper-3 hover:text-paper hover:border-paper-3 transition"
          title="Command palette"
        >
          <Command className="w-3 h-3" />
          <span>K</span>
        </button>
        <NotificationBell />
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);

  const collapsed = sidebarWidth <= COLLAPSED_WIDTH + 10;

  const userEmail = user?.email ?? null;
  const userInitial = (user?.email?.[0] ?? 'U').toUpperCase();

  const handleLogout = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }, [router]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    e.preventDefault();
  }, [sidebarWidth]);

  const handleToggle = useCallback(() => {
    setSidebarWidth((w) => (w <= COLLAPSED_WIDTH + 10 ? DEFAULT_WIDTH : COLLAPSED_WIDTH));
  }, []);

  // Cubey context
  const [platformContext, setPlatformContext] = useState('');
  useEffect(() => {
    async function fetchContext() {
      try {
        const [bizRes, campaignRes] = await Promise.all([
          fetch(`${PLATFORM_API}/businesses?limit=100`).catch(() => null),
          fetch(`${PLATFORM_API}/campaigns?limit=20`).catch(() => null),
        ]);
        const lines: string[] = [];
        if (bizRes?.ok) {
          const bizData = await bizRes.json();
          const businesses = bizData.businesses ?? bizData ?? [];
          lines.push(`Total businesses onboarded: ${businesses.length}`);
          if (businesses.length > 0) {
            const names = businesses.slice(0, 10).map((b: { name: string; status: string }) => `${b.name} (${b.status})`);
            lines.push(`Recent businesses: ${names.join(', ')}`);
          }
        }
        if (campaignRes?.ok) {
          const campData = await campaignRes.json();
          const campaigns = campData.campaigns ?? campData ?? [];
          lines.push(`Active outbound campaigns: ${campaigns.length}`);
          for (const c of campaigns.slice(0, 5)) {
            lines.push(`Campaign "${c.name ?? c.id}": ${c.status ?? 'unknown'}, ${c.prospectCount ?? 0} prospects, targeting ${c.targetCity ?? 'unknown city'}`);
          }
        }
        if (lines.length > 0) setPlatformContext(lines.join('\n'));
      } catch { /* non-critical */ }
    }
    fetchContext();
    const interval = setInterval(fetchContext, 120_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      const raw = startWidth.current + delta;
      setSidebarWidth(Math.max(COLLAPSED_WIDTH, Math.min(MAX_WIDTH, raw)));
    };
    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setSidebarWidth((w) => {
        if (w < SNAP_THRESHOLD) return COLLAPSED_WIDTH;
        if (w < MIN_EXPANDED) return MIN_EXPANDED;
        return w;
      });
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div className="min-h-screen flex bg-ink-0 text-paper">
      <Sidebar
        width={sidebarWidth}
        collapsed={collapsed}
        onDragStart={handleDragStart}
        onToggle={handleToggle}
        userEmail={userEmail}
        userInitial={userInitial}
        onLogout={handleLogout}
      />
      <div className="relative flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar path={pathname} />
        <main className="flex-1 overflow-auto bg-ink-0">
          <div className="animate-fade-up">
            {children}
          </div>
        </main>
      </div>

      {/* Cubey retained */}
      <CubeyChat
        mode="support"
        businessId="embedo-platform"
        headerTitle="Cubey"
        welcomeMessage="Operator here. Ask me about campaigns, prospects, leads — anything in the CRM."
        systemContext={platformContext}
      />
    </div>
  );
}
