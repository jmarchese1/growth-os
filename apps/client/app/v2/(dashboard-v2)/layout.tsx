'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from '../../../components/auth/session-provider';
import { useBusiness } from '../../../components/auth/business-provider';
import { useTheme } from '../../../components/theme-provider';
import { NotificationsBell } from '../../../components/ui/notifications-bell';
import { CubeyChat } from '../../../components/ui/cubey-chat';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';

/* ── Navigation ─────────────────────────────────────────── */

const NAV = [
  {
    section: null, // ungrouped top items
    items: [
      { href: '/v2', label: 'Overview', icon: 'home' },
    ],
  },
  {
    section: 'Tools',
    items: [
      { href: '/v2/website', label: 'Website', icon: 'globe' },
      { href: '/v2/voice-agent', label: 'Phone Agent', icon: 'phone' },
      { href: '/v2/chatbot', label: 'Chat Widget', icon: 'chat' },
      { href: '/v2/surveys', label: 'QR & Surveys', icon: 'qr' },
      { href: '/v2/social', label: 'Social Media', icon: 'share' },
      { href: '/v2/images', label: 'Images', icon: 'image' },
    ],
  },
  {
    section: 'Data',
    items: [
      { href: '/v2/customers', label: 'Contacts', icon: 'users' },
      { href: '/v2/campaigns', label: 'Campaigns', icon: 'mail' },
      { href: '/v2/reservations', label: 'Reservations', icon: 'calendar' },
      { href: '/v2/orders', label: 'Orders', icon: 'cart' },
    ],
  },
  {
    section: 'Account',
    items: [
      { href: '/v2/billing', label: 'Billing', icon: 'card' },
      { href: '/v2/settings', label: 'Settings', icon: 'gear' },
    ],
  },
];

/* ── Icons (minimal stroke-based) ───────────────────────── */

function NavIcon({ name, className = '' }: { name: string; className?: string }) {
  const c = `w-[18px] h-[18px] ${className}`;
  const props = { className: c, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (name) {
    case 'home': return <svg {...props}><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>;
    case 'globe': return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>;
    case 'phone': return <svg {...props}><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
    case 'chat': return <svg {...props}><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
    case 'qr': return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="3" height="3" /><path d="M21 14h-3v3m3 4h-7v-3m4 0v3" /></svg>;
    case 'share': return <svg {...props}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" /></svg>;
    case 'image': return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>;
    case 'users': return <svg {...props}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>;
    case 'mail': return <svg {...props}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><path d="M22 6l-10 7L2 6" /></svg>;
    case 'calendar': return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
    case 'cart': return <svg {...props}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" /></svg>;
    case 'card': return <svg {...props}><rect x="1" y="4" width="22" height="16" rx="2" /><path d="M1 10h22" /></svg>;
    case 'gear': return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>;
    default: return <svg {...props}><circle cx="12" cy="12" r="10" /></svg>;
  }
}

/* ── Components ──────────────────────────────────────────── */

function NavItem({ href, label, icon, isActive, collapsed }: {
  href: string; label: string; icon: string; isActive: boolean; collapsed: boolean;
}) {
  return (
    <Link href={href} title={collapsed ? label : undefined}
      className={`group flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-200 ${
        collapsed ? 'justify-center p-2.5' : 'px-3 py-2'
      } ${
        isActive
          ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.06]'
      }`}>
      <NavIcon name={icon} className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle}
      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/[0.06] transition-colors"
      title={theme === 'light' ? 'Dark mode' : 'Light mode'}>
      {theme === 'light' ? (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
      ) : (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
      )}
    </button>
  );
}

/* ── Layout ──────────────────────────────────────────────── */

export default function DashboardV2Layout({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const { business, needsOnboarding, loading: businessLoading } = useBusiness();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const userEmail = user?.email ?? null;
  const userInitial = (user?.email?.[0] ?? 'U').toUpperCase();

  const handleLogout = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!businessLoading && needsOnboarding) {
      router.replace('/setup');
    }
  }, [businessLoading, needsOnboarding, router]);

  if (!businessLoading && needsOnboarding) return null;

  const sidebarWidth = collapsed ? 68 : 240;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#09090b]">
      {/* ── Sidebar ── */}
      <aside className="flex-shrink-0 flex flex-col h-screen sticky top-0 border-r border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-[#0c0c0f] transition-all duration-300" style={{ width: sidebarWidth }}>

        {/* Logo */}
        <div className={`flex items-center h-16 border-b border-slate-100 dark:border-white/[0.06] ${collapsed ? 'justify-center px-2' : 'px-5 gap-3'}`}>
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-600/20">
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
              <polygon points="16,6 26,11 16,16 6,11" fill="white" fillOpacity="0.9" />
              <polygon points="6,11 16,16 16,26 6,21" fill="white" fillOpacity="0.5" />
              <polygon points="26,11 16,16 16,26 26,21" fill="white" fillOpacity="0.7" />
            </svg>
          </div>
          {!collapsed && (
            <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Embedo</span>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 py-4 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
          <div className="space-y-6">
            {NAV.map((group, gi) => (
              <div key={gi}>
                {group.section && !collapsed && (
                  <p className="px-3 mb-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em]">
                    {group.section}
                  </p>
                )}
                {group.section && collapsed && <div className="h-px bg-slate-100 dark:bg-white/[0.06] mx-2 mb-2" />}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = item.href === '/v2'
                      ? pathname === '/v2'
                      : pathname.startsWith(item.href);
                    return <NavItem key={item.href} {...item} isActive={isActive} collapsed={collapsed} />;
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* User footer */}
        <div className={`border-t border-slate-100 dark:border-white/[0.06] flex items-center ${collapsed ? 'justify-center py-4 px-2' : 'px-4 py-3 gap-3'}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {userInitial}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{userEmail ?? 'User'}</p>
              </div>
              <button onClick={handleLogout} title="Sign out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3l3-3m0 0l-3-3m3 3H9" /></svg>
              </button>
            </>
          )}
        </div>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute top-[72px] -right-3 w-6 h-6 rounded-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-violet-600 hover:border-violet-300 dark:hover:text-violet-400 transition-colors z-50 shadow-sm"
          title={collapsed ? 'Expand' : 'Collapse'}>
          <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 transition-transform duration-300 ${collapsed ? 'rotate-0' : 'rotate-180'}`}>
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 border-b border-slate-200/80 dark:border-white/[0.06] bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-slate-800 dark:text-white">{business?.name ?? 'Dashboard'}</h1>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">Live</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <ThemeToggle />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>

      <CubeyChat mode="support" headerTitle="Cubey Help"
        welcomeMessage="Hey! I'm Cubey, your Embedo platform guide. Ask me anything about using the dashboard!" />
    </div>
  );
}
