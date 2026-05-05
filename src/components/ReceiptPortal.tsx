import React from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { ReceiptText, Printer } from 'lucide-react';
import { Badge } from '@/src/components/ui/badge';
import { cn } from '@/src/lib/utils';

interface ReceiptPortalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: any;
  onPrint: () => void;
}

export default function ReceiptPortal({ open, onOpenChange, data, onPrint }: ReceiptPortalProps) {
  if (!data) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xs p-0 overflow-hidden border-none shadow-2xl font-sans">
          <div className="bg-slate-900 p-6 text-center text-white space-y-4">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
              <ReceiptText className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg uppercase">Booking Validated</h3>
              <p className="text-xs text-slate-400 font-mono">{data.invoice}</p>
            </div>
          </div>
          <div className="p-6 space-y-4 bg-white">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-1 text-center col-span-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer</p>
                <p className="text-sm font-bold text-slate-900 truncate uppercase">{data.customerName}</p>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <Button className="w-full font-bold uppercase tracking-widest text-[10px]" onClick={onPrint}>
                <Printer className="w-4 h-4 mr-2" /> Execute Print
              </Button>
              <Button variant="outline" className="w-full font-bold uppercase tracking-widest text-[10px]" onClick={() => onOpenChange(false)}>
                Close Terminal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {typeof document !== 'undefined' && createPortal(
        <div id="booking-thermal-receipt" className="hidden font-mono text-black leading-tight">
          <div className="text-center mb-6">
            <div className="border-4 border-black p-4 inline-block mb-4">
              <h1 className="font-bold text-4xl uppercase">STRUK BOOKING</h1>
            </div>
            <p className="text-xl font-bold uppercase tracking-widest text-center">Tanda Terima Pengambilan</p>
          </div>

          <div className="text-center mb-10">
            <h2 className="font-bold text-4xl uppercase tracking-tighter">SETRIKA.OS</h2>
            <p className="text-lg font-bold uppercase tracking-widest">Premium Garment Care Service</p>
          </div>

          <div className="text-center mb-10">
            <div className="border-t-4 border-dashed border-black mb-4" />
            <p className="font-bold text-2xl">{data.invoice}</p>
            <p className="text-lg italic">{data.date}</p>
          </div>

          <div className="space-y-4 mb-10 text-xl">
             <div className="flex justify-between border-b-4 border-gray-100 pb-3">
               <span>PELANGGAN:</span>
               <span className="font-bold uppercase truncate max-w-[250px] text-right pl-4">{data.customerName}</span>
             </div>
             <div className="flex justify-between border-b-4 border-gray-100 pb-3">
               <span>WHATSAPP :</span>
               <span>{data.customerWA}</span>
             </div>
             <div className="flex justify-between border-b-4 border-gray-100 pb-3">
               <span>ESTIMASI :</span>
               <span className="font-bold">{data.estimatedCompletedAt ? new Date(data.estimatedCompletedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
             </div>
          </div>

          <div className="border-t-4 border-dashed border-black my-6" />
          
          <div className="space-y-4 mb-10 text-xl text-center">
             <div className="border-4 border-black p-6 my-4 bg-gray-50">
                <p className="text-xl font-bold uppercase mb-2">Status Pesanan</p>
                <h2 className="text-4xl font-black">MENUNGGU HITUNG</h2>
             </div>
             <p className="text-lg italic font-bold uppercase mt-4">** Berat & Total Tagihan akan diinfokan admin **</p>
          </div>

          {data.notes && (
            <div className="mt-8 text-xl italic border-4 border-dashed p-6 border-black bg-gray-50">
              <span className="font-bold not-italic uppercase">Catatan:</span> {data.notes}
            </div>
          )}

          <div className="mt-16 text-center space-y-6 border-t-8 border-black pt-10">
             <p className="uppercase font-bold text-xl leading-snug">
               PESANAN TELAH KAMI TERIMA.<br/>
               STRUK INI DIGUNAKAN UNTUK PENGAMBILAN.
             </p>
             <div className="h-32" />
          </div>

          <style>{`
            @media print {
              #booking-thermal-receipt { 
                display: block !important; 
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 10mm !important;
                visibility: visible !important;
              }
              #booking-thermal-receipt * { visibility: visible !important; }
            }
          `}</style>
        </div>,
        document.body
      )}
    </>
  );
}
