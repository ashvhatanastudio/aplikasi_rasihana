import React, { useState } from 'react';
import Shell from './components/layout/Shell';
import POSView from './views/POSView';
import DashboardView from './views/DashboardView';
import CustomersView from './views/CustomersView';
import ProductsView from './views/ProductsView';
import ReportsView from './views/ReportsView';
import LoginView from './views/LoginView';
import { useAuth } from './hooks/useAuth';
import { Toaster } from '@/src/components/ui/sonner';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, profile, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-slate-900 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginView />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  const userRole = profile?.role || 'kasir';
  const fullName = profile?.full_name || user.email?.split('@')[0] || 'User';

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNewTransaction={() => setActiveTab('pos')} />;
      case 'pos':
        return <POSView />;
      case 'customers':
        return <CustomersView />;
      case 'products':
        return <ProductsView />;
      case 'reports':
        return <ReportsView />;
      case 'users':
        return <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest border-2 border-dashed rounded-3xl">Manajemen Akses Sistem</div>;
      default:
        return <DashboardView onNewTransaction={() => setActiveTab('pos')} />;
    }
  };

  return (
    <div className="selection:bg-blue-100 selection:text-blue-900">
      <Shell activeId={activeTab} setActiveId={setActiveTab} userRole={userRole}>
        {renderContent()}
      </Shell>
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
