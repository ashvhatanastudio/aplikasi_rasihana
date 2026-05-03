import React, { useState, useEffect } from 'react';
import { ShoppingCart, TrendingUp, Users, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';

export default function DashboardView({ onNewTransaction }: { onNewTransaction: () => void }) {
  const [stats, setStats] = useState({
    totalSales: 0,
    txCount: 0,
    customers: 0,
    pendingOrders: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Total Sales (Paid only)
    const { data: sales } = await supabase
      .from('transactions')
      .select('total_bayar')
      .eq('payment_status', 'PAID')
      .gte('created_at', today.toISOString());

    // Transaction Count (All today)
    const { count: txToday } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // Pending Orders (Unpaid)
    const { count: pendingCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'UNPAID');

    const { count: customersCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    const total = sales?.reduce((acc, curr) => acc + Number(curr.total_bayar), 0) || 0;
    setStats({
      totalSales: total,
      txCount: txToday || 0,
      customers: customersCount || 0,
      pendingOrders: pendingCount || 0
    });
  };

  const statCards = [
    { label: 'Penjualan Hari Ini', value: formatCurrency(stats.totalSales), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Orders', value: stats.pendingOrders.toString(), icon: ShoppingCart, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Total Pelanggan', value: stats.customers.toString(), icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-slate-900 rounded border border-slate-800 p-8 text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="relative z-10">
          <h1 className="text-xl font-bold tracking-tight mb-2 uppercase">Systems Operational: <span className="text-blue-400">Stable</span></h1>
          <p className="text-slate-400 text-sm max-w-md">Connected to Core Banking Engine V.2.0.4. Ready for transaction processing and customer lifecycle management.</p>
          <button 
            onClick={onNewTransaction}
            className="mt-6 bg-blue-600 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-widest flex items-center shadow-lg hover:bg-blue-700 transition-all border border-blue-500"
          >
            <ShoppingCart className="w-4 h-4 mr-2" /> Launch Terminal
          </button>
        </div>
        <div className="flex gap-4 relative z-10">
          <div className="text-center p-4 bg-slate-800 rounded border border-slate-700 w-32">
            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Queue</div>
            <div className="text-xl font-bold text-orange-400">{stats.pendingOrders}</div>
          </div>
          <div className="text-center p-4 bg-slate-800 rounded border border-slate-700 w-32">
            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Sync</div>
            <div className="text-xl font-bold text-blue-400">100%</div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full -mr-48 -mt-48 opacity-10 blur-3xl"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className={cn("p-2.5 rounded", stat.bg)}>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-bold text-slate-900 font-mono tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links / Recent */}
      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 bg-slate-50 border-b border-slate-200">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Administrative Control</h3>
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 font-sans">
          {[
            { label: 'Inventory Audit', icon: Package },
            { label: 'Registry Look-up', icon: Users },
            { label: 'Financial Ledger', icon: TrendingUp },
            { label: 'System Protocols', icon: Settings }
          ].map((action, i) => (
            <button key={i} className="p-3 border border-slate-200 rounded text-left hover:border-blue-300 hover:bg-slate-50 transition-all flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                <action.icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper local import fix
import { cn } from '@/src/lib/utils';
import { Package, Settings } from 'lucide-react';

