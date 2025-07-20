
'use client'
import * as React from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Payment, Expense } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, TrendingUp, TrendingDown, Wallet } from "lucide-react"
import { useToast } from "@/hooks/use-toast";

export default function FinancePage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
  });

  React.useEffect(() => {
    const fetchFinanceData = async () => {
        setLoading(true);
        try {
            const [paymentsSnapshot, expensesSnapshot] = await Promise.all([
                getDocs(collection(db, "payments")),
                getDocs(query(collection(db, "expenses"), where("date", "!=", null)))
            ]);

            const totalIncome = paymentsSnapshot.docs
                .map(doc => doc.data() as Payment)
                .reduce((sum, p) => sum + (p.totalPayment || p.paidAmount), 0);

            const totalExpense = expensesSnapshot.docs
                .map(doc => doc.data() as Expense)
                .reduce((sum, e) => sum + e.amount, 0);
            
            const balance = totalIncome - totalExpense;

            setStats({
                totalIncome,
                totalExpense,
                balance,
            });

        } catch (error) {
            console.error("Failed to fetch finance data:", error);
            toast({
                title: "Gagal memuat data",
                description: "Tidak dapat mengambil data keuangan.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };
    
    fetchFinanceData();
  }, [toast]);

  if (loading) {
    return (
        <div className="flex flex-col gap-8">
            <h1 className="text-3xl font-bold tracking-tight">Keuangan</h1>
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Keuangan</h1>
        <p className="text-muted-foreground">Akumulasi pemasukan, pengeluaran, dan saldo dari seluruh riwayat transaksi.</p>
      </div>
        <Card>
            <CardHeader>
                <CardTitle>Ringkasan Keuangan Total</CardTitle>
                <CardDescription>Total akumulasi dari seluruh riwayat transaksi.</CardDescription>
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
                            <p className="text-sm text-muted-foreground">Saldo Bersih</p>
                            <p className="text-2xl font-bold">Rp{stats.balance.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
  )
}
