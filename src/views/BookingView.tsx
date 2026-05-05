import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/hooks/useAuth';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Textarea } from '@/src/components/ui/textarea';
import { toast } from 'sonner';
import { CalendarPlus, UserPlus, Search, Phone, History, Receipt, Printer, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReceiptPortal from '@/src/components/ReceiptPortal';

export default function BookingView() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [estimatedCompletedAt, setEstimatedCompletedAt] = useState(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    if (!error && data) setCustomers(data);
  };

  const handleBooking = async () => {
    if (!user) return;
    if (!customerId) {
      toast.error('Pilih pelanggan terlebih dahulu');
      return;
    }

    setIsSubmitting(true);
    try {
      const estimatedDateStr = new Date(estimatedCompletedAt).toLocaleDateString('id-ID', { 
        day: 'numeric', month: 'long', year: 'numeric' 
      });
      
      const txPayload: any = {
        customer_id: customerId,
        kasir_id: user.id,
        total_qty: 0,
        subtotal: 0,
        discount: 0,
        tax: 0,
        total_bayar: 0,
        uang_dibayar: 0,
        kembalian: 0,
        metode_pembayaran: 'CASH',
        status: 'PROCESSING',
        payment_status: 'UNPAID',
        laundry_status: 'RECEIVED',
        notes: estimatedCompletedAt 
          ? `${notes ? notes + ' | ' : ''}ESTIMASI SELESAI: ${new Date(estimatedCompletedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
          : notes,
        estimated_completed_at: estimatedCompletedAt
      };

      let { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert(txPayload)
        .select('id, invoice_number, total_bayar, status, payment_status')
        .single();

      // Fallback if 'notes' or 'estimated_completed_at' column is missing from cache
      if (txError && (txError.message.includes('notes') || txError.message.includes('estimated_completed_at'))) {
        console.warn("Retrying without extended columns due to schema cache issue...");
        const { notes: _, estimated_completed_at: __, laundry_status: ___, ...fallbackPayload } = txPayload;
        const retryResult = await supabase
          .from('transactions')
          .insert(fallbackPayload)
          .select('id, invoice_number, total_bayar, status, payment_status')
          .single();
        transaction = retryResult.data;
        txError = retryResult.error;
      }

      if (txError) throw txError;

      // Register a dummy item for receipt display - safely with fallback for schema cache issue
      try {
        const dummyItem = {
          transaction_id: transaction.id,
          product_id: null,
          name: 'LAYANAN (BERAT MENYUSUL)',
          qty: 1,
          price: 0,
          subtotal: 0
        };
        
        const { error: itemError } = await supabase.from('transaction_items').insert(dummyItem);
        
        if (itemError && itemError.message.includes('name')) {
          console.warn("Retrying dummy item insert without 'name' column...");
          const { name: _, ...fallbackItem } = dummyItem;
          await supabase.from('transaction_items').insert(fallbackItem);
        }
      } catch (e) {
        console.error("Non-critical: Failed to insert dummy item", e);
      }
      
      const customerData = customers.find(c => c.id === customerId);
      const receiptData = {
        invoice: transaction.invoice_number,
        total: 0,
        subtotal: 0,
        discount: 0,
        tax: 0,
        metode_pembayaran: 'CASH',
        uang_dibayar: 0,
        kembalian: 0,
        payment_status: 'UNPAID',
        items: [{ name: 'LAYANAN (DATA MENYUSUL)', qty: 1, unit: 'KG', price: 0 }],
        customerName: customerData?.name || 'PELANGGAN',
        customerWA: customerData?.whatsapp || '-',
        customerAddress: customerData?.address || '-',
        date: new Date().toLocaleString('id-ID', { 
           day: 'numeric', 
           month: 'long', 
           year: 'numeric',
           hour: '2-digit',
           minute: '2-digit'
        }),
        notes: notes,
        estimatedCompletedAt: estimatedCompletedAt
      };

      setLastTransaction(receiptData);
      setShowReceipt(true);
      
      // Cleanup
      setCustomerId('');
      setNotes('');
      setEstimatedCompletedAt(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString());
      
      toast.success('Booking Laundry Berhasil!');
    } catch (error: any) {
      console.error(error);
      toast.error(`Gagal membuat booking: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Booking Laundry</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Daftarkan cucian masuk sebelum dihitung beratnya</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card className="border-2 border-slate-100 shadow-xl shadow-slate-100 rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-900 text-white p-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl">
                <CalendarPlus className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold uppercase tracking-tighter">Form Booking Masuk</CardTitle>
                <CardDescription className="text-blue-200/60 font-bold text-[10px] uppercase tracking-widest mt-1">Estimasi dan data pelanggan</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pilih Pelanggan</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="h-12 border-slate-200 rounded-xl font-bold">
                    <SelectValue placeholder="-- CARI ATAU PILIH PELANGGAN --" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="font-bold">
                        {c.name} ({c.whatsapp})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estimasi Pengambilan</Label>
                  <Input 
                    type="date"
                    className="h-12 border-slate-200 rounded-xl font-bold"
                    value={estimatedCompletedAt.split('T')[0]}
                    onChange={(e) => setEstimatedCompletedAt(new Date(e.target.value).toISOString())}
                  />
                </div>
                <div className="flex items-end">
                   <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 w-full flex items-center gap-3">
                      <Phone className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-[9px] font-black text-blue-600 uppercase">Kontak Terpilih</p>
                        <p className="text-xs font-bold text-slate-700">
                          {customers.find(c => c.id === customerId)?.whatsapp || 'Pilih pelanggan'}
                        </p>
                      </div>
                   </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-slate-400">Catatan Khusus (Opsional)</Label>
                <Textarea 
                  placeholder="Contoh: Titip hanger, cucian sangat kotor, laundry express, dll"
                  className="min-h-[100px] border-slate-200 rounded-2xl font-bold p-4 bg-slate-50 border-dashed"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <Button 
              className="w-full h-16 text-lg font-black uppercase tracking-widest rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
              disabled={isSubmitting || !customerId}
              onClick={handleBooking}
            >
              {isSubmitting ? (
                <>Menyimpan...</>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6 mr-3" />
                  Simpan Booking & Cetak Struk
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <ReceiptPortal 
        open={showReceipt} 
        onOpenChange={setShowReceipt}
        data={lastTransaction}
        onPrint={() => window.print()}
      />
    </div>
  );
}
