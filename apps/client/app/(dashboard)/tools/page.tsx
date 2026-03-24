'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../../../components/auth/business-provider';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 dark:focus:border-violet-500/40';
const labelCls = 'block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1';

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

/* ── Per-tool config editor components ─────────────────────────── */

function ConfigField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className={labelCls}>{label}</label>{children}</div>;
}

function ListManager({ items, onAdd, onRemove, renderItem, addLabel, children }: {
  items: unknown[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  renderItem: (item: unknown, i: number) => React.ReactNode;
  addLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {items.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">{renderItem(item, i)}</div>
              <button onClick={() => onRemove(i)} className="text-slate-400 hover:text-rose-500 flex-shrink-0" aria-label="Remove">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">{children}</div>
      <button onClick={onAdd} type="button" className="mt-2 text-xs text-violet-600 dark:text-violet-400 hover:underline">{addLabel}</button>
    </div>
  );
}

interface MenuItem { name: string; price: number; category: string; description: string; available: boolean }
interface Special { name: string; description: string; price: number }
interface Promo { name: string; description: string; days: string[] }

function TakeoutConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>((config['menuItems'] as MenuItem[]) ?? []);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '', description: '' });
  const taxRate = String((config['taxRate'] as number) ?? 0);
  const prepTime = String((config['prepTimeMinutes'] as number) ?? 20);

  const update = (patch: Record<string, unknown>) => onChange({ ...config, ...patch, menuItems });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <ConfigField label="Tax Rate (decimal, e.g. 0.08 = 8%)">
          <input type="number" step="0.01" min="0" max="0.5" defaultValue={taxRate} onChange={e => update({ taxRate: parseFloat(e.target.value) || 0 })} className={inputCls} />
        </ConfigField>
        <ConfigField label="Prep Time (minutes)">
          <input type="number" min="1" defaultValue={prepTime} onChange={e => update({ prepTimeMinutes: parseInt(e.target.value) || 20 })} className={inputCls} />
        </ConfigField>
      </div>
      <div>
        <p className={labelCls}>Menu Items ({menuItems.length})</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2">Your AI agents will know these items and can take orders for them.</p>
        <ListManager
          items={menuItems}
          onAdd={() => {
            if (!newItem.name || !newItem.price) return;
            const updated = [...menuItems, { name: newItem.name, price: parseFloat(newItem.price) || 0, category: newItem.category || 'General', description: newItem.description, available: true }];
            setMenuItems(updated);
            onChange({ ...config, menuItems: updated });
            setNewItem({ name: '', price: '', category: '', description: '' });
          }}
          onRemove={(i) => { const updated = menuItems.filter((_, j) => j !== i); setMenuItems(updated); onChange({ ...config, menuItems: updated }); }}
          renderItem={(item) => { const m = item as MenuItem; return <span className="text-sm"><span className="font-medium text-slate-900 dark:text-white">{m.name}</span> <span className="text-slate-400">{m.category}</span> <span className="font-medium text-slate-900 dark:text-white">${m.price.toFixed(2)}</span></span>; }}
          addLabel="+ Add item"
        >
          <input placeholder="Item name" value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} className={`flex-1 ${inputCls}`} />
          <input placeholder="$" type="number" step="0.01" value={newItem.price} onChange={e => setNewItem(p => ({ ...p, price: e.target.value }))} className={`w-20 ${inputCls}`} />
          <input placeholder="Category" value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))} className={`w-28 ${inputCls}`} />
        </ListManager>
      </div>
    </div>
  );
}

function WaitlistConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <ConfigField label="Average Wait (minutes)">
          <input type="number" min="1" defaultValue={String((config['avgWaitMinutes'] as number) ?? 15)} onChange={e => onChange({ ...config, avgWaitMinutes: parseInt(e.target.value) || 15 })} className={inputCls} />
        </ConfigField>
        <ConfigField label="Max Waitlist Size">
          <input type="number" min="1" defaultValue={String((config['maxWaitlistSize'] as number) ?? 50)} onChange={e => onChange({ ...config, maxWaitlistSize: parseInt(e.target.value) || 50 })} className={inputCls} />
        </ConfigField>
      </div>
      <ConfigField label="SMS Notification Message">
        <input type="text" defaultValue={(config['notificationMessage'] as string) ?? 'Your table is ready! Please come to the host stand.'} onChange={e => onChange({ ...config, notificationMessage: e.target.value })} className={inputCls} placeholder="Your table at {businessName} is ready!" />
      </ConfigField>
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" defaultChecked={(config['autoNotify'] as boolean) ?? true} onChange={e => onChange({ ...config, autoNotify: e.target.checked })} className="rounded border-slate-300 dark:border-white/[0.08] text-violet-600" />
        Auto-send SMS when table is ready
      </label>
    </div>
  );
}

function DailySpecialsConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const [specials, setSpecials] = useState<Special[]>((config['specials'] as Special[]) ?? []);
  const [eightySixed, setEightySixed] = useState<string[]>((config['eightySixedItems'] as string[]) ?? []);
  const [newSpecial, setNewSpecial] = useState({ name: '', description: '', price: '' });
  const [new86, setNew86] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <p className={labelCls}>Today&apos;s Specials</p>
        <ListManager
          items={specials}
          onAdd={() => {
            if (!newSpecial.name) return;
            const updated = [...specials, { name: newSpecial.name, description: newSpecial.description, price: parseFloat(newSpecial.price) || 0 }];
            setSpecials(updated);
            onChange({ ...config, specials: updated });
            setNewSpecial({ name: '', description: '', price: '' });
          }}
          onRemove={(i) => { const updated = specials.filter((_, j) => j !== i); setSpecials(updated); onChange({ ...config, specials: updated }); }}
          renderItem={(item) => { const s = item as Special; return <span className="text-sm"><span className="font-medium text-slate-900 dark:text-white">{s.name}</span> {s.price > 0 && <span className="text-slate-400">${s.price.toFixed(2)}</span>} {s.description && <span className="text-slate-400">— {s.description}</span>}</span>; }}
          addLabel="+ Add special"
        >
          <input placeholder="Special name" value={newSpecial.name} onChange={e => setNewSpecial(p => ({ ...p, name: e.target.value }))} className={`flex-1 ${inputCls}`} />
          <input placeholder="$" type="number" step="0.01" value={newSpecial.price} onChange={e => setNewSpecial(p => ({ ...p, price: e.target.value }))} className={`w-20 ${inputCls}`} />
        </ListManager>
      </div>
      <div>
        <p className={labelCls}>86&apos;d Items (sold out / unavailable)</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2">Your AI agents will tell customers these items aren&apos;t available today.</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {eightySixed.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-md text-xs">
              {item}
              <button onClick={() => { const updated = eightySixed.filter((_, j) => j !== i); setEightySixed(updated); onChange({ ...config, eightySixedItems: updated }); }} className="hover:text-rose-800">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input placeholder="Item name" value={new86} onChange={e => setNew86(e.target.value)} className={`flex-1 ${inputCls}`} onKeyDown={e => { if (e.key === 'Enter' && new86.trim()) { const updated = [...eightySixed, new86.trim()]; setEightySixed(updated); onChange({ ...config, eightySixedItems: updated }); setNew86(''); } }} />
          <button onClick={() => { if (!new86.trim()) return; const updated = [...eightySixed, new86.trim()]; setEightySixed(updated); onChange({ ...config, eightySixedItems: updated }); setNew86(''); }} className="px-3 py-2 text-xs bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100">Add</button>
        </div>
      </div>
    </div>
  );
}

function CateringConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <ConfigField label="Minimum Headcount">
          <input type="number" min="1" defaultValue={String((config['minimumHeadcount'] as number) ?? 10)} onChange={e => onChange({ ...config, minimumHeadcount: parseInt(e.target.value) || 10 })} className={inputCls} />
        </ConfigField>
        <ConfigField label="Minimum Budget ($)">
          <input type="number" min="0" defaultValue={String((config['minimumBudget'] as number) ?? 200)} onChange={e => onChange({ ...config, minimumBudget: parseInt(e.target.value) || 200 })} className={inputCls} />
        </ConfigField>
      </div>
      <ConfigField label="Lead Time (hours in advance)">
        <input type="number" min="1" defaultValue={String((config['leadTimeHours'] as number) ?? 48)} onChange={e => onChange({ ...config, leadTimeHours: parseInt(e.target.value) || 48 })} className={inputCls} />
      </ConfigField>
    </div>
  );
}

function FeedbackConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" defaultChecked={(config['autoSendAfterOrder'] as boolean) ?? true} onChange={e => onChange({ ...config, autoSendAfterOrder: e.target.checked })} className="rounded border-slate-300 dark:border-white/[0.08] text-violet-600" />
        Auto-send follow-up after orders
      </label>
      <ConfigField label="Delay before sending (minutes)">
        <input type="number" min="1" defaultValue={String((config['delayMinutes'] as number) ?? 60)} onChange={e => onChange({ ...config, delayMinutes: parseInt(e.target.value) || 60 })} className={inputCls} />
      </ConfigField>
      <ConfigField label="Follow-up message">
        <input type="text" defaultValue={(config['followUpMessage'] as string) ?? ''} onChange={e => onChange({ ...config, followUpMessage: e.target.value })} className={inputCls} placeholder="Thanks for ordering! How was your experience? Reply 1-5" />
      </ConfigField>
    </div>
  );
}

function GiftCardConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const [denoms, setDenoms] = useState<number[]>((config['denominations'] as number[]) ?? [25, 50, 75, 100]);
  const [newDenom, setNewDenom] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <p className={labelCls}>Gift Card Amounts</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {denoms.map((d, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-md text-xs font-medium">
              ${d}
              <button onClick={() => { const updated = denoms.filter((_, j) => j !== i); setDenoms(updated); onChange({ ...config, denominations: updated }); }} className="hover:text-emerald-900">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="number" min="1" placeholder="Amount" value={newDenom} onChange={e => setNewDenom(e.target.value)} className={`w-28 ${inputCls}`} />
          <button onClick={() => { if (!newDenom) return; const updated = [...denoms, parseInt(newDenom)]; setDenoms(updated); onChange({ ...config, denominations: updated }); setNewDenom(''); }} className="px-3 py-2 text-xs bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100">Add</button>
        </div>
      </div>
      <ConfigField label="Expiration (months)">
        <input type="number" min="1" defaultValue={String((config['expirationMonths'] as number) ?? 12)} onChange={e => onChange({ ...config, expirationMonths: parseInt(e.target.value) || 12 })} className={inputCls} />
      </ConfigField>
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" defaultChecked={(config['allowCustomAmount'] as boolean) ?? true} onChange={e => onChange({ ...config, allowCustomAmount: e.target.checked })} className="rounded border-slate-300 dark:border-white/[0.08] text-violet-600" />
        Allow custom amounts
      </label>
    </div>
  );
}

function PromoConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const [promos, setPromos] = useState<Promo[]>((config['promos'] as Promo[]) ?? []);
  const [newPromo, setNewPromo] = useState({ name: '', description: '' });

  return (
    <div className="space-y-4">
      <div>
        <p className={labelCls}>Active Promotions</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2">Your AI agents will mention these to customers.</p>
        <ListManager
          items={promos}
          onAdd={() => {
            if (!newPromo.name) return;
            const updated = [...promos, { name: newPromo.name, description: newPromo.description, days: [] }];
            setPromos(updated);
            onChange({ ...config, promos: updated });
            setNewPromo({ name: '', description: '' });
          }}
          onRemove={(i) => { const updated = promos.filter((_, j) => j !== i); setPromos(updated); onChange({ ...config, promos: updated }); }}
          renderItem={(item) => { const p = item as Promo; return <span className="text-sm"><span className="font-medium text-slate-900 dark:text-white">{p.name}</span> {p.description && <span className="text-slate-400">— {p.description}</span>}</span>; }}
          addLabel="+ Add promo"
        >
          <input placeholder="Promo name (e.g. Taco Tuesday)" value={newPromo.name} onChange={e => setNewPromo(p => ({ ...p, name: e.target.value }))} className={`flex-1 ${inputCls}`} />
          <input placeholder="Description" value={newPromo.description} onChange={e => setNewPromo(p => ({ ...p, description: e.target.value }))} className={`flex-1 ${inputCls}`} />
        </ListManager>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" defaultChecked={(config['smsBlastEnabled'] as boolean) ?? false} onChange={e => onChange({ ...config, smsBlastEnabled: e.target.checked })} className="rounded border-slate-300 dark:border-white/[0.08] text-violet-600" />
        Enable SMS blast to opted-in contacts
      </label>
    </div>
  );
}

function ReviewConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-4">
      <ConfigField label="Response Tone">
        <select defaultValue={(config['tone'] as string) ?? 'professional'} onChange={e => onChange({ ...config, tone: e.target.value })} className={inputCls}>
          <option value="professional">Professional</option>
          <option value="casual">Casual & Friendly</option>
          <option value="apologetic">Apologetic</option>
        </select>
      </ConfigField>
      <ConfigField label="Alert on reviews rated ≤">
        <select defaultValue={String((config['alertOnRating'] as number) ?? 3)} onChange={e => onChange({ ...config, alertOnRating: parseInt(e.target.value) })} className={inputCls}>
          <option value="1">1 star</option>
          <option value="2">2 stars</option>
          <option value="3">3 stars</option>
          <option value="4">4 stars</option>
        </select>
      </ConfigField>
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" defaultChecked={(config['autoAlert'] as boolean) ?? true} onChange={e => onChange({ ...config, autoAlert: e.target.checked })} className="rounded border-slate-300 dark:border-white/[0.08] text-violet-600" />
        Send alerts for negative reviews
      </label>
    </div>
  );
}

function TableConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-4">
      <ConfigField label="Average Dining Time (minutes)">
        <input type="number" min="10" defaultValue={String((config['avgDiningMinutes'] as number) ?? 60)} onChange={e => onChange({ ...config, avgDiningMinutes: parseInt(e.target.value) || 60 })} className={inputCls} />
      </ConfigField>
      <p className="text-[10px] text-slate-400 dark:text-slate-500">Table management coming soon. This helps your AI agents estimate wait times more accurately.</p>
    </div>
  );
}

function DeliveryConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <ConfigField label="Default Delivery Time (minutes)">
          <input type="number" min="5" defaultValue={String((config['defaultDeliveryMinutes'] as number) ?? 30)} onChange={e => onChange({ ...config, defaultDeliveryMinutes: parseInt(e.target.value) || 30 })} className={inputCls} />
        </ConfigField>
        <ConfigField label="Delivery Fee ($)">
          <input type="number" min="0" step="0.5" defaultValue={String((config['deliveryFee'] as number) ?? 0)} onChange={e => onChange({ ...config, deliveryFee: parseFloat(e.target.value) || 0 })} className={inputCls} />
        </ConfigField>
      </div>
      <ConfigField label="Delivery Radius (miles)">
        <input type="number" min="0.5" step="0.5" defaultValue={String((config['deliveryRadius'] as number) ?? 5)} onChange={e => onChange({ ...config, deliveryRadius: parseFloat(e.target.value) || 5 })} className={inputCls} />
      </ConfigField>
    </div>
  );
}

const CONFIG_COMPONENTS: Record<string, React.ComponentType<{ config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }>> = {
  TAKEOUT_ORDERS: TakeoutConfig,
  WAITLIST: WaitlistConfig,
  DAILY_SPECIALS: DailySpecialsConfig,
  CATERING_REQUESTS: CateringConfig,
  FEEDBACK_COLLECTION: FeedbackConfig,
  GIFT_CARD_LOYALTY: GiftCardConfig,
  PROMO_ALERTS: PromoConfig,
  REVIEW_RESPONSE: ReviewConfig,
  TABLE_TURNOVER: TableConfig,
  DELIVERY_TRACKING: DeliveryConfig,
};

/* ── Main Page ─────────────────────────────────────────────────── */

