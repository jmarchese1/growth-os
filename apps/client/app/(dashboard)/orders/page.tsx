'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../../../components/auth/business-provider';
import { KpiCard } from '../../../components/ui/kpi-card';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

const STATUS_BADGES: Record<string, string> = {
  RECEIVED: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  CONFIRMED: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  PREPARING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  READY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  PICKED_UP: 'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400',
  CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
};

const SOURCE_BADGES: Record<string, string> = {
  VOICE_AGENT: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  CHATBOT: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  WEBSITE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  MANUAL: 'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400',
};

const SOURCE_LABELS: Record<string, string> = {
  VOICE_AGENT: 'Phone',
  CHATBOT: 'Chat',
  WEBSITE: 'Web',
  MANUAL: 'Manual',
};

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

interface Order {
  id: string;
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
  specialNotes?: string;
  pickupTime?: string;
  estimatedReady?: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  source: string;
  createdAt: string;
}

interface Stats {
  totalOrders: number;
  activeOrders: number;
  revenue: number;
  byStatus: Record<string, number>;
}

export default function OrdersPage() {
  const { business, loading: bizLoading } = useBusiness();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [toolEnabled, setToolEnabled] = useState<boolean | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ businessId: business.id });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API_URL}/orders?${params}`);
      const json = await res.json();
      if (json.success) setOrders(json.orders);
    } finally {
      setLoading(false);
    }
  }, [business?.id, statusFilter]);

  const fetchStats = useCallback(async () => {
    if (!business?.id) return;
    try {
      const res = await fetch(`${API_URL}/orders/stats/${business.id}`);
      const json = await res.json();
      if (json.success) setStats(json.stats);
    } catch { /* ignore */ }
  }, [business?.id]);

  const checkTool = useCallback(async () => {
    if (!business?.id) return;
    try {
      const res = await fetch(`${API_URL}/business-tools?businessId=${business.id}`);
      const json = await res.json();
      if (json.success) {
        const orderTool = json.tools.find((t: { type: string }) => t.type === 'TAKEOUT_ORDERS');
        setToolEnabled(orderTool?.enabled ?? false);
      }
    } catch {
      setToolEnabled(false);
    }
  }, [business?.id]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { checkTool(); }, [checkTool]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
        if (selectedOrder?.id === orderId) setSelectedOrder({ ...selectedOrder, status });
        fetchStats();
      }
    } catch { /* ignore */ }
  };

  if (bizLoading) return (
    <div className="p-8 flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );
  if (!business) return null;

  if (toolEnabled === false) {
    return (
      <div className="p-8 animate-fade-up">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Orders</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Takeout order management</p>
        </div>
        <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-violet-100 dark:bg-violet-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-violet-600 dark:text-violet-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Takeout Orders Not Enabled</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
            Enable the Takeout Orders tool from the Tool Library to let your AI phone agent and chatbot take orders from customers.
          </p>
          <a href="/tools" className="inline-flex px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">
            Go to Tool Library
          </a>
        </div>
      </div>
    );
  }

  const nextStatus: Record<string, string> = {
    RECEIVED: 'CONFIRMED',
    CONFIRMED: 'PREPARING',
    PREPARING: 'READY',
    READY: 'PICKED_UP',
  };

  const nextLabel: Record<string, string> = {
    RECEIVED: 'Confirm',
    CONFIRMED: 'Start Preparing',
    PREPARING: 'Mark Ready',
    READY: 'Mark Picked Up',
  };

  return (
    <div className="p-8 animate-fade-up">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Orders</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage takeout orders from phone, chat, and walk-ins</p>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Active Orders" value={stats.activeOrders} color="violet" icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
          } />
          <KpiCard label="Total Orders (30d)" value={stats.totalOrders} color="sky" icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" /></svg>
          } />
          <KpiCard label="Revenue (30d)" value={`$${stats.revenue.toFixed(2)}`} color="emerald" icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>
          } />
          <KpiCard label="Cancelled" value={stats.byStatus['CANCELLED'] ?? 0} color="rose" icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
          } />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {['', 'RECEIVED', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === s
                ? 'bg-violet-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:bg-white/[0.1]'
            }`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Orders</h2>
          <span className="text-xs text-slate-400">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="px-5 py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">No orders yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Items</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pickup</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Source</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Time</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/[0.04]">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => setSelectedOrder(order)}>
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{order.customerName}</p>
                    {order.customerPhone && <p className="text-[11px] text-slate-400">{order.customerPhone}</p>}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-slate-900 dark:text-white">${order.total.toFixed(2)}</td>
                  <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{order.pickupTime ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${SOURCE_BADGES[order.source] ?? ''}`}>
                      {SOURCE_LABELS[order.source] ?? order.source}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGES[order.status] ?? ''}`}>
                      {order.status.toLowerCase().replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[11px] text-slate-400">
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1.5">
                      {nextStatus[order.status] && (
                        <button onClick={() => updateStatus(order.id, nextStatus[order.status])}
                          className="px-2.5 py-1 text-[11px] font-medium bg-violet-600 text-white rounded-md hover:bg-violet-700 transition-colors">
                          {nextLabel[order.status]}
                        </button>
                      )}
                      {order.status !== 'CANCELLED' && order.status !== 'PICKED_UP' && (
                        <button onClick={() => updateStatus(order.id, 'CANCELLED')}
                          className="px-2.5 py-1 text-[11px] font-medium text-rose-600 bg-rose-50 rounded-md hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 transition-colors">
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedOrder(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#0f0d1a] border-l border-slate-200 dark:border-white/[0.08] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Order Details</h2>
                <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              </div>

              {/* Customer */}
              <div className="mb-6">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Customer</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedOrder.customerName}</p>
                {selectedOrder.customerPhone && <p className="text-sm text-slate-500">{selectedOrder.customerPhone}</p>}
              </div>

              {/* Status */}
              <div className="mb-6">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Status</p>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGES[selectedOrder.status]}`}>
                  {selectedOrder.status.toLowerCase().replace('_', ' ')}
                </span>
              </div>

              {/* Items */}
              <div className="mb-6">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Items</p>
                <div className="space-y-2">
                  {selectedOrder.items.map(item => (
                    <div key={item.id} className="flex items-start justify-between bg-slate-50 dark:bg-white/[0.04] rounded-lg p-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{item.quantity}x {item.name}</p>
                        {item.notes && <p className="text-[11px] text-slate-500 mt-0.5">{item.notes}</p>}
                      </div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Notes */}
              {selectedOrder.specialNotes && (
                <div className="mb-6">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Special Notes</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 bg-amber-50 dark:bg-amber-500/10 rounded-lg p-3">{selectedOrder.specialNotes}</p>
                </div>
              )}

              {/* Totals */}
              <div className="mb-6 border-t border-slate-100 dark:border-white/[0.06] pt-4">
                <div className="flex justify-between text-sm text-slate-500 mb-1">
                  <span>Subtotal</span><span>${selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                {selectedOrder.tax > 0 && (
                  <div className="flex justify-between text-sm text-slate-500 mb-1">
                    <span>Tax</span><span>${selectedOrder.tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold text-slate-900 dark:text-white">
                  <span>Total</span><span>${selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {nextStatus[selectedOrder.status] && (
                  <button onClick={() => updateStatus(selectedOrder.id, nextStatus[selectedOrder.status])}
                    className="flex-1 px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">
                    {nextLabel[selectedOrder.status]}
                  </button>
                )}
                {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'PICKED_UP' && (
                  <button onClick={() => updateStatus(selectedOrder.id, 'CANCELLED')}
                    className="px-4 py-2.5 text-sm font-medium text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 transition-colors">
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
