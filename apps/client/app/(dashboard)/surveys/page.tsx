'use client';

import { useState } from 'react';
import SurveysTab from './surveys-client';
import QrCodesTab from './qr-codes-client';

const TABS = [
  { id: 'surveys', label: 'Surveys', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { id: 'qr', label: 'QR Codes', icon: 'M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z' },
];

export default function SurveysAndQrPage() {
  const [tab, setTab] = useState('surveys');

  return (
    <div className="p-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" /></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Surveys & QR Codes</h1>
            <p className="text-sm text-slate-500">Create surveys and generate QR codes to capture feedback and leads</p>
          </div>
        </div>
      </div>

      {/* Pill Tabs */}
      <div className="flex gap-1.5 mb-8 bg-slate-100/80 rounded-2xl p-1.5 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl whitespace-nowrap transition-all duration-200 ${
              tab === t.id
                ? 'bg-white text-violet-700 shadow-sm border border-violet-100'
                : 'text-slate-500 hover:text-violet-600 hover:bg-white/60'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div key={tab} className="animate-fade-up">
        {tab === 'surveys' && <SurveysTab />}
        {tab === 'qr' && <QrCodesTab />}
      </div>
    </div>
  );
}
