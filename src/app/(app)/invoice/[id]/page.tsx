
'use client';

import * as React from 'react';
import { notFound, useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Customer, Invoice } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Download, ArrowLeft, Loader2, Send } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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

export default function InvoicePage() {
    const params = useParams();
    const customerId = params.id as string;
    const router = useRouter();
    const { toast } = useToast();
    const invoiceRef = React.useRef<HTMLDivElement>(null);
    
    const [loading, setLoading] = React.useState(true);
    const [customer, setCustomer] = React.useState<Customer | null>(null);
    const [customerInvoices, setCustomerInvoices] = React.useState<Invoice[]>([]);

    React.useEffect(() => {
        if (!customerId) return;
        
        const fetchInvoiceData = async () => {
            setLoading(true);
            try {
                const customerDocRef = doc(db, "customers", customerId);
                const customerDocSnap = await getDoc(customerDocRef);
                if (!customerDocSnap.exists()) {
                    notFound();
                    return;
                }
                setCustomer({ id: customerDocSnap.id, ...customerDocSnap.data() } as Customer);
                
                const invoicesQuery = query(collection(db, "invoices"), where("customerId", "==", customerId), where("status", "==", "belum lunas"));
                const invoicesSnapshot = await getDocs(invoicesQuery);
                const invoicesList = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
                setCustomerInvoices(invoicesList.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()));

            } catch (error) {
                console.error("Error fetching invoice data:", error);
                 toast({
                    title: "Gagal memuat data",
                    description: "Tidak dapat mengambil data faktur dari database.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchInvoiceData();
    }, [customerId, toast]);


    const subTotal = customerInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const creditUsed = Math.min(customer?.creditBalance ?? 0, subTotal);
    const totalAmount = subTotal - creditUsed;

    const handleDownloadPdf = () => {
        const input = invoiceRef.current;
        if (!input || !customer) return;
    
        html2canvas(input, {
          scale: 2,
          useCORS: true, 
        }).then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', [58, 200]); 
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          const ratio = canvasWidth / canvasHeight;
          const imgHeight = pdfWidth / ratio;
          
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
          
          const fileName = `Invoice-${customer.name.replace(/ /g, '_')}-${format(new Date(), 'yyyyMMdd')}.pdf`;
          pdf.save(fileName);
        });
      };

    const handleSendWhatsApp = async () => {
        if (!customer || !invoiceRef.current) return;
    
        const message = `Yth. Bapak/Ibu pelanggan CYBERNETWORK, Ini adalah rincian untuk pembayaran internet bulan ini. \nTerima kasih, selamat beraktivitas kembali - PT CYBERNETWORK CORP -`;
        
        try {
            await navigator.clipboard.writeText(message);
            toast({
                title: "Pesan Disalin!",
                description: "Tempel (paste) pesan ini di WhatsApp setelah gambar terlampir.",
            });
        } catch (err) {
            console.error('Failed to copy text: ', err);
            // This fallback might not be needed if clipboard API is well-supported, but it's safe to have.
        }

        const canvas = await html2canvas(invoiceRef.current, { scale: 2, useCORS: true });
        
        canvas.toBlob(async (blob) => {
            if (!blob) {
                toast({ title: 'Gagal membuat gambar invoice', variant: 'destructive' });
                return;
            }
            
            const fileName = `invoice-${customer.id}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });
    
            // Check for Web Share API support for files
            if (navigator.share && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: `Invoice ${customer.name}`,
                    });
                } catch (error) {
                    if ((error as any).name !== 'AbortError') {
                        toast({ title: 'Gagal membagikan invoice', variant: 'destructive' });
                    }
                }
            } else {
                // Fallback for desktop or unsupported browsers
                try {
                    downloadImage(blob, fileName);
                    toast({
                        title: "Gambar Invoice Diunduh",
                        description: "Buka WhatsApp Web untuk melampirkan gambar.",
                    });
                    // Optionally open WhatsApp Web
                    const whatsappUrl = `https://web.whatsapp.com/send?phone=${customer.phone || ''}&text=`;
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
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }

    if (!customer) {
        return notFound();
    }

    return (
        <div className="max-w-md mx-auto p-4 sm:p-6 lg:p-8 bg-background print:bg-white">
             <div className="flex justify-between items-center mb-6 print:hidden">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Kembali
                </Button>
                <div className="flex items-center gap-2">
                    <Button onClick={handleSendWhatsApp}>
                        <Send className="mr-2 h-4 w-4" />
                        Kirim ke WA
                    </Button>
                    <Button onClick={handleDownloadPdf}>
                        <Download className="mr-2 h-4 w-4" />
                        Unduh PDF
                    </Button>
                </div>
            </div>
            <div ref={invoiceRef}>
                <Card className="border shadow-lg print:border-none print:shadow-none font-mono" id="invoice-content">
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
                           <div className="col-span-1">Invoice</div>
                           <div className="col-span-2">: INV-{customer.id.substring(4)}-{format(new Date(), 'yyyyMMdd')}</div>
                           <div className="col-span-1">Tanggal</div>
                           <div className="col-span-2">: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: id })}</div>
                           <div className="col-span-1">Pelanggan</div>
                           <div className="col-span-2">: {customer.name}</div>
                           <div className="col-span-1">Jt. Tempo</div>
                           <div className="col-span-2">: Tgl {customer.dueDateCode} setiap bulan</div>
                        </div>
                        <p className="text-xs">--------------------------------</p>
                         <p className="text-center font-semibold my-1">RINCIAN TAGIHAN</p>
                        {customerInvoices.length > 0 ? (
                            customerInvoices.map(invoice => (
                                <div className="grid grid-cols-3 gap-1" key={invoice.id}>
                                    <div className="col-span-2">Tagihan {format(parseISO(invoice.date), "MMMM yyyy", {locale: id})}</div>
                                    <div className="col-span-1 text-right">Rp{invoice.amount.toLocaleString('id-ID')}</div>
                                </div>
                            ))
                        ) : (
                             <p className="text-center my-2">(Tidak ada tagihan)</p>
                        )}
                        <p className="text-xs">--------------------------------</p>
                        <div className="grid grid-cols-3 gap-1 mt-2">
                            <div className="col-span-2 font-semibold">Subtotal</div>
                            <div className="col-span-1 text-right">Rp{subTotal.toLocaleString('id-ID')}</div>
                            {creditUsed > 0 && (
                                <>
                                <div className="col-span-2 font-semibold">Saldo</div>
                                <div className="col-span-1 text-right">- Rp{creditUsed.toLocaleString('id-ID')}</div>
                                </>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="p-4 text-xs flex-col">
                        <p className="text-xs">--------------------------------</p>
                         <div className="grid grid-cols-3 gap-1 w-full font-bold">
                            <div className="col-span-2">TOTAL</div>
                            <div className="col-span-1 text-right">Rp{totalAmount.toLocaleString('id-ID')}</div>
                        </div>
                        <p className="text-xs mt-4">Mohon lakukan pembayaran sebelum jatuh tempo untuk menghindari gangguan layanan. Terima kasih.</p>
                    </CardFooter>
                </Card>
            </div>
            <style jsx global>{`
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .print\\:hidden {
                        display: none;
                    }
                    .print\\:shadow-none {
                        box-shadow: none;
                    }
                     .print\\:border-none {
                        border: none;
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

