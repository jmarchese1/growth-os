'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import EmbedoLogo from '../../components/EmbedoLogo';
import { useSession } from '../../components/auth/session-provider';
import { useBusiness } from '../../components/auth/business-provider';
import { useTheme } from '../../components/theme-provider';
import { NotificationsBell } from '../../components/ui/notifications-bell';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';

const NAV = [
  {
    section: 'OVERVIEW',
    items: [
      {
        href: '/',
        label: 'Dashboard',
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'YOUR TOOLS',
    items: [
      { href: '/website', label: 'Website', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4z" clipRule="evenodd" /></svg> },
      { href: '/voice-agent', label: 'Phone Agent', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg> },
      { href: '/chatbot', label: 'Chat Widget', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg> },
      { href: '/surveys', label: 'QR Codes', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" /><path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM7 11a1 1 0 100-2H4a1 1 0 100 2h3zM17 13a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zM16 17a1 1 0 100-2h-3a1 1 0 100 2h3z" /></svg> },
      { href: '/social', label: 'Social Media', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg> },
      { href: '/images', label: 'Image Library', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg> },
      { href: '/tools', label: 'Tool Library', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" /></svg> },
    ],
  },
  {
    section: 'DATA',
    items: [
      { href: '/reservations', label: 'Reservations', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg> },
      { href: '/orders', label: 'Orders', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg> },
    ],
  },
  {
    section: 'CRM',
    items: [
      { href: '/customers', label: 'Contacts', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.973 5.973 0 004 17v1H1v-1a3 3 0 013.75-2.906z" /></svg> },
    ],
  },
  {
    section: 'ACCOUNT',
    items: [
      { href: '/billing', label: 'Billing', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg> },
      { href: '/integrations', label: 'Integrations', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg> },
      { href: '/settings', label: 'Settings', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg> },
    ],
  },
];

const DEFAULT_WIDTH = 240;
const COLLAPSED_WIDTH = 60;
const MIN_EXPANDED = 160;
const MAX_WIDTH = 360;
const SNAP_THRESHOLD = 110;

/* ── Platform-style dark mode classes ──────────────────────────────── */
// Sidebar:  gradient #0f0c1f → #0d0b1a, border-white/[0.06]
// Cards:    bg-white/[0.04] border-white/[0.08] backdrop-blur
// Active:   bg-violet-600/20 border-violet-500/30 glow
// Text:     white (primary), slate-400 (secondary), slate-600 (muted)
// Base:     #0c0a18

function NavItem({ href, label, icon, isActive, collapsed }: {
  href: string; label: string; icon: React.ReactNode; isActive: boolean; collapsed: boolean;
}) {
  return (
    <Link href={href} title={collapsed ? label : undefined}
      className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 ${
        collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
      } ${
        isActive
          ? 'text-violet-700 bg-violet-50 border border-violet-200/60 dark:text-white dark:bg-violet-600/20 dark:border-violet-500/30 dark:shadow-[0_0_16px_rgba(124,58,237,0.15)]'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.04]'
      }`}>
      <span className={`flex-shrink-0 ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-400'}`}>{icon}</span>
      {!collapsed && (
        <>
          {label}
          {isActive && <span className="ml-auto w-1 h-4 rounded-full bg-violet-400 dark:bg-violet-400/60" />}
        </>
      )}
    </Link>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-violet-400 dark:hover:bg-white/[0.04] transition-colors"
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      )}
    </button>
  );
}

function Sidebar({ width, collapsed, onDragStart, onToggle, userEmail, userInitial, onLogout }: {
  width: number; collapsed: boolean;
  onDragStart: (e: React.MouseEvent) => void; onToggle: () => void;
  userEmail: string | null; userInitial: string; onLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className="flex-shrink-0 border-r border-slate-200 dark:border-white/[0.06] flex flex-col h-screen sticky top-0 relative overflow-hidden select-none bg-white dark:bg-transparent"
      style={{
        width,
        ...(typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
          ? {} : {}),
      }}
    >
      {/* Dark mode sidebar gradient — applied via inline style for the deep purple */}
      <div className="absolute inset-0 hidden dark:block pointer-events-none" style={{ background: 'linear-gradient(180deg, #0f0c1f 0%, #0d0b1a 100%)' }} />
      {/* Ambient violet glow */}
      <div className="absolute -top-20 -left-20 w-40 h-40 hidden dark:block pointer-events-none rounded-full bg-violet-600/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 right-0 h-32 hidden dark:block pointer-events-none bg-gradient-to-t from-violet-950/20 to-transparent" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Logo */}
        <div className={`border-b border-slate-200 dark:border-white/[0.06] flex items-center ${collapsed ? 'justify-center py-5 px-2' : 'px-5 py-5 gap-3'}`}>
          <EmbedoLogo size={collapsed ? 28 : 36} />
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-none tracking-tight">Embedo</p>
              <p className="text-[10px] text-violet-500 dark:text-violet-400 mt-0.5 leading-none font-medium uppercase tracking-widest">Client</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 py-5 space-y-5 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
          {NAV.map((group) => (
            <div key={group.section}>
              {!collapsed && (
                <p className="px-3 mb-2 text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-[0.18em]">
                  {group.section}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  return <NavItem key={item.href} {...item} isActive={isActive} collapsed={collapsed} />;
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={`border-t border-slate-200 dark:border-white/[0.06] flex items-center ${collapsed ? 'justify-center py-4 px-2' : 'px-4 py-4 gap-2.5'}`}>
          <div className="relative w-7 h-7 flex-shrink-0">
            <div className="absolute inset-[-2px] rounded-full bg-violet-500/30 blur-sm hidden dark:block" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              {userInitial}
            </div>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-none truncate">{userEmail ?? 'User'}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={onLogout} title="Sign out"
              className="flex-shrink-0 p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4.414l-4.293 4.293a1 1 0 01-1.414-1.414L11.586 7H7a1 1 0 110-2h6a1 1 0 011 1v6a1 1 0 11-2 0V7.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button onClick={onToggle}
        className="absolute bottom-16 -right-3 w-6 h-6 rounded-full bg-white dark:bg-[#1a1730] border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-violet-600 hover:border-violet-300 dark:hover:text-violet-400 dark:hover:border-violet-500/30 transition-colors z-50 shadow-sm"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 transition-transform ${collapsed ? 'rotate-0' : 'rotate-180'}`}>
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Drag handle */}
      <div className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-violet-100 dark:hover:bg-violet-500/10 active:bg-violet-200 transition-colors z-40"
        onMouseDown={onDragStart} />
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const { business, needsOnboarding, loading: businessLoading } = useBusiness();
  const router = useRouter();
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
      setSidebarWidth(Math.max(COLLAPSED_WIDTH, Math.min(MAX_WIDTH, startWidth.current + delta)));
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

  useEffect(() => {
    if (!businessLoading && needsOnboarding) {
      router.replace('/setup');
    }
  }, [businessLoading, needsOnboarding, router]);

  if (!businessLoading && needsOnboarding) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0c0a18]">
      <Sidebar width={sidebarWidth} collapsed={collapsed} onDragStart={handleDragStart} onToggle={handleToggle}
        userEmail={userEmail} userInitial={userInitial} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b border-slate-200/80 dark:border-white/[0.06] bg-white/80 dark:bg-[#0c0a18]/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-white">{business?.name ?? 'Dashboard'}</p>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 bg-grid-light">
          {children}
        </main>
      </div>
    </div>
  );
}
