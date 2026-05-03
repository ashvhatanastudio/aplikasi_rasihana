import jsPDF from 'jspdf';
import { formatCurrency } from './utils';

export const generateReceipt = (data: {
  invoiceNumber: string;
  customerName: string;
  items: any[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  change: number;
  paymentMethod: string;
}) => {
  const doc = new jsPDF({
    unit: 'mm',
    format: [58, 200] // Thermal printer width 58mm
  });

  const margin = 5;
  let y = 10;

  doc.setFontSize(10);
  doc.text('SETRIKA POS', 29, y, { align: 'center' });
  
  y += 5;
  doc.setFontSize(7);
  doc.text('Jl. Laundry No. 123, Kota', 29, y, { align: 'center' });
  
  y += 5;
  doc.text('--------------------------------', 29, y, { align: 'center' });
  
  y += 5;
  doc.text(`No: ${data.invoiceNumber}`, margin, y);
  y += 4;
  doc.text(`Tgl: ${new Date().toLocaleString('id-ID')}`, margin, y);
  y += 4;
  doc.text(`Pel: ${data.customerName}`, margin, y);
  
  y += 5;
  doc.text('--------------------------------', 29, y, { align: 'center' });
  
  data.items.forEach(item => {
    y += 5;
    doc.text(`${item.name}`, margin, y);
    y += 4;
    doc.text(`${item.qty} x ${formatCurrency(item.price)}`, margin, y);
    doc.text(`${formatCurrency(item.qty * item.price)}`, 53, y, { align: 'right' });
  });
  
  y += 6;
  doc.text('--------------------------------', 29, y, { align: 'center' });
  
  y += 5;
  doc.text('Subtotal:', margin, y);
  doc.text(formatCurrency(data.subtotal), 53, y, { align: 'right' });
  
  y += 4;
  doc.text('Diskon:', margin, y);
  doc.text(`-${formatCurrency(data.discount)}`, 53, y, { align: 'right' });
  
  y += 4;
  doc.text('Pajak:', margin, y);
  doc.text(formatCurrency(data.tax), 53, y, { align: 'right' });
  
  y += 5;
  doc.setFontSize(8);
  doc.text('TOTAL:', margin, y);
  doc.text(formatCurrency(data.total), 53, y, { align: 'right' });
  
  y += 6;
  doc.setFontSize(7);
  doc.text(`Bayar (${data.paymentMethod}):`, margin, y);
  doc.text(formatCurrency(data.amountPaid), 53, y, { align: 'right' });
  
  y += 4;
  doc.text('Kembali:', margin, y);
  doc.text(formatCurrency(data.change), 53, y, { align: 'right' });
  
  y += 10;
  doc.text('Terima Kasih Atas', 29, y, { align: 'center' });
  y += 4;
  doc.text('Kepercayaan Anda!', 29, y, { align: 'center' });

  doc.save(`Receipt-${data.invoiceNumber}.pdf`);
};
