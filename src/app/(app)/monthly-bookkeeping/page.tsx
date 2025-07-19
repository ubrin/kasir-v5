
'use client';

import * as React from 'react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Payment } from '@/lib/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Loader2, Wallet, Banknote, Landmark } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';


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
  

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Pembukuan Bulanan</h1>
            <p className="text-muted-foreground">Laporan pemasukan dan pengeluaran bisnis Anda.</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="flex flex-col gap-8">
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
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Catat Pengeluaran</CardTitle>
                    <CardDescription>
                        Input semua pengeluaran operasional pada periode ini.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Accordion type="multiple" defaultValue={['item-1']} className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>Pengeluaran Utama</AccordionTrigger>
                            <AccordionContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="bandwidth">Bandwidth (Rp)</Label>
                                    <Input id="bandwidth" type="number" placeholder="cth. 5000000" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="listrik">Listrik (Rp)</Label>
                                    <Input id="listrik" type="number" placeholder="cth. 1000000" />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>Angsuran</AccordionTrigger>
                            <AccordionContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="angsuran-bri">BRI (Rp)</Label>
                                    <Input id="angsuran-bri" type="number" placeholder="cth. 2500000" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="angsuran-shopee">Shopee (Rp)</Label>
                                    <Input id="angsuran-shopee" type="number" placeholder="cth. 500000" />
                                     <Label htmlFor="angsuran-shopee-ket" className="sr-only">Keterangan Shopee</Label>
                                    <Input id="angsuran-shopee-ket" placeholder="Keterangan (misal: Pembelian router)" />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>Pengeluaran Lainnya</AccordionTrigger>
                             <AccordionContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="lainnya-rp">Jumlah (Rp)</Label>
                                    <Input id="lainnya-rp" type="number" placeholder="cth. 150000" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="lainnya-ket">Keterangan</Label>
                                    <Textarea id="lainnya-ket" placeholder="cth. Biaya tak terduga, perbaikan alat, dll." />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
                <CardFooter>
                    <Button className="w-full">Simpan Pengeluaran</Button>
                </CardFooter>
            </Card>
        </div>
      )}
    </div>
  );
}
