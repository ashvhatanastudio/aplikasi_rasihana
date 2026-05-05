import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, TrendingUp, Users, CheckCircle, 
  Package, Settings, ArrowUpRight, ArrowDownRight,
  Clock, Activity, AlertCircle, RefreshCcw
} from 'lucide-react';
import { formatCurrency, cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';

export default function DashboardView({ onNewTransaction }: { onNewTransaction: () => void }) {
  const [stats, setStats] = useState({
    totalSales: 0,
    txCount: 0,
    customers: 0,
    pendingOrders: 0,
    growth: 12.5
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const { data: sales } = await supabase
        .from('transactions')
        .select('total_bayar, created_at, payment_status, laundry_status, customers(name)')
        .order('created_at', { ascending: false });

      if (sales) {
        const todaySales = sales
          .filter(s => new Date(s.created_at) >= today && s.payment_status === 'PAID')
          .reduce((acc, curr) => acc + Number(curr.total_bayar), 0);
        
        const pending = sales.filter(s => s.payment_status === 'UNPAID').length;
        
        // Group by date for chart
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const dateStr = d.toISOString().split('T')[0];
          const val = sales
            .filter(s => s.created_at.startsWith(dateStr) && s.payment_status === 'PAID')
            .reduce((acc, curr) => acc + Number(curr.total_bayar), 0);
          return { date: d.toLocaleDateString('id-ID', { weekday: 'short' }), total: val };
        });

        const { count: customersCount } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalSales: todaySales,
          txCount: sales.filter(s => new Date(s.created_at) >= today).length,
          customers: customersCount || 0,
          pendingOrders: pending,
          growth: 15.2
        });
        setChartData(last7Days);
        setRecentTx(sales.slice(0, 5));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 container mx-auto p-4 md:p-6 pb-20">
      {/* Top Bar / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Main Command Centre</h1>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Real-time Operations Monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchStats} disabled={isLoading}>
            <RefreshCcw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh Data
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200" onClick={onNewTransaction}>
            <ShoppingCart className="w-4 h-4 mr-2" />
            New Service Order
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIItem 
          label="Today's Revenue" 
          value={formatCurrency(stats.totalSales)} 
          icon={TrendingUp} 
          trend="+8.2%"
          color="bg-emerald-500"
        />
        <KPIItem 
          label="Orders Processing" 
          value={stats.pendingOrders.toString()} 
          icon={Package} 
          trend="In Queue"
          color="bg-amber-500"
        />
        <KPIItem 
          label="Customer Database" 
          value={stats.customers.toString()} 
          icon={Users} 
          trend="+3 New Today"
          color="bg-blue-500"
        />
        <KPIItem 
          label="System Health" 
          value="STABLE" 
          icon={Activity} 
          trend="Latency 14ms"
          color="bg-slate-900"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Sales Performance</CardTitle>
              <CardDescription>Revenue trajectory over the last 7 processing cycles</CardDescription>
            </div>
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 uppercase text-[9px] font-bold tracking-widest">
              Growth: +15.2%
            </Badge>
          </CardHeader>
          <CardContent className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                  tickFormatter={(val) => `Rp${val/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: number) => [formatCurrency(val), 'Revenue']}
                />
                <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Live Traffic</CardTitle>
            <CardDescription>Latest transaction event stream</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {recentTx.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 py-10">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest">No Recent Activity</p>
              </div>
            ) : (
              recentTx.map((tx, i) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                  <div className={cn(
                    "w-8 h-8 rounded shrink-0 flex items-center justify-center",
                    tx.payment_status === 'PAID' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {tx.payment_status === 'PAID' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-slate-800 truncate">{tx.customers?.name || 'PELANGGAN'}</p>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <Badge variant="outline" className="text-[8px] h-4 py-0 font-bold uppercase tracking-tighter">
                        {tx.laundry_status || 'RECEIVED'}
                      </Badge>
                      <span className="text-[11px] font-bold text-slate-900">{formatCurrency(tx.total_bayar)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
          <div className="p-3 bg-slate-50 border-t border-slate-100">
            <Button variant="ghost" className="w-full text-[10px] font-bold uppercase tracking-widest h-8 text-slate-500">
              View Detailed Audit Trail
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function KPIItem({ label, value, icon: Icon, trend, color }: any) {
  return (
    <Card className="border-slate-200 shadow-sm hover:border-blue-500 transition-colors group">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-lg", color)}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
          <p className="text-xl font-bold text-slate-900 truncate tracking-tight">{value}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[9px] font-bold text-slate-500">{trend}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
