'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import EmbedoLogo from '../../components/EmbedoLogo';

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
        href: '/leads',
        label: 'Leads',
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.973 5.973 0 004 17v1H1v-1a3 3 0 013.75-2.906z" />
          </svg>
        ),
      },
      {
        href: '/proposals',
        label: 'Proposals',
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'OUTBOUND',
    items: [
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
          ? 'text-indigo-700 bg-indigo-50 border border-indigo-100 shadow-sm'
          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-transparent'
      }`}
    >
      <span className={`flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>{icon}</span>
      {!collapsed && (
        <>
          {label}
          {isActive && <span className="ml-auto w-1 h-4 rounded-full bg-indigo-400" />}
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
}: {
  width: number;
  collapsed: boolean;
  onDragStart: (e: React.MouseEvent) => void;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className="flex-shrink-0 border-r border-gray-100 bg-white flex flex-col h-screen sticky top-0 relative overflow-hidden select-none"
      style={{ width }}
    >
      {/* Subtle indigo orb top-left */}
      <div className="absolute -top-16 -left-16 w-40 h-40 rounded-full bg-indigo-100/60 blur-3xl pointer-events-none" />

      {/* Logo */}
      <div className={`relative border-b border-gray-100 flex items-center ${collapsed ? 'justify-center py-5 px-2' : 'px-5 py-5 gap-3'}`}>
        <EmbedoLogo size={collapsed ? 28 : 36} />
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none tracking-tight">Embedo</p>
            <p className="text-[10px] text-indigo-500 mt-0.5 leading-none font-medium uppercase tracking-widest">Growth OS</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={`relative flex-1 py-5 space-y-5 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
        {NAV.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[9px] font-bold text-gray-300 uppercase tracking-[0.18em]">
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
      <div className={`relative border-t border-gray-100 flex items-center ${collapsed ? 'justify-center py-4 px-2' : 'px-4 py-4 gap-2.5'}`}>
        <div className="relative w-7 h-7 flex-shrink-0">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-xs font-bold">
            J
          </div>
        </div>
        {!collapsed && (
          <div>
            <p className="text-xs font-semibold text-gray-700 leading-none">Jason Marchese</p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-none">Owner</p>
          </div>
        )}
      </div>

      {/* Collapse/expand toggle button */}
      <button
        onClick={onToggle}
        className="absolute bottom-16 -right-3 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors z-50 shadow-sm"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 transition-transform ${collapsed ? 'rotate-0' : 'rotate-180'}`}>
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Drag handle */}
      <div
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-100 active:bg-indigo-200 transition-colors z-40"
        onMouseDown={onDragStart}
      />
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);

  const collapsed = sidebarWidth <= COLLAPSED_WIDTH + 10;

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
    <div className="min-h-screen flex bg-gray-50">
      {/* Subtle ambient orbs on the main canvas */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-100/40 blur-[120px] animate-float-orb" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] rounded-full bg-indigo-50/60 blur-[100px] animate-float-orb-b" />
      </div>

      <Sidebar
        width={sidebarWidth}
        collapsed={collapsed}
        onDragStart={handleDragStart}
        onToggle={handleToggle}
      />
      <main className="relative flex-1 overflow-auto bg-grid-dark" style={{ zIndex: 2 }}>
        {children}
      </main>
    </div>
  );
}
