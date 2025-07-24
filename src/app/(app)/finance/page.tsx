
'use client'
import * as React from "react";
import { collection, getDocs, query, where, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { OtherIncome, Payment, Expense } from "@/lib/types";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { id } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, TrendingUp, TrendingDown, Wallet, AreaChart, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { OtherIncomeDialog } from "@/components/other-income-dialog";

export default function FinancePage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
      totalIncome: 0,
      totalExpense: 0,
      totalOtherIncome: 0,
      balance: 0,
  });
  const [otherIncomes, setOtherIncomes] = React.useState<OtherIncome[]>([]);

  const fetchFinanceData = React.useCallback(async () => {
    setLoading(true);
    try {
        const [paymentsSnapshot, expensesSnapshot, otherIncomesSnapshot] = await Promise.all([
            getDocs(collection(db, "payments")),
            getDocs(query(collection(db, "expenses"), where("date", "!=", null))),
            getDocs(collection(db, "otherIncomes"))
        ]);

        const totalIncome = paymentsSnapshot.docs
            .map(doc => doc.data() as Payment)
            .reduce((sum, p) => sum + (p.totalPayment || p.paidAmount), 0);

        const totalExpense = expensesSnapshot.docs
            .map(doc => doc.data() as Expense)
            .reduce((sum, e) => sum + e.amount, 0);

        const allOtherIncomes = otherIncomesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OtherIncome)).sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        setOtherIncomes(allOtherIncomes);

        const totalOtherIncome = allOtherIncomes.reduce((sum, e) => sum + e.amount, 0);
        
        const balance = (totalIncome + totalOtherIncome) - totalExpense;

        setStats({
            totalIncome,
            totalExpense,
            totalOtherIncome,
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
  }, [toast]);
  
  React.useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData, toast]);

  const handleAddOtherIncome = async (data: { name: string; amount: number }) => {
     try {
        await addDoc(collection(db, "otherIncomes"), {
            ...data,
            date: format(new Date(), 'yyyy-MM-dd')
        });
        toast({
            title: "Berhasil Ditambahkan",
            description: `${data.name} telah ditambahkan ke pemasukan lainnya.`
        });
        fetchFinanceData(); // Refetch data
    } catch (error) {
        console.error("Error adding other income:", error);
        toast({
            title: "Gagal Menambahkan",
            variant: "destructive"
        });
    }
  };

  const handleDeleteIncome = async (incomeToDelete: OtherIncome) => {
    if (!incomeToDelete) return;
    try {
        await deleteDoc(doc(db, "otherIncomes", incomeToDelete.id));
        toast({
            title: "Data Dihapus",
            description: "Data pemasukan lainnya telah berhasil dihapus.",
            variant: "destructive"
        });
        fetchFinanceData();
    } catch (error) {
        console.error("Error deleting income:", error);
        toast({
            title: "Gagal Menghapus",
            variant: "destructive"
        });
    }
  };


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
    <>
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Keuangan</h1>
            <p className="text-muted-foreground">Akumulasi pemasukan, pengeluaran, dan saldo dari seluruh riwayat transaksi.</p>
        </div>
      </div>
        <Card>
            <CardHeader>
                <CardTitle>Ringkasan Keuangan Total</CardTitle>
                <CardDescription>Total akumulasi dari seluruh riwayat transaksi.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center gap-4">
                         <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Pemasukan Tagihan</p>
                            <p className="text-2xl font-bold">Rp{stats.totalIncome.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-4">
                         <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-lg">
                            <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Pemasukan Lainnya</p>
                            <p className="text-2xl font-bold">Rp{stats.totalOtherIncome.toLocaleString('id-ID')}</p>
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

        <div className="flex items-center gap-2">
            <OtherIncomeDialog 
                otherIncomes={otherIncomes}
                onAddIncome={handleAddOtherIncome}
                onDeleteIncome={handleDeleteIncome}
            />
            <Button asChild variant="outline">
                <Link href="/expenses">
                    <Wallet className="mr-2 h-4 w-4" />
                    Lihat Pengeluaran
                </Link>
            </Button>
             <Button asChild variant="outline">
                <Link href="/monthly-statistics">
                    <AreaChart className="mr-2 h-4 w-4" />
                    Statistik Bulanan
                </Link>
            </Button>
        </div>

    </div>
    </>
  )
}
