import React from 'react';
import { 
  Home, ShoppingCart, BarChart2, Users, Package, 
  Settings, LogOut, Menu, X, Bell, User, CalendarPlus
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Button } from '@/src/components/ui/button';
import { useAuth } from '@/src/hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/src/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/components/ui/avatar';

type NavItem = {
  label: string;
  icon: React.ElementType;
  id: string;
  roles: string[];
};

const navItems: NavItem[] = [
  { label: 'Overview', icon: Home, id: 'dashboard', roles: ['super_admin', 'admin', 'kasir'] },
  { label: 'Terminal POS', icon: ShoppingCart, id: 'pos', roles: ['super_admin', 'admin', 'kasir'] },
  { label: 'Booking Pesanan', icon: CalendarPlus, id: 'booking', roles: ['super_admin', 'admin', 'kasir'] },
  { label: 'Service Pipeline', icon: BarChart2, id: 'reports', roles: ['super_admin', 'admin', 'kasir'] },
  { label: 'Client Registry', icon: Users, id: 'customers', roles: ['super_admin', 'admin'] },
  { label: 'Service Assets', icon: Package, id: 'products', roles: ['super_admin', 'admin'] },
  { label: 'System Access', icon: Settings, id: 'users', roles: ['super_admin'] },
];

interface ShellProps {
  children: React.ReactNode;
  activeId: string;
  setActiveId: (id: string) => void;
  userRole: string;
}

export default function Shell({ children, activeId, setActiveId, userRole }: ShellProps) {
  const { logout, profile } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const filteredNav = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col sticky top-0 h-screen shrink-0 z-40">
        <div className="p-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-slate-200">
               S
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tighter text-slate-900 uppercase">SETRIKA.OS</h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-widest leading-none">CORE ENGINE V2</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-3 mb-4">Operations</p>
          {filteredNav.map((item) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveId(item.id)}
                className={cn(
                  "flex items-center w-full px-3 py-2.5 rounded-lg text-xs transition-all duration-200 font-bold uppercase tracking-wider group",
                  isActive 
                    ? "bg-slate-900 text-white shadow-md" 
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-4 h-4 mr-3 transition-colors", isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-600")} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-100">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
             <Avatar className="w-9 h-9 rounded-lg border border-white">
                <AvatarFallback className="bg-blue-600 text-white font-bold text-xs">
                  {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
             </Avatar>
             <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{profile?.full_name || 'System User'}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{userRole}</p>
             </div>
             <button onClick={() => logout()} className="text-slate-300 hover:text-red-500 transition-colors">
                <LogOut className="w-4 h-4" />
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-100 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu className="w-5 h-5 text-slate-600" />
             </Button>
             <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest hidden md:block">
               {navItems.find(n => n.id === activeId)?.label || 'Console'}
             </h2>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Network Status: Online</span>
             </div>
             <Button variant="ghost" size="icon" className="relative group">
                <Bell className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full border-2 border-white" />
             </Button>
             <div className="h-8 w-px bg-slate-100 mx-1" />
             <Button variant="ghost" size="sm" className="font-bold text-[10px] uppercase tracking-widest text-slate-500">
               Support
             </Button>
          </div>
        </header>

        {/* Dynamic Viewport */}
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full">
             {children}
          </div>
        </main>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[50]"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-white z-[60] shadow-2xl flex flex-col"
            >
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black">S</div>
                  <h1 className="text-sm font-black tracking-tighter">SETRIKA.OS</h1>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <nav className="flex-1 px-4 py-2 space-y-1">
                {filteredNav.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveId(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center w-full px-4 py-3 rounded-xl text-sm transition-all font-bold uppercase tracking-wider",
                      activeId === item.id 
                        ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
                        : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 mr-4", activeId === item.id ? "text-blue-400" : "text-slate-400")} />
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="p-6 border-t border-slate-100">
                <Button variant="outline" className="w-full text-red-500 border-red-50" onClick={() => logout()}>
                  <LogOut className="w-4 h-4 mr-2" /> Keluar Sistem
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
