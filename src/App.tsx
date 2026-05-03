import React, { useState } from 'react';
import Shell from './components/layout/Shell';
import POSView from './views/POSView';
import DashboardView from './views/DashboardView';
import CustomersView from './views/CustomersView';
import ProductsView from './views/ProductsView';
import ReportsView from './views/ReportsView';
import LoginView from './views/LoginView';
import { useAuth } from './hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, profile, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-[#064e3b] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
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
        return <div className="p-8 text-center text-gray-500 bg-white rounded-xl border">Manajemen Kasir</div>;
      default:
        return <DashboardView onNewTransaction={() => setActiveTab('pos')} />;
    }
  };

  return (
    <Shell activeId={activeTab} setActiveId={setActiveTab} userRole={userRole}>
      <div className="max-w-7xl mx-auto">
        {renderContent()}
      </div>
    </Shell>
  );
}
