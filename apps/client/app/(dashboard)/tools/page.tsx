'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../../../components/auth/business-provider';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface CatalogTool {
  type: string;
  name: string;
  description: string;
  icon: string;
  industries: string[];
  capabilities: string[];
  defaultConfig: Record<string, unknown>;
}

interface EnabledTool {
  id: string;
  type: string;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: string;
}

interface MenuItem {
  name: string;
  price: number;
  category: string;
  description: string;
  available: boolean;
}

export default function ToolsPage() {
  const { business, loading: bizLoading } = useBusiness();
  const [catalog, setCatalog] = useState<CatalogTool[]>([]);
  const [enabledTools, setEnabledTools] = useState<EnabledTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Config state for TAKEOUT_ORDERS
  const [taxRate, setTaxRate] = useState('0');
  const [prepTime, setPrepTime] = useState('20');
  const [notifPhone, setNotifPhone] = useState('');
  const [notifEmail, setNotifEmail] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '', description: '' });

  const fetchCatalog = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/business-tools/catalog`);
      const json = await res.json();
      if (json.success) setCatalog(json.catalog);
    } catch { /* ignore */ }
  }, []);

  const fetchEnabled = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/business-tools?businessId=${business.id}`);
      const json = await res.json();
      if (json.success) setEnabledTools(json.tools);
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  useEffect(() => { fetchCatalog(); }, [fetchCatalog]);
  useEffect(() => { fetchEnabled(); }, [fetchEnabled]);

  const enableTool = async (type: string, defaultConfig: Record<string, unknown>) => {
    if (!business?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/business-tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, type, config: defaultConfig }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchEnabled();
        setConfiguring(type);
        loadConfig(json.tool);
      }
    } finally {
      setSaving(false);
    }
  };

  const disableTool = async (toolId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/business-tools/${toolId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      });
      const json = await res.json();
      if (json.success) await fetchEnabled();
    } finally {
      setSaving(false);
    }
  };

  const loadConfig = (tool: EnabledTool) => {
    const c = tool.config ?? {};
    setTaxRate(String((c['taxRate'] as number) ?? 0));
    setPrepTime(String((c['prepTimeMinutes'] as number) ?? 20));
    setNotifPhone((c['orderNotificationPhone'] as string) ?? '');
    setNotifEmail((c['orderNotificationEmail'] as string) ?? '');
    setMenuItems((c['menuItems'] as MenuItem[]) ?? []);
  };

  const saveConfig = async (toolId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/business-tools/${toolId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            taxRate: parseFloat(taxRate) || 0,
            prepTimeMinutes: parseInt(prepTime) || 20,
            acceptingOrders: true,
            orderNotificationPhone: notifPhone || undefined,
            orderNotificationEmail: notifEmail || undefined,
            menuItems,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchEnabled();
        setConfiguring(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const addMenuItem = () => {
    if (!newItem.name || !newItem.price) return;
    setMenuItems(prev => [...prev, {
      name: newItem.name,
      price: parseFloat(newItem.price) || 0,
      category: newItem.category || 'General',
      description: newItem.description,
      available: true,
    }]);
    setNewItem({ name: '', price: '', category: '', description: '' });
  };

  const removeMenuItem = (index: number) => {
    setMenuItems(prev => prev.filter((_, i) => i !== index));
  };

  if (bizLoading) return (
    <div className="p-8 flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );
  if (!business) return null;

  const getEnabledTool = (type: string) => enabledTools.find(t => t.type === type && t.enabled);

  return (
    <div className="p-8 animate-fade-up">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Tool Library</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Enable AI-powered tools for your phone agent and chatbot. Each tool gives your agents new capabilities.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {catalog.map(tool => {
            const enabled = getEnabledTool(tool.type);
            const isConfiguring = configuring === tool.type;

            return (
              <div key={tool.type} className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
                {/* Tool Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-white/[0.06]">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${enabled ? 'bg-violet-100 dark:bg-violet-500/15' : 'bg-slate-100 dark:bg-white/[0.06]'}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={`w-6 h-6 ${enabled ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{tool.name}</h3>
                          {enabled && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{tool.description}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Capabilities */}
                <div className="px-6 py-4">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">What it does</p>
                  <ul className="space-y-2">
                    {tool.capabilities.map((cap, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {cap}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Config Panel */}
                {isConfiguring && enabled && (
                  <div className="px-6 py-5 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
                    <p className="text-xs font-semibold text-slate-700 dark:text-white mb-4">Configuration</p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Tax Rate (%)</label>
                        <input type="number" step="0.01" min="0" max="1" value={taxRate}
                          onChange={e => setTaxRate(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Prep Time (min)</label>
                        <input type="number" min="1" value={prepTime}
                          onChange={e => setPrepTime(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Notification Phone</label>
                        <input type="tel" value={notifPhone} placeholder="+1234567890"
                          onChange={e => setNotifPhone(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Notification Email</label>
                        <input type="email" value={notifEmail} placeholder="orders@restaurant.com"
                          onChange={e => setNotifEmail(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="mb-4">
                      <p className="text-[11px] font-medium text-slate-500 mb-2">Menu Items</p>
                      {menuItems.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          {menuItems.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-lg px-3 py-2">
                              <span className="text-sm font-medium text-slate-900 dark:text-white flex-1">{item.name}</span>
                              <span className="text-xs text-slate-400">{item.category}</span>
                              <span className="text-sm font-medium text-slate-900 dark:text-white">${item.price.toFixed(2)}</span>
                              <button onClick={() => removeMenuItem(i)} className="text-slate-400 hover:text-rose-500">
                                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input placeholder="Item name" value={newItem.name}
                          onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                          className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
                        <input placeholder="Price" type="number" step="0.01" value={newItem.price}
                          onChange={e => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                          className="w-20 px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
                        <input placeholder="Category" value={newItem.category}
                          onChange={e => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                          className="w-24 px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
                        <button onClick={addMenuItem}
                          className="px-3 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => saveConfig(enabled.id)} disabled={saving}
                        className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save Configuration'}
                      </button>
                      <button onClick={() => setConfiguring(null)}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-white/[0.06] flex items-center gap-2">
                  {enabled ? (
                    <>
                      <button onClick={() => { setConfiguring(isConfiguring ? null : tool.type); loadConfig(enabled); }}
                        className="px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors">
                        {isConfiguring ? 'Close Config' : 'Configure'}
                      </button>
                      <button onClick={() => disableTool(enabled.id)} disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors disabled:opacity-50">
                        Disable
                      </button>
                      <a href="/orders" className="ml-auto px-4 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors">
                        View Orders →
                      </a>
                    </>
                  ) : (
                    <button onClick={() => enableTool(tool.type, tool.defaultConfig)} disabled={saving}
                      className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50">
                      {saving ? 'Enabling...' : 'Enable Tool'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Coming Soon Section */}
      <div className="mt-12">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Coming Soon</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'Appointment Booking', desc: 'AI schedules appointments for service businesses', industry: 'Barber Shops, Salons, Spas' },
            { name: 'Waitlist Manager', desc: 'Automated waitlist with SMS notifications', industry: 'Restaurants, Clinics' },
            { name: 'Class & Session Booking', desc: 'Book fitness classes, sessions, and memberships', industry: 'Gyms, Studios, Training' },
          ].map(item => (
            <div key={item.name} className="bg-white dark:bg-white/[0.04] border border-dashed border-slate-200 dark:border-white/[0.08] rounded-xl p-5 opacity-60">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{item.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{item.desc}</p>
              <span className="text-[10px] text-slate-400">{item.industry}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
