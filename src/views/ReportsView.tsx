import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, Calendar, FileText, Loader2, Download, 
  Eye, Plus, Trash2, Printer, CheckCircle2, 
  Clock, Package, AlertCircle, Phone, MessageSquare,
  ArrowRightLeft, BadgeCheck
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { formatCurrency, cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
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

import { RefreshCcw } from 'lucide-react';

export default function ReportsView() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [filterMode, setFilterMode] = useState('pipeline'); // pipeline, history
  const [printData, setPrintData] = useState<any>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

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
                    <Button className="flex-1 bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-bold uppercase tracking-widest h-10" onClick={() => markAsPaid(selectedTx.id)}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Finalize Payment
                    </Button>
                  )}
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Overlay CSS */}
      <style>{`
        @media print {
          @page { size: auto; margin: 5mm; }
          html, body { 
            width: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            background: white !important; 
            -webkit-print-color-adjust: exact;
            font-size: 14px;
          }
          #root, .fixed, dialog, [role="dialog"] { display: none !important; }
          #report-thermal-receipt { 
            display: block !important; 
            width: 100% !important; 
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 4mm !important; 
            visibility: visible !important;
            background: white !important;
            color: black !important;
            box-sizing: border-box;
          }
          #report-thermal-receipt * { visibility: visible !important; }
          .print-bold { font-weight: 900 !important; }
        }
      `}</style>

      {/* Thermal Template Portal - Optimized for better readability */}
      {typeof document !== 'undefined' && createPortal(
         <div id="report-thermal-receipt" className="hidden font-mono text-[12px] text-black leading-tight">
            <div className="text-center mb-4">
              <h2 className="font-bold text-lg uppercase tracking-tighter print-bold">SETRIKA.OS</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest">Premium Garment Care</p>
              <div className="border-t border-dashed border-black my-2" />
              <p className="font-bold text-sm print-bold">{printData?.invoice_number}</p>
              <p className="text-[10px] italic">{printData?.date}</p>
            </div>

            <div className="space-y-1.5 mb-4 text-[11px]">
               <div className="flex justify-between"><span>CLIENT:</span><span className="font-bold uppercase truncate max-w-[120px] print-bold">{printData?.customerName}</span></div>
               <div className="flex justify-between"><span>TELP  :</span><span>{printData?.customerWA}</span></div>
               <div className="flex justify-between"><span>TARGET:</span><span className="font-bold print-bold">{printData?.estimatedCompletedAt}</span></div>
            </div>

            <div className="border-t border-dashed border-black my-2" />
            
            <div className="space-y-2 mb-4">
               {printData?.items.map((item: any, i: number) => (
                 <div key={i} className="text-[11px]">
                    <div className="uppercase font-bold leading-tight print-bold">{item.name}</div>
                    <div className="flex justify-between">
                       <span>{item.qty} × {item.price.toLocaleString()}</span>
                       <span className="font-bold print-bold">{(item.qty * item.price).toLocaleString()}</span>
                    </div>
                 </div>
               ))}
            </div>

            <div className="border-t border-dashed border-black my-2" />
            
            <div className="space-y-1.5 mb-4 text-[11px]">
               <div className="flex justify-between font-bold text-sm print-bold"><span>GRAND TOTAL:</span><span>{printData?.total_bayar.toLocaleString()}</span></div>
               <div className="flex justify-between text-[10px] opacity-80"><span>METODE:</span><span className="uppercase">{printData?.metode_pembayaran}</span></div>
               <div className="flex justify-between text-[10px] opacity-80"><span>STATUS:</span><span className="font-bold italic uppercase print-bold">{printData?.payment_status === 'PAID' ? 'LUNAS' : 'BELUM BAYAR'}</span></div>
            </div>

            {printData?.notes && (
              <div className="mt-4 text-[10px] italic border-2 border-dashed p-2 border-black">
                <span className="font-bold not-italic">NOTES:</span> {printData.notes}
              </div>
            )}

            <div className="mt-8 text-center text-[9px] space-y-2 border-t border-black pt-4">
               <p className="uppercase font-bold leading-relaxed">TERIMA KASIH TELAH PERCAYA KEPADA KAMI.<br/>SIMPAN STRUK INI UNTUK PENGAMBILAN.</p>
               <p className="opacity-70 font-bold tracking-widest">• CORE ENGINE OPERATIONAL MODULE •</p>
            </div>
            <div className="h-10" />
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
