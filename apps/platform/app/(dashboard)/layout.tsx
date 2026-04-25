'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard, Settings as SettingsIcon, LogOut, ChevronLeft, Command, Zap, Crosshair,
} from 'lucide-react';
import NotificationBell from '../../components/NotificationBell';
import { AgentStatusWidget } from '../../components/AgentStatusWidget';
import { useSession } from '../../components/auth/session-provider';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';

type NavItemT = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavSection = { numeral: string; section: string; items: NavItemT[] };

const NAV: NavSection[] = [
  {
    numeral: '',
    section: 'Workspace',
    items: [
      { href: '/',          label: 'Dashboard',  icon: LayoutDashboard },
      { href: '/agents',    label: 'Agents',     icon: Zap },
      { href: '/campaigns', label: 'Campaigns',  icon: Crosshair },
      { href: '/settings',  label: 'Settings',   icon: SettingsIcon },
    ],
  },
];

const DEFAULT_WIDTH = 248;
const COLLAPSED_WIDTH = 60;
const MIN_EXPANDED = 200;
const MAX_WIDTH = 340;
const SNAP_THRESHOLD = 130;

function NavItem({
  href, label, icon: Icon, isActive, collapsed,
}: NavItemT & { isActive: boolean; collapsed: boolean }) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center transition-all duration-150 ${
        collapsed ? 'justify-center h-9 w-9 mx-auto rounded-lg' : 'h-9 mx-2 px-3 gap-3 rounded-lg'
      } ${
        isActive
          ? 'text-signal bg-signal/10 font-medium'
          : 'text-paper-2 hover:text-paper hover:bg-ink-2'
      }`}
    >
      <Icon className={`w-[15px] h-[15px] shrink-0 ${isActive ? 'text-signal' : ''}`} />
      {!collapsed && <span className="text-[13px] tracking-tight">{label}</span>}
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
        <div className="relative w-7 h-7 shrink-0 rounded-lg bg-signal flex items-center justify-center">
          <span className="text-white text-[14px] font-semibold leading-none">E</span>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-paper text-[15px] font-semibold leading-none tracking-tight">
              Embedo
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV.map((group, i) => (
          <div key={group.section} className={i > 0 ? 'mt-5' : ''}>
            {!collapsed && (
              <div className="px-5 mb-1.5">
                <span className="text-[11px] font-medium text-paper-3 leading-none">
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
        <div className="relative w-7 h-7 shrink-0 rounded-full bg-signal flex items-center justify-center">
          <span className="text-white text-[12px] font-semibold leading-none">{userInitial}</span>
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-paper leading-none truncate">
                {userEmail?.split('@')[0] ?? 'operator'}
              </p>
              <p className="text-[11px] text-paper-3 mt-1">
                Owner
              </p>
            </div>
            <button
              onClick={onLogout}
              title="Sign out"
              className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-paper-3 hover:text-ember hover:bg-ink-2 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute top-[52px] -right-3 w-6 h-6 rounded-full bg-ink-0 border border-rule shadow-sm flex items-center justify-center text-paper-3 hover:text-signal hover:border-signal transition z-50"
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
  const dateLabel = now.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
  });

  const rawSegment = path === '/' ? 'Dashboard' : path.slice(1).split('/')[0] ?? '';
  const breadcrumb = rawSegment.charAt(0).toUpperCase() + rawSegment.slice(1);

  return (
    <header className="flex-shrink-0 h-14 hairline-b flex items-center justify-between px-10 bg-ink-0/85 backdrop-blur-md sticky top-0 z-30">
      {/* Left — breadcrumb */}
      <div className="flex items-center gap-5">
        <span className="text-paper text-[14px] font-semibold tracking-tight">
          {breadcrumb}
        </span>
      </div>

      <div className="flex-1" />

      {/* Right — time + actions */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-baseline gap-2 text-[12px] text-paper-3">
          <span>{dateLabel}</span>
          <span className="text-paper-2 nums">{timeString}</span>
        </div>
        <button
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-rule text-[12px] text-paper-3 hover:text-paper hover:bg-ink-2 transition"
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

      {/* Agent status — floating */}
      <AgentStatusWidget />
    </div>
  );
}