export default function ToolsPage() {
  const { business, loading: bizLoading } = useBusiness();
  const [catalog, setCatalog] = useState<CatalogTool[]>([]);
  const [enabledTools, setEnabledTools] = useState<EnabledTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [pendingConfig, setPendingConfig] = useState<Record<string, unknown>>({});

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

  const showToast = (message: string, type: 'success' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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
        setPendingConfig(json.tool.config ?? defaultConfig);
        showToast('Tool enabled! Configure it below.', 'success');
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
      if (json.success) {
        await fetchEnabled();
        setConfiguring(null);
        showToast('Tool disabled.', 'info');
      }
    } finally {
      setSaving(false);
    }
  };

  const saveConfig = async (toolId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/business-tools/${toolId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: pendingConfig }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchEnabled();
        setConfiguring(null);
        showToast('Configuration saved! Your AI agents will use these settings.', 'success');
      }
    } finally {
      setSaving(false);
    }
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
          Enable AI-powered tools for your phone agent and chatbot. When you configure a tool, your AI agents automatically learn the settings.
        </p>
        <div className="flex items-center gap-3 mt-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {enabledTools.filter(t => t.enabled).length} active
          </span>
          <span className="text-xs text-slate-400">{catalog.length} available</span>
        </div>
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
            const ConfigComponent = CONFIG_COMPONENTS[tool.type];

            return (
              <div key={tool.type} className={`bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border rounded-xl overflow-hidden transition-all duration-300 ${
                enabled
                  ? 'border-violet-300 dark:border-violet-500/30 shadow-sm shadow-violet-100 dark:shadow-violet-500/5'
                  : 'border-slate-200 dark:border-white/[0.08]'
              }`}>
                {/* Tool Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-white/[0.06]">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${enabled ? 'bg-violet-100 dark:bg-violet-500/15' : 'bg-slate-100 dark:bg-white/[0.06]'}`}>
                      <span className={`text-lg ${enabled ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'}`}>
                        {tool.type === 'TAKEOUT_ORDERS' && '🛒'}
                        {tool.type === 'WAITLIST' && '⏳'}
                        {tool.type === 'DAILY_SPECIALS' && '⭐'}
                        {tool.type === 'CATERING_REQUESTS' && '🍽️'}
                        {tool.type === 'REVIEW_RESPONSE' && '💬'}
                        {tool.type === 'FEEDBACK_COLLECTION' && '👍'}
                        {tool.type === 'PROMO_ALERTS' && '📢'}
                        {tool.type === 'TABLE_TURNOVER' && '🪑'}
                        {tool.type === 'DELIVERY_TRACKING' && '🚗'}
                        {tool.type === 'GIFT_CARD_LOYALTY' && '🎁'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{tool.name}</h3>
                        {enabled && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{tool.description}</p>
                    </div>
                  </div>
                </div>

                {/* Capabilities */}
                {!isConfiguring && (
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
                )}

                {/* Config Panel — tool-specific */}
                {isConfiguring && enabled && ConfigComponent && (
                  <div className="px-6 py-5 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2 mb-4">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-500"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                      <p className="text-xs font-semibold text-slate-700 dark:text-white">Configure {tool.name}</p>
                    </div>
                    <ConfigComponent config={pendingConfig} onChange={setPendingConfig} />
                    <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                      <button onClick={() => saveConfig(enabled.id)} disabled={saving}
                        className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save'}
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
                      <button onClick={() => {
                        if (isConfiguring) { setConfiguring(null); } else { setConfiguring(tool.type); setPendingConfig(enabled.config ?? {}); }
                      }}
                        className="px-4 py-2 text-sm font-medium bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors">
                        <span className="flex items-center gap-1.5">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                          {isConfiguring ? 'Close' : 'Configure'}
                        </span>
                      </button>
                      <button onClick={() => disableTool(enabled.id)} disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors disabled:opacity-50">
                        Disable
                      </button>
                      {(() => {
                        const links: Record<string, { href: string; label: string }> = {
                          TAKEOUT_ORDERS: { href: '/orders', label: 'View Orders' },
                          WAITLIST: { href: '/waitlist', label: 'View Waitlist' },
                          CATERING_REQUESTS: { href: '/catering', label: 'View Requests' },
                          FEEDBACK_COLLECTION: { href: '/feedback', label: 'View Feedback' },
                          GIFT_CARD_LOYALTY: { href: '/gift-cards', label: 'View Cards' },
                        };
                        const link = links[tool.type];
                        return link ? (
                          <a href={link.href} className="ml-auto px-4 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors">
                            {link.label} →
                          </a>
                        ) : null;
                      })()}
                    </>
                  ) : (
                    <button onClick={() => enableTool(tool.type, tool.defaultConfig)} disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-all hover:shadow-md hover:shadow-violet-600/20 disabled:opacity-50">
                      {saving ? (
                        <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enabling...</>
                      ) : (
                        <><svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg> Enable for your AI agents</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-fade-up ${
          toast.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
            : 'bg-slate-50 dark:bg-white/[0.06] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300'
        }`}>
          {toast.type === 'success' ? (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
          )}
          {toast.message}
        </div>
      )}

      {/* Coming Soon Section */}
      <div className="mt-12">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Coming Soon — Other Industries</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'Appointment Booking', desc: 'AI schedules appointments for service businesses', industry: 'Barber Shops, Salons, Spas' },
            { name: 'Class & Session Booking', desc: 'Book fitness classes, sessions, and memberships', industry: 'Gyms, Studios, Training' },
            { name: 'Service Quotes', desc: 'AI collects job details and generates service quotes', industry: 'Contractors, Auto Shops' },
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
