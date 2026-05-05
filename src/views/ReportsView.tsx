import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, Calendar, FileText, Loader2, Download, 
  Eye, Plus, Trash2, Printer, CheckCircle2, 
  Clock, Package, AlertCircle, Phone, MessageSquare,
  ArrowRightLeft, BadgeCheck, Calculator, X, ShoppingBag, RefreshCcw
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { formatCurrency, cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Badge } from '@/src/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription 
} from '@/src/components/ui/dialog';
import { 
  Card, CardContent, CardHeader, CardTitle, 
  CardDescription, CardFooter 
} from '@/src/components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/src/components/ui/table';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator 
} from '@/src/components/ui/dropdown-menu';
import { toast } from 'sonner';

const LAUNDRY_STEPS = [
  { id: 'RECEIVED', label: 'Masuk', color: 'bg-slate-100 text-slate-600', icon: Package },
  { id: 'WASHING', label: 'Cuci', color: 'bg-blue-100 text-blue-600', icon: RefreshCcw },
  { id: 'IRONING', label: 'Setrika', color: 'bg-purple-100 text-purple-600', icon: ArrowRightLeft },
  { id: 'READY', label: 'Siap', color: 'bg-green-100 text-green-600', icon: BadgeCheck },
  { id: 'COLLECTED', label: 'Diambil', color: 'bg-slate-900 text-white', icon: CheckCircle2 },
];

