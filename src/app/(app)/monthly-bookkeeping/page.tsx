
'use client';

import * as React from 'react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Payment } from '@/lib/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Receipt, Loader2, DollarSign, Wallet, Banknote, Landmark } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';


export default function MonthlyBookkeepingPage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  React.useEffect(() => {
    const fetchPayments = async () => {
        setLoading(true);
        try {
            const paymentsSnapshot = await getDocs(collection(db, "payments"));
            const paymentsList = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
            setPayments(paymentsList);
        } catch (error) {
            console.error("Error fetching payments:", error);
            toast({
                title: "Gagal Memuat Laporan",
                description: "Tidak dapat mengambil data pembayaran dari database.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };
    fetchPayments();
  }, [toast]);

  const filteredPayments = React.useMemo(() => {
    return payments.filter(payment => {
        if (!date?.from) return true;
        const paymentDate = parseISO(payment.paymentDate);
        const fromDate = new Date(date.from.setHours(0, 0, 0, 0));
        const toDate = date.to ? new Date(date.to.setHours(23, 59, 59, 999)) : new Date(date.from.setHours(23, 59, 59, 999));
        return paymentDate >= fromDate && paymentDate <= toDate;
    });
  }, [payments, date]);

  const summary = React.useMemo(() => {
    return filteredPayments.reduce(
      (acc, payment) => {
        const amount = payment.totalPayment ?? payment.paidAmount; // Fallback for older data
        acc.total += amount;
        if (payment.paymentMethod === 'cash') acc.cash += amount;
        if (payment.paymentMethod === 'bri') acc.bri += amount;
        if (payment.paymentMethod === 'dana') acc.dana += amount;
        return acc;
      },
      { total: 0, cash: 0, bri: 0, dana: 0 }
    );
  }, [filteredPayments]);
  
  const getMethodBadge = (method: 'cash' | 'bri' | 'dana') => {
    switch(method) {
        case 'cash': return <Badge variant="secondary">Cash</Badge>;
        case 'bri': return <Badge className="bg-blue-600 text-white hover:bg-blue-700">BRI</Badge>;
        case 'dana': return <Badge className="bg-sky-500 text-white hover:bg-sky-600">DANA</Badge>;
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Pembukuan Bulanan</h1>
            <p className="text-muted-foreground">Laporan penerimaan pembayaran dari pelanggan.</p>
        </div>
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

       {loading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        ) : (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Ringkasan Pemasukan</CardTitle>
                    <CardDescription>
                        Total pemasukan berdasarkan periode yang dipilih.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Pemasukan</p>
                        <p className="text-4xl font-bold">Rp{summary.total.toLocaleString('id-ID')}</p>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="flex items-center">
                            <Wallet className="h-6 w-6 text-muted-foreground" />
                            <div className="ml-4 flex-1">
                                <p className="text-sm text-muted-foreground">Cash</p>
                                <p className="text-lg font-bold">Rp{summary.cash.toLocaleString('id-ID')}</p>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <Landmark className="h-6 w-6 text-muted-foreground" />
                            <div className="ml-4 flex-1">
                                <p className="text-sm text-muted-foreground">BRI</p>
                                <p className="text-lg font-bold">Rp{summary.bri.toLocaleString('id-ID')}</p>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <Banknote className="h-6 w-6 text-muted-foreground" />
                            <div className="ml-4 flex-1">
                                <p className="text-sm text-muted-foreground">DANA</p>
                                <p className="text-lg font-bold">Rp{summary.dana.toLocaleString('id-ID')}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Rincian Transaksi</CardTitle>
                    <CardDescription>
                        Daftar semua transaksi pembayaran pada periode yang dipilih.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredPayments.length > 0 ? (
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Pelanggan</TableHead>
                            <TableHead>Metode</TableHead>
                            <TableHead className="text-right">Total Tagihan</TableHead>
                            <TableHead className="text-right">Diskon</TableHead>
                            <TableHead className="text-right">Jumlah Dibayar</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPayments.map(payment => (
                                <TableRow key={payment.id}>
                                    <TableCell>{format(parseISO(payment.paymentDate), 'd MMM yyyy', { locale: id })}</TableCell>
                                    <TableCell className="font-medium">{payment.customerName}</TableCell>
                                    <TableCell>{getMethodBadge(payment.paymentMethod)}</TableCell>
                                    <TableCell className="text-right">Rp{payment.totalBill.toLocaleString('id-ID')}</TableCell>
                                    <TableCell className="text-right text-green-600">Rp{payment.discount.toLocaleString('id-ID')}</TableCell>
                                    <TableCell className="text-right font-semibold">Rp{(payment.totalPayment ?? payment.paidAmount).toLocaleString('id-ID')}</TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={`/receipt/${payment.id}`}>
                                                <Receipt className="mr-2 h-4 w-4" /> Struk
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    ) : (
                         <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
                            <p className="text-lg font-medium">Tidak Ada Data</p>
                            <p className="text-muted-foreground">Tidak ada pembayaran yang tercatat pada periode tanggal yang dipilih.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
      )}
    </div>
  );
}
