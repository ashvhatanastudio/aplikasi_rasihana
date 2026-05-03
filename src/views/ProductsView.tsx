import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Package, Tag, Layers, Loader2 } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { formatCurrency } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function ProductsView() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('Kg');
  const [category, setCategory] = useState('Kiloan');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) console.error('Error fetching products:', error);
    if (data) setProducts(data);
    setLoading(false);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{ 
          name, 
          price: Number(price), 
          unit, 
          category 
        }])
        .select();

      if (error) {
        console.error('DB Insert Error:', error);
        setErrorMessage(error.message);
      } else {
        setName('');
        setPrice('');
        setShowModal(false);
        fetchProducts();
      }
    } catch (err: any) {
      setErrorMessage('Terjadi kesalahan fatal: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Hapus produk ini?')) return;
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Gagal menghapus: Mungkin produk ini sudah pernah digunakan dalam transaksi.');
    } else {
      fetchProducts();
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Service Inventory</h1>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Catalog & Pricing Definition</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-widest flex items-center shadow-lg hover:bg-blue-700 transition-all"
        >
          <Plus className="w-3.5 h-3.5 mr-2" /> Add New Service
        </button>
      </div>

      <div className="bg-white rounded border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center group">
          <Search className="w-4 h-4 text-slate-400 mr-3 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Filter by designation or category classification..."
            className="bg-transparent border-none outline-none text-xs font-medium w-full text-slate-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] uppercase tracking-widest font-bold text-slate-400 border-b border-slate-200">
                <th className="px-6 py-3 font-bold">Service Info</th>
                <th className="px-6 py-3 font-bold">Category</th>
                <th className="px-6 py-3 font-bold">Unit Price</th>
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
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-400 text-xs font-medium italic">
                    Catalog is currently empty. Define new services above.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                          <Package className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase tracking-tighter border border-slate-200">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold font-mono text-blue-700">{formatCurrency(product.price)}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Per {product.unit}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => deleteProduct(product.id)}
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
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">New Service Registration</h3>
              </div>
              <form onSubmit={handleAddProduct} className="p-6 space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded text-[10px] text-red-600 font-bold uppercase tracking-tight">
                    {errorMessage}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Service Designation</label>
                  <input 
                    required
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    placeholder="CUCI_KERING_SETRIKA"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Valuation (Price)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-mono text-[10px]">IDR</span>
                      <input 
                        required
                        type="number" 
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded text-xs font-bold font-mono bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Logic Unit</label>
                    <select 
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none appearance-none"
                    >
                      <option value="Kg">Kg (Kilo)</option>
                      <option value="PCS">PCS (Piece)</option>
                      <option value="Set">Set</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Classification Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none appearance-none"
                  >
                    <option value="Kiloan">Kiloan (Regular)</option>
                    <option value="Satuan">Satuan (Special)</option>
                    <option value="Express">Express (Priority)</option>
                    <option value="Lainnya">Other</option>
                  </select>
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
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Plus className="w-3.5 h-3.5 mr-2" />}
                    Confirm Registry
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
