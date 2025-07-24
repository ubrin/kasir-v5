
'use client'
import * as React from "react";
import { collection, getDocs, query, where, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Payment, Expense, OtherIncome } from "@/lib/types";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { id } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, TrendingUp, TrendingDown, Wallet, AreaChart, DollarSign, MoreHorizontal, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { AddOtherIncomeDialog } from "@/components/add-other-income-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  const [incomeToDelete, setIncomeToDelete] = React.useState<OtherIncome | null>(null);

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

  const handleDeleteIncome = async () => {
    if (!incomeToDelete) return;
    try {
        await deleteDoc(doc(db, "otherIncomes", incomeToDelete.id));
        toast({
            title: "Data Dihapus",
            description: "Data pemasukan lainnya telah berhasil dihapus.",
            variant: "destructive"
        });
        fetchFinanceData();
        setIncomeToDelete(null);
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

        <Card>
            <CardHeader>
                <CardTitle>Riwayat Pemasukan Lainnya</CardTitle>
                <CardDescription>Daftar pemasukan di luar dari tagihan rutin pelanggan.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Nama Pemasukan</TableHead>
                            <TableHead className="text-right">Jumlah</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {otherIncomes.length > 0 ? otherIncomes.map((income) => (
                            <TableRow key={income.id}>
                                <TableCell>{format(parseISO(income.date), 'd MMMM yyyy', {locale: id})}</TableCell>
                                <TableCell className="font-medium">{income.name}</TableCell>
                                <TableCell className="text-right">Rp{income.amount.toLocaleString('id-ID')}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">Buka menu</span>
                                        </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                        <DropdownMenuItem 
                                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                            onClick={() => setIncomeToDelete(income)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Hapus
                                        </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">Belum ada pemasukan lainnya yang dicatat.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <div className="flex items-center gap-2">
            <AddOtherIncomeDialog onConfirm={handleAddOtherIncome} />
            <Button asChild>
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
    <AlertDialog open={!!incomeToDelete} onOpenChange={(isOpen) => !isOpen && setIncomeToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Anda yakin ingin menghapus data ini?</AlertDialogTitle>
            <AlertDialogDescription>
                Tindakan ini akan menghapus data pemasukan <span className="font-bold">{incomeToDelete?.name}</span> secara permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIncomeToDelete(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction
                onClick={handleDeleteIncome}
                className="bg-destructive hover:bg-destructive/90"
            >
                Ya, Hapus
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
