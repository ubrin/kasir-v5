
'use client';

import * as React from 'react';
import { notFound, useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Customer, Invoice } from '@/lib/types';
import Image from 'next/image';

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
    
        // Temporarily make it look like the web version for PDF generation
        input.classList.add('pdf-render-web');
    
        html2canvas(input, {
          scale: 2,
          useCORS: true,
          logging: false
        }).then((canvas) => {
          input.classList.remove('pdf-render-web');
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          const ratio = canvasWidth / canvasHeight;
          let imgWidth = pdfWidth - 20; // with margin
          let imgHeight = imgWidth / ratio;
          
          if (imgHeight > pdfHeight - 20) {
              imgHeight = pdfHeight - 20;
              imgWidth = imgHeight * ratio;
          }
          
          const x = (pdfWidth - imgWidth) / 2;
          const y = 10;

          pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
          
          const fileName = `Invoice-${customer.name.replace(/ /g, '_')}-${format(new Date(), 'yyyyMMdd')}.pdf`;
          pdf.save(fileName);
        }).catch(() => {
          // Ensure class is removed even if html2canvas fails
          input.classList.remove('pdf-render-web');
        });
      };

    const handleSendWhatsApp = async () => {
        if (!customer || !invoiceRef.current) return;
    
        const message = `Yth. Bapak/Ibu pelanggan CYBERNETWORK, Ini adalah rincian untuk pembayaran internet bulan ini. \nTerima kasih.\n-PT CYBERNETWORK CORP -`;
        
        try {
            await navigator.clipboard.writeText(message);
            toast({
                title: "Pesan Disalin!",
                description: "Tempel (paste) pesan ini di WhatsApp setelah gambar terlampir.",
            });
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }

        const canvas = await html2canvas(invoiceRef.current, { scale: 2, useCORS: true });
        
        canvas.toBlob(async (blob) => {
            if (!blob) {
                toast({ title: 'Gagal membuat gambar invoice', variant: 'destructive' });
                return;
            }
            
            const fileName = `invoice-${customer.id}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });
    
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
                 try {
                    downloadImage(blob, fileName);
                    const whatsappUrl = `https://web.whatsapp.com/${customer.phone ? `send?phone=${customer.phone}` : ''}`;
                    toast({
                        title: "Gambar Invoice Diunduh",
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
    
    const invoiceNumber = customerInvoices.length > 0 
        ? `#${customer.id.substring(0, 5).toUpperCase()}-${customerInvoices[0].id.substring(0, 5).toUpperCase()}` 
        : `#${customer.id.substring(0, 5).toUpperCase()}`;

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-background">
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
            <div ref={invoiceRef} className="bg-white p-4 sm:p-8">
                <Card className="border shadow-lg print:border-none print:shadow-none" id="invoice-content">
                    <CardHeader className="p-4 sm:p-6">
                        <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
                             <div className="flex items-center gap-4">
                                <img src="/icon-512x512.png" alt="Logo Perusahaan" style={{ width: '48px', height: '48px' }} />
                                <div>
                                    <h2 className="font-bold text-lg">PT CYBERNETWORK CORP</h2>
                                    <p className="text-muted-foreground text-xs">suport by NAVAZ</p>
                                </div>
                            </div>
                            <div className="text-left sm:text-right w-full sm:w-auto">
                                <h1 className="text-2xl font-bold uppercase text-primary">Invoice</h1>
                                <p className="text-muted-foreground">{invoiceNumber}</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div>
                                <h3 className="font-semibold mb-2">Ditagihkan Kepada:</h3>
                                <p className="font-bold">{customer.name}</p>
                                <p>{customer.address}</p>
                                <p>{customer.phone}</p>
                            </div>
                            <div className="text-left md:text-right">
                                <h3 className="font-semibold mb-2">Detail Invoice:</h3>
                                <p><span className="font-medium">Tanggal Terbit:</span> {format(new Date(), "d MMMM yyyy", { locale: id })}</p>
                                <p><span className="font-medium">Jatuh Tempo:</span> Tgl {customer.dueDateCode} setiap bulan</p>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Deskripsi</TableHead>
                                        <TableHead className="text-right">Jumlah</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {customerInvoices.length > 0 ? (
                                        customerInvoices.map(invoice => (
                                            <TableRow key={invoice.id}>
                                                <TableCell>Tagihan Internet - {format(parseISO(invoice.date), "MMMM yyyy", {locale: id})}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap">Rp {invoice.amount.toLocaleString('id-ID')}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center h-24">Tidak ada tagihan tertunggak.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex justify-end mt-6">
                            <div className="w-full max-w-sm space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>Rp {subTotal.toLocaleString('id-ID')}</span>
                                </div>
                                {creditUsed > 0 && (
                                    <div className="flex justify-between">
                                        <span>Penggunaan Saldo</span>
                                        <span className="text-green-600">- Rp {creditUsed.toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>Rp {totalAmount.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-16 grid grid-cols-2">
                            <div>{/* Spacer */}</div>
                            <div className="text-center">
                                <p>Hormat kami,</p>
                                <div className="relative h-24 w-48 mx-auto">
                                    <Image src="/stamp.png" layout="fill" objectFit="contain" alt="Cap Perusahaan" />
                                </div>
                                <p className="font-bold border-t pt-2 mt-2">Aditya</p>
                                <p className="text-sm text-muted-foreground">Direktur</p>
                            </div>
                        </div>

                    </CardContent>
                    <CardFooter className="p-4 sm:p-6 text-xs text-muted-foreground text-center">
                        <p>Terima kasih telah menggunakan layanan kami. Mohon lakukan pembayaran sebelum tanggal jatuh tempo untuk menghindari gangguan layanan.</p>
                    </CardFooter>
                </Card>
            </div>
            <style jsx global>{`
                @media (max-width: 640px) {
                  #invoice-content {
                    box-shadow: none;
                    border: none;
                  }
                   div.p-4.sm\\:p-8 {
                    padding: 0;
                  }
                }
                .pdf-render-web #invoice-content {
                  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
                  border: 1px solid hsl(var(--border));
                }
                 .pdf-render-web div.p-4.sm\\:p-8 {
                  padding: 2rem;
                }
                @media print {
                    body, html {
                        background-color: white !important;
                    }
                    .print\\:hidden {
                        display: none;
                    }
                     .print\\:border-none {
                        border: none !important;
                    }
                    .print\\:shadow-none {
                        box-shadow: none !important;
                    }
                    @page {
                        size: A4;
                        margin: 0;
                    }
                }
            `}</style>
        </div>
    );
}

    