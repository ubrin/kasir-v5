
'use client';

import * as React from 'react';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { id } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Payment, Expense } from '@/lib/types';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Loader2, Wallet, Banknote, Landmark, TrendingDown, Package, Landmark as InstallmentIcon, ShoppingBag } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function MonthlyBookkeepingPage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [expenses, setExpenses] = React.useState<Expense[]>([]);

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const fetchData = React.useCallback(async () => {
    if (!date?.from) return;
    setLoading(true);
    try {
        const fromDate = new Date(date.from.setHours(0, 0, 0, 0));
        const toDate = date.to ? new Date(date.to.setHours(23, 59, 59, 999)) : new Date(date.from.setHours(23, 59, 59, 999));

        // Fetch Payments
        const paymentsSnapshot = await getDocs(collection(db, "payments"));
        const paymentsList = paymentsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Payment))
            .filter(p => isWithinInterval(parseISO(p.paymentDate), { start: fromDate, end: toDate }));
        setPayments(paymentsList);
        
        // Fetch Expenses
        const expensesSnapshot = await getDocs(collection(db, "expenses"));
        const expenseList = expensesSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Expense))
            .filter(exp => {
                if (exp.category === 'utama' && exp.dueDateDay) return true; // Include recurring
                if (exp.date) {
                    return isWithinInterval(parseISO(exp.date), { start: fromDate, end: toDate });
                }
                return false;
            });
        setExpenses(expenseList);


    } catch (error) {
        console.error("Error fetching data:", error);
        toast({
            title: "Gagal Memuat Data",
            description: "Tidak dapat mengambil data dari database.",
            variant: "destructive"
        });
    } finally {
        setLoading(false);
    }
  }, [date, toast]);
  
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const incomeSummary = React.useMemo(() => {
    return payments.reduce(
      (acc, payment) => {
        const amount = payment.totalPayment ?? payment.paidAmount;
        acc.total += amount;
        if (payment.paymentMethod === 'cash') acc.cash += amount;
        if (payment.paymentMethod === 'bri') acc.bri += amount;
        if (payment.paymentMethod === 'dana') acc.dana += amount;
        return acc;
      },
      { total: 0, cash: 0, bri: 0, dana: 0 }
    );
  }, [payments]);

  const expenseSummary = React.useMemo(() => {
    const summary = { total: 0, main: 0, installments: 0, other: 0 };
    expenses.forEach(exp => {
        summary.total += exp.amount;
        if (exp.category === 'utama') summary.main += exp.amount;
        if (exp.category === 'angsuran') summary.installments += exp.amount;
        if (exp.category === 'lainnya') summary.other += exp.amount;
    });
    return summary;
  }, [expenses]);
  
  const netIncome = incomeSummary.total - expenseSummary.total;

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
        <div className="grid grid-cols-1 gap-8 items-start">
            <Card>
                <CardHeader>
                    <CardTitle>Ringkasan Keuangan</CardTitle>
                    <CardDescription>
                        Total pemasukan, pengeluaran, dan laba bersih pada periode terpilih.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Pemasukan</p>
                            <p className="text-3xl font-bold text-green-600">Rp{incomeSummary.total.toLocaleString('id-ID')}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Pengeluaran</p>
                            <p className="text-3xl font-bold text-destructive">Rp{expenseSummary.total.toLocaleString('id-ID')}</p>
                        </div>
                         <div>
                            <p className="text-sm font-medium text-muted-foreground">Laba Bersih</p>
                            <p className={`text-3xl font-bold ${netIncome >= 0 ? 'text-blue-600' : 'text-destructive'}`}>
                                Rp{netIncome.toLocaleString('id-ID')}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>Rincian Pemasukan</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="flex items-center">
                                <Wallet className="h-6 w-6 text-muted-foreground" />
                                <div className="ml-4 flex-1">
                                    <p className="text-sm text-muted-foreground">Cash</p>
                                    <p className="text-lg font-bold">Rp{incomeSummary.cash.toLocaleString('id-ID')}</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <Landmark className="h-6 w-6 text-muted-foreground" />
                                <div className="ml-4 flex-1">
                                    <p className="text-sm text-muted-foreground">BRI</p>
                                    <p className="text-lg font-bold">Rp{incomeSummary.bri.toLocaleString('id-ID')}</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <Banknote className="h-6 w-6 text-muted-foreground" />
                                <div className="ml-4 flex-1">
                                    <p className="text-sm text-muted-foreground">DANA</p>
                                    <p className="text-lg font-bold">Rp{incomeSummary.dana.toLocaleString('id-ID')}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Rincian Pengeluaran</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="flex items-center">
                                <TrendingDown className="h-6 w-6 text-muted-foreground" />
                                <div className="ml-4 flex-1">
                                    <p className="text-sm text-muted-foreground">Utama</p>
                                    <p className="text-lg font-bold">Rp{expenseSummary.main.toLocaleString('id-ID')}</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <InstallmentIcon className="h-6 w-6 text-muted-foreground" />
                                <div className="ml-4 flex-1">
                                    <p className="text-sm text-muted-foreground">Angsuran</p>
                                    <p className="text-lg font-bold">Rp{expenseSummary.installments.toLocaleString('id-ID')}</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                                <div className="ml-4 flex-1">
                                    <p className="text-sm text-muted-foreground">Lainnya</p>
                                    <p className="text-lg font-bold">Rp{expenseSummary.other.toLocaleString('id-ID')}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      )}
    </div>
  );
}
