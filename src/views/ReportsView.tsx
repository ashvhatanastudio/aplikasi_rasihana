import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Calendar, FileText, Loader2, Download, Eye, Plus, Trash2, Printer } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { formatCurrency } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function ReportsView() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'UNPAID' | 'PAID'>('all');
  const [products, setProducts] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [newItems, setNewItems] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [editQty, setEditQty] = useState(1);
  const [printData, setPrintData] = useState<any>(null);

  useEffect(() => {
    fetchTransactions();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*');
    if (data) setProducts(data);
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          customers(name, whatsapp),
          transaction_items(
            *,
            products(name)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setTransactions(data);
    } catch (err: any) {
      console.error('Fetch transactions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (txId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ 
          payment_status: 'PAID', 
          status: 'COMPLETED',
          metode_pembayaran: 'Tunai' // Default to Tunai if marking as paid later
        })
        .eq('id', txId);
      
      if (error) throw error;
      
      const shouldPrint = window.confirm('Transaksi ditandai sebagai LUNAS! Ingin cetak struk pembayaran?');
      if (shouldPrint) {
        handlePrintReceipt(txId);
      } else {
        alert('Transaksi berhasil diperbarui (LUNAS).');
      }

      fetchTransactions();
      setSelectedTx(null);
    } catch (err: any) {
      alert('Gagal memproses pembayaran: ' + err.message);
    }
  };

  const handlePrintReceipt = (txId: string | null = null) => {
    const tx = txId ? transactions.find(t => t.id === txId) : selectedTx;
    if (!tx) return;

    const receiptData = {
      invoice_number: tx.invoice_number,
      total_bayar: tx.total_bayar,
      metode_pembayaran: tx.metode_pembayaran || (tx.payment_status === 'PAID' || txId ? 'Tunai' : 'Pending'),
      uang_dibayar: tx.uang_dibayar || tx.total_bayar,
      kembalian: tx.kembalian || 0,
      payment_status: tx.payment_status === 'PAID' || txId ? 'PAID' : tx.payment_status,
      items: tx.transaction_items?.map((item: any) => ({
        name: item.products?.name,
        qty: item.qty,
        price: item.price
      })) || [],
      customerName: tx.customers?.name || 'PELANGGAN',
      customerAddress: tx.customers?.address || '-',
      date: new Date(tx.created_at).toLocaleString('id-ID')
    };

    setPrintData(receiptData);
    
    // Trigger print after state update
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const addItemToEdit = () => {
    if (!selectedProductId) return;
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    setNewItems([...newItems, {
      id: `temp-${Date.now()}`,
      product_id: prod.id,
      name: prod.name,
      price: prod.price,
      qty: editQty,
      subtotal: prod.price * editQty
    }]);
    setSelectedProductId('');
    setEditQty(1);
  };

  const removeItemFromEdit = (id: string) => {
    setNewItems(newItems.filter(i => i.id !== id));
  };

  const saveEditedOrder = async () => {
    if (newItems.length === 0) return alert('Input setidaknya 1 layanan');
    
    try {
      const total = newItems.reduce((acc, i) => acc + i.subtotal, 0);
      const qtyCount = newItems.reduce((acc, i) => acc + i.qty, 0);

      // 1. Hapus item lama jika ada
      await supabase.from('transaction_items').delete().eq('transaction_id', selectedTx.id);

      // 2. Simpan item baru
      const { error: itemError } = await supabase.from('transaction_items').insert(
        newItems.map(i => ({
          transaction_id: selectedTx.id,
          product_id: i.product_id,
          qty: i.qty,
          price: i.price,
          subtotal: i.subtotal
        }))
      );

      if (itemError) throw itemError;

      // 3. Update header transaksi
      const { error: txError } = await supabase
        .from('transactions')
        .update({
          total_bayar: total,
          subtotal: total,
          total_qty: qtyCount
        })
        .eq('id', selectedTx.id);

      if (txError) throw txError;

      alert('Order berhasil diperbarui!');
      setEditMode(false);
      fetchTransactions();
      setSelectedTx(null);
    } catch (err: any) {
      alert('Gagal update: ' + err.message);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.invoice_number?.toLowerCase().includes(search.toLowerCase()) || 
      t.customers?.name?.toLowerCase().includes(search.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && t.payment_status === filterStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Financial Records</h1>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Sales History & Audit Trail</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-white border border-slate-200 rounded p-1">
            <button 
              onClick={() => setFilterStatus('all')}
              className={cn("px-3 py-1 text-[9px] font-bold uppercase rounded", filterStatus === 'all' ? "bg-slate-900 text-white" : "text-slate-400")}
            >All</button>
            <button 
              onClick={() => setFilterStatus('UNPAID')}
              className={cn("px-3 py-1 text-[9px] font-bold uppercase rounded", filterStatus === 'UNPAID' ? "bg-orange-500 text-white" : "text-slate-400")}
            >Orders</button>
            <button 
              onClick={() => setFilterStatus('PAID')}
              className={cn("px-3 py-1 text-[9px] font-bold uppercase rounded", filterStatus === 'PAID' ? "bg-green-600 text-white" : "text-slate-400")}
            >Settled</button>
          </div>
          <button 
            onClick={fetchTransactions}
            className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded text-xs font-bold uppercase tracking-widest flex items-center hover:bg-slate-50 transition-all"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center group">
          <Search className="w-4 h-4 text-slate-400 mr-3 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by invoice hex or customer identity..."
            className="bg-transparent border-none outline-none text-xs font-medium w-full text-slate-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] uppercase tracking-widest font-bold text-slate-400 border-b border-slate-200">
                <th className="px-6 py-3 font-bold">Transaction Node</th>
                <th className="px-6 py-3 font-bold">Client Identity</th>
                <th className="px-6 py-3 font-bold">Protocol</th>
                <th className="px-6 py-3 font-bold">State</th>
                <th className="px-6 py-3 font-bold">Valuation</th>
                <th className="px-6 py-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 text-xs font-medium italic">
                    No records matched filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold font-mono text-slate-900">{tx.invoice_number}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                          {new Date(tx.created_at).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{tx.customers?.name || 'Anonymous'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-tighter border",
                        tx.metode_pembayaran === 'Tunai' ? "bg-green-50 text-green-600 border-green-100" : 
                        tx.metode_pembayaran === 'QRIS' ? "bg-blue-50 text-blue-600 border-blue-100" :
                        "bg-slate-50 text-slate-400 border-slate-100"
                      )}>
                        {tx.metode_pembayaran || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-tighter border",
                        tx.payment_status === 'PAID' ? "bg-green-600 text-white border-green-700" : "bg-orange-100 text-orange-700 border-orange-200"
                      )}>
                        {tx.payment_status === 'PAID' ? 'LUNAS' : 'PENDING'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold font-mono text-blue-700">{formatCurrency(tx.total_bayar)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedTx(tx)}
                        className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
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
        {selectedTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSelectedTx(null)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded border border-slate-200 w-full max-w-md overflow-hidden relative z-10 shadow-2xl"
            >
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Audit</h3>
                  <span className="text-xs font-mono font-bold text-slate-900">{selectedTx.invoice_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTx.payment_status === 'UNPAID' && !editMode && (
                    <button 
                      onClick={() => {
                        setEditMode(true);
                        setNewItems(selectedTx.transaction_items?.map((item: any) => ({
                          id: item.id,
                          product_id: item.product_id,
                          name: item.products?.name,
                          price: item.price,
                          qty: item.qty,
                          subtotal: item.subtotal
                        })) || []);
                      }}
                      className="px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-bold uppercase text-slate-600 hover:bg-slate-50"
                    >
                      Update Order
                    </button>
                  )}
                  <div className={cn(
                    "px-2 py-1 rounded text-[9px] font-bold uppercase",
                    selectedTx.payment_status === 'PAID' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                  )}>
                    {selectedTx.payment_status === 'PAID' ? 'Lunas' : 'Belum Bayar'}
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {editMode ? (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <select 
                          className="text-[10px] p-2 bg-white border border-slate-200 rounded uppercase font-bold"
                          value={selectedProductId}
                          onChange={(e) => setSelectedProductId(e.target.value)}
                        >
                          <option value="">Pilih Layanan</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            className="bg-white border border-slate-200 rounded p-2 text-[10px] w-full"
                            placeholder="Qty/KG"
                            step="0.1"
                            value={editQty}
                            onChange={(e) => setEditQty(Number(e.target.value))}
                          />
                          <button 
                            onClick={addItemToEdit}
                            className="bg-slate-900 text-white p-2 rounded"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="max-h-[30vh] overflow-y-auto space-y-2">
                      {newItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px] bg-white p-2 border border-slate-100 rounded">
                          <div className="flex flex-col">
                            <span className="font-bold uppercase">{item.name}</span>
                            <span className="text-slate-400">{item.qty} x {formatCurrency(item.price)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{formatCurrency(item.subtotal)}</span>
                            <button onClick={() => removeItemFromEdit(item.id)} className="text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Estimated Total</span>
                      <span className="text-sm font-bold font-mono text-blue-700">
                        {formatCurrency(newItems.reduce((acc, i) => acc + i.subtotal, 0))}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEditMode(false)}
                        className="flex-1 bg-slate-100 text-slate-600 py-3 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={saveEditedOrder}
                        className="flex-1 bg-blue-600 text-white py-3 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700"
                      >
                        Save Items
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                      {selectedTx.transaction_items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-start border-b border-slate-50 pb-2">
                          <div>
                            <p className="text-[11px] font-bold text-slate-800 uppercase">{item.products?.name}</p>
                            <p className="text-[10px] font-mono text-slate-400">{item.qty} x {formatCurrency(item.price)}</p>
                          </div>
                          <span className="text-xs font-bold font-mono text-slate-900">{formatCurrency(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 space-y-2 border-t border-slate-100">
                       <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Summary Total</span>
                        <span className="text-blue-700 font-mono text-sm">{formatCurrency(selectedTx.total_bayar)}</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400 uppercase">
                        <span>Protocol</span>
                        <span className="font-bold text-slate-600">{selectedTx.metode_pembayaran || 'Waiting Payment'}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handlePrintReceipt()}
                        className="flex items-center justify-center w-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-all mt-4"
                        title="Print Struk"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {selectedTx.payment_status === 'UNPAID' && (
                        <button 
                          onClick={() => markAsPaid(selectedTx.id)}
                          className="flex-1 bg-green-600 text-white py-2.5 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-green-700 transition-all mt-4"
                        >
                          Process Payment (Lunas)
                        </button>
                      )}
                      <button 
                        onClick={() => setSelectedTx(null)}
                        className={cn(
                          "py-2.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all mt-4",
                          selectedTx.payment_status === 'UNPAID' ? "w-24 bg-slate-100 text-slate-600 hover:bg-slate-200" : "w-full bg-slate-900 text-white hover:bg-slate-800"
                        )}
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
          body > *:not(#report-thermal-receipt) {
            display: none !important;
          }
          #report-thermal-receipt { 
            display: block !important;
            width: 100% !important;
            padding: 5% !important;
            margin: 0 !important;
            color: black !important;
            background: white !important;
            box-sizing: border-box;
            visibility: visible !important;
          }
          #report-thermal-receipt * {
            visibility: visible !important;
          }
          /* Font sangat besar agar saat di-scale down oleh printer thermal (dari A4) tetap terbaca jelas */
          .text-\[8px\] { font-size: 20pt !important; line-height: 1.3 !important; }
          .text-\[10px\] { font-size: 24pt !important; line-height: 1.3 !important; }
          .text-\[7px\] { font-size: 18pt !important; line-height: 1.2 !important; }
          .text-\[9px\] { font-size: 22pt !important; line-height: 1.3 !important; }
          .text-\[14px\] { font-size: 32pt !important; line-height: 1.2 !important; }
          .text-sm { font-size: 26pt !important; line-height: 1.3 !important; }
          .font-bold { font-weight: 700 !important; }
          .border-dashed { border-top: 2pt dashed black !important; border-width: 0 !important; }
          .border-t { border-top: 2pt solid black !important; }
          .border-b { border-bottom: 2pt solid black !important; }
          .border-2 { border: 2pt solid black !important; }
          .flex { display: flex !important; }
          .justify-between { justify-content: space-between !important; }
        }
      `}</style>
 
      {/* Hidden Thermal Receipt for Printing - Rendered via Portal */}
      {typeof document !== 'undefined' && createPortal(
        <div id="report-thermal-receipt" className="hidden print:block bg-white text-black font-mono">
          <div className="w-full text-center">
            <h2 className="font-bold text-sm uppercase tracking-tighter">KASIR JASA SETRIKA</h2>
            <p className="text-[8px] leading-tight mb-1">Cucian Rapi, Transaksi Beres</p>
            <div className="border-t border-dashed border-black my-1"></div>
            
            <h3 className="text-[10px] font-bold uppercase mb-1">
              {printData?.payment_status === 'PAID' ? 'Struk Pembayaran' : 'Struk Order / Tag Pengambilan'}
            </h3>
            
            <div className="flex justify-between text-[8px] font-bold">
              <span>INV:</span>
              <span>{printData?.invoice_number}</span>
            </div>
            <div className="flex justify-between text-[8px] mb-1">
              <span>TGL:</span>
              <span>{printData?.date}</span>
            </div>
            <div className="flex justify-between text-[8px] mb-1">
              <span>PLG:</span>
              <span className="truncate max-w-[80px] uppercase font-bold text-[10px]">{printData?.customerName}</span>
            </div>
            <div className="flex justify-between text-[8px] mb-1">
              <span>ALM:</span>
              <span className="truncate max-w-[80px] text-[7px] text-right leading-none">{printData?.customerAddress}</span>
            </div>

            <div className="border-t border-dashed border-black my-1"></div>

            {printData?.items.map((item: any, i: number) => (
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
              <span>{printData?.total_bayar?.toLocaleString('id-ID')}</span>
            </div>
            
            {printData?.payment_status === 'PAID' ? (
              <>
                <div className="flex justify-between text-[8px]">
                  <span>BAYAR:</span>
                  <span>{printData?.uang_dibayar?.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-[8px]">
                  <span>KEMBALI:</span>
                  <span>{printData?.kembalian?.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-[7px] mt-1 space-x-1">
                  <span className="bg-black text-white px-1">LUNAS</span>
                  <span className="italic uppercase">{printData?.metode_pembayaran}</span>
                </div>
              </>
            ) : (
              <div className="mt-2 text-center border border-black p-1">
                <p className="text-[8px] font-bold uppercase">Belum Bayar</p>
                <p className="text-[7px]">Bawa struk ini saat pengambilan</p>
              </div>
            )}

            <div className="border-t border-dashed border-black my-2"></div>
            <p className="text-[7px] leading-none mb-1 uppercase italic text-center">Terima Kasih Telah Menggunakan Jasa Kami</p>
            <div className="h-6"></div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
