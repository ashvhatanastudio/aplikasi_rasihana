import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Trash2, Package, Tag, Layers, 
  Loader2, MoreVertical, Edit3 
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { formatCurrency, cn } from '@/src/lib/utils';
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

export default function ProductsView() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({ name: '', price: '', unit: 'Kg', category: 'Kiloan' });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      if (data) setProducts(data);
    } catch (err: any) {
      toast.error('Gagal memuat katalog: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return toast.error('Lengkapi data layanan');
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('products')
        .insert([{ ...formData, price: Number(formData.price) }]);

      if (error) throw error;
      
      toast.success('Layanan baru berhasil didaftarkan');
      setFormData({ name: '', price: '', unit: 'Kg', category: 'Kiloan' });
      setShowModal(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Layanan dihapus dari katalog');
      fetchProducts();
    } catch (err: any) {
      toast.error('Gagal hapus: Layanan mungkin memiliki riwayat transaksi.');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 container mx-auto p-4 md:p-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight text-center md:text-left">Service Catalog</h1>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1 text-center md:text-left">Pricing & Capabilities Definition</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
          <Plus className="w-4 h-4 mr-2" /> Add New Service
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex items-center">
          <Search className="w-4 h-4 text-slate-400 mr-3" />
          <Input 
            placeholder="Search catalog by designation or classification..."
            className="border-none shadow-none bg-transparent focus-visible:ring-0 text-xs font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest">Service Item</TableHead>
                <TableHead className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest">Asset Category</TableHead>
                <TableHead className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest">Unit Valuation</TableHead>
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
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center text-slate-400 text-xs italic">
                    Universal catalog is empty. Define services to begin operations.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((p) => (
                  <TableRow key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell className="px-6 py-4 font-bold text-slate-900 border-l-2 border-transparent group-hover:border-blue-500">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                           <Package className="w-4 h-4" />
                         </div>
                         <span className="uppercase">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-tight">
                        {p.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 font-mono font-bold text-blue-600">
                      {formatCurrency(p.price)} <span className="text-[10px] text-slate-400 font-medium lowercase">/ {p.unit}</span>
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
                               <Edit3 className="w-3 h-3 mr-2" /> Modify Asset
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-xs font-bold uppercase text-red-500 focus:bg-red-50 focus:text-red-500 transition-colors"
                              onClick={() => deleteProduct(p.id)}
                            >
                               <Trash2 className="w-3 h-3 mr-2" /> Delete Service
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
            <DialogTitle>Service Registry Protocol</DialogTitle>
            <DialogDescription>Define a new service logic and valuation in the global catalog.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Service Name</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="e.g. CUCI SETRIKA KILAT" 
                className="h-11 border-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fixed Valuation</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">Rp</span>
                  <Input 
                    type="number"
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: e.target.value})} 
                    placeholder="0" 
                    className="h-11 pl-10 border-slate-200 font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Logic Unit</Label>
                <select 
                  className="w-full bg-white border border-slate-200 rounded-md h-11 px-3 text-xs font-medium focus:ring-1 focus:ring-blue-500 outline-none"
                  value={formData.unit}
                  onChange={e => setFormData({...formData, unit: e.target.value})}
                >
                  <option value="Kg">Kilo (Kg)</option>
                  <option value="PCS">Piece (Pcs)</option>
                  <option value="Set">Set</option>
                  <option value="Meter">Meter (m2)</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System Classification</Label>
               <select 
                  className="w-full bg-white border border-slate-200 rounded-md h-11 px-3 text-xs font-medium focus:ring-1 focus:ring-blue-500 outline-none"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Kiloan">Regular (Kiloan)</option>
                  <option value="Satuan">Premium (Satuan)</option>
                  <option value="Express">Express (Kilat)</option>
                  <option value="Karpet">Furnishing (Karpet/Bedding)</option>
                </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} className="uppercase text-[10px] font-bold tracking-widest">Abort</Button>
            <Button onClick={handleAddProduct} disabled={isSubmitting} className="uppercase text-[10px] font-bold tracking-widest bg-blue-600">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Commit Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
