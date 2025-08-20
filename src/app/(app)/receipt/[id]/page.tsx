
'use client';

import * as React from 'react';
import { notFound, useRouter, useParams } from 'next/navigation';
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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

const downloadImage = (blob: Blob, fileName: string) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export default function ReceiptPage() {
    const params = useParams();
    const paymentId = params.id as string;
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
                    setPaidInvoices(invoicesList);
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
    
        html2canvas(input, { scale: 2, useCORS: true }).then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', [58, 200]); 
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

    const handleSendWhatsApp = async () => {
        if (!customer || !payment || !receiptRef.current) return;

        const paidMonths = paidInvoices.map(inv => format(parseISO(inv.date), "MMMM yyyy", { locale: id })).join(', ');

        const message = `Terima kasih Anda telah melakukan Pembayaran internet untuk bulan:\n*${paidMonths}*\n\nTotal Bayar: *Rp${payment.totalPayment.toLocaleString('id-ID')}*\nStatus: *LUNAS*\n\nTerima kasih telah menggunakan layanan kami.\n- PT CYBERNETWORK CORP -`;

        try {
            await navigator.clipboard.writeText(message);
            toast({
                title: "Pesan Disalin!",
                description: "Tempel (paste) pesan ini di WhatsApp setelah gambar terlampir.",
            });
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }

        const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true });
        
        canvas.toBlob(async (blob) => {
            if (!blob) {
                toast({ title: 'Gagal membuat gambar struk', variant: 'destructive' });
                return;
            }
            
            const fileName = `struk-${customer.id}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: `Struk Pembayaran ${customer.name}`,
                    });
                } catch (error) {
                     if ((error as any).name !== 'AbortError') {
                        toast({ title: 'Gagal membagikan struk', variant: 'destructive' });
                    }
                }
            } else {
                 try {
                    downloadImage(blob, fileName);
                    const whatsappUrl = `https://web.whatsapp.com/${customer.phone ? `send?phone=${customer.phone}` : ''}`;
                    toast({
                        title: "Gambar Struk Diunduh",
                        description: `Buka WhatsApp untuk melampirkan gambar.`,
                    });
                    window.open(whatsappUrl, '_blank');
                } catch (downloadError) {
                    toast({
                        title: 'Gagal mengunduh gambar',
                        description: 'Silakan coba unduh PDF secara manual.',
                        variant: 'destructive',
                    });
                }
            }
        }, 'image/png');
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
                             <img src="/icon-512x512.png" alt="Logo Perusahaan" style={{ width: '32px', height: '32px' }} className="print:w-8 print:h-8"/>
                            <div className="text-left">
                                <h1 className="text-base font-bold">PT CYBERNETWORK CORP</h1>
                                <p className="text-xs">suport by NAVAZ</p>
                            </div>
                        </div>
                        <p className="text-xs">--------------------------------</p>
                    </CardHeader>
                    <CardContent className="p-4 text-xs">
                        <div className="grid grid-cols-3 gap-1 mb-2">
                           <div className="col-span-1">Tanggal</div>
                           <div className="col-span-2">: {format(parseISO(payment.paymentDate), "dd/MM/yyyy HH:mm", { locale: id })}</div>
                           <div className="col-span-1">Pelanggan</div>
                           <div className="col-span-2">: {payment.customerName}</div>
                        </div>
                        <p className="text-xs">--------------------------------</p>
                        <p className="text-center font-semibold my-1">RINCIAN PEMBAYARAN</p>
                        {paidInvoices.map(invoice => (
                             <div className="grid grid-cols-3 gap-1" key={invoice.id}>
                                <div className="col-span-2">wifi bulan {format(parseISO(invoice.date), "MMMM", {locale: id}).toLowerCase()}</div>
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
                    body, html {
                        background-color: white !important;
                    }
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
                    .print\\:w-8 {
                        width: 32px !important;
                    }
                    .print\\:h-8 {
                        height: 32px !important;
                    }
                    @page {
                        size: 58mm auto;
                        margin: 2mm;
                    }
                }
            `}</style>
        </div>
    );
}


