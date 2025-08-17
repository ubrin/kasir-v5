
'use client';

import * as React from 'react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { collection, getDocs, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Payment, Collector } from '@/lib/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Receipt, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


type DailyCollection = {
    date: string;
    collectors: {
        [collectorId: string]: {
            name: string;
            payments: Payment[];
            total: number;
        }
    }
    total: number;
    paymentMethodTotals: {
        cash: number;
        bri: number;
        dana: number;
    }
}

export default function PaymentReportPage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [collectors, setCollectors] = React.useState<Collector[]>([]);
  const [selectedCollectorId, setSelectedCollectorId] = React.useState<string>('all');
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  React.useEffect(() => {
    setLoading(true);
    try {
          const unsubscribePayments = onSnapshot(query(collection(db, "payments")), (paymentsSnapshot) => {
            const paymentsList = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
            setPayments(paymentsList);
            // We set loading to false here, but collector data might still be loading.
            // This is okay as the UI will update once collectors arrive.
            setLoading(false); 
        }, (error) => {
              console.error("Error fetching payments:", error);
              toast({ title: "Gagal Memuat Laporan", variant: "destructive" });
              setLoading(false);
        });
        
        const unsubscribeCollectors = onSnapshot(collection(db, "collectors"), (collectorsSnapshot) => {
            const collectorsList = collectorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collector)).sort((a,b) => a.name.localeCompare(b.name));
            setCollectors(collectorsList);
        }, (error) => {
              console.error("Error fetching collectors:", error);
              toast({ title: "Gagal Memuat Data Penagih", variant: "destructive" });
        });

        return () => {
            unsubscribePayments();
            unsubscribeCollectors();
        }

    } catch (error) {
        console.error("Error fetching initial data:", error);
        toast({
            title: "Gagal Memuat Laporan",
            description: "Tidak dapat mengambil data pembayaran dari database.",
            variant: "destructive"
        });
        setLoading(false);
    }
  }, [toast]);

  const filteredPayments = payments.filter(payment => {
    if (!date?.from) return true;
    const paymentDate = new Date(payment.paymentDate);
    const fromDate = new Date(date.from.setHours(0, 0, 0, 0));
    const toDate = date.to ? new Date(date.to.setHours(23, 59, 59, 999)) : new Date(date.from.setHours(23, 59, 59, 999));
    
    const isDateInRange = paymentDate >= fromDate && paymentDate <= toDate;
    const isCollectorMatch = selectedCollectorId === 'all' || (payment.collectorId || 'unassigned') === selectedCollectorId;

    return isDateInRange && isCollectorMatch;
  });

  const collectorsMap = new Map(collectors.map(c => [c.id, c.name]));
  collectorsMap.set('unassigned', 'Tidak Ditentukan');

  const groupedByDate: { [date: string]: DailyCollection } = {};

    for (const payment of filteredPayments) {
        const dateStr = payment.paymentDate;
        if (!groupedByDate[dateStr]) {
            groupedByDate[dateStr] = { 
                date: dateStr, 
                collectors: {}, 
                total: 0,
                paymentMethodTotals: { cash: 0, bri: 0, dana: 0 }
            };
        }

        const collectorId = payment.collectorId || 'unassigned';
        const collectorName = collectorsMap.get(collectorId) || 'Nama Tidak Ditemukan';

        if (!groupedByDate[dateStr].collectors[collectorId]) {
            groupedByDate[dateStr].collectors[collectorId] = {
                name: collectorName,
                payments: [],
                total: 0
            };
        }
        
        groupedByDate[dateStr].collectors[collectorId].payments.push(payment);
        groupedByDate[dateStr].collectors[collectorId].total += payment.totalPayment;
        groupedByDate[dateStr].total += payment.totalPayment;
        groupedByDate[dateStr].paymentMethodTotals[payment.paymentMethod] += payment.totalPayment;
    }

  const sortedCollections = Object.values(groupedByDate).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const getMethodBadge = (method: 'cash' | 'bri' | 'dana') => {
    switch(method) {
        case 'cash': return <Badge variant="secondary">Cash</Badge>;
        case 'bri': return <Badge className="bg-blue-600 text-white hover:bg-blue-700">BRI</Badge>;
        case 'dana': return <Badge className="bg-sky-500 text-white hover:bg-sky-600">DANA</Badge>;
    }
  }

  if (loading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-16 w-16 animate-spin" />
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Laporan Pembayaran</h1>
            <p className="text-muted-foreground">Laporan penerimaan pembayaran dari pelanggan.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={selectedCollectorId} onValueChange={setSelectedCollectorId}>
                <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Pilih Penagih" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Semua Penagih</SelectItem>
                    {collectors.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                    <SelectItem value="unassigned">Tidak Ditentukan</SelectItem>
                </SelectContent>
            </Select>
            <Popover>
            <PopoverTrigger asChild>
                <Button
                id="date"
                variant={'outline'}
                className={cn('w-full sm:w-[300px] justify-start text-left font-normal', !date && 'text-muted-foreground')}
                >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                    date.to ? (
                    <>
                        {format(date.from, 'LLL dd, y', {locale: id})} - {format(date.to, 'LLL dd, y', {locale: id})}
                    </>
                    ) : (
                    format(date.from, 'LLL dd, y', {locale: id})
                    )
                ) : (
                    <span>Pilih tanggal</span>
                )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                locale={id}
                />
            </PopoverContent>
            </Popover>
        </div>
      </div>

      {sortedCollections.length > 0 ? (
        <Card>
            <CardHeader>
                <CardTitle>Rincian Harian</CardTitle>
                <CardDescription>Klik pada tanggal untuk melihat rincian transaksi per penagih.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" className="w-full space-y-4" defaultValue={sortedCollections.length > 0 ? [sortedCollections[0].date] : []}>
                    {sortedCollections.map((daily) => {
                        return (
                             <AccordionItem value={daily.date} key={daily.date} className="border rounded-lg bg-card overflow-hidden">
                                <AccordionTrigger className="bg-muted/50 hover:no-underline px-4 sm:px-6 py-3">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full">
                                        <span className="font-semibold text-lg mb-2 sm:mb-0 text-left">{format(parseISO(daily.date), 'eeee, d MMMM yyyy', { locale: id })}</span>
                                        <div className="flex flex-col items-start sm:items-end gap-2">
                                            <span className="font-bold text-lg text-primary sm:mr-4">Total: Rp{daily.total.toLocaleString('id-ID')}</span>
                                            <div className="flex flex-wrap gap-2 sm:mr-4">
                                                <Badge variant="secondary">Cash: Rp{daily.paymentMethodTotals.cash.toLocaleString('id-ID')}</Badge>
                                                <Badge className="bg-blue-600 text-white hover:bg-blue-700">BRI: Rp{daily.paymentMethodTotals.bri.toLocaleString('id-ID')}</Badge>
                                                <Badge className="bg-sky-500 text-white hover:bg-sky-600">DANA: Rp{daily.paymentMethodTotals.dana.toLocaleString('id-ID')}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-0">
                                   {Object.values(daily.collectors)
                                    .sort((a,b) => a.name.localeCompare(b.name))
                                    .map(collectorData => (
                                    <div key={collectorData.name} className="border-t">
                                        <div className="bg-muted/30 px-4 sm:px-6 py-2 flex justify-between items-center">
                                            <h3 className="font-semibold">{collectorData.name}</h3>
                                            <p className="text-sm font-medium">Subtotal: Rp{collectorData.total.toLocaleString('id-ID')}</p>
                                        </div>
                                        <div className='md:hidden divide-y'>
                                            {collectorData.payments.map(payment => (
                                                <div key={payment.id} className="p-4">
                                                    <div className="flex justify-between items-start">
                                                        <p className="font-medium">{payment.customerName}</p>
                                                        {getMethodBadge(payment.paymentMethod)}
                                                    </div>
                                                    <div className="flex justify-between items-center mt-2 pt-2 border-t">
                                                        <p className="font-semibold">Rp{payment.paidAmount.toLocaleString('id-ID')}</p>
                                                        <Button asChild variant="outline" size="sm">
                                                            <Link href={`/receipt/${payment.id}`}>
                                                                <Receipt className="mr-2 h-4 w-4" /> Struk
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="hidden md:block">
                                            <Table>
                                            <TableHeader>
                                                <TableRow>
                                                <TableHead>Pelanggan</TableHead>
                                                <TableHead>Metode Bayar</TableHead>
                                                <TableHead className="text-right">Jumlah Dibayar</TableHead>
                                                <TableHead className="text-right">Aksi</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {collectorData.payments.map(payment => (
                                                <TableRow key={payment.id}>
                                                    <TableCell className="font-medium">{payment.customerName}</TableCell>
                                                    <TableCell>{getMethodBadge(payment.paymentMethod)}</TableCell>
                                                    <TableCell className="text-right">Rp{payment.paidAmount.toLocaleString('id-ID')}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button asChild variant="outline" size="sm">
                                                            <Link href={`/receipt/${payment.id}`}>
                                                                <Receipt className="mr-2 h-4 w-4" /> Lihat Struk
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                                ))}
                                            </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                ))}
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            </CardContent>
        </Card>
      ) : (
        <Card>
            <CardContent className="flex flex-col items-center justify-center h-48 gap-2 text-center">
                <p className="text-lg font-medium">Tidak Ada Data</p>
                <p className="text-muted-foreground">Tidak ada pembayaran yang tercatat pada periode tanggal yang dipilih.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

    