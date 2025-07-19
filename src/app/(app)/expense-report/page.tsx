
'use client';

import * as React from 'react';
import { useSearchParams, useRouter, notFound } from 'next/navigation';
import { format, parse, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { collection, query, where, getDocs, doc, writeBatch, updateDoc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Expense } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Edit, Trash2, MoreHorizontal, CreditCard, Save, TrendingUp, Repeat, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const formatNumber = (value: number | undefined): string => {
    if (value === undefined || value === null) return '0';
    return value.toLocaleString('id-ID');
};

export default function ExpenseReportPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const periodStr = searchParams.get('period');
    const [period, setPeriod] = React.useState<Date | null>(null);

    const [loading, setLoading] = React.useState(true);
    const [expenses, setExpenses] = React.useState<Expense[]>([]);
    
    React.useEffect(() => {
        if (periodStr) {
            try {
                const parsedDate = parse(periodStr, 'yyyy-MM', new Date());
                setPeriod(parsedDate);
            } catch (error) {
                console.error("Invalid period format:", error);
                notFound();
            }
        } else {
            notFound();
        }
    }, [periodStr]);

    const fetchExpenses = React.useCallback(async () => {
        if (!period) return;
        setLoading(true);
        try {
            const expensesCollection = collection(db, "expenses");
            const snapshot = await getDocs(expensesCollection);
            const allExpensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));

            const fromDate = startOfMonth(period);
            const toDate = endOfMonth(period);
            
            // Filter expenses based on the selected period
            const periodExpenses = allExpensesData.filter(exp => {
                if (exp.category === 'utama') {
                    // Recurring expenses are always included in any period report
                    return true;
                }
                if (exp.date) {
                    const expDate = parseISO(exp.date);
                    return expDate >= fromDate && expDate <= toDate;
                }
                return false;
            });
            
            // Sort client-side
            const sortedExpenses = periodExpenses.sort((a,b) => {
                 const dateA = a.date ? parseISO(a.date).getTime() : 0;
                 const dateB = b.date ? parseISO(b.date).getTime() : 0;
                 return dateB - dateA;
            });

            setExpenses(sortedExpenses);
        } catch (error) {
            console.error("Error fetching expenses:", error);
            toast({ title: "Gagal memuat data", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [period, toast]);

    React.useEffect(() => {
        if (period) {
            fetchExpenses();
        }
    }, [period, fetchExpenses]);


    const handleSaveExpense = async (data: Partial<Omit<Expense, 'id'>>, id?: string) => {
        try {
            if (id) {
                const expenseRef = doc(db, 'expenses', id);
                await updateDoc(expenseRef, data);
                toast({ title: "Pengeluaran diperbarui" });
            } else {
                 await addDoc(collection(db, 'expenses'), data);
                 toast({ title: "Pengeluaran ditambahkan" });
            }
            fetchExpenses();
        } catch (error) {
            console.error("Error saving expense:", error);
            toast({ title: "Gagal menyimpan", variant: "destructive" });
        }
    };
    
    const handleDeleteExpense = async (id: string) => {
        try {
            const expenseRef = doc(db, 'expenses', id);
            await deleteDoc(expenseRef);
            toast({ title: "Pengeluaran dihapus", variant: "destructive" });
            fetchExpenses();
        } catch (error) {
            console.error("Error deleting expense:", error);
            toast({ title: "Gagal menghapus", variant: "destructive" });
        }
    };
    
    const handlePayInstallment = async (expense: Expense) => {
        if (expense.category !== 'angsuran' || !expense.tenor) return;
        const currentPaidTenor = expense.paidTenor || 0;
        if (currentPaidTenor >= expense.tenor) {
             toast({ title: "Angsuran sudah lunas", variant: "default" });
             return;
        }

        try {
            const expenseRef = doc(db, "expenses", expense.id);
            await updateDoc(expenseRef, {
                paidTenor: currentPaidTenor + 1
            });
            toast({ title: "Pembayaran angsuran berhasil", description: `Sisa tenor: ${expense.tenor - (currentPaidTenor + 1)} bulan.` });
            fetchExpenses();
        } catch (error) {
             console.error("Error paying installment:", error);
             toast({ title: "Gagal membayar angsuran", variant: "destructive" });
        }
    }

    const groupedExpenses = React.useMemo(() => {
        return expenses.reduce((acc, exp) => {
            (acc[exp.category] = acc[exp.category] || []).push(exp);
            return acc;
        }, {} as Record<Expense['category'], Expense[]>);
    }, [expenses]);
    
    const totals = React.useMemo(() => {
        return {
            utama: groupedExpenses.utama?.reduce((sum, exp) => sum + exp.amount, 0) || 0,
            angsuran: groupedExpenses.angsuran?.reduce((sum, exp) => sum + exp.amount, 0) || 0,
            lainnya: groupedExpenses.lainnya?.reduce((sum, exp) => sum + exp.amount, 0) || 0,
        };
    }, [groupedExpenses]);

    const totalExpenseAmount = totals.utama + totals.angsuran + totals.lainnya;

    if (loading || !period) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push('/expenses')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Rincian Pengeluaran</h1>
                    <p className="text-muted-foreground">
                        Periode: {format(period, 'MMMM yyyy', { locale: localeId })}. Total: <span className="font-bold">Rp{formatNumber(totalExpenseAmount)}</span>
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pengeluaran Utama</CardTitle>
                        <Repeat className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">Rp{formatNumber(totals.utama)}</div>
                        <p className="text-xs text-muted-foreground">Pengeluaran rutin bulanan</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Angsuran</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">Rp{formatNumber(totals.angsuran)}</div>
                        <p className="text-xs text-muted-foreground">Cicilan & pembayaran bertahap</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pengeluaran Lainnya</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">Rp{formatNumber(totals.lainnya)}</div>
                        <p className="text-xs text-muted-foreground">Pengeluaran insidental</p>
                    </CardContent>
                </Card>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Rincian Pengeluaran Utama</CardTitle>
                        <CardDescription>Daftar pengeluaran rutin yang terjadi setiap bulan.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>Jatuh Tempo</TableHead>
                                    <TableHead className="text-right">Jumlah</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupedExpenses.utama?.length > 0 ? groupedExpenses.utama.map(expense => (
                                    <TableRow key={expense.id}>
                                        <TableCell className="font-medium">{expense.name}</TableCell>
                                        <TableCell>{`Setiap Tgl. ${expense.dueDateDay}`}</TableCell>
                                        <TableCell className="text-right">Rp{formatNumber(expense.amount)}</TableCell>
                                        <TableCell className="text-right">
                                            {/* Action Menu here */}
                                        </TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="text-center h-24">Tidak ada data.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Rincian Pengeluaran Angsuran</CardTitle>
                         <CardDescription>Daftar cicilan atau pembayaran bertahap pada periode ini.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead className="text-right">Jumlah</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupedExpenses.angsuran?.length > 0 ? groupedExpenses.angsuran.map(expense => (
                                    <TableRow key={expense.id}>
                                        <TableCell className="font-medium">{expense.name} {expense.tenor && <span className="text-muted-foreground text-xs">({expense.paidTenor || 0}/{expense.tenor})</span>}</TableCell>
                                        <TableCell>{expense.date && format(parseISO(expense.date), 'd MMM yyyy', { locale: localeId })}</TableCell>
                                        <TableCell className="text-right">Rp{formatNumber(expense.amount)}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handlePayInstallment(expense)}><CreditCard className="mr-2 h-4 w-4"/> Bayar Angsuran</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {/* Edit Dialog Trigger can be here */}
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                                <Trash2 className="mr-2 h-4 w-4"/> Hapus
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Yakin ingin menghapus?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus data secara permanen.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteExpense(expense.id)} className="bg-destructive hover:bg-destructive/90">Ya, Hapus</AlertDialogAction></AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="text-center h-24">Tidak ada data.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Rincian Pengeluaran Lainnya</CardTitle>
                        <CardDescription>Daftar pengeluaran insidental pada periode ini.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead className="text-right">Jumlah</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupedExpenses.lainnya?.length > 0 ? groupedExpenses.lainnya.map(expense => (
                                    <TableRow key={expense.id}>
                                        <TableCell className="font-medium">{expense.name}</TableCell>
                                        <TableCell>{expense.date && format(parseISO(expense.date), 'd MMM yyyy', { locale: localeId })}</TableCell>
                                        <TableCell className="text-right">Rp{formatNumber(expense.amount)}</TableCell>
                                        <TableCell className="text-right">
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {/* Edit Dialog Trigger can be here */}
                                                     <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                                <Trash2 className="mr-2 h-4 w-4"/> Hapus
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Yakin ingin menghapus?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus data secara permanen.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteExpense(expense.id)} className="bg-destructive hover:bg-destructive/90">Ya, Hapus</AlertDialogAction></AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="text-center h-24">Tidak ada data.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
