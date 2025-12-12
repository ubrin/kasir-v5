
'use client';

import * as React from 'react';
import { notFound, useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Customer, Invoice } from '@/lib/types';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Download, ArrowLeft, Loader2, Send, Printer } from 'lucide-react';
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
        ? `INV/${new Date().getFullYear()}/${String(customerInvoices[0].id.substring(0, 4)).toUpperCase()}`
        : `INV/${new Date().getFullYear()}/${String(customer.id.substring(0, 4)).toUpperCase()}`;

    return (
        <>
            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-background">
                <div className="flex justify-between items-center mb-6 print:hidden">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Kembali
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button onClick={handleSendWhatsApp}>
                            <Send className="mr-2 h-4 w-4" />
                            Kirim
                        </Button>
                        <Button onClick={handleDownloadPdf}>
                            <Download className="mr-2 h-4 w-4" />
                            Unduh PDF
                        </Button>
                    </div>
                </div>
                <div ref={invoiceRef} className="bg-white p-4 sm:p-8 shadow-lg border rounded-lg">
                    <header className="flex justify-between items-start mb-10">
                        <div className="w-1/2">
                            <Image src="/icon-512x512.png" alt="Logo Perusahaan" width={120} height={40} className="mb-4"/>
                        </div>
                        <div className="w-1/2 text-right">
                            <h1 className="text-4xl font-bold text-blue-700 uppercase mb-4">Invoice</h1>
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr>
                                        <td className="font-bold text-gray-600 pr-4">Referensi</td>
                                        <td>{invoiceNumber}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-bold text-gray-600 pr-4">Tanggal</td>
                                        <td>{format(new Date(), "dd/MM/yyyy", { locale: id })}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-bold text-gray-600 pr-4">Tgl. Jatuh Tempo</td>
                                        <td>{format(new Date(new Date().getFullYear(), new Date().getMonth(), customer.dueDateCode), "dd/MM/yyyy", { locale: id })}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </header>

                    <section className="flex justify-between mb-10 text-sm">
                        <div className="w-1/2 pr-8">
                            <h2 className="font-bold text-gray-500 uppercase tracking-wider mb-2">Info Perusahaan</h2>
                            <Separator className="mb-3"/>
                            <p className="font-bold">PT CYBER NETWORK CORP</p>
                            <p>Munggur, kepek Rt.01 Rw.014,</p>
                            <p>Kab. Gunung Kidul, DI Yogyakarta,</p>
                            <p>Telp: 6283861100703</p>
                            <p>Email: rhiztria@gmail.com</p>
                        </div>
                        <div className="w-1/2">
                            <h2 className="font-bold text-gray-500 uppercase tracking-wider mb-2">Tagihan Untuk</h2>
                            <Separator className="mb-3"/>
                            <p className="font-bold">{customer.name}</p>
                            <p>{customer.address}</p>
                            <p>Telp: {customer.phone}</p>
                        </div>
                    </section>

                    <section className="mb-10">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-800 text-white">
                                <tr>
                                    <th className="p-3 text-left font-medium">Produk</th>
                                    <th className="p-3 text-left font-medium">Deskripsi</th>
                                    <th className="p-3 text-center font-medium">Kuantitas</th>
                                    <th className="p-3 text-right font-medium">Harga (Rp)</th>
                                    <th className="p-3 text-right font-medium">Jumlah (Rp)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customerInvoices.map((invoice, index) => (
                                    <tr key={invoice.id} className="border-b">
                                        <td className="p-3">INTERNET</td>
                                        <td className="p-3">Tagihan Internet - {format(parseISO(invoice.date), "MMMM yyyy", { locale: id })}</td>
                                        <td className="p-3 text-center">1</td>
                                        <td className="p-3 text-right">{invoice.amount.toLocaleString('id-ID', {minimumFractionDigits: 2})}</td>
                                        <td className="p-3 text-right">{invoice.amount.toLocaleString('id-ID', {minimumFractionDigits: 2})}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    <section className="flex justify-end mb-10 text-sm">
                        <div className="w-full max-w-sm">
                            <div className="flex justify-between py-2">
                                <span className="font-medium text-gray-600">Subtotal</span>
                                <span className="font-medium">Rp {subTotal.toLocaleString('id-ID', {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="font-medium text-gray-600">Pajak</span>
                                <span className="font-medium">Rp 0.00</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between py-2 font-bold">
                                <span className="text-gray-600">Total</span>
                                <span>Rp {subTotal.toLocaleString('id-ID', {minimumFractionDigits: 2})}</span>
                            </div>
                            {creditUsed > 0 && (
                                <div className="flex justify-between py-2">
                                    <span className="font-medium text-gray-600">Penggunaan Saldo</span>
                                    <span className="font-medium text-green-600">- Rp {creditUsed.toLocaleString('id-ID', {minimumFractionDigits: 2})}</span>
                                </div>
                            )}
                            <div className="bg-gray-100 p-3 rounded-md mt-2">
                                <div className="flex justify-between font-bold text-base">
                                    <span className="text-gray-700">Sisa Tagihan</span>
                                    <span className="text-blue-700">Rp {totalAmount.toLocaleString('id-ID', {minimumFractionDigits: 2})}</span>
                                </div>
                            </div>
                        </div>
                    </section>
                    
                    <section className="flex justify-between items-end text-sm">
                        <div className="w-1/2 pr-8">
                            <h2 className="font-bold text-gray-500 uppercase tracking-wider mb-2">Keterangan</h2>
                            <Separator className="mb-3"/>
                            <p className="font-semibold">Untuk pembayaran transfer</p>
                            <p>BRI 698601034613530</p>
                            <p>DANA 081239492626</p>
                            <p>A.N UBRIN OCTARI SANDI PRIATAMA</p>
                            <br />
                            <p>NIB:0709230129521</p>
                            <p>NPWP:50.288.361.4-545.000</p>
                        </div>
                        <div className="w-1/2 text-center">
                            <p className="mb-20">Hormat Kami,</p>
                            <p className="font-bold border-t pt-2 mt-2">haris trianto</p>
                        </div>
                    </section>
                </div>
            </div>
            <style jsx global>{`
                @media (max-width: 640px) {
                    div.bg-white {
                        padding: 0;
                        box-shadow: none;
                        border: none;
                    }
                }
                .pdf-render-web {
                    padding: 2rem;
                    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
                    border-radius: 0.5rem;
                    border: 1px solid #e5e7eb;
                }
                @media print {
                    body, html {
                        background-color: white !important;
                    }
                    .print\\:hidden {
                        display: none;
                    }
                    @page {
                        size: A4;
                        margin: 0;
                    }
                }
            `}</style>
        </>
    );
}
