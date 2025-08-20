
'use client';

import * as React from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, Wallet, Users, FileClock, DollarSign, BookText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { format, isThisMonth, parseISO, startOfMonth } from "date-fns";
import type { Payment, Expense, OtherIncome, Customer, Invoice } from "@/lib/types";

type Stats = {
  monthlyIncome: number;
  monthlyExpense: number;
  netProfit: number;
  totalOmset: number;
  totalArrears: number;
  newCustomersCount: number;
};

export default function FinancePage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<Stats | null>(null);

  React.useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [
          paymentsSnapshot,
          expensesSnapshot,
          otherIncomesSnapshot,
          customersSnapshot,
          invoicesSnapshot,
        ] = await Promise.all([
          getDocs(collection(db, "payments")),
          getDocs(collection(db, "expenses")),
          getDocs(collection(db, "otherIncomes")),
          getDocs(collection(db, "customers")),
          getDocs(collection(db, "invoices")),
        ]);

        const today = new Date();
        const startOfCurrentMonth = startOfMonth(today);

        const thisMonthPayments = paymentsSnapshot.docs
            .map(doc => doc.data() as Payment)
            .filter(p => p.paymentDate && isThisMonth(parseISO(p.paymentDate)));
        
        const monthlyIncomeFromPayments = thisMonthPayments.reduce((sum, p) => sum + (p.totalPayment || 0), 0);

        const thisMonthOtherIncomes = otherIncomesSnapshot.docs
            .map(doc => doc.data() as OtherIncome)
            .filter(oi => oi.date && isThisMonth(parseISO(oi.date)));
            
        const monthlyIncomeFromOther = thisMonthOtherIncomes.reduce((sum, oi) => sum + (oi.amount || 0), 0);

        const monthlyIncome = monthlyIncomeFromPayments + monthlyIncomeFromOther;

        const thisMonthExpenses = expensesSnapshot.docs
            .map(doc => doc.data() as Expense)
            .filter(e => e.date && isThisMonth(parseISO(e.date)));
            
        const monthlyExpense = thisMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        
        const customersList = customersSnapshot.docs.map(doc => doc.data() as Customer);

        const newCustomers = customersList.filter(c => c.installationDate && isThisMonth(parseISO(c.installationDate)));

        const oldUnpaidInvoices = invoicesSnapshot.docs
            .map(doc => doc.data() as Invoice)
            .filter(inv => inv.status === 'belum lunas' && inv.date && parseISO(inv.date) < startOfCurrentMonth);

        const totalArrears = oldUnpaidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

        const totalOmset = customersList.reduce((sum, c) => sum + (c.packagePrice || 0), 0);

        setStats({
          monthlyIncome,
          monthlyExpense,
          netProfit: monthlyIncome - monthlyExpense,
          totalOmset,
          totalArrears,
          newCustomersCount: newCustomers.length,
        });

      } catch (error) {
        console.error("Failed to fetch stats:", error);
        toast({
          title: "Gagal memuat data",
          description: "Tidak dapat mengambil data keuangan.",
          variant: "destructive",
        });
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Gagal memuat statistik. Coba segarkan halaman.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Keuangan & Statistik</h1>
          <p className="text-muted-foreground">Ringkasan keuangan bulanan dan total.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Keuangan Bulan Ini</CardTitle>
          <CardDescription>Pemasukan, pengeluaran, dan laba bersih yang tercatat bulan ini.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pemasukan</p>
                <p className="text-2xl font-bold">Rp{stats.monthlyIncome.toLocaleString('id-ID')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pengeluaran</p>
                <p className="text-2xl font-bold">Rp{stats.monthlyExpense.toLocaleString('id-ID')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg">
                <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Laba Bersih</p>
                <p className="text-2xl font-bold">Rp{stats.netProfit.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/customers" className="block hover:bg-muted/50 transition-colors rounded-lg">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Omset Potensial</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp{stats.totalOmset.toLocaleString('id-ID')}</div>
              <p className="text-xs text-muted-foreground">Potensi pendapatan bulanan</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/customers?filter=new_this_month" className="block hover:bg-muted/50 transition-colors rounded-lg">
            <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pelanggan Baru Bulan Ini</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">+{stats.newCustomersCount}</div>
                <p className="text-xs text-muted-foreground">Pelanggan baru bulan ini</p>
            </CardContent>
            </Card>
        </Link>
        <Link href="/customers?filter=has_arrears" className="block hover:bg-muted/50 transition-colors rounded-lg">
            <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pelanggan Menunggak</CardTitle>
                <FileClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">Rp{stats.totalArrears.toLocaleString('id-ID')}</div>
                <p className="text-xs text-muted-foreground">Total tagihan belum lunas dari bulan lalu</p>
            </CardContent>
            </Card>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline">
          <Link href="/other-incomes">
            <DollarSign className="mr-2 h-4 w-4" />
            Pemasukan Lainnya
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/expenses">
            <TrendingDown className="mr-2 h-4 w-4" />
            Lihat Pengeluaran
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/reports">
            <BookText className="mr-2 h-4 w-4" />
            Total Keuangan
          </Link>
        </Button>
      </div>
    </div>
  );
}
