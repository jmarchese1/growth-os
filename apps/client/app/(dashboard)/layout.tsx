'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import EmbedoLogo from '../../components/EmbedoLogo';
import { useSession } from '../../components/auth/session-provider';
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
    section: 'AI MODULES',
    items: [
      {
        href: '/voice-agent',
        label: 'Voice Agent',
        icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg>,
      },
      {
        href: '/chatbot',
        label: 'Chatbot',
        icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>,
      },
      {
        href: '/contacts',
        label: 'Contacts & Leads',
        icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.973 5.973 0 004 17v1H1v-1a3 3 0 013.75-2.906z" /></svg>,
      },
      {
        href: '/surveys',
        label: 'Surveys',
        icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>,
      },
      {
        href: '/social',
        label: 'Social Media',
        icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>,
      },
      {
        href: '/website',
        label: 'Website',
        icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4z" clipRule="evenodd" /></svg>,
      },
      {
        href: '/proposals',
        label: 'Proposals',
        icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>,
      },
    ],
  },
  {
    section: 'ACCOUNT',
    items: [
      {
        href: '/integrations',
        label: 'Integrations',
        icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>,
      },
      {
        href: '/settings',
        label: 'Settings',
        icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>,
      },
    ],
  },
];

const DEFAULT_WIDTH = 240;
const COLLAPSED_WIDTH = 60;
const MIN_EXPANDED = 160;
const MAX_WIDTH = 360;
const SNAP_THRESHOLD = 110;

function NavItem({ href, label, icon, isActive, collapsed }: {
  href: string; label: string; icon: React.ReactNode; isActive: boolean; collapsed: boolean;
}) {
  return (
    <Link href={href} title={collapsed ? label : undefined}
      className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 ${
        collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
      } ${
        isActive
          ? 'text-violet-700 bg-violet-50 border border-violet-200/60'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
      }`}>
      <span className={`flex-shrink-0 ${isActive ? 'text-violet-600' : 'text-slate-400'}`}>{icon}</span>
      {!collapsed && (
        <>
          {label}
          {isActive && <span className="ml-auto w-1 h-4 rounded-full bg-violet-400" />}
        </>
      )}
    </Link>
  );
}

function Sidebar({ width, collapsed, onDragStart, onToggle, userEmail, userInitial, onLogout }: {
  width: number; collapsed: boolean;
  onDragStart: (e: React.MouseEvent) => void; onToggle: () => void;
  userEmail: string | null; userInitial: string; onLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex-shrink-0 border-r border-slate-200 flex flex-col h-screen sticky top-0 relative overflow-hidden select-none bg-white"
      style={{ width }}>
      {/* Logo */}
      <div className={`border-b border-slate-200 flex items-center ${collapsed ? 'justify-center py-5 px-2' : 'px-5 py-5 gap-3'}`}>
        <EmbedoLogo size={collapsed ? 28 : 36} />
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-slate-900 leading-none tracking-tight">Embedo</p>
            <p className="text-[10px] text-violet-500 mt-0.5 leading-none font-medium uppercase tracking-widest">Client</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={`flex-1 py-5 space-y-5 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
        {NAV.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[9px] font-bold text-slate-400 uppercase tracking-[0.18em]">
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
      <div className={`border-t border-slate-200 flex items-center ${collapsed ? 'justify-center py-4 px-2' : 'px-4 py-4 gap-2.5'}`}>
        <div className="relative w-7 h-7 flex-shrink-0">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {userInitial}
          </div>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 leading-none truncate">{userEmail ?? 'User'}</p>
          </div>
        )}
        {!collapsed && (
          <button onClick={onLogout} title="Sign out"
            className="flex-shrink-0 p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4.414l-4.293 4.293a1 1 0 01-1.414-1.414L11.586 7H7a1 1 0 110-2h6a1 1 0 011 1v6a1 1 0 11-2 0V7.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Collapse toggle */}
      <button onClick={onToggle}
        className="absolute bottom-16 -right-3 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-violet-600 hover:border-violet-300 transition-colors z-50 shadow-sm"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 transition-transform ${collapsed ? 'rotate-0' : 'rotate-180'}`}>
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Drag handle */}
      <div className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-violet-100 active:bg-violet-200 transition-colors z-40"
        onMouseDown={onDragStart} />
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

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar width={sidebarWidth} collapsed={collapsed} onDragStart={handleDragStart} onToggle={handleToggle}
        userEmail={userEmail} userInitial={userInitial} onLogout={handleLogout} />
      <main className="flex-1 overflow-auto bg-grid-light">
        {children}
      </main>
    </div>
  );
}