export default function ReportsView() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [filterMode, setFilterMode] = useState('pipeline'); // pipeline, history
  const [printData, setPrintData] = useState<any>(null);
  
  // Edit Order State
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editingCart, setEditingCart] = useState<any[]>([]);
  const [discount, setDiscount] = useState(0);
  const [isTaxEnabled, setIsTaxEnabled] = useState(false);

  useEffect(() => {
    fetchTransactions();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (!error && data) setProducts(data);
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          customers(name, whatsapp, address),
          transaction_items(
            *,
            products(name)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setTransactions(data);
    } catch (err: any) {
      toast.error('Gagal memuat data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateLaundryStatus = async (txId: string, status: string) => {
    try {
      const updateData: any = { laundry_status: status };
      if (status === 'READY') {
         // Auto-notify mockup logic could go here
      }
      if (status === 'COLLECTED') {
         updateData.status = 'COMPLETED';
         updateData.actual_completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', txId);
      
      if (error) throw error;
      
      toast.success(`Workflow updated to ${status}`);
      fetchTransactions();
      if (selectedTx?.id === txId) {
        setSelectedTx({ ...selectedTx, ...updateData });
      }
    } catch (err: any) {
      toast.error('Update failed: ' + err.message);
    }
  };

  const markAsPaid = async (txId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ 
          payment_status: 'PAID', 
          metode_pembayaran: 'Tunai'
        })
        .eq('id', txId);
      
      if (error) throw error;
      toast.success('Transaction SETTLED (Lunas)');
      fetchTransactions();
    } catch (err: any) {
      toast.error('Payment failure: ' + err.message);
    }
  };

  const handleUpdateOrder = async (tx: any) => {
    try {
      const subtotal = editingCart.reduce((acc, item) => acc + item.subtotal, 0);
      const taxAmount = isTaxEnabled ? subtotal * 0.1 : 0;
      const total = subtotal - discount + taxAmount;

      // 1. Update Transaction
      const txUpdateData: any = {
        total_qty: editingCart.reduce((acc, item) => acc + item.qty, 0),
        subtotal,
        discount,
        tax: taxAmount,
        total_bayar: total,
        status: 'PROCESSING'
      };

      let { error: txError } = await supabase
        .from('transactions')
        .update(txUpdateData)
        .eq('id', tx.id);

      if (txError && txError.message.includes('total_bayar')) {
        console.warn("Retrying transaction update without 'total_bayar' due to cache issue...");
        const { total_bayar: _, ...fallbackTxData } = txUpdateData;
        const retryTx = await supabase
          .from('transactions')
          .update(fallbackTxData)
          .eq('id', tx.id);
        txError = retryTx.error;
      }

      if (txError) throw txError;

      // 2. Delete old items and insert new ones
      await supabase.from('transaction_items').delete().eq('transaction_id', tx.id);
      
      const details = editingCart.map(item => ({
        transaction_id: tx.id,
        product_id: item.product_id,
        name: item.name,
        qty: item.qty,
        price: item.price,
        subtotal: item.subtotal
      }));

      let { error: detailError } = await supabase.from('transaction_items').insert(details);
      
      // Fallback for schema cache issue with 'name' column
      if (detailError && detailError.message.includes('name')) {
        console.warn("Retrying collection update without 'name' column due to cache issue...");
        const fallbackDetails = details.map(({ name: _, ...rest }) => rest);
        const retryResult = await supabase.from('transaction_items').insert(fallbackDetails);
        detailError = retryResult.error;
      }
      
      if (detailError) throw detailError;

      toast.success('Order data updated successfully');
      setIsEditingOrder(false);
      fetchTransactions();
      setSelectedTx(null);
    } catch (err: any) {
      toast.error('Failed to update order: ' + err.message);
    }
  };

  const addToEditingCart = (product: any) => {
    setEditingCart(prev => {
      const existing = prev.find(p => p.product_id === product.id);
      if (existing) {
        return prev.map(p => p.product_id === product.id ? { ...p, qty: p.qty + 1, subtotal: (p.qty + 1) * p.price } : p);
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        qty: 1,
        price: product.price,
        subtotal: product.price
      }];
    });
  };

  const updateEditingQty = (id: string, qty: number) => {
    if (qty < 0.1) return;
    setEditingCart(prev => prev.map(p => p.product_id === id ? { ...p, qty, subtotal: qty * p.price } : p));
  };

  const removeFromEditingCart = (id: string) => {
    setEditingCart(prev => prev.filter(p => p.product_id !== id));
  };

  const handlePrint = (tx: any) => {
    const receiptData = {
      invoice_number: tx.invoice_number,
      total_bayar: tx.total_bayar,
      metode_pembayaran: tx.metode_pembayaran || 'PENDING',
      uang_dibayar: tx.uang_dibayar || tx.total_bayar,
      kembalian: tx.kembalian || 0,
      payment_status: tx.payment_status,
      items: tx.transaction_items?.map((item: any) => ({
        name: item.products?.name,
        qty: item.qty,
        price: item.price
      })) || [],
      customerName: tx.customers?.name || 'PELANGGAN',
      customerAddress: tx.customers?.address || '-',
      customerWA: tx.customers?.whatsapp || '-',
      date: new Date(tx.created_at).toLocaleString('id-ID'),
      notes: tx.notes,
      estimatedCompletedAt: tx.estimated_completed_at ? new Date(tx.estimated_completed_at).toLocaleDateString('id-ID') : '-'
    };

    setPrintData(receiptData);
    setTimeout(() => window.print(), 100);
  };

  const filteredTx = transactions.filter(t => 
    t.invoice_number?.toLowerCase().includes(search.toLowerCase()) || 
    t.customers?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const pipelineTx = filteredTx.filter(t => t.laundry_status !== 'COLLECTED');
  const historyTx = filteredTx.filter(t => t.laundry_status === 'COLLECTED');

  return (
    <div className="space-y-6 container mx-auto p-4 md:p-6 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BadgeCheck className="w-6 h-6 text-blue-600" />
             Order Lifecycle & Logistics
          </h1>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Operational Flow Monitoring</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input 
                placeholder="Find invoice or client..." 
                className="pl-9 h-9 text-xs" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
           <Button variant="outline" size="sm" onClick={fetchTransactions}>
              <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
           </Button>
        </div>
      </header>

      <Tabs defaultValue="pipeline" className="w-full" onValueChange={setFilterMode}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pipeline" className="text-[10px] uppercase font-bold tracking-widest">Active Pipeline</TabsTrigger>
          <TabsTrigger value="history" className="text-[10px] uppercase font-bold tracking-widest">Archived Records</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-40">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Hydrating state...</p>
              </div>
            ) : pipelineTx.length === 0 ? (
               <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl border-slate-200">
                  <p className="text-slate-400 text-xs font-medium">No active orders in processing cycle.</p>
               </div>
            ) : (
              pipelineTx.map((tx) => (
                <OrderCard key={tx.id} tx={tx} onSelect={() => setSelectedTx(tx)} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
             <div className="overflow-x-auto">
               <table className="w-full text-left text-xs border-collapse">
                 <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b">
                      <th className="px-6 py-4">Node ID</th>
                      <th className="px-6 py-4">Client</th>
                      <th className="px-6 py-4">Volume</th>
                      <th className="px-6 py-4">Settlement</th>
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4 text-right">Operation</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 italic">
                   {historyTx.map(tx => (
                     <tr key={tx.id} className="hover:bg-slate-50 font-medium">
                       <td className="px-6 py-4 font-mono font-bold text-slate-900">{tx.invoice_number}</td>
                       <td className="px-6 py-4 truncate max-w-[150px] uppercase">{tx.customers?.name}</td>
                       <td className="px-6 py-4">{tx.total_qty} units</td>
                       <td className="px-6 py-4">
                         <Badge className={cn("text-[9px] uppercase font-bold", tx.payment_status === 'PAID' ? "bg-emerald-500" : "bg-slate-400")}>
                           {tx.payment_status}
                         </Badge>
                       </td>
                       <td className="px-6 py-4 text-slate-400">
                        {new Date(tx.created_at).toLocaleDateString('id-ID')}
                       </td>
                       <td className="px-6 py-4 text-right">
                         <Button variant="ghost" size="icon" onClick={() => setSelectedTx(tx)}>
                            <Eye className="w-4 h-4 text-slate-400" />
                         </Button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="max-w-xl md:max-w-2xl p-0 overflow-hidden font-sans">
          <div className="grid grid-cols-1 md:grid-cols-5 h-full">
            {/* Left Panel: Client Sidebar */}
            <div className="md:col-span-2 bg-slate-900 text-white p-6 space-y-6">
               <div className="space-y-4">
                  <div className="w-12 h-12 rounded bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
                     <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">{selectedTx?.invoice_number}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Identity Protocol</p>
                  </div>
               </div>

               <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Customer Information</p>
                    <p className="font-bold text-sm uppercase">{selectedTx?.customers?.name || 'Anonymous'}</p>
                    <p className="text-xs text-slate-400">{selectedTx?.customers?.whatsapp || 'No contact registered'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Delivery Proxy</p>
                    <p className="text-xs leading-relaxed text-slate-300">{selectedTx?.customers?.address || 'Self-collection point'}</p>
                  </div>
               </div>

               <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 bg-transparent border-slate-700 text-[10px] font-bold uppercase tracking-widest text-slate-300 h-9">
                    <Phone className="w-3 h-3 mr-2" /> Call
                  </Button>
                  <Button className="flex-1 bg-green-600 hover:bg-green-700 border-none text-[10px] font-bold uppercase tracking-widest text-white h-9">
                    <MessageSquare className="w-3 h-3 mr-2" /> WhatsApp
                  </Button>
               </div>
            </div>

            {/* Right Panel: Transaction Body */}
            <div className="md:col-span-3 p-6 space-y-6 bg-white overflow-y-auto max-h-[80vh]">
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Processing Stage</h3>
                     <Badge className={cn("text-[10px] uppercase font-bold px-3 py-1", LAUNDRY_STEPS.find(s => s.id === selectedTx?.laundry_status)?.color)}>
                        {LAUNDRY_STEPS.find(s => s.id === selectedTx?.laundry_status)?.label || 'Unknown'}
                     </Badge>
                  </div>
                  
                  {/* Pipeline Stepper */}
                  <div className="flex justify-between items-center relative py-2">
                     <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
                     {LAUNDRY_STEPS.map((step) => {
                        const isCurrent = selectedTx?.laundry_status === step.id;
                        const isPast = LAUNDRY_STEPS.findIndex(s => s.id === step.id) < LAUNDRY_STEPS.findIndex(s => s.id === selectedTx?.laundry_status);
                        return (
                          <button 
                            key={step.id} 
                            onClick={() => updateLaundryStatus(selectedTx.id, step.id)}
                            className={cn(
                              "w-8 h-8 rounded-full border-2 z-10 flex items-center justify-center transition-all",
                              isCurrent ? "bg-blue-600 border-blue-600 text-white scale-110 shadow-lg shadow-blue-200" :
                              isPast ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-200 text-slate-300 hover:border-slate-400"
                            )}
                            title={step.label}
                          >
                             <step.icon className="w-4 h-4" />
                          </button>
                        )
                     })}
                  </div>
               </div>

               <div className="space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b pb-1">Itemized Ledger</h3>
                  {selectedTx?.transaction_items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center text-xs">
                       <div className="flex flex-col">
                          <span className="font-bold text-slate-800 uppercase">{item.products?.name}</span>
                          <span className="text-slate-400 font-mono text-[10px]">{item.qty} units × {formatCurrency(item.price)}</span>
                       </div>
                       <span className="font-bold font-mono text-slate-900">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
               </div>

               {selectedTx?.notes && (
                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[10px] text-slate-600 italic">
                    <span className="font-bold text-slate-400 not-italic uppercase mb-1 block">Special Protocols:</span>
                    "{selectedTx.notes}"
                 </div>
               )}

               <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg bg-slate-50/50 space-y-1">
                     <p className="text-[9px] font-bold uppercase text-slate-400">Total Valuation</p>
                     <p className="text-sm font-bold font-mono text-blue-600">{formatCurrency(selectedTx?.total_bayar || 0)}</p>
                  </div>
                  <div className="p-3 border rounded-lg bg-slate-50/50 space-y-1">
                     <p className="text-[9px] font-bold uppercase text-slate-400">Settlement Status</p>
                     <Badge variant={selectedTx?.payment_status === 'PAID' ? 'default' : 'outline'} className={cn(
                       "text-[9px] font-bold uppercase h-5",
                       selectedTx?.payment_status === 'PAID' ? "bg-emerald-600 border-none" : "border-amber-200 text-amber-600"
                     )}>
                        {selectedTx?.payment_status === 'PAID' ? 'Settled' : 'Unpaid Balance'}
                     </Badge>
                  </div>
               </div>

               <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1 text-[10px] font-bold uppercase tracking-widest h-10" onClick={() => handlePrint(selectedTx)}>
                    <Printer className="w-3.5 h-3.5 mr-2" /> Print Struk
                  </Button>
                  {selectedTx?.payment_status !== 'PAID' && (
                    <>
                      <Button 
                        variant="secondary"
                        className="flex-1 text-[10px] font-bold uppercase tracking-widest h-10" 
                        onClick={() => {
                          setEditingCart(selectedTx.transaction_items.map((i: any) => ({
                            product_id: i.product_id,
                            name: i.name,
                            qty: i.qty,
                            price: i.price,
                            subtotal: i.subtotal
                          })).filter((i: any) => i.product_id !== null));
                          setDiscount(selectedTx.discount || 0);
                          setIsTaxEnabled(selectedTx.tax > 0);
                          setIsEditingOrder(true);
                        }}
                      >
                        <Calculator className="w-3.5 h-3.5 mr-2" /> Update Bill
                      </Button>
                      <Button className="flex-1 bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-bold uppercase tracking-widest h-10" onClick={() => markAsPaid(selectedTx.id)}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Pay
                      </Button>
                    </>
                  )}
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={isEditingOrder} onOpenChange={setIsEditingOrder}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 font-sans rounded-3xl">
          <DialogHeader className="p-6 bg-slate-900 text-white shrink-0">
             <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-bold uppercase tracking-tighter">Update Order Bill</DialogTitle>
                  <p className="text-blue-300/60 text-[10px] font-bold uppercase tracking-widest mt-1">
                    Invoice: {selectedTx?.invoice_number} | Customer: {selectedTx?.customers?.name}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setIsEditingOrder(false)}>
                  <X className="w-5 h-5" />
                </Button>
             </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2">
             {/* Product Selection */}
             <div className="p-6 overflow-y-auto border-r border-slate-100 bg-slate-50/50">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Select Products/Services</h3>
                <div className="grid grid-cols-2 gap-3">
                   {products.map(product => (
                     <button
                        key={product.id}
                        onClick={() => addToEditingCart(product)}
                        className="bg-white p-4 rounded-2xl border-2 border-transparent hover:border-blue-500 hover:shadow-lg transition-all text-left group"
                     >
                        <ShoppingBag className="w-5 h-5 text-slate-400 group-hover:text-blue-500 mb-2" />
                        <p className="text-xs font-bold text-slate-900 uppercase truncate">{product.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-1">{formatCurrency(product.price)} / {product.unit}</p>
                     </button>
                   ))}
                </div>
             </div>

             {/* Cart / Summary */}
             <div className="p-6 overflow-y-auto bg-white flex flex-col">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Current Selection</h3>
                <div className="flex-1 space-y-3">
                   {editingCart.length === 0 ? (
                      <div className="py-20 text-center opacity-30 flex flex-col items-center">
                         <Calculator className="w-8 h-8 mb-2" />
                         <p className="text-xs font-bold uppercase text-slate-400">Cart is empty</p>
                      </div>
                   ) : (
                     editingCart.map(item => (
                       <div key={item.product_id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
                          <div className="flex-1 min-w-0">
                             <p className="text-xs font-bold text-slate-900 uppercase truncate">{item.name}</p>
                             <p className="text-[10px] text-slate-500">{formatCurrency(item.price)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                             <Input 
                                type="number" 
                                step="0.1"
                                value={item.qty} 
                                onChange={(e) => updateEditingQty(item.product_id, parseFloat(e.target.value))}
                                className="w-16 h-8 text-xs text-center font-bold"
                             />
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeFromEditingCart(item.product_id)}>
                                <Trash2 className="w-4 h-4" />
                             </Button>
                          </div>
                       </div>
                     ))
                   )}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                   <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="font-bold font-mono">{formatCurrency(editingCart.reduce((acc, i) => acc + i.subtotal, 0))}</span>
                   </div>
                   
                   <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-1">
                         <Label className="text-[9px] font-bold uppercase text-slate-400">Discount</Label>
                         <Input 
                            type="number" 
                            className="h-8 text-xs" 
                            value={discount} 
                            onChange={(e) => setDiscount(parseFloat(e.target.value))} 
                         />
                      </div>
                      <div className="flex flex-col gap-1 items-end pt-5">
                         <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn("text-[9px] font-bold uppercase tracking-widest h-8 px-2", isTaxEnabled ? "text-blue-600 bg-blue-50" : "text-slate-400")}
                            onClick={() => setIsTaxEnabled(!isTaxEnabled)}
                         >
                            {isTaxEnabled ? 'Tax 10% ON' : 'Add Tax'}
                         </Button>
                      </div>
                   </div>

                   <div className="flex justify-between items-center p-4 bg-slate-900 text-white rounded-2xl">
                      <span className="text-[10px] font-bold uppercase tracking-widest">Grand Total</span>
                      <span className="text-xl font-black font-mono">
                         {formatCurrency(
                            editingCart.reduce((acc, i) => acc + i.subtotal, 0) - discount + (isTaxEnabled ? editingCart.reduce((acc, i) => acc + i.subtotal, 0) * 0.1 : 0)
                         )}
                      </span>
                   </div>

                   <Button 
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-xl"
                      disabled={editingCart.length === 0}
                      onClick={() => handleUpdateOrder(selectedTx)}
                   >
                      Save Configuration
                   </Button>
                </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Print Overlay CSS */}
      <style>{`
        @media print {
          @page { 
            size: auto; 
            margin: 0mm; 
          }
          html, body { 
            width: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            background: white !important; 
            -webkit-print-color-adjust: exact;
          }
          #root, .fixed, dialog, [role="dialog"] { display: none !important; }
          #report-thermal-receipt { 
            display: block !important; 
            width: 100% !important;
            max-width: none !important; 
            margin: 0 !important;
            padding: 5mm !important; 
            visibility: visible !important;
            background: white !important;
            color: black !important;
            box-sizing: border-box;
            font-size: 24px !important;
            line-height: 1.2 !important;
          }
          #report-thermal-receipt * { visibility: visible !important; }
          .print-bold { font-weight: 900 !important; }
          .print-lg { font-size: 32px !important; }
          .print-xl { font-size: 40px !important; }
          
          .print-divider {
            border-top: 5px dashed black !important;
            margin: 20px 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* Thermal Template Portal - Optimized for Ultra Wide / A4s */}
      {typeof document !== 'undefined' && createPortal(
         <div id="report-thermal-receipt" className="hidden font-mono text-black leading-tight">
            {printData?.payment_status === 'UNPAID' ? (
              <div className="text-center mb-6">
                <div className="border-4 border-black p-4 inline-block mb-4">
                  <h1 className="font-bold text-4xl print-bold uppercase">STRUK BOOKING</h1>
                </div>
                <p className="text-xl font-bold uppercase tracking-widest text-center">Tanda Terima Pengambilan</p>
              </div>
            ) : (
              <div className="text-center mb-10">
                <h2 className="font-bold text-4xl uppercase tracking-tighter print-bold print-xl">SETRIKA.OS</h2>
                <p className="text-lg font-bold uppercase tracking-widest">Premium Garment Care Service</p>
              </div>
            )}

            <div className="text-center mb-10">
              <div className="print-divider" />
              <p className="font-bold text-2xl print-bold">{printData?.invoice_number}</p>
              <p className="text-lg italic">{printData?.date}</p>
            </div>

            <div className="space-y-4 mb-10 text-xl">
               <div className="flex justify-between border-b-4 border-gray-100 pb-3">
                 <span>PELANGGAN  :</span>
                 <span className="font-bold uppercase truncate max-w-[250px] print-bold text-right pl-4">{printData?.customerName}</span>
               </div>
               <div className="flex justify-between border-b-4 border-gray-100 pb-3">
                 <span>WHATSAPP   :</span>
                 <span>{printData?.customerWA}</span>
               </div>
               <div className="flex justify-between border-b-4 border-gray-100 pb-3">
                 <span>ALAMAT     :</span>
                 <span className="text-right max-w-[220px]">{printData?.customerAddress || '-'}</span>
               </div>
               <div className="flex justify-between border-b-4 border-gray-100 pb-3">
                 <span>PENGAMBILAN:</span>
                 <span className="font-bold print-bold">{printData?.estimatedCompletedAt}</span>
               </div>
            </div>

            <div className="print-divider" />
            
            <div className="space-y-6 mb-10">
               {printData?.items.map((item: any, i: number) => (
                 <div key={i} className="border-b-4 border-dashed border-gray-200 pb-4 last:border-0">
                    <div className="uppercase font-bold text-2xl leading-tight print-bold">{item.name}</div>
                    <div className="flex justify-between text-xl mt-2">
                       <span>{item.qty} × {item.price.toLocaleString()}</span>
                       <span className="font-bold print-bold">{(item.qty * item.price).toLocaleString()}</span>
                    </div>
                 </div>
               ))}
            </div>

            <div className="print-divider" />
            
            {printData?.payment_status === 'PAID' ? (
              <div className="space-y-4 mb-10 text-xl">
                <div className="flex justify-between font-bold text-4xl print-bold py-6 border-y-4 border-black my-4">
                  <span>GRAND TOTAL:</span>
                  <span>{printData?.total_bayar.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-4">
                  <span>METODE  :</span>
                  <span className="uppercase">{printData?.metode_pembayaran}</span>
                </div>
                <div className="flex justify-between font-bold print-bold text-2xl">
                  <span>STATUS  :</span>
                  <span className="italic uppercase">LUNAS</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 mb-10 text-xl text-center">
                 <div className="border-4 border-black p-6 my-4 bg-gray-50">
                    <p className="text-xl font-bold uppercase mb-2">Total Estimasi Tagihan</p>
                    <h2 className="text-5xl font-black print-bold">Rp {printData?.total_bayar.toLocaleString()}</h2>
                 </div>
                 <p className="text-lg italic font-bold uppercase mt-4">** Pembayaran saat cucian selesai **</p>
              </div>
            )}

            {printData?.notes && (
              <div className="mt-8 text-xl italic border-4 border-dashed p-6 border-black bg-gray-50">
                <span className="font-bold not-italic uppercase">Catatan Khusus:</span> {printData.notes}
              </div>
            )}

            <div className="mt-16 text-center space-y-6 border-t-8 border-black pt-10">
               <p className="uppercase font-bold text-xl leading-snug print-bold">
                 {printData?.payment_status === 'PAID' ? 'TERIMA KASIH ATAS KEPERCAYAAN ANDA.' : 'PESANAN TELAH KAMI TERIMA.'}<br/>
                 STRUK INI DIGUNAKAN UNTUK PENGAMBILAN.
               </p>
               <div className="h-32" />
            </div>
         </div>,
         document.body
      )}
    </div>
  );
}

function OrderCard({ tx, onSelect }: any) {
  const currentStepIdx = LAUNDRY_STEPS.findIndex(s => s.id === (tx.laundry_status || 'RECEIVED'));
  const currentStep = LAUNDRY_STEPS[currentStepIdx] || LAUNDRY_STEPS[0];
  
  return (
    <Card className="hover:border-blue-500 transition-all cursor-pointer group shadow-sm border-slate-200 flex flex-col overflow-hidden" onClick={onSelect}>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
           <div className="space-y-1 min-w-0 flex-1">
              <h3 className="font-bold text-xs text-slate-400 font-mono tracking-tighter truncate group-hover:text-blue-600 transition-colors">{tx.invoice_number}</h3>
              <p className="font-bold text-slate-800 uppercase text-sm truncate">{tx.customers?.name || 'PLG001'}</p>
           </div>
           <Badge className={cn("text-[9px] h-5 uppercase font-bold", currentStep.color)}>
             {currentStep.label}
           </Badge>
        </div>

        <div className="flex items-center gap-4 py-1">
           <div className="flex -space-x-1.5 grayscale group-hover:grayscale-0 transition-all">
              {LAUNDRY_STEPS.slice(0, 4).map((step, i) => (
                <div key={i} className={cn(
                  "w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white",
                  i <= currentStepIdx ? (i === currentStepIdx ? "bg-blue-600" : "bg-emerald-500") : "bg-slate-200"
                )}>
                   <step.icon className="w-3 h-3" />
                </div>
              ))}
           </div>
           <div className="flex-1">
              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-blue-500 transition-all duration-1000" 
                   style={{ width: `${Math.min(100, (currentStepIdx / (LAUNDRY_STEPS.length - 1)) * 100)}%` }} 
                 />
              </div>
           </div>
        </div>

        <div className="flex justify-between items-end pt-2 border-t border-slate-50">
           <div className="space-y-0.5">
             <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium italic">
                <Clock className="w-3 h-3" />
                <span>{tx.estimated_completed_at ? new Date(tx.estimated_completed_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : 'No Est'}</span>
             </div>
             <p className="text-xs font-bold font-mono text-slate-900">{formatCurrency(tx.total_bayar)}</p>
           </div>
           <Badge variant={tx.payment_status === 'PAID' ? 'default' : 'outline'} className={cn(
             "text-[9px] uppercase font-bold h-5",
             tx.payment_status === 'PAID' ? "bg-emerald-500 border-none" : "border-amber-200 text-amber-600"
           )}>
             {tx.payment_status === 'PAID' ? 'Settled' : 'Pending'}
           </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
