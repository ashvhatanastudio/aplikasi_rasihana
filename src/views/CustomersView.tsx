import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, UserPlus, Phone, Mail, Loader2, User } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

export default function CustomersView() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) console.error('Error fetching customers:', error);
    if (data) setCustomers(data);
    setLoading(false);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{ name, whatsapp, address }])
        .select();

      if (error) {
        console.error('DB Insert Error:', error);
        setErrorMessage(error.message);
      } else {
        setName('');
        setWhatsapp('');
        setAddress('');
        setShowModal(false);
        fetchCustomers();
      }
    } catch (err: any) {
      setErrorMessage('Terjadi kesalahan fatal: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCustomer = async (id: string) => {
    if (!confirm('Hapus pelanggan ini?')) return;
    
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Gagal menghapus: Pelanggan mungkin memiliki riwayat transaksi.');
    } else {
      fetchCustomers();
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.whatsapp.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Internal Registry</h1>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Personnel & Clients Identification</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-widest flex items-center shadow-lg hover:bg-blue-700 transition-all"
        >
          <UserPlus className="w-3.5 h-3.5 mr-2" /> Register New Entry
        </button>
      </div>

      <div className="bg-white rounded border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center group">
          <Search className="w-4 h-4 text-slate-400 mr-3 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by identity or contact digits..."
            className="bg-transparent border-none outline-none text-xs font-medium w-full text-slate-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] uppercase tracking-widest font-bold text-slate-400 border-b border-slate-200">
                <th className="px-6 py-3 font-bold">Identity</th>
                <th className="px-6 py-3 font-bold">Communication</th>
                <th className="px-6 py-3 font-bold">Postal Address</th>
                <th className="px-6 py-3 font-bold text-right">Protocol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-400 text-xs font-medium italic">
                    No matching records found in central node.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center text-[11px] font-mono font-bold text-slate-600">
                          <Phone className="w-3 h-3 mr-1.5 text-slate-300" /> {customer.whatsapp}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] text-slate-500 font-medium line-clamp-1">{customer.address || '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => deleteCustomer(customer.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden relative z-10"
            >
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identity Enrollment</h3>
              </div>
              <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded text-[10px] text-red-600 font-bold uppercase tracking-tight">
                    {errorMessage}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Designation</label>
                  <input 
                    required
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    placeholder="CLIENT_NAME_01"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Contact Protocol (WA)</label>
                  <input 
                    required
                    type="text" 
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-bold font-mono bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    placeholder="628123XXX"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Operational Area (Address)</label>
                  <textarea 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-medium bg-slate-50 focus:bg-white focus:border-blue-500 outline-none h-20 resize-none"
                    placeholder="LOC_COORDINATES..."
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded"
                  >
                    Abort
                  </button>
                  <button 
                    disabled={isSubmitting}
                    className="flex-3 bg-blue-600 text-white px-4 py-2.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center justify-center hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <UserPlus className="w-3.5 h-3.5 mr-2" />}
                    Confirm Registration
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
