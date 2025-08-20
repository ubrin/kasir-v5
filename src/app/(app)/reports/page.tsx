
'use client';

import * as React from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Payment, Expense, OtherIncome } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, TrendingDown, Wallet, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<{
      totalIncome: number;
      totalExpense: number;
      balance: number;
  } | null>(null);

  const calculateTotalStats = React.useCallback(async () => {
    setLoading(true);
    try {
        const [
            paymentsSnapshot,
            expensesSnapshot,
            otherIncomesSnapshot,
        ] = await Promise.all([
            getDocs(collection(db, "payments")),
            getDocs(collection(db, "expenses")),
            getDocs(collection(db, "otherIncomes")),
        ]);

        const payments = paymentsSnapshot.docs.map(doc => doc.data() as Payment);
        const expenses = expensesSnapshot.docs.map(doc => doc.data() as Expense);
        const otherIncomes = otherIncomesSnapshot.docs.map(doc => doc.data() as OtherIncome);

        const totalPaymentIncome = payments.reduce((sum, p) => sum + (Number(p.totalPayment) || 0), 0);
        const totalOtherIncomeValue = otherIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const totalIncome = totalPaymentIncome + totalOtherIncomeValue;
        
        const totalExpense = expenses.filter(e => e.date && e.amount).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        
        const balance = totalIncome - totalExpense;

        setStats({
          totalIncome,
          totalExpense,
          balance,
        });

    } catch (error) {
      console.error("Failed to fetch total stats:", error);
      toast({
          title: "Gagal memuat data",
          description: "Tidak dapat mengambil data keuangan total.",
          variant: "destructive"
      });
      setStats(null);
    } finally {
        setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    calculateTotalStats();
  }, [calculateTotalStats]);


  if (loading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-16 w-16 animate-spin" />
        </div>
    );
  }

  if (!stats) {
     return (
        <div className="flex flex-col gap-8 items-center justify-center h-96">
             <Card className="max-w-lg text-center">
                <CardHeader>
                    <CardTitle>Gagal Memuat Data</CardTitle>
                    <CardDescription>
                       Tidak dapat memuat data statistik total. Coba segarkan halaman.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={calculateTotalStats}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Coba Lagi
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Total Keuangan</h1>
                <p className="text-muted-foreground">Ringkasan total dari semua pemasukan dan pengeluaran yang tercatat.</p>
            </div>
             <Button onClick={calculateTotalStats} disabled={loading} variant="outline">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Segarkan Data
            </Button>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Ringkasan Keuangan Total</CardTitle>
                <CardDescription>Akumulasi dari seluruh riwayat keuangan bisnis Anda.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="grid gap-8 sm:grid-cols-3">
                    <div className="flex items-center gap-4">
                         <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Pemasukan</p>
                            <p className="text-2xl font-bold">Rp{stats.totalIncome.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">
                            <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
                            <p className="text-2xl font-bold">Rp{stats.totalExpense.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg">
                            <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Saldo Bersih</p>
                            <p className="text-2xl font-bold">Rp{stats.balance.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
