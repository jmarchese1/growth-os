'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import EmbedoLogo from '../../components/EmbedoLogo';
import NotificationBell from '../../components/NotificationBell';
import { useSession } from '../../components/auth/session-provider';
import { CubeyChat } from '../../components/ui/cubey-chat';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';

const PLATFORM_API = process.env['NEXT_PUBLIC_API_URL'] ?? process.env['API_BASE_URL'] ?? 'https://embedoapi-production.up.railway.app';

const NAV = [
  {
    section: 'MAIN',
    items: [
      {
        href: '/',
        label: 'Overview',
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm8-3a1 1 0 100 2 1 1 0 000-2zm-1 4a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3z" />
          </svg>
        ),
      },
      {
        href: '/businesses',
        label: 'Businesses',
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h2v2H7V5zm4 0h2v2h-2V5zM7 9h2v2H7V9zm4 0h2v2h-2V9zm-4 4h2v2H7v-2zm4 0h2v2h-2v-2z" clipRule="evenodd" />
          </svg>
        ),
      },
      {
        href: '/analytics',
        label: 'Analytics',
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
        ),
      },
      {
        href: '/calendar',
        label: 'Calendar',
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'OUTBOUND',
    items: [
      {
        href: '/automation',
        label: 'Automation',
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
        ),
      },
      {
        href: '/campaigns',
        label: 'Campaigns',
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
        ),
      },
      {
        href: '/emails',
        label: 'Emails',
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
        ),
      },
      {
        href: '/email-templates',
        label: 'Templates',
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        ),
      },
      {
        href: '/leads',
        label: 'Leads',
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.973 5.973 0 004 17v1H1v-1a3 3 0 013.75-2.906z" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'ACCOUNT',
    items: [
      {
        href: '/settings',
        label: 'Settings',
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        ),
      },
      {
        href: '/domains',
        label: 'Domains',
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
        ),
      },
      {
        href: '/integrations',
        label: 'Integrations',
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
          </svg>
        ),
      },
    ],
  },
];

const DEFAULT_WIDTH = 240;
const COLLAPSED_WIDTH = 60;
const MIN_EXPANDED = 160;
const MAX_WIDTH = 360;
const SNAP_THRESHOLD = 110;

function NavItem({
  href, label, icon, isActive, collapsed,
}: {
  href: string; label: string; icon: React.ReactNode; isActive: boolean; collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 ${
        collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
      } ${
        isActive
          ? 'text-white bg-violet-600/20 border border-violet-500/30 shadow-[0_0_16px_rgba(124,58,237,0.18),inset_0_0_16px_rgba(124,58,237,0.04)]'
          : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
      }`}
    >
      <span className={`flex-shrink-0 ${isActive ? 'text-violet-400' : 'text-slate-500'}`}>{icon}</span>
      {!collapsed && (
        <>
          {label}
          {isActive && <span className="ml-auto w-1 h-4 rounded-full bg-violet-400/60" />}
        </>
      )}
    </Link>
  );
}

function Sidebar({
  width,
  collapsed,
  onDragStart,
  onToggle,
  userEmail,
  userInitial,
  onLogout,
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
      className="flex-shrink-0 border-r border-white/[0.06] flex flex-col h-screen sticky top-0 relative overflow-hidden select-none"
      style={{ width, background: 'linear-gradient(180deg, #0f0c1f 0%, #0d0b1a 100%)' }}
    >
      {/* Ambient glow */}
      <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-violet-950/20 to-transparent pointer-events-none" />

      {/* Logo */}
      <div className={`relative border-b border-white/[0.06] flex items-center ${collapsed ? 'justify-center py-5 px-2' : 'px-5 py-5 gap-3'}`}>
        <EmbedoLogo size={collapsed ? 28 : 36} />
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-white leading-none tracking-tight">Embedo</p>
            <p className="text-[10px] text-violet-400/60 mt-0.5 leading-none font-medium uppercase tracking-widest">Growth OS</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={`relative flex-1 py-5 space-y-5 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
        {NAV.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[9px] font-bold text-slate-700 uppercase tracking-[0.18em]">
                {group.section}
              </p>
            )}
            <div className="space-y-0.5">
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
      <div className={`relative border-t border-white/[0.06] flex items-center ${collapsed ? 'justify-center py-4 px-2' : 'px-4 py-4 gap-2.5'}`}>
        <div className="relative w-7 h-7 flex-shrink-0">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {userInitial}
          </div>
          <div className="absolute inset-0 rounded-full bg-violet-500/30 blur-sm" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-300 leading-none truncate">{userEmail ?? 'User'}</p>
            <p className="text-[10px] text-slate-600 mt-0.5 leading-none">Owner</p>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={onLogout}
            title="Sign out"
            className="flex-shrink-0 p-1.5 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4.414l-4.293 4.293a1 1 0 01-1.414-1.414L11.586 7H7a1 1 0 110-2h6a1 1 0 011 1v6a1 1 0 11-2 0V7.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Collapse/expand toggle button */}
      <button
        onClick={onToggle}
        className="absolute bottom-16 -right-3 w-6 h-6 rounded-full bg-[#1a1730] border border-white/10 flex items-center justify-center text-slate-500 hover:text-violet-400 hover:border-violet-500/40 transition-colors z-50 shadow-md"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 transition-transform ${collapsed ? 'rotate-0' : 'rotate-180'}`}>
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Drag handle */}
      <div
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-violet-500/25 active:bg-violet-500/40 transition-colors z-40"
        onMouseDown={onDragStart}
      />
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
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

  // Fetch live platform context for Cubey
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
    <div className="min-h-screen flex bg-[#0c0a18]">
      {/* Global ambient background orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[560px] h-[560px] rounded-full bg-violet-700/8 blur-[110px] animate-float-orb" />
        <div className="absolute top-2/3 -right-20 w-[420px] h-[420px] rounded-full bg-indigo-600/6 blur-[100px] animate-float-orb-b" />
        <div className="absolute bottom-0 left-10 w-[300px] h-[300px] rounded-full bg-violet-900/8 blur-[80px] animate-shimmer" />
      </div>

      <Sidebar
        width={sidebarWidth}
        collapsed={collapsed}
        onDragStart={handleDragStart}
        onToggle={handleToggle}
        userEmail={userEmail}
        userInitial={userInitial}
        onLogout={handleLogout}
      />
      <div className="relative flex-1 flex flex-col overflow-hidden" style={{ zIndex: 2 }}>
        {/* Top header bar */}
        <header className="flex-shrink-0 h-14 border-b border-white/[0.06] flex items-center justify-end px-6 bg-[#0c0a18]/80 backdrop-blur-sm">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-auto bg-grid-dark">
          {children}
        </main>
      </div>

      {/* Cubey — internal platform assistant */}
      <CubeyChat
        mode="support"
        businessId="embedo-platform"
        headerTitle="Cubey Assistant"
        welcomeMessage="Hey Jason! I'm Cubey, your platform assistant. Ask me about campaigns, prospects, leads, analytics — anything about what's happening in the CRM."
        systemContext={platformContext}
      />
    </div>
  );
}
