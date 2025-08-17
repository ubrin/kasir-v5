
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

        // Hide buttons before capture
        const buttons = input.querySelectorAll('button');
        buttons.forEach(btn => btn.style.display = 'none');
    
        html2canvas(input, {
          scale: 2, // Increase scale for better quality
          useCORS: true, 
        }).then((canvas) => {
          // Show buttons after capture
          buttons.forEach(btn => btn.style.display = '');

          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          const ratio = canvasWidth / canvasHeight;
          const imgWidth = pdfWidth;
          const imgHeight = imgWidth / ratio;
          
          let heightLeft = imgHeight;
          let position = 0;
          
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
          
          while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
          }
          
          const fileName = `Invoice-${customer.name.replace(/ /g, '_')}-${format(new Date(), 'yyyyMMdd')}.pdf`;
          pdf.save(fileName);
        });
      };

    const handleSendWhatsApp = () => {
        if (!customer) return;

        const message = `
Yth. Bapak/Ibu pelanggan CYBERNETWORK, Ini adalah rincian untuk pembayaran internet bulan ini. 
Terima kasih, selamat beraktivitas kembali - PT CYBERNETWORK CORP -
        `.trim().replace(/\n/g, '%0A').replace(/ /g, '%20');

        const phoneNumber = customer.phone;
        const whatsappUrl = `https://wa.me/${phoneNumber ? phoneNumber : ''}?text=${message}`;
        window.open(whatsappUrl, '_blank');
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
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-background print:bg-white">
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
                <Card className="border shadow-lg print:border-none print:shadow-none" id="invoice-content">
                    <CardHeader className="bg-muted/30 p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                     <Image src="/icon-512x512.png" alt="Logo Perusahaan" width={50} height={50} />
                                    <div>
                                        <h1 className="text-xl sm:text-2xl font-bold text-primary">PT CYBERNETWORK CORP</h1>
                                        <p className="text-sm text-muted-foreground">suport by NAVAZ</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-left sm:text-right w-full sm:w-auto mt-4 sm:mt-0">
                                <CardTitle className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-800 mb-1">INVOICE</CardTitle>
                                <CardDescription>#INV-{customer.id.substring(4)}-{format(new Date(), 'yyyyMMdd')}</CardDescription>
                            </div>
                        </div>
                        <Separator className="my-4"/>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="font-semibold text-muted-foreground">Ditagihkan kepada:</p>
                                <p className="font-bold text-base">{customer.name}</p>
                                <p>{customer.address}</p>
                            </div>
                            <div className="text-left sm:text-right mt-4 sm:mt-0">
                                <p className="font-semibold text-muted-foreground">Tanggal Invoice:</p>
                                <p>{format(new Date(), "d MMMM yyyy", { locale: id })}</p>
                                <p className="font-semibold text-muted-foreground mt-2">Jatuh Tempo:</p>
                                <p>Tanggal {customer.dueDateCode} setiap bulan</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="px-4 sm:px-6">Deskripsi</TableHead>
                                        <TableHead className="text-right px-4 sm:px-6">Jumlah</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {customerInvoices.length > 0 ? (
                                        customerInvoices.map(invoice => (
                                            <TableRow key={invoice.id}>
                                                <TableCell className="px-4 sm:px-6">Tagihan Internet - {format(parseISO(invoice.date), "MMMM yyyy", { locale: id })}</TableCell>
                                                <TableCell className="text-right px-4 sm:px-6">Rp{invoice.amount.toLocaleString('id-ID')}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center h-24 px-4 sm:px-6">Tidak ada tagihan tertunggak.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-muted/30 p-4 sm:p-6">
                        <div className="w-full">
                            <div className="flex flex-col items-end space-y-2 text-sm">
                                <div className="flex justify-between items-center w-full max-w-xs">
                                    <p className="text-muted-foreground">Subtotal:</p>
                                    <p className="font-medium w-32 text-right">Rp{subTotal.toLocaleString('id-ID')}</p>
                                </div>
                                {creditUsed > 0 && (
                                     <div className="flex justify-between items-center w-full max-w-xs">
                                        <p className="text-muted-foreground">Penggunaan Saldo:</p>
                                        <p className="font-medium text-blue-600 w-32 text-right">- Rp{creditUsed.toLocaleString('id-ID')}</p>
                                    </div>
                                )}
                            </div>
                            <Separator className="my-4"/>
                            <div className="flex justify-end items-center">
                                <p className="text-base sm:text-lg font-medium mr-4">Total Tagihan:</p>
                                <p className="text-xl sm:text-2xl font-bold text-primary w-36 sm:w-40 text-right">Rp{totalAmount.toLocaleString('id-ID')}</p>
                            </div>
                            <Separator className="my-4"/>
                            <div className="text-xs text-muted-foreground">
                                <p className="font-bold">Catatan:</p>
                                <p>Mohon lakukan pembayaran sebelum tanggal jatuh tempo untuk menghindari gangguan layanan. Terima kasih.</p>
                            </div>
                        </div>
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
                }
            `}</style>
        </div>
    );
}
