import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Trash2, UserPlus, Phone, 
  Loader2, User, MoreVertical, ExternalLink 
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Badge } from '@/src/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/src/components/ui/table';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription 
} from '@/src/components/ui/dialog';
import { Label } from '@/src/components/ui/label';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/src/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function CustomersView() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({ name: '', whatsapp: '', address: '' });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      if (data) setCustomers(data);
    } catch (err: any) {
      toast.error('Gagal memuat pelanggan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error('Nama wajib diisi');
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('customers')
        .insert([formData]);

      if (error) throw error;
      
      toast.success('Pelanggan berhasil didaftarkan');
      setFormData({ name: '', whatsapp: '', address: '' });
      setShowModal(false);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Data pelanggan dihapus');
      fetchCustomers();
    } catch (err: any) {
      toast.error('Gagal hapus: Pelanggan mungkin memiliki riwayat transaksi aktif.');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.whatsapp.includes(search)
  );

  return (
    <div className="space-y-6 container mx-auto p-4 md:p-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Client Hub</h1>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Personnel & Registry Management</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
          <UserPlus className="w-4 h-4 mr-2" /> Register New Entry
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex items-center">
          <Search className="w-4 h-4 text-slate-400 mr-3" />
          <Input 
            placeholder="Search by identity or contact protocol..."
            className="border-none shadow-none bg-transparent focus-visible:ring-0 text-xs font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest">Client Identity</TableHead>
                <TableHead className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest">Comm. Protocol</TableHead>
                <TableHead className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest">Postal Location</TableHead>
                <TableHead className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-right">Operations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 opacity-20" />
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center text-slate-400 text-xs italic">
                    No matching identities found in registry.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell className="px-6 py-4 capitalize font-bold text-slate-900 border-l-2 border-transparent group-hover:border-blue-500">
                      {customer.name}
                    </TableCell>
                    <TableCell className="px-6 py-4 font-mono font-bold text-slate-500">
                      {customer.whatsapp}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-slate-400 max-w-xs truncate italic">
                      {customer.address || 'Location undefined'}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-slate-900">
                               <MoreVertical className="w-4 h-4" />
                            </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-xs font-bold uppercase transition-colors">
                               <ExternalLink className="w-3 h-3 mr-2" /> View History
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-xs font-bold uppercase text-red-500 focus:bg-red-50 focus:text-red-500 transition-colors"
                              onClick={() => deleteCustomer(customer.id)}
                            >
                               <Trash2 className="w-3 h-3 mr-2" /> Purge Entry
                            </DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Client Identity Enrollment</DialogTitle>
            <DialogDescription>Input new personnel data to the internal central registry.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Designation</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="e.g. John Matrix" 
                className="h-11 border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">WhatsApp / Secure Line</Label>
              <Input 
                value={formData.whatsapp} 
                onChange={e => setFormData({...formData, whatsapp: e.target.value})} 
                placeholder="62812XXXX" 
                className="h-11 border-slate-200 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Stationary Address</Label>
              <Input 
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})} 
                placeholder="Unit, Floor, Street..." 
                className="h-11 border-slate-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} className="uppercase text-[10px] font-bold tracking-widest">Abort</Button>
            <Button onClick={handleAddCustomer} disabled={isSubmitting} className="uppercase text-[10px] font-bold tracking-widest">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Commit Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
