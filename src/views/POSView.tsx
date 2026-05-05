import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Trash2, CreditCard, Banknote, ReceiptText, Loader2, ShoppingCart, Tag } from 'lucide-react';
import { usePOSStore } from '@/src/hooks/usePOSStore';
import { formatCurrency, cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'motion/react';
import { useAuth } from '@/src/hooks/useAuth';

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
    clearCart
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

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*');
    if (data) setProducts(data);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*');
    if (data) setCustomers(data);
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const taxAmount = isTaxEnabled ? subtotal * 0.11 : 0;
  const grandTotal = subtotal + taxAmount - discount;
  const change = amountPaid - grandTotal;

  const handleCheckout = async () => {
    if (!customerId) return alert('Pilih pelanggan terlebih dahulu');
    if (cart.length === 0) return alert('Keranjang masih kosong');
    if (!user) return alert('Anda harus login sebagai kasir');

    console.log('Initiating checkout process...');
    setIsSubmitting(true);
    
    try {
      // Pre-payload creation
      const txPayload: any = {
        customer_id: customerId,
        kasir_id: user.id,
        total_qty: cart.reduce((acc, i) => acc + i.qty, 0),
        subtotal: subtotal,
        discount: discount,
        tax: taxAmount,
        total_bayar: grandTotal,
        metode_pembayaran: paymentMethod,
        uang_dibayar: paymentMethod === 'Tunai' ? amountPaid : grandTotal,
        kembalian: paymentMethod === 'Tunai' ? Math.max(0, amountPaid - grandTotal) : 0,
        status: 'PROCESSING',
        payment_status: 'UNPAID'
      };

      // Jika bayar sekarang (Lunas)
      const isDirectPayment = (paymentMethod === 'Tunai' && amountPaid >= grandTotal && grandTotal > 0) || (paymentMethod === 'QRIS' && grandTotal > 0);

      if (isDirectPayment) {
        txPayload.payment_status = 'PAID';
        txPayload.status = 'COMPLETED';
      }

      // 1. Simpan Header Transaksi
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert(txPayload)
        .select()
        .single();

      if (txError) {
        console.error('Database Error (Header):', txError);
        throw txError;
      }

      // 2. Simpan Detail Item (jika ada)
      if (cart.length > 0) {
        const details = cart.map(item => ({
          transaction_id: transaction.id,
          product_id: item.id,
          qty: item.qty,
          price: item.price,
          subtotal: item.price * item.qty
        }));

        const { error: detailError } = await supabase.from('transaction_items').insert(details);
        if (detailError) {
          console.error('Database Error (Items):', detailError);
        }
      }
      
      const customerData = customers.find(c => c.id === customerId);
      const receiptData = {
        invoice_number: transaction?.invoice_number || `TMP-${Date.now()}`,
        total_bayar: transaction?.total_bayar || grandTotal,
        metode_pembayaran: transaction?.metode_pembayaran || paymentMethod,
        uang_dibayar: transaction?.uang_dibayar || (paymentMethod === 'Tunai' ? amountPaid : grandTotal),
        kembalian: transaction?.kembalian || (paymentMethod === 'Tunai' ? Math.max(0, amountPaid - grandTotal) : 0),
        payment_status: txPayload.payment_status,
        items: [...cart],
        customerName: customerData?.name || 'PELANGGAN UMUM',
        customerWA: customerData?.whatsapp || '-',
        customerAddress: customerData?.address || '-',
        date: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
      };

      setLastTransaction(receiptData);
      setShowReceipt(true);
      clearCart();
      setAmountPaid(0);
    } catch (error: any) {
      console.error('Checkout failed:', error);
      alert(`Gagal: ${error.message}. Jangan lupa jalankan SQL terbaru di Supabase Dashboard.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickTag = async () => {
    if (!customerId) return alert('Pilih pelanggan terlebih dahulu');
    if (!user) return alert('Kasir belum login');
    
    setIsSubmitting(true);
    try {
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          customer_id: customerId,
          kasir_id: user.id,
          total_qty: 0,
          subtotal: 0,
          total_bayar: 0,
          status: 'PROCESSING',
          payment_status: 'UNPAID'
        })
        .select()
        .single();

      if (txError) throw txError;

      const customerData = customers.find(c => c.id === customerId);
      const receiptData = {
        invoice_number: transaction.invoice_number,
        total_bayar: 0,
        payment_status: 'UNPAID',
        isTagOnly: true,
        items: [],
        customerName: customerData?.name || 'PELANGGAN',
        customerWA: customerData?.whatsapp || '-',
        customerAddress: customerData?.address || '-',
        date: new Date().toLocaleString('id-ID')
      };

      setLastTransaction(receiptData);
      setShowReceipt(true);
    } catch (err: any) {
      alert('Gagal membuat label: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const printReceipt = () => {
    // Di HP, window.open sering diblokir atau gagal. 
    // Kita langsung gunakan window.print() dengan CSS media print.
    window.print();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full max-w-7xl mx-auto relative">
      {/* Thermal Receipt Template - Only visible during printing */}
      <div id="thermal-receipt" className="hidden print:block bg-white text-black font-mono">
        <div className="w-[58mm] mx-auto text-center">
          <h2 className="font-bold text-sm uppercase tracking-tighter">KASIR JASA SETRIKA</h2>
          <p className="text-[8px] leading-tight mb-1">Cucian Rapi, Transaksi Beres</p>
          <div className="border-t border-dashed border-black my-1"></div>
          
          <h3 className="text-[10px] font-bold uppercase mb-1">
            {lastTransaction?.isTagOnly ? 'LABEL PENANDA PESANAN' : 
             lastTransaction?.payment_status === 'PAID' ? 'Struk Pembayaran' : 'Struk Order / Tag Pengambilan'}
          </h3>
          
          <div className="flex justify-between text-[8px] font-bold">
            <span>INV:</span>
            <span>{lastTransaction?.invoice_number}</span>
          </div>
          <div className="flex justify-between text-[8px] mb-1">
            <span>TGL:</span>
            <span>{lastTransaction?.date}</span>
          </div>
          <div className="flex justify-between text-[8px] mb-1">
            <span>PLG:</span>
            <span className="truncate max-w-[80px] uppercase font-bold text-[10px]">{lastTransaction?.customerName}</span>
          </div>
          <div className="flex justify-between text-[8px] mb-1">
            <span>ALM:</span>
            <span className="truncate max-w-[80px] text-[7px] text-right">{lastTransaction?.customerAddress}</span>
          </div>

          <div className="border-t border-dashed border-black my-1"></div>

          {lastTransaction?.isTagOnly ? (
            <div className="py-2 border-2 border-black my-2">
              <p className="text-[14px] font-bold uppercase leading-none">{lastTransaction?.customerName}</p>
              <div className="border-t border-black my-1 mx-2"></div>
              <p className="text-[8px] px-1 font-bold">ALAMAT PENGANTARAN:</p>
              <p className="text-[9px] px-1 italic leading-tight">{lastTransaction?.customerAddress}</p>
              <p className="text-[7px] mt-2 italic px-1 opacity-70">LABEL PENANDA PESANAN</p>
            </div>
          ) : (
            <>
              {lastTransaction?.items.map((item: any, i: number) => (
                <div key={i} className="mb-1">
                  <div className="text-[8px] text-left uppercase font-bold leading-none">{item.name}</div>
                  <div className="flex justify-between text-[8px]">
                    <span>{item.qty} x {item.price.toLocaleString()}</span>
                    <span>{(item.qty * item.price).toLocaleString()}</span>
                  </div>
                </div>
              ))}

              <div className="border-t border-dashed border-black my-1"></div>
              
              <div className="flex justify-between text-[10px] font-bold">
                <span>TOTAL:</span>
                <span>{lastTransaction?.total_bayar?.toLocaleString('id-ID')}</span>
              </div>
            </>
          )}
          
          {!lastTransaction?.isTagOnly && (
            lastTransaction?.payment_status === 'PAID' ? (
              <>
                <div className="flex justify-between text-[8px]">
                  <span>BAYAR:</span>
                  <span>{lastTransaction?.uang_dibayar?.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-[8px]">
                  <span>KEMBALI:</span>
                  <span>{lastTransaction?.kembalian?.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-[7px] mt-1 space-x-1">
                  <span className="bg-black text-white px-1">LUNAS</span>
                  <span className="italic uppercase">{lastTransaction?.metode_pembayaran}</span>
                </div>
              </>
            ) : (
              <div className="mt-2 text-center border border-black p-1">
                <p className="text-[8px] font-bold uppercase">Belum Bayar</p>
                <p className="text-[7px]">Bawa struk ini saat pengambilan</p>
              </div>
            )
          )}

          <div className="border-t border-dashed border-black my-2"></div>
          <p className="text-[7px] leading-none mb-1 uppercase italic">Terima Kasih Telah Menggunakan Jasa Kami</p>
          <div className="h-6"></div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 0 !important;
          }
          html, body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
          }
          #root {
            display: none !important;
          }
          body > *:not(#thermal-receipt) {
            display: none !important;
          }
          #thermal-receipt { 
            display: block !important;
            width: 100% !important;
            padding: 4mm !important;
            margin: 0 !important;
            color: black !important;
            background: white !important;
            box-sizing: border-box;
            visibility: visible !important;
          }
          #thermal-receipt * {
            visibility: visible !important;
          }
          /* Font yang dioptimalkan untuk printer thermal agar tajam dan besar */
          .text-[8px] { font-size: 11pt !important; line-height: 1.3 !important; }
          .text-[10px] { font-size: 13pt !important; line-height: 1.3 !important; }
          .text-[7px] { font-size: 10pt !important; line-height: 1.2 !important; }
          .text-[9px] { font-size: 12pt !important; line-height: 1.3 !important; }
          .text-[14px] { font-size: 18pt !important; line-height: 1.2 !important; }
          .text-sm { font-size: 14pt !important; line-height: 1.3 !important; }
          .font-bold { font-weight: 700 !important; }
          .border-dashed { border-top: 1.5pt dashed black !important; border-width: 0 !important; }
          .border-t { border-top: 1.5pt solid black !important; }
          .border-b { border-bottom: 1.5pt solid black !important; }
          .border-2 { border: 1.5pt solid black !important; }
        }
      `}</style>
      
      {typeof document !== 'undefined' && createPortal(
        <div id="thermal-receipt" className="hidden print:block bg-white text-black font-mono">
          <div className="w-full text-center">
            <h2 className="font-bold text-sm uppercase tracking-tighter">KASIR JASA SETRIKA</h2>
            <p className="text-[8px] leading-tight mb-1">Cucian Rapi, Transaksi Beres</p>
            <div className="border-t border-dashed border-black my-1"></div>
            
            <h3 className="text-[10px] font-bold uppercase mb-1">
              {lastTransaction?.isTagOnly ? 'LABEL PENANDA PESANAN' : 
               lastTransaction?.payment_status === 'PAID' ? 'Struk Pembayaran' : 'Struk Order / Tag Pengambilan'}
            </h3>
            
            <div className="flex justify-between text-[8px] font-bold">
              <span>INV:</span>
              <span>{lastTransaction?.invoice_number}</span>
            </div>
            <div className="flex justify-between text-[8px] mb-1">
              <span>TGL:</span>
              <span>{lastTransaction?.date}</span>
            </div>
            <div className="flex justify-between text-[8px] mb-1">
              <span>PLG:</span>
              <span className="truncate max-w-[80px] uppercase font-bold text-[10px]">{lastTransaction?.customerName}</span>
            </div>
            <div className="flex justify-between text-[8px] mb-1">
              <span>ALM:</span>
              <span className="truncate max-w-[80px] text-[7px] text-right leading-none">{lastTransaction?.customerAddress}</span>
            </div>

            <div className="border-t border-dashed border-black my-1"></div>

            {lastTransaction?.isTagOnly ? (
              <div className="py-2 border-2 border-black my-2">
                <p className="text-[14px] font-bold uppercase leading-none">{lastTransaction?.customerName}</p>
                <div className="border-t border-black my-1 mx-2"></div>
                <p className="text-[8px] px-1 font-bold">ALAMAT PENGANTARAN:</p>
                <p className="text-[9px] px-1 italic leading-tight">{lastTransaction?.customerAddress}</p>
                <p className="text-[7px] mt-2 italic px-1 opacity-70">LABEL PENANDA PESANAN</p>
              </div>
            ) : (
              <>
                {lastTransaction?.items.map((item: any, i: number) => (
                  <div key={i} className="mb-1">
                    <div className="text-[8px] text-left uppercase font-bold leading-none">{item.name}</div>
                    <div className="flex justify-between text-[8px]">
                      <span>{item.qty} x {item.price.toLocaleString()}</span>
                      <span>{(item.qty * item.price).toLocaleString()}</span>
                    </div>
                  </div>
                ))}

                <div className="border-t border-dashed border-black my-1"></div>
                
                <div className="flex justify-between text-[10px] font-bold">
                  <span>TOTAL:</span>
                  <span>{lastTransaction?.total_bayar?.toLocaleString('id-ID')}</span>
                </div>
              </>
            )}
            
            {!lastTransaction?.isTagOnly && (
              lastTransaction?.payment_status === 'PAID' ? (
                <>
                  <div className="flex justify-between text-[8px]">
                    <span>BAYAR:</span>
                    <span>{lastTransaction?.uang_dibayar?.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-[8px]">
                    <span>KEMBALI:</span>
                    <span>{lastTransaction?.kembalian?.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-[7px] mt-1 space-x-1">
                    <span className="bg-black text-white px-1">LUNAS</span>
                    <span className="italic uppercase">{lastTransaction?.metode_pembayaran}</span>
                  </div>
                </>
              ) : (
                <div className="mt-2 text-center border border-black p-1">
                  <p className="text-[8px] font-bold uppercase">Belum Bayar</p>
                  <p className="text-[7px]">Bawa struk ini saat pengambilan</p>
                </div>
              )
            )}

            <div className="border-t border-dashed border-black my-2"></div>
            <p className="text-[7px] leading-none mb-1 uppercase italic text-center">Terima Kasih Telah Menggunakan Jasa Kami</p>
            <div className="h-6"></div>
          </div>
        </div>,
        document.body
      )}

      {/* Kolom Kiri: Produk & Pelanggan */}
      <div className="lg:col-span-8 space-y-6">
        {/* Pilih Pelanggan */}
        <div className="bg-slate-50 p-4 rounded border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Identification</h3>
            <button className="text-blue-600 text-[10px] font-bold uppercase flex items-center hover:underline">
              <Plus className="w-3 h-3 mr-1" /> New Entry
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={customerId || ''}
              onChange={(e) => setCustomer(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-blue-500 outline-none appearance-none"
            >
              <option value="">{customers.length === 0 ? 'No customers found - Please register one first' : 'Search internal registry...'}</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} - {c.whatsapp}</option>
              ))}
            </select>
          </div>
        </div>

        {/* List Layanan */}
        <div className="bg-white rounded border border-slate-200 flex flex-col">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Services</h3>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products.map(product => (
              <motion.button
                whileTap={{ scale: 0.98 }}
                key={product.id}
                onClick={() => addToCart({ ...product, qty: 1 })}
                className="p-3 border border-slate-200 rounded bg-slate-50 text-left hover:border-blue-300 hover:bg-blue-50 transition-all flex flex-col gap-1 group"
              >
                <p className="text-xs font-bold text-slate-900 line-clamp-1">{product.name}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-blue-600 font-mono text-[11px] font-bold">{formatCurrency(product.price)}</span>
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">/ {product.unit}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Kolom Kanan: Keranjang & Pembayaran */}
      <div className="lg:col-span-4 flex flex-col space-y-6">
        <div className="bg-white rounded border border-slate-200 overflow-hidden flex flex-col flex-1">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center">
              <ShoppingCart className="w-3 h-3 mr-2" /> Current Order
            </h3>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">
              {cart.length} SKUs
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[300px]">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2 py-10">
                <ShoppingCart className="w-8 h-8 stroke-1 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-wider">Empty Registry</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-100 group">
                  <div>
                    <p className="text-[11px] font-bold text-slate-900">{item.name}</p>
                    <p className="text-[10px] font-mono text-slate-500">{formatCurrency(item.price)} <span className="italic">x</span> {item.qty}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                      <div className="flex items-center border border-slate-200 rounded bg-slate-50 overflow-hidden">
                        <button 
                          onClick={() => updateQty(item.id, Math.max(0, Number((item.qty - 0.1).toFixed(2))))} 
                          className="px-2 py-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >-</button>
                        <input 
                          type="number"
                          step="0.1"
                          min="0"
                          value={item.qty}
                          onChange={(e) => updateQty(item.id, Number(e.target.value))}
                          className="w-12 text-center text-[10px] font-bold font-mono bg-transparent outline-none focus:bg-white transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button 
                          onClick={() => updateQty(item.id, Number((item.qty + 0.1).toFixed(2)))}
                          className="px-2 py-1 text-blue-600 hover:text-blue-800 hover:bg-slate-100 transition-colors"
                        >+</button>
                      </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rincian Biaya */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-1.5 font-sans">
            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span>Gross Total</span>
              <span className="font-mono">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <div className="flex items-center">
                <span>Tax Allocation (11%)</span>
                <input 
                  type="checkbox" 
                  checked={isTaxEnabled} 
                  onChange={toggleTax} 
                  className="ml-2 w-3 h-3 accent-blue-600 rounded"
                />
              </div>
              <span className="font-mono">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-amber-600 font-medium italic">
              <span>Discounts Applied</span>
              <div className="flex items-center">
                <span className="mr-1">-</span>
                <input 
                  type="number" 
                  value={discount} 
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-16 text-right bg-transparent border-b border-amber-200 outline-none font-mono"
                />
              </div>
            </div>
            <div className="flex justify-between items-end pt-2 border-t border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Final Amount</span>
              <span className="text-lg font-bold text-slate-900 leading-none font-mono">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {/* Pembayaran */}
          <div className="p-3 bg-white border-t border-slate-200 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentMethod('Tunai')}
                className={cn(
                  "flex items-center justify-center py-2 px-3 rounded border text-[10px] font-bold uppercase tracking-wider transition-all",
                  paymentMethod === 'Tunai' ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-400 hover:bg-slate-50"
                )}
              >
                <Banknote className="w-3 h-3 mr-2" /> Cash
              </button>
              <button
                onClick={() => setPaymentMethod('QRIS')}
                className={cn(
                  "flex items-center justify-center py-2 px-3 rounded border text-[10px] font-bold uppercase tracking-wider transition-all",
                  paymentMethod === 'QRIS' ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-400 hover:bg-slate-50"
                )}
              >
                <CreditCard className="w-3 h-3 mr-2" /> Digital
              </button>
            </div>

            {paymentMethod === 'Tunai' && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Amount Delivered</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-mono text-xs">IDR</span>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded font-mono text-base font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
                {change > 0 && (
                  <div className="px-3 py-2 bg-blue-100/50 rounded flex justify-between items-center border border-blue-200">
                    <span className="text-[9px] font-bold uppercase text-blue-700">Currency Change</span>
                    <span className="font-mono text-xs font-bold text-blue-800">{formatCurrency(change)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleQuickTag}
                disabled={!customerId || isSubmitting}
                className="flex-1 bg-white border-2 border-slate-900 text-slate-900 py-3 rounded text-[11px] font-bold uppercase tracking-widest flex items-center justify-center hover:bg-slate-50 transition-all"
              >
                <Tag className="w-3.5 h-3.5 mr-2" />
                Print Label
              </button>
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || !customerId || isSubmitting}
                className="flex-1 bg-slate-900 text-white py-3 rounded text-[11px] font-bold uppercase tracking-widest flex items-center justify-center shadow-lg hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition-all"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                ) : (
                  <ReceiptText className="w-3.5 h-3.5 mr-2" />
                )}
                {isSubmitting ? 'Processing...' : (
                  (amountPaid >= grandTotal && grandTotal > 0 || paymentMethod === 'QRIS' && grandTotal > 0) ? 'Simpan & Lunas' : 'Simpan Order'
                )}
              </button>
            </div>
            {amountPaid < grandTotal && paymentMethod === 'Tunai' && (
              <p className="text-[9px] text-orange-600 font-bold text-center uppercase tracking-tighter mt-2">
                * Uang belum cukup, otomatis disimpan sebagai Order Belum Lunas
              </p>
            )}
          </div>
        </div>
      </div>
      {/* Success Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowReceipt(false)}
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white rounded border border-slate-200 w-full max-w-xs overflow-hidden relative z-10 shadow-2xl"
          >
            <div className="p-4 bg-slate-50 border-b border-slate-200 text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-600">
                <ReceiptText className="w-5 h-5" />
              </div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Recorded</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="text-center space-y-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Invoice Node</p>
                <p className="text-sm font-bold font-mono text-slate-900">{lastTransaction?.invoice_number}</p>
              </div>

              <div className="space-y-2">
                <button 
                  onClick={printReceipt}
                  className="w-full bg-blue-600 text-white py-2.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center justify-center hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                >
                  Confirm Print Receipt
                </button>
                <button 
                  onClick={() => setShowReceipt(false)}
                  className="w-full bg-slate-100 text-slate-600 py-2.5 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Dismiss Overlay
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
