
'use client';

import * as React from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { customers, invoices } from '@/lib/data';
import type { Customer, Invoice } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Package, Printer, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { Logo } from '@/components/ui/logo';

export default function InvoicePage() {
    const params = useParams();
    const router = useRouter();
    const customerId = params.id as string;
    
    const [isClient, setIsClient] = React.useState(false);
    React.useEffect(() => { setIsClient(true) }, []);

    const customer = customers.find(c => c.id === customerId);
    const customerInvoices = invoices.filter(i => i.customerId === customerId && i.status === 'belum lunas');

    if (!customer) {
        notFound();
    }

    const totalAmount = customerInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    const handlePrint = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };
    
    if (!isClient) {
        return null;
    }

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-background print:bg-white">
             <div className="flex justify-between items-center mb-6 print:hidden">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Kembali
                </Button>
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Cetak Invoice
                </Button>
            </div>
            <Card className="border shadow-lg print:border-none print:shadow-none">
                <CardHeader className="bg-muted/30 p-6">
                    <div className="flex justify-between items-start">
                        <div>
                             <div className="flex items-center gap-3 mb-4">
                                <Logo className="h-12 w-12" />
                                <div>
                                    <h1 className="text-2xl font-bold text-primary">PT CYBERNETWORK CORP</h1>
                                    <p className="text-muted-foreground">Jl. Teknologi No. 1, Technopark, Indonesia</p>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <CardTitle className="text-4xl font-bold tracking-tight text-gray-800 mb-1">INVOICE</CardTitle>
                            <CardDescription>#INV-{customer.id.substring(4)}-{format(new Date(), 'yyyyMMdd')}</CardDescription>
                        </div>
                    </div>
                     <Separator className="my-4"/>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="font-semibold text-muted-foreground">Ditagihkan kepada:</p>
                            <p className="font-bold text-lg">{customer.name}</p>
                            <p>{customer.address}</p>
                        </div>
                        <div className="text-right">
                             <p className="font-semibold text-muted-foreground">Tanggal Invoice:</p>
                             <p>{format(new Date(), "d MMMM yyyy", { locale: id })}</p>
                             <p className="font-semibold text-muted-foreground mt-2">Jatuh Tempo:</p>
                             <p>Tanggal {customer.dueDateCode} setiap bulan</p>
                        </div>
                     </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-[100px]">ID Faktur</TableHead>
                                <TableHead>Deskripsi</TableHead>
                                <TableHead className="text-right">Jumlah</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customerInvoices.length > 0 ? (
                                customerInvoices.map(invoice => (
                                    <TableRow key={invoice.id}>
                                        <TableCell>{invoice.id}</TableCell>
                                        <TableCell>Tagihan Internet - {format(parseISO(invoice.date), "MMMM yyyy", { locale: id })}</TableCell>
                                        <TableCell className="text-right">Rp{invoice.amount.toLocaleString('id-ID')}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center">Tidak ada tagihan tertunggak.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter className="bg-muted/30 p-6">
                    <div className="w-full">
                         <div className="flex justify-end items-center">
                            <p className="text-lg font-medium mr-4">Total Tagihan:</p>
                            <p className="text-2xl font-bold text-primary">Rp{totalAmount.toLocaleString('id-ID')}</p>
                         </div>
                         <Separator className="my-4"/>
                         <div className="text-xs text-muted-foreground">
                            <p className="font-bold">Catatan:</p>
                            <p>Mohon lakukan pembayaran sebelum tanggal jatuh tempo untuk menghindari gangguan layanan. Terima kasih.</p>
                         </div>
                    </div>
                </CardFooter>
            </Card>
            <style jsx global>{`
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .print\:hidden {
                        display: none;
                    }
                    .print\:shadow-none {
                        box-shadow: none;
                    }
                     .print\:border-none {
                        border: none;
                    }
                    .print\:bg-white {
                        background-color: white;
                    }
                }
            `}</style>
        </div>
    );
}
