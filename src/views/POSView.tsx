import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, Plus, Trash2, CreditCard, Banknote, ReceiptText, 
  Loader2, ShoppingCart, Tag, Clock, FileText, UserPlus,
  CheckCircle2, Printer, X
} from 'lucide-react';
import { usePOSStore } from '@/src/hooks/usePOSStore';
import { formatCurrency, cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/src/hooks/useAuth';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Badge } from '@/src/components/ui/badge';
import { Card, CardContent } from '@/src/components/ui/card';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/src/components/ui/dialog';
import { Label } from '@/src/components/ui/label';
import { toast } from 'sonner';

export default function POSView() {
  const { 
    cart, 
    addToCart, 
    removeFromCart, 
    updateQty, 
    customerId, 
    setCustomer, 
    discount, 
    setDiscount, 
    isTaxEnabled, 
    toggleTax,
    clearCart,
    notes,
    setNotes,
    estimatedCompletedAt,
    setEstimatedCompletedAt
  } = usePOSStore();

  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'QRIS'>('Tunai');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  
  // New Customer State
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', whatsapp: '', address: '' });

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name');
    if (data) setProducts(data);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('name');
    if (data) setCustomers(data);
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name) return toast.error('Nama pelanggan wajib diisi');
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert(newCustomer)
        .select()
        .single();
      
      if (error) throw error;
      
      setCustomers([...customers, data]);
      setCustomer(data.id);
      setShowNewCustomer(false);
      setNewCustomer({ name: '', whatsapp: '', address: '' });
      toast.success('Pelanggan baru berhasil didaftarkan');
    } catch (err: any) {
      toast.error('Gagal tambah pelanggan: ' + err.message);
    }
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const taxAmount = isTaxEnabled ? subtotal * 0.11 : 0;
  const grandTotal = subtotal + taxAmount - discount;
  const change = amountPaid - grandTotal;

  const handleCheckout = async (payNow: boolean = true) => {
    if (!customerId) return toast.error('Pilih pelanggan terlebih dahulu');
    
    // Booking (payNow=false) allows empty cart, but Payment (payNow=true) requires items
    if (payNow && cart.length === 0) return toast.error('Keranjang masih kosong untuk pembayaran');
    if (!user) return toast.error('Sesi login berakhir. Silakan login kembali.');

    setIsSubmitting(true);
    
    try {
      // Use placeholder if cart is empty during booking
      const finalCart = cart.length > 0 ? cart : [
        { id: 'placeholder', name: 'LAYANAN (BERAT MENYUSUL)', price: 0, qty: 1, unit: 'KG', category: 'BOOKING' }
      ];

      const finalSubtotal = finalCart.reduce((acc, item) => acc + item.price * item.qty, 0);
      const finalTax = isTaxEnabled ? finalSubtotal * 0.11 : 0;
      const finalGrandTotal = finalSubtotal + finalTax - discount;

      const txPayload: any = {
        customer_id: customerId,
        kasir_id: user.id,
        total_qty: finalCart.reduce((acc, i) => acc + i.qty, 0),
        subtotal: finalSubtotal,
        discount: discount,
        tax: finalTax,
        total_bayar: finalGrandTotal,
        metode_pembayaran: payNow ? paymentMethod : 'PENDING',
        uang_dibayar: payNow ? (paymentMethod === 'Tunai' ? amountPaid : finalGrandTotal) : 0,
        kembalian: payNow ? (paymentMethod === 'Tunai' ? Math.max(0, amountPaid - finalGrandTotal) : 0) : 0,
        status: payNow ? 'COMPLETED' : 'PROCESSING',
        payment_status: payNow ? 'PAID' : 'UNPAID',
        laundry_status: 'RECEIVED',
        notes: notes,
        estimated_completed_at: estimatedCompletedAt
      };

      // 1. Transaction Header
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert(txPayload)
        .select()
        .single();

      if (txError) throw txError;

      // 2. Transaction Items
      const details = finalCart.map(item => ({
        transaction_id: transaction.id,
        product_id: item.id === 'placeholder' ? null : item.id,
        qty: item.qty,
        price: item.price,
        subtotal: item.price * item.qty
      }));

      const { error: detailError } = await supabase.from('transaction_items').insert(details);
      if (detailError) throw detailError;
      
      const customerData = customers.find(c => c.id === customerId);
      const receiptData = {
        invoice_number: transaction.invoice_number,
        total_bayar: transaction.total_bayar,
        metode_pembayaran: transaction.metode_pembayaran,
        uang_dibayar: transaction.uang_dibayar,
        kembalian: transaction.kembalian,
        payment_status: txPayload.payment_status,
        items: finalCart,
        customerName: customerData?.name || 'PELANGGAN',
        customerWA: customerData?.whatsapp || '-',
        customerAddress: customerData?.address || '-',
        date: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
        notes: notes,
        estimatedCompletedAt: new Date(estimatedCompletedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })
      };

      setLastTransaction(receiptData);
      setShowReceipt(true);
      clearCart();
      setAmountPaid(0);
      toast.success(payNow ? 'Transaksi berhasil disimpan!' : 'Pesanan berhasil dibooking!');
    } catch (error: any) {
      toast.error(`Checkout gagal: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchProduct.toLowerCase()) || 
    p.category.toLowerCase().includes(searchProduct.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-6 bg-slate-50/50 min-h-screen">
      {/* Kolom Kiri: Produk & Menu */}
      <div className="flex-1 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
              Laundry POS Terminal
            </h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Processing Node v.2.4.1</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search services..." 
                className="pl-10 bg-white border-slate-200"
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchProducts}>
               <Loader2 className={cn("w-4 h-4", isSubmitting && "animate-spin")} />
            </Button>
          </div>
        </header>

        {/* Categories / Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={product.id}
              >
                <Card 
                  className="cursor-pointer hover:border-blue-500 hover:ring-1 hover:ring-blue-500 transition-all active:scale-[0.98] group relative overflow-hidden"
                  onClick={() => addToCart({ ...product, qty: 1 })}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-tighter">
                        {product.category}
                      </Badge>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight mb-1">{product.name}</h3>
                    <div className="flex justify-between items-baseline">
                      <span className="text-blue-600 font-bold text-sm">{formatCurrency(product.price)}</span>
                      <span className="text-[10px] text-slate-400 font-medium">/ {product.unit}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Kolom Kanan: Cart & Checkout */}
      <div className="w-full lg:w-[400px] space-y-4">
        <Card className="border-slate-200 shadow-sm flex flex-col h-[calc(100vh-100px)] sticky top-6">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Receipt Registry</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{cart.length} LINE ITEMS</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => clearCart()} className="text-slate-300 hover:text-red-500">
               <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Customer Selection */}
          <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 space-y-2">
             <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned Client</Label>
                <button 
                  onClick={() => setShowNewCustomer(true)}
                  className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" /> New Client
                </button>
             </div>
             <select 
               className="w-full bg-white border border-slate-200 rounded-md py-2 px-3 text-xs font-medium focus:ring-1 focus:ring-blue-500 outline-none"
               value={customerId || ''}
               onChange={(e) => setCustomer(e.target.value)}
             >
               <option value="">Search internal registry...</option>
               {customers.map(c => (
                 <option key={c.id} value={c.id}>{c.name} ({c.whatsapp})</option>
               ))}
             </select>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-2 py-20 grayscale">
                <ShoppingCart className="w-12 h-12" />
                <p className="text-xs font-bold uppercase tracking-widest">Registry Empty</p>
              </div>
            ) : (
              cart.map((item) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={item.id} 
                  className="flex justify-between items-center group bg-white p-2 rounded-lg border border-slate-100"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-xs truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {formatCurrency(item.price)} <span className="text-slate-300">×</span> {item.qty}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-slate-200 rounded overflow-hidden h-7">
                      <button 
                        onClick={() => updateQty(item.id, Math.max(0.1, Number((item.qty - 0.1).toFixed(2))))}
                        className="px-2 bg-slate-50 hover:bg-slate-100 text-slate-400"
                      >-</button>
                      <input 
                        type="number" 
                        value={item.qty}
                        onChange={(e) => updateQty(item.id, Number(e.target.value))}
                        className="w-10 text-center text-[10px] font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                      />
                      <button 
                        onClick={() => updateQty(item.id, Number((item.qty + 0.1).toFixed(2)))}
                        className="px-2 bg-slate-50 hover:bg-slate-100 text-blue-600"
                      >+</button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-slate-200 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Additional Meta */}
          {cart.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100 space-y-3 bg-slate-50/30">
               <div className="space-y-1">
                 <Label className="text-[10px] font-bold text-slate-400 uppercase">Service Notes</Label>
                 <Input 
                  placeholder="e.g. Wangi Sakura, Lipat rapi..." 
                  className="h-8 text-xs bg-white"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                 />
               </div>
               <div className="space-y-1">
                 <Label className="text-[10px] font-bold text-slate-400 uppercase">Estimated Collection</Label>
                 <Input 
                  type="date"
                  className="h-8 text-xs bg-white"
                  value={estimatedCompletedAt.split('T')[0]}
                  onChange={(e) => setEstimatedCompletedAt(new Date(e.target.value).toISOString())}
                 />
               </div>
            </div>
          )}

          {/* Footer Calculations */}
          <div className="p-4 bg-slate-900 text-white rounded-b-lg space-y-3">
             <div className="space-y-1 text-slate-400 font-medium">
               <div className="flex justify-between text-[11px]">
                 <span>Subtotal</span>
                 <span className="font-mono text-white">{formatCurrency(subtotal)}</span>
               </div>
               <div className="flex justify-between text-[11px]">
                 <div className="flex items-center gap-2">
                   <span>Tax (11%)</span>
                   <button onClick={() => toggleTax()} className={cn("w-6 h-3 rounded-full transition-colors relative", isTaxEnabled ? "bg-blue-600" : "bg-slate-700")}>
                      <div className={cn("absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all", isTaxEnabled ? "right-0.5" : "left-0.5")} />
                   </button>
                 </div>
                 <span className="font-mono text-white">{formatCurrency(taxAmount)}</span>
               </div>
             </div>
             
             <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Valuation</span>
                <span className="text-2xl font-bold font-mono text-blue-400">{formatCurrency(grandTotal)}</span>
             </div>

             <div className="grid grid-cols-2 gap-2 pt-2">
                <Button 
                  variant={paymentMethod === 'Tunai' ? 'default' : 'outline'}
                  size="sm"
                  className={cn("text-[10px] uppercase font-bold tracking-widest h-10", paymentMethod === 'Tunai' ? "bg-blue-600" : "border-slate-800 text-slate-400")}
                  onClick={() => setPaymentMethod('Tunai')}
                >
                  <Banknote className="w-4 h-4 mr-2" /> Cash
                </Button>
                <Button 
                  variant={paymentMethod === 'QRIS' ? 'default' : 'outline'}
                  size="sm"
                  className={cn("text-[10px] uppercase font-bold tracking-widest h-10", paymentMethod === 'QRIS' ? "bg-blue-600" : "border-slate-800 text-slate-400")}
                  onClick={() => setPaymentMethod('QRIS')}
                >
                  <CreditCard className="w-4 h-4 mr-2" /> Digital
                </Button>
             </div>

             {paymentMethod === 'Tunai' && (
               <div className="space-y-2 pt-1 animate-in fade-in slide-in-from-top-2">
                 <div className="relative">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">IDR</span>
                   <Input 
                     type="number"
                     placeholder="Amount paid..."
                     className="bg-slate-800 border-slate-700 text-white pl-10 font-mono text-lg h-12"
                     value={amountPaid || ''}
                     onChange={(e) => setAmountPaid(Number(e.target.value))}
                   />
                 </div>
                 {change > 0 && (
                   <div className="flex justify-between items-center px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400">
                     <span className="text-[10px] font-bold uppercase tracking-widest">Balance Return</span>
                     <span className="text-sm font-bold font-mono">{formatCurrency(change)}</span>
                   </div>
                 )}
               </div>
             )}

             <div className="grid grid-cols-2 gap-2 mt-2">
                <Button 
                  variant="outline"
                  className="w-full h-12 text-sm font-bold uppercase tracking-widest border-slate-200 hover:bg-slate-50"
                  disabled={isSubmitting || !customerId}
                  onClick={() => handleCheckout(false)}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Clock className="w-5 h-5 mr-2" />
                  )}
                  Save Booking
                </Button>
                <Button 
                  className="w-full bg-white text-slate-900 hover:bg-slate-100 h-12 text-sm font-bold uppercase tracking-widest shadow-xl"
                  disabled={isSubmitting || cart.length === 0 || !customerId || (paymentMethod === 'Tunai' && amountPaid < (subtotal + (isTaxEnabled ? subtotal * 0.11 : 0) - discount))}
                  onClick={() => handleCheckout(true)}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                  )}
                  Pay Now
                </Button>
             </div>
          </div>
        </Card>
      </div>

      {/* MODALS */}
      <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Pendaftaran Pelanggan Baru</DialogTitle>
            <DialogDescription>Input data identitas pelanggan ke sistem internal.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input id="name" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} placeholder="e.g. Bapak Ahmad" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wa">WhatsApp / Phone</Label>
              <Input id="wa" value={newCustomer.whatsapp} onChange={e => setNewCustomer({...newCustomer, whatsapp: e.target.value})} placeholder="0812xxxx" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Alamat Pengantaran</Label>
              <Input id="address" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} placeholder="Nama Jalan, No. Rumah" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCustomer(false)}>Batal</Button>
            <Button onClick={handleAddCustomer}>Simpan Identitas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POS RECEIPT MODAL */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-xs p-0 overflow-hidden border-none shadow-2xl">
           <div className="bg-slate-900 p-6 text-center text-white space-y-4">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
                <ReceiptText className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg">Order Validated</h3>
                <p className="text-xs text-slate-400 font-mono">{lastTransaction?.invoice_number}</p>
              </div>
           </div>
           <div className="p-6 space-y-4 bg-white">
              <div className="grid grid-cols-2 gap-4 text-center">
                 <div className="space-y-1">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Bayar</p>
                   <p className="text-sm font-bold text-slate-900 font-mono">{formatCurrency(lastTransaction?.total_bayar || 0)}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment</p>
                   <Badge variant="outline" className={cn(
                     "text-[9px] uppercase font-bold",
                     lastTransaction?.payment_status === 'PAID' ? "border-emerald-200 text-emerald-600" : "border-amber-200 text-amber-600"
                   )}>
                     {lastTransaction?.payment_status === 'PAID' ? 'Settled' : 'Unpaid'}
                   </Badge>
                 </div>
              </div>
              
              <div className="space-y-2 pt-2">
                 <Button className="w-full font-bold uppercase tracking-widest text-[10px]" onClick={printReceipt}>
                    <Printer className="w-4 h-4 mr-2" /> Execute Print
                 </Button>
                 <Button variant="outline" className="w-full font-bold uppercase tracking-widest text-[10px]" onClick={() => setShowReceipt(false)}>
                    Close Terminal
                 </Button>
              </div>
           </div>
        </DialogContent>
      </Dialog>

      {/* CSS For Printing */}
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
          #thermal-receipt { 
            display: block !important; 
            width: 100% !important;
            max-width: none !important; 
            margin: 0 !important;
            padding: 5mm !important; 
            box-sizing: border-box;
            background: white;
            color: black;
            font-size: 24px !important; /* Diperbesar lagi */
            line-height: 1.2 !important;
          }
          .print-bold { font-weight: 900 !important; }
          .print-lg { font-size: 32px !important; }
          .print-xl { font-size: 40px !important; }
          .print-sm { font-size: 18px !important; }
          
          /* Garis pemisah lebih tebal agar terlihat di thermal */
          .print-divider {
            border-top: 5px dashed black !important;
            margin: 20px 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* Thermal Template Portal - Optimized for Ultra Wide / A4s */}
      {typeof document !== 'undefined' && createPortal(
         <div id="thermal-receipt" className="hidden font-mono text-black">
            {lastTransaction?.payment_status === 'UNPAID' ? (
              <div className="text-center mb-6">
                <div className="border-4 border-black p-4 inline-block mb-4">
                  <h1 className="font-bold text-4xl print-bold uppercase">STRUK BOOKING</h1>
                </div>
                <p className="text-xl font-bold uppercase tracking-widest text-center">Tanda Terima Pengambilan</p>
              </div>
            ) : (
              <div className="text-center mb-10">
                <h2 className="font-bold text-4xl tracking-tighter uppercase print-bold print-xl">SETRIKA.OS</h2>
                <p className="text-lg font-bold uppercase tracking-widest">Premium Garment Care Service</p>
              </div>
            )}

            <div className="text-center mb-8">
              <div className="print-divider" />
              <p className="font-bold text-2xl print-bold">{lastTransaction?.invoice_number}</p>
              <p className="text-lg">{lastTransaction?.date}</p>
            </div>

            <div className="space-y-4 mb-10 text-xl">
               <div className="flex justify-between border-b-4 border-gray-100 pb-3">
                 <span>PELANGGAN:</span>
                 <span className="font-bold print-bold uppercase">{lastTransaction?.customerName}</span>
               </div>
               <div className="flex justify-between border-b-4 border-gray-100 pb-3">
                 <span>WHATSAPP :</span>
                 <span>{lastTransaction?.customerWA}</span>
               </div>
               <div className="flex justify-between border-b-4 border-gray-100 pb-3">
                 <span>ESTIMASI :</span>
                 <span className="font-bold print-bold">{lastTransaction?.estimatedCompletedAt}</span>
               </div>
            </div>

            <div className="print-divider" />
            
            <div className="space-y-6 mb-10">
               {lastTransaction?.items.map((item: any, i: number) => (
                 <div key={i} className="border-b-4 border-dashed border-gray-200 pb-4 last:border-0">
                    <div className="uppercase font-bold text-2xl print-bold">{item.name}</div>
                    <div className="flex justify-between text-xl mt-2">
                       <span>{item.qty} {item.unit} x {item.price.toLocaleString()}</span>
                       <span className="font-bold print-bold">{(item.qty * item.price).toLocaleString()}</span>
                    </div>
                 </div>
               ))}
            </div>

            <div className="print-divider" />
            
            {lastTransaction?.payment_status === 'PAID' ? (
              <div className="space-y-4 mb-10 text-xl">
                <div className="flex justify-between font-bold text-4xl print-bold py-6 border-y-4 border-black my-4">
                  <span>TOTAL:</span>
                  <span>{lastTransaction?.total_bayar.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-4">
                  <span>BAYAR :</span>
                  <span>{lastTransaction?.uang_dibayar.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold print-bold text-2xl">
                  <span>KEMBALI:</span>
                  <span>{lastTransaction?.kembalian.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-base opacity-70">
                  <span>METODE :</span>
                  <span className="uppercase">{lastTransaction?.metode_pembayaran}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 mb-10 text-xl text-center">
                 <div className="border-4 border-black p-6 my-4 bg-gray-50">
                    <p className="text-xl font-bold uppercase mb-2">Total Estimasi Tagihan</p>
                    <h2 className="text-5xl font-black print-bold">Rp {lastTransaction?.total_bayar.toLocaleString()}</h2>
                 </div>
                 <p className="text-lg italic font-bold uppercase mt-4">** Pembayaran saat cucian selesai **</p>
              </div>
            )}

            {lastTransaction?.notes && (
              <div className="mt-8 text-xl italic border-4 border-dashed p-6 border-black bg-gray-50">
                <span className="font-bold not-italic">CATATAN:</span> {lastTransaction.notes}
              </div>
            )}

            <div className="mt-16 text-center space-y-6 border-t-8 border-black pt-10">
               <p className="uppercase font-bold text-xl leading-snug print-bold">
                  {lastTransaction?.payment_status === 'PAID' ? 'TERIMA KASIH TELAH MEMILIH KAMI.' : 'PESANAN TELAH KAMI TERIMA.'}<br/>
                  STRUK INI ADALAH TANDA TERIMA SAH.
               </p>
               <p className="text-base italic">Simpan struk ini sebagai syarat pengambilan laundry.</p>
               <div className="h-32" />
            </div>
         </div>,
         document.body
      )}
    </div>
  );
}
