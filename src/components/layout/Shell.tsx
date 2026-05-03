import React, { useState, useEffect } from 'react';
import { Home, ShoppingCart, BarChart2, Users, Package, Settings, LogOut } from 'lucide-react';
import { cn } from '@/src/lib/utils';

type NavItem = {
  label: string;
  icon: React.ElementType;
  id: string;
  roles: string[];
};

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: Home, id: 'dashboard', roles: ['super_admin', 'admin', 'kasir'] },
  { label: 'Transaksi', icon: ShoppingCart, id: 'pos', roles: ['super_admin', 'admin', 'kasir'] },
  { label: 'Laporan & Antrean', icon: BarChart2, id: 'reports', roles: ['super_admin', 'admin', 'kasir'] },
  { label: 'Pelanggan', icon: Users, id: 'customers', roles: ['super_admin', 'admin'] },
  { label: 'Produk/Stok', icon: Package, id: 'products', roles: ['super_admin', 'admin'] },
  { label: 'User', icon: Settings, id: 'users', roles: ['super_admin'] },
];

interface ShellProps {
  children: React.ReactNode;
  activeId: string;
  setActiveId: (id: string) => void;
  userRole: string;
}

export default function Shell({ children, activeId, setActiveId, userRole }: ShellProps) {
  const filteredNav = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-56 bg-slate-50 border-r border-slate-200 text-slate-900 flex-col sticky top-0 h-screen shrink-0">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">SP</div>
            <div>
              <h1 className="text-xs font-bold tracking-tight uppercase">Setrika POS</h1>
              <p className="text-[9px] text-slate-500 uppercase font-medium tracking-wider">v2.0.4-stable</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 px-2 tracking-widest">Menu Utama</div>
          {filteredNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveId(item.id)}
              className={cn(
                "flex items-center w-full px-3 py-2 rounded text-xs transition-all font-medium",
                activeId === item.id 
                  ? "bg-blue-50 text-blue-700 border border-blue-100 shadow-sm" 
                  : "text-slate-600 hover:bg-slate-200"
              )}
            >
              <item.icon className={cn("w-4 h-4 mr-3", activeId === item.id ? "text-blue-600" : "text-slate-400")} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200 bg-slate-100/50">
          <button className="flex items-center w-full px-3 py-2 text-slate-600 hover:text-slate-900 transition-colors text-xs font-medium">
            <LogOut className="w-4 h-4 mr-3 text-slate-400" />
            Keluar Sistem
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 pb-20 md:pb-0 bg-white">
        <header className="bg-white border-b border-slate-200 h-14 px-6 flex justify-between items-center sticky top-0 z-10 shrink-0">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
            {navItems.find(n => n.id === activeId)?.label || 'Aplikasi POS'}
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold">JD</div>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">
              Status: {userRole}
            </span>
          </div>
        </header>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* Bottom Nav Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center p-2 z-50">
        {filteredNav.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveId(item.id)}
            className={cn(
              "flex flex-col items-center p-2 rounded-lg transition-all",
              activeId === item.id ? "text-[#064e3b]" : "text-gray-400"
            )}
          >
            <item.icon className={cn("w-6 h-6", activeId === item.id ? "stroke-2" : "stroke-1.5")} />
            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
