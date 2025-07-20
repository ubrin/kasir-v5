
'use client';

import * as React from 'react';
import { notFound, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Customer, Invoice, Payment } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Download, ArrowLeft, Send, Printer, MoreVertical, Loader2 } from 'lucide-react';
import Image from 'next/image';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

export default function ReceiptPage({ params }: { params: { id: string } }) {
    const paymentId = params.id;
    const router = useRouter();
    const { toast } = useToast();
    const receiptRef = React.useRef<HTMLDivElement>(null);
    
    const [loading, setLoading] = React.useState(true);
    const [payment, setPayment] = React.useState<Payment | null>(null);
    const [customer, setCustomer] = React.useState<Customer | null>(null);
    const [paidInvoices, setPaidInvoices] = React.useState<Invoice[]>([]);

    React.useEffect(() => {
        if (!paymentId) return;

        const fetchReceiptData = async () => {
            setLoading(true);
            try {
                const paymentDocRef = doc(db, "payments", paymentId);
                const paymentDocSnap = await getDoc(paymentDocRef);
                if (!paymentDocSnap.exists()) {
                    notFound();
                    return;
                }
                const paymentData = { id: paymentDocSnap.id, ...paymentDocSnap.data() } as Payment;
                setPayment(paymentData);

                const customerDocRef = doc(db, "customers", paymentData.customerId);
                const customerDocSnap = await getDoc(customerDocRef);
                if (customerDocSnap.exists()) {
                    setCustomer({ id: customerDocSnap.id, ...customerDocSnap.data() } as Customer);
                }

                if (paymentData.invoiceIds && paymentData.invoiceIds.length > 0) {
                    const invoicesQuery = query(collection(db, "invoices"), where("__name__", "in", paymentData.invoiceIds));
                    const invoicesSnapshot = await getDocs(invoicesQuery);
                    const invoicesList = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Invoice);

                    // We need to re-calculate invoice amounts if they were partially paid,
                    // but for a receipt, we usually show the full original amount.
                    // Let's find the original invoice amounts from the customer's total invoices.
                     const allInvoicesQuery = query(collection(db, "invoices"), where("customerId", "==", paymentData.customerId));
                     const allInvoicesSnapshot = await getDocs(allInvoicesQuery);
                     const allInvoices = allInvoicesSnapshot.docs.map(doc => ({id: doc.id, ...doc.data() as Invoice}));
                    
                     const finalPaidInvoices = paymentData.invoiceIds.map(id => {
                        const foundInvoice = allInvoices.find(inv => inv.id === id);
                        return foundInvoice ? { ...foundInvoice, amount: foundInvoice.amount } : null;
                     }).filter(inv => inv !== null) as Invoice[];

                    setPaidInvoices(finalPaidInvoices);
                }

            } catch (error) {
                console.error("Error fetching receipt data:", error);
                toast({
                    title: "Gagal memuat data struk",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchReceiptData();
    }, [paymentId, toast]);

    const handleDownloadPdf = () => {
        const input = receiptRef.current;
        if (!input) return;

        const buttons = input.querySelectorAll('button');
        buttons.forEach(btn => btn.style.display = 'none');
    
        html2canvas(input, { scale: 2, useCORS: true }).then((canvas) => {
          buttons.forEach(btn => btn.style.display = '');

          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', [80, 200]); // Thermal-like size
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          const ratio = canvasWidth / canvasHeight;
          const imgHeight = pdfWidth / ratio;
          
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
          
          const fileName = `Struk-${customer?.name.replace(/ /g, '_')}-${payment ? format(parseISO(payment.paymentDate), 'yyyyMMdd') : ''}.pdf`;
          pdf.save(fileName);
        });
    };

    const handleSendWhatsApp = () => {
        if (!customer?.phone) {
            toast({
                title: "Nomor Tidak Ditemukan",
                description: "Nomor WhatsApp pelanggan tidak terdaftar.",
                variant: "destructive",
            });
            return;
        }

        const paidMonths = paidInvoices.map(inv => format(parseISO(inv.date), "MMMM yyyy", { locale: id })).join(', ');

        const message = `
Terima kasih Anda telah melakukan Pembayaran internet untuk: ${paidMonths}
Total Bayar: Rp${payment?.totalPayment.toLocaleString('id-ID')}

Terima kasih telah menggunakan layanan kami.
- PT CYBERNETWORK CORP -
        `.trim().replace(/\n/g, '%0A').replace(/ /g, '%20');

        const whatsappUrl = `https://wa.me/${customer.phone}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };

    const handlePrint = () => {
        window.print();
    }
    
    if (loading) {
        return (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }
    
    if (!payment || !customer) {
        return notFound();
    }

    return (
        <div className="max-w-md mx-auto p-4 sm:p-6 lg:p-8 bg-background print:bg-white">
             <div className="flex justify-between items-center mb-6 print:hidden">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                     <span className="sr-only">Kembali</span>
                </Button>
                <div className="flex gap-2">
                    <Button onClick={handleSendWhatsApp}>
                        <Send className="mr-0 sm:mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Kirim Struk</span>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Opsi Lain</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handlePrint}>
                                <Printer className="mr-2 h-4 w-4" />
                                <span>Print</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDownloadPdf}>
                                <Download className="mr-2 h-4 w-4" />
                                <span>Unduh PDF</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <div ref={receiptRef}>
                <Card className="border shadow-lg print:border-none print:shadow-none font-mono" id="receipt-content">
                    <CardHeader className="p-4 text-center">
                        <div className="flex justify-center items-center gap-2 mb-2">
                            <Image src="/icon-512x512.png" alt="Logo Perusahaan" width={32} height={32} />
                            <h1 className="text-lg font-bold">PT CYBERNETWORK CORP</h1>
                        </div>
                        <p className="text-xs">suport by NAVAZ</p>
                        <p className="text-xs">--------------------------------</p>
                    </CardHeader>
                    <CardContent className="p-4 text-xs">
                        <div className="grid grid-cols-3 gap-1 mb-2">
                           <div className="col-span-1">No Struk</div>
                           <div className="col-span-2">: {payment.id}</div>
                           <div className="col-span-1">Tanggal</div>
                           <div className="col-span-2">: {format(parseISO(payment.paymentDate), "dd/MM/yyyy HH:mm", { locale: id })}</div>
                           <div className="col-span-1">Pelanggan</div>
                           <div className="col-span-2">: {payment.customerName}</div>
                        </div>
                        <p className="text-xs">--------------------------------</p>
                        <p className="text-center font-semibold my-1">RINCIAN PEMBAYARAN</p>
                        {paidInvoices.map(invoice => (
                             <div className="grid grid-cols-3 gap-1" key={invoice.id}>
                                <div className="col-span-2">Tagihan {format(parseISO(invoice.date), "MMMM yyyy")}</div>
                                <div className="col-span-1 text-right">Rp{invoice.amount.toLocaleString('id-ID')}</div>
                            </div>
                        ))}
                         <p className="text-xs">--------------------------------</p>
                        <div className="grid grid-cols-3 gap-1 mt-2">
                            <div className="col-span-2 font-semibold">Total Tagihan</div>
                            <div className="col-span-1 text-right">Rp{payment.totalBill.toLocaleString('id-ID')}</div>
                            <div className="col-span-2 font-semibold">Diskon</div>
                            <div className="col-span-1 text-right">Rp{payment.discount.toLocaleString('id-ID')}</div>
                            <div className="col-span-2 font-semibold">Total Bayar</div>
                            <div className="col-span-1 text-right">Rp{payment.totalPayment.toLocaleString('id-ID')}</div>
                             <p className="col-span-3 text-xs">--------------------------------</p>
                            <div className="col-span-2 font-semibold">Jumlah Dibayar</div>
                            <div className="col-span-1 text-right font-bold">Rp{payment.paidAmount.toLocaleString('id-ID')}</div>
                             <div className="col-span-2 font-semibold">Kembalian</div>
                            <div className="col-span-1 text-right font-bold">Rp{payment.changeAmount.toLocaleString('id-ID')}</div>
                        </div>

                    </CardContent>
                    <CardFooter className="p-4 text-center text-xs flex-col">
                         <p className="text-xs">--------------------------------</p>
                        <p className="font-semibold">Terima Kasih!</p>
                        <p>Simpan struk ini sebagai bukti pembayaran yang sah.</p>
                    </CardFooter>
                </Card>
            </div>
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #receipt-content, #receipt-content * {
                        visibility: visible;
                    }
                    #receipt-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .print\\:hidden {
                        display: none;
                    }
                     .print\\:border-none {
                        border: none;
                    }
                    .print\\:shadow-none {
                        box-shadow: none;
                    }
                    .print\\:bg-white {
                        background-color: white;
                    }
                    @page {
                        size: 80mm auto;
                        margin: 5mm;
                    }
                }
            `}</style>
        </div>
    );
}
